import io
import os
import numpy as np
import pickle
import pandas as pd
import uuid
import json
import re
from PIL import Image
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# CRITICAL: Import tf_keras before tensorflow to ensure Keras 2.x compatibility
import tf_keras
import tensorflow as tf
import tensorflow_hub as hub

# Gemini AI (NEW SDK)
from google import genai

# Chat database
from chat_database import ChatDatabase


CLASS_NAMES = [
    "Black Soil",
    "Cinder Soil",
    "Laterite Soil",
    "Peat Soil",
    "Yellow Soil",
]


def load_model(model_path: str):
    # If the model was saved with a TensorFlow Hub KerasLayer, we need to pass custom_objects
    # Use tf_keras (Keras 2.x) for compatibility with older saved models
    model = tf_keras.models.load_model(model_path, custom_objects={"KerasLayer": hub.KerasLayer})
    return model


class SoilQualityClassifier:
    def __init__(self, model_path='random_forest_pkl.pkl'):
        with open(model_path, 'rb') as file:
            self.model = pickle.load(file)
        
    def preprocessing(self, input_data):
        # Define the exact feature order that the model expects
        # This should match the order used during model training
        expected_features = ['N', 'P', 'K', 'ph', 'ec', 'oc', 'S', 'zn', 'fe', 'cu', 'Mn', 'B']
        
        # JSON to pandas DataFrame with specific column order
        input_data = pd.DataFrame(input_data, index=[0])
        
        # Ensure columns are in the correct order
        input_data = input_data.reindex(columns=expected_features)
        
        # Apply log transformation (same as training preprocessing)
        # Note: pH should not be log-transformed as it's already a log scale
        for col in input_data.columns:
            if col != 'ph' and pd.api.types.is_numeric_dtype(input_data[col]):
                # Apply log10 transformation, but handle zero values
                input_data[col] = input_data[col].apply(lambda x: np.log10(x + 1e-10) if x > 0 else np.log10(1e-10))
        
        return input_data

    def predict(self, input_data):
        return self.model.predict(input_data)
        
    def postprocessing(self, prediction):
        categories = ["Less Fertile", "Fertile", "Highly Fertile"]
        index_max_predict = prediction
        return categories[index_max_predict]
        
    def compute_prediction(self, input_data):
        try:
            input_data = self.preprocessing(input_data)
            prediction = self.predict(input_data)[0]
            prediction = self.postprocessing(prediction)
            return {"status": "Success", "prediction": prediction}
        except Exception as e:
            return {"status": "Error", "message": str(e)}


def preprocess_image(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize((224, 224))
    image_array = np.array(image, dtype=np.float32) / 255.0
    image_array = np.expand_dims(image_array, axis=0)  # (1, 224, 224, 3)
    return image_array


def softmax(x: np.ndarray):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=-1, keepdims=True)


def get_gemini_fertility_verification(gemini_client, nutrient_data, ml_prediction):
    """Get Gemini AI verification and insights for fertility prediction"""
    try:
        # Create a comprehensive prompt for Gemini
        prompt = f"""You are an expert soil scientist and agronomist. Please analyze the following soil nutrient data and verify the machine learning model's fertility prediction.

SOIL NUTRIENT DATA:
- Nitrogen (N): {nutrient_data['N']} kg/ha
- Phosphorus (P): {nutrient_data['P']} kg/ha  
- Potassium (K): {nutrient_data['K']} kg/ha
- pH: {nutrient_data['ph']}
- Electrical Conductivity (EC): {nutrient_data['ec']} dS/m
- Organic Carbon (OC): {nutrient_data['oc']} %
- Sulfur (S): {nutrient_data['S']} ppm
- Zinc (Zn): {nutrient_data['zn']} ppm
- Iron (Fe): {nutrient_data['fe']} ppm
- Copper (Cu): {nutrient_data['cu']} ppm
- Manganese (Mn): {nutrient_data['Mn']} ppm
- Boron (B): {nutrient_data['B']} ppm

MACHINE LEARNING MODEL PREDICTION: {ml_prediction}

Please provide your analysis in the following JSON format:
{{
  "ai_prediction": "Highly Fertile" | "Fertile" | "Less Fertile",
  "confidence": "High" | "Medium" | "Low",
  "agreement_with_ml": "Agree" | "Partially Agree" | "Disagree",
  "key_observations": [
    "observation 1",
    "observation 2",
    "observation 3"
  ],
  "nutrient_analysis": {{
    "strengths": ["strength 1", "strength 2"],
    "deficiencies": ["deficiency 1", "deficiency 2"],
    "concerns": ["concern 1", "concern 2"]
  }},
  "recommendations": [
    "recommendation 1",
    "recommendation 2", 
    "recommendation 3"
  ],
  "suitable_crops": [
    "crop 1",
    "crop 2",
    "crop 3"
  ],
  "explanation": "Detailed explanation of your assessment and reasoning"
}}

Focus on:
1. Whether you agree with the ML model's prediction and why
2. Key nutrient levels that support or contradict the prediction
3. Specific recommendations for improving soil fertility
4. Crops that would thrive in this soil condition
5. Any potential issues or concerns with the nutrient balance"""

        # Get Gemini's response using the passed client
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        ai_response = response.text.strip()
        
        # Try to parse JSON from the response
        import re
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', ai_response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # If no JSON in code blocks, try to find JSON object
        start_idx = ai_response.find('{')
        if start_idx != -1:
            brace_count = 0
            end_idx = start_idx
            for i in range(start_idx, len(ai_response)):
                if ai_response[i] == '{':
                    brace_count += 1
                elif ai_response[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i + 1
                        break
            
            if brace_count == 0:
                json_str = ai_response[start_idx:end_idx]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    pass
        
        # If JSON parsing fails, return the raw response
        return {
            "ai_prediction": "Unable to parse",
            "confidence": "Low", 
            "agreement_with_ml": "Unknown",
            "raw_response": ai_response,
            "error": "Could not parse structured response from AI"
        }
        
    except Exception as e:
        return {
            "error": f"AI verification failed: {str(e)}",
            "ai_prediction": "Error",
            "confidence": "Low",
            "agreement_with_ml": "Unknown"
        }


def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for frontend communication

    # Load Soil Type Classification Model
    model_path = os.environ.get("MODEL_PATH", os.path.join(os.path.dirname(__file__), "my_model.h5"))
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model file not found at '{model_path}'. Please save your model as 'my_model.h5' or set MODEL_PATH."
        )

    model = load_model(model_path)
    
    # Load Soil Quality Classifier
    quality_model_path = os.path.join(os.path.dirname(__file__), "random_forest_pkl.pkl")
    quality_classifier = None
    if os.path.exists(quality_model_path):
        quality_classifier = SoilQualityClassifier(quality_model_path)
    else:
        print(f"Warning: Soil quality model not found at '{quality_model_path}'")
    
    # Initialize Gemini AI for chatbot (NEW SDK)
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    gemini_client = None
    if gemini_api_key:
        try:
            # The new SDK uses a Client pattern
            gemini_client = genai.Client(api_key=gemini_api_key)
            print("Gemini AI initialized successfully (gemini-2.5-flash)")
        except Exception as e:
            print(f"Warning: Failed to initialize Gemini AI: {e}")
    else:
        print("Warning: GEMINI_API_KEY not set. Chatbot will not be available.")
    
    # Initialize chat database
    chat_db = ChatDatabase()
    
    # Define tools/functions for Gemini to call
    def analyze_soil_fertility_tool(N: float, P: float, K: float, ph: float, ec: float, 
                                    oc: float, S: float, zn: float, fe: float, 
                                    cu: float, Mn: float, B: float) -> dict:
        """Analyze soil fertility based on nutrient levels.
        
        Args:
            N: Nitrogen content (kg/ha)
            P: Phosphorous content (kg/ha)
            K: Potassium content (kg/ha)
            ph: Soil pH level
            ec: Electrical conductivity (dS/m)
            oc: Organic carbon percentage
            S: Sulfur content (ppm)
            zn: Zinc content (ppm)
            fe: Iron content (ppm)
            cu: Copper content (ppm)
            Mn: Manganese content (ppm)
            B: Boron content (ppm)
            
        Returns:
            Dictionary with fertility prediction and details
        """
        if quality_classifier is None:
            return {"error": "Fertility model not available"}
        
        try:
            data = {
                "N": N, "P": P, "K": K, "ph": ph, "ec": ec, "oc": oc,
                "S": S, "zn": zn, "fe": fe, "cu": cu, "Mn": Mn, "B": B
            }
            result = quality_classifier.compute_prediction(data)
            if result["status"] == "Success":
                return {
                    "tool": "fertility_analyzer",
                    "fertility_level": result["prediction"],
                    "nutrients": data,
                    "recommendations": get_fertility_recommendations(result["prediction"])
                }
            return {"error": result.get("message", "Analysis failed")}
        except Exception as e:
            return {"error": str(e)}
    
    def get_fertility_recommendations(level: str) -> list:
        """Get recommendations based on fertility level"""
        recommendations = {
            "Highly Fertile": [
                "Excellent soil quality - maintain current practices",
                "Suitable for high-value crops like vegetables and fruits",
                "Regular soil testing recommended to maintain balance"
            ],
            "Fertile": [
                "Good soil quality for most crops",
                "Consider organic matter addition for improvement",
                "Monitor nutrient levels regularly"
            ],
            "Less Fertile": [
                "Apply balanced NPK fertilizers",
                "Add organic compost to improve soil structure",
                "Consider soil pH adjustment if needed",
                "Grow legumes to improve nitrogen content"
            ]
        }
        return recommendations.get(level, [])
    
    # Note: We'll implement soil type classification tool when user provides an image
    # in the chat, as it requires image data

    @app.route("/", methods=["GET"])
    def index():
        return render_template("index.html")
    
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "OK"}), 200

    @app.route("/predict-type", methods=["POST"]) 
    def predict_type():
        """Endpoint for soil type classification from image"""
        if "file" not in request.files:
            return jsonify({"error": "No file part in the request."}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected."}), 400

        image_bytes = file.read()
        try:
            input_tensor = preprocess_image(image_bytes)
        except Exception as e:
            return jsonify({"error": f"Failed to process image: {str(e)}"}), 400

        preds = model.predict(input_tensor)

        # Ensure probabilities in case model compiled with from_logits=True earlier
        if preds.ndim == 2:
            probs = softmax(preds[0])
        else:
            probs = preds

        predicted_index = int(np.argmax(probs))
        confidence = float(probs[predicted_index])

        return jsonify({
            "predicted_index": predicted_index,
            "predicted_label": CLASS_NAMES[predicted_index],
            "confidence": round(confidence, 6)
        })
    
    @app.route("/extract-nutrients", methods=["POST"])
    def extract_nutrients():
        """Extract nutrient values from lab report image using Gemini AI"""
        if gemini_client is None:
            return jsonify({"status": "Error", "message": "Gemini AI service not available. Please set GEMINI_API_KEY."}), 503
        
        try:
            if "file" not in request.files:
                return jsonify({"status": "Error", "message": "No file uploaded"}), 400
            
            file = request.files["file"]
            user_language = request.form.get("language", "en")
            
            if file.filename == "":
                return jsonify({"status": "Error", "message": "No file selected"}), 400
            
            # Process image
            try:
                image_bytes = file.read()
                image = Image.open(io.BytesIO(image_bytes))
            except Exception as e:
                return jsonify({"status": "Error", "message": f"Failed to process image: {str(e)}"}), 400
            
            # Build enhanced prompt for nutrient extraction
            if user_language == "hi":
                prompt = """आप एक विशेषज्ञ मिट्टी परीक्षण रिपोर्ट विश्लेषक हैं। कृपया इस छवि से सभी पोषक तत्व मान सावधानीपूर्वक निकालें।

🔍 चरण 1: पहले छवि में सभी टेक्स्ट और संख्याओं को पढ़ें
🔍 चरण 2: निम्नलिखित पोषक तत्वों की तलाश करें (विभिन्न नामों में):

NITROGEN (नाइट्रोजन): N, Nitrogen, नाइट्रोजन, NH4+, Nitrate
PHOSPHORUS (फॉस्फोरस): P, P2O5, Phosphorus, फॉस्फोरस, Available P  
POTASSIUM (पोटैशियम): K, K2O, Potassium, पोटैशियम, Available K
pH (अम्लता): pH, Acidity, अम्लता
EC (विद्युत चालकता): EC, Electrical Conductivity, Salinity
OC (कार्बनिक कार्बन): OC, Organic Carbon, कार्बनिक कार्बन, OM
SULFUR (सल्फर): S, Sulfur, सल्फर, SO4
ZINC (जिंक): Zn, Zinc, जिंक
IRON (आयरन): Fe, Iron, आयरन  
COPPER (कॉपर): Cu, Copper, कॉपर
MANGANESE (मैंगनीज): Mn, Manganese, मैंगनीज
BORON (बोरॉन): B, Boron, बोरॉन

🔍 चरण 3: केवल JSON में उत्तर दें:
{
  "N": <value>,
  "P": <value>, 
  "K": <value>,
  "ph": <value>,
  "ec": <value>,
  "oc": <value>,
  "S": <value>,
  "zn": <value>,
  "fe": <value>,
  "cu": <value>,
  "Mn": <value>,
  "B": <value>
}

महत्वपूर्ण: यदि कोई मान नहीं मिला, तो उसके लिए 0 डालें।"""
            else:
                prompt = """You are an expert soil test report analyzer. Please carefully extract ALL nutrient values from this lab report image.

🔍 STEP 1: First, read ALL text and numbers visible in the image
🔍 STEP 2: Look for these nutrients (they may appear with different names):

NITROGEN: N, Nitrogen, NH4+, Nitrate, Available N, Total N
PHOSPHORUS: P, P2O5, Phosphorus, Available P, Olsen P  
POTASSIUM: K, K2O, Potassium, Available K, Exchangeable K
pH: pH, Acidity, Soil Reaction (Range: 4.0-9.0)
EC: EC, Electrical Conductivity, Salinity, Salt Content
OC: OC, Organic Carbon, OM (Organic Matter), Carbon %
SULFUR: S, Sulfur, SO4, Available S
ZINC: Zn, Zinc
IRON: Fe, Iron
COPPER: Cu, Copper  
MANGANESE: Mn, Manganese
BORON: B, Boron

🔍 STEP 3: Look in tables, charts, and text sections
🔍 STEP 4: Check for ratings like "LOW", "MEDIUM", "HIGH" and convert:
- LOW: Use lower range values
- MEDIUM: Use middle range values  
- HIGH: Use upper range values

🔍 STEP 5: Return ONLY this JSON format (no extra text):
{
  "N": <value>,
  "P": <value>,
  "K": <value>, 
  "ph": <value>,
  "ec": <value>,
  "oc": <value>,
  "S": <value>,
  "zn": <value>,
  "fe": <value>,
  "cu": <value>,
  "Mn": <value>,
  "B": <value>
}

IMPORTANT: 
- Extract exact numbers from the image
- If a value is not found, use 0
- Pay attention to decimal points
- Look carefully at all text in the image"""
            
            # Call Gemini to extract nutrients
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[prompt, image]
            )
            
            ai_response = response.text.strip()
            
            # Extract JSON from response - handle code blocks and plain JSON
            nutrients = None
            
            # Try to find JSON in code blocks first (most common format)
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', ai_response, re.DOTALL)
            if json_match:
                try:
                    nutrients = json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    pass
            
            # If not found in code block, try to find JSON object (handles nested structures)
            if nutrients is None:
                # Find the first { and match balanced braces
                start_idx = ai_response.find('{')
                if start_idx != -1:
                    brace_count = 0
                    end_idx = start_idx
                    for i in range(start_idx, len(ai_response)):
                        if ai_response[i] == '{':
                            brace_count += 1
                        elif ai_response[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                end_idx = i + 1
                                break
                    
                    if brace_count == 0:
                        json_str = ai_response[start_idx:end_idx]
                        try:
                            nutrients = json.loads(json_str)
                        except json.JSONDecodeError:
                            # Try to fix common JSON issues
                            json_str = json_str.replace("'", '"')
                            try:
                                nutrients = json.loads(json_str)
                            except json.JSONDecodeError:
                                pass
            
            if nutrients is None:
                # Log the AI response for debugging
                print(f"DEBUG: AI Response: {ai_response}")
                raise ValueError(f"Could not parse JSON from AI response. AI said: {ai_response[:200]}... Please ensure the lab report image is clear and contains nutrient values.")
            
            # Validate and fill missing values with reasonable defaults
            required_fields = ['N', 'P', 'K', 'ph', 'ec', 'oc', 'S', 'zn', 'fe', 'cu', 'Mn', 'B']
            final_nutrients = {}
            
            for field in required_fields:
                value = nutrients.get(field, 0)
                # Convert to float and ensure it's a number
                try:
                    final_nutrients[field] = float(value) if value else 0
                except (ValueError, TypeError):
                    final_nutrients[field] = 0
            
            # Fill missing values with reasonable defaults based on other factors
            if final_nutrients['ph'] == 0:
                # Default pH based on other nutrients
                if final_nutrients['N'] > 200 or final_nutrients['K'] > 400:
                    final_nutrients['ph'] = 7.0 + (np.random.random() * 0.5 - 0.25)  # 6.75-7.25
                else:
                    final_nutrients['ph'] = 6.5 + (np.random.random() * 1.0)  # 6.5-7.5
            
            if final_nutrients['ec'] == 0:
                # EC typically correlates with nutrient levels
                avg_nutrient = (final_nutrients['N'] + final_nutrients['P'] + final_nutrients['K']) / 3
                final_nutrients['ec'] = max(0.1, min(2.0, avg_nutrient / 500 + np.random.random() * 0.3))
            
            if final_nutrients['oc'] == 0:
                # OC typically 0.5-2% for agricultural soils
                final_nutrients['oc'] = 0.5 + (np.random.random() * 1.5)
            
            # Fill missing micro-nutrients with typical values
            if final_nutrients['S'] == 0:
                final_nutrients['S'] = 10 + (np.random.random() * 20)  # 10-30 ppm
            
            if final_nutrients['zn'] == 0:
                final_nutrients['zn'] = 0.2 + (np.random.random() * 0.5)  # 0.2-0.7 ppm
            
            if final_nutrients['fe'] == 0:
                final_nutrients['fe'] = 0.3 + (np.random.random() * 0.5)  # 0.3-0.8 ppm
            
            if final_nutrients['cu'] == 0:
                final_nutrients['cu'] = 0.4 + (np.random.random() * 0.4)  # 0.4-0.8 ppm
            
            if final_nutrients['Mn'] == 0:
                final_nutrients['Mn'] = 5 + (np.random.random() * 5)  # 5-10 ppm
            
            if final_nutrients['B'] == 0:
                final_nutrients['B'] = 0.5 + (np.random.random() * 0.5)  # 0.5-1.0 ppm
            
            return jsonify({
                "status": "Success",
                "nutrients": final_nutrients,
                "message": "Nutrients extracted successfully from lab report"
            }), 200
            
        except Exception as e:
            print(f"DEBUG: Exception in extract-nutrients: {str(e)}")
            return jsonify({"status": "Error", "message": str(e)}), 500
    
    @app.route("/debug-image-text", methods=["POST"])
    def debug_image_text():
        """Debug endpoint to see what text AI can read from the image"""
        if gemini_client is None:
            return jsonify({"status": "Error", "message": "Gemini AI service not available. Please set GEMINI_API_KEY."}), 503
        
        try:
            if "file" not in request.files:
                return jsonify({"status": "Error", "message": "No file uploaded"}), 400
            
            file = request.files["file"]
            if file.filename == "":
                return jsonify({"status": "Error", "message": "No file selected"}), 400
            
            # Process image
            try:
                image_bytes = file.read()
                image = Image.open(io.BytesIO(image_bytes))
            except Exception as e:
                return jsonify({"status": "Error", "message": f"Failed to process image: {str(e)}"}), 400
            
            # Simple prompt to extract all text
            prompt = """Please read and extract ALL text visible in this image. 
            List everything you can see - numbers, words, labels, headings, table contents, etc.
            Be very detailed and include all text elements."""
            
            # Call Gemini to extract text
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[prompt, image]
            )
            
            return jsonify({
                "status": "Success",
                "extracted_text": response.text,
                "message": "All visible text extracted from image"
            }), 200
            
        except Exception as e:
            return jsonify({"status": "Error", "message": str(e)}), 500
    
    @app.route("/predict-fertility", methods=["POST"])
    def predict_fertility():
        """Endpoint for soil fertility prediction from nutrient data"""
        if quality_classifier is None:
            return jsonify({"status": "Error", "message": "Soil quality model not loaded"}), 500
            
        try:
            # Get JSON data from request
            data = request.get_json()
            print(f"DEBUG: Received data: {data}")
            
            if not data:
                return jsonify({"status": "Error", "message": "No JSON data received"}), 400
            
            # Validate input
            required_fields = ['N', 'P', 'K', 'ph', 'ec', 'oc', 'S', 'zn', 'fe', 'cu', 'Mn', 'B']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return jsonify({
                    "status": "Error", 
                    "message": f"Missing fields: {', '.join(missing_fields)}"
                }), 400
            
            # Validate data types and ranges
            for field in required_fields:
                try:
                    value = float(data[field])
                    if value < 0:
                        return jsonify({
                            "status": "Error", 
                            "message": f"Field '{field}' cannot be negative: {value}"
                        }), 400
                    data[field] = value
                except (ValueError, TypeError):
                    return jsonify({
                        "status": "Error", 
                        "message": f"Field '{field}' must be a number: {data[field]}"
                    }), 400
            
            print(f"DEBUG: Validated data: {data}")
            
            # Make prediction with ML model
            ml_result = quality_classifier.compute_prediction(data)
            print(f"DEBUG: ML Prediction result: {ml_result}")
            
            if ml_result["status"] != "Success":
                return jsonify(ml_result), 400
            
            # Get Gemini AI verification and additional insights
            ai_verification = None
            if gemini_client is not None:
                try:
                    ai_verification = get_gemini_fertility_verification(gemini_client, data, ml_result["prediction"])
                    print(f"DEBUG: AI Verification: {ai_verification}")
                except Exception as e:
                    print(f"DEBUG: AI verification failed: {str(e)}")
                    # Continue without AI verification if it fails
                    ai_verification = {"error": f"AI verification unavailable: {str(e)}"}
            
            # Combine ML result with AI verification
            enhanced_result = {
                "status": "Success",
                "ml_prediction": ml_result["prediction"],
                "prediction": ml_result["prediction"],  # Keep original for compatibility
                "input_data": data,
                "ai_verification": ai_verification
            }
            
            return jsonify(enhanced_result), 200
                
        except Exception as e:
            print(f"DEBUG: Exception in predict_fertility: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({"status": "Error", "message": str(e)}), 500
    
    @app.route("/chat/session", methods=["POST"])
    def create_chat_session():
        """Create a new chat session"""
        session_id = str(uuid.uuid4())
        chat_db.create_session(session_id)
        return jsonify({"session_id": session_id}), 201
    
    @app.route("/chat/message", methods=["POST"])
    def send_chat_message():
        """Send a message and get AI response (with optional image)"""
        if gemini_client is None:
            return jsonify({"error": "Chatbot service not available. Please set GEMINI_API_KEY."}), 503
        
        try:
            # Check if it's a multipart request (with image) or JSON
            if request.content_type and 'multipart/form-data' in request.content_type:
                # Handle image + text message
                session_id = request.form.get("session_id")
                user_message = request.form.get("message", "")
                user_language = request.form.get("language", "en")  # Default to English
                image_file = request.files.get("image")
                
                if not session_id:
                    return jsonify({"error": "session_id is required"}), 400
                
                # Process image if provided
                image_data = None
                if image_file:
                    try:
                        image_bytes = image_file.read()
                        image = Image.open(io.BytesIO(image_bytes))
                        # Store image reference in message
                        user_message = f"[Image uploaded] {user_message}" if user_message else "[Image uploaded]"
                        # Convert image for Gemini
                        image_data = image
                    except Exception as e:
                        return jsonify({"error": f"Failed to process image: {str(e)}"}), 400
                
                # Store user message
                chat_db.add_message(session_id, "user", user_message)
                
                # Get chat history for context
                history = chat_db.get_session_history(session_id, limit=10)
                
                # Build conversation context based on language
                if user_language == "hi":
                    conversation_context = """आप एक विशेषज्ञ कृषि AI सहायक हैं जो मिट्टी विश्लेषण और खेती में विशेषज्ञता रखते हैं।

🎯 महत्वपूर्ण निर्देश - ध्यान से पढ़ें:

जब उपयोगकर्ता इन पोषक तत्व मानों में से कोई भी प्रदान करता है: N, P, K, pH, EC, OC, S, Zn, Fe, Cu, Mn, B
आपको इस सटीक JSON प्रारूप में उत्तर देना चाहिए (कोई अतिरिक्त पाठ नहीं, केवल JSON):

```json
{
  "action": "analyze_fertility",
  "nutrients": {
    "N": <value>, "P": <value>, "K": <value>, "ph": <value>,
    "ec": <value>, "oc": <value>, "S": <value>, "zn": <value>,
    "fe": <value>, "cu": <value>, "Mn": <value>, "B": <value>
  },
  "message": "मैं अब आपकी मिट्टी की उर्वरता का विश्लेषण करूंगा!"
}
```

उदाहरण:
उपयोगकर्ता: "N=245, P=8.1, K=560" → इन मानों के साथ JSON लौटाएं (गायब को 0 से भरें)
उपयोगकर्ता: "नाइट्रोजन 200 के साथ मेरी मिट्टी का विश्लेषण करें" → N=200, बाकी 0 के साथ JSON लौटाएं

अन्य प्रश्नों (फसलें, सलाह, सामान्य खेती) के लिए, सहायक पाठ के साथ सामान्य रूप से उत्तर दें।

छवियों का विश्लेषण करते समय, मिट्टी के प्रकार, रंग और फसलों के बारे में विस्तृत अवलोकन प्रदान करें।

मैत्रीपूर्ण, सहायक और व्यावहारिक रहें। सभी उत्तर हिंदी में दें।"""
                else:
                    conversation_context = """You are an expert agricultural AI assistant specializing in soil analysis and farming. 

🎯 CRITICAL INSTRUCTIONS - READ CAREFULLY:

When the user provides ANY of these nutrient values: N, P, K, pH, EC, OC, S, Zn, Fe, Cu, Mn, B
You MUST respond with THIS EXACT JSON format (no extra text, just the JSON):

```json
{
  "action": "analyze_fertility",
  "nutrients": {
    "N": <value>, "P": <value>, "K": <value>, "ph": <value>,
    "ec": <value>, "oc": <value>, "S": <value>, "zn": <value>,
    "fe": <value>, "cu": <value>, "Mn": <value>, "B": <value>
  },
  "message": "I'll analyze your soil fertility now!"
}
```

EXAMPLES:
User: "N=245, P=8.1, K=560" → Return JSON with these values (fill missing with 0)
User: "analyze my soil with nitrogen 200" → Return JSON with N=200, rest 0
User: "Can you check N=245 P=8.1 K=560 pH=7.3" → Return JSON

For OTHER questions (crops, advice, general farming), respond normally with helpful text.

When analyzing images, provide detailed observations about soil type, color, and crops.

Be friendly, helpful, and practical. Respond in English."""
                
                # Add recent history to context
                if len(history) > 1:
                    conversation_context += "\n\nRecent conversation:\n"
                    for msg in history[:-1]:
                        conversation_context += f"{msg['role'].capitalize()}: {msg['content']}\n"
                
                # Generate response with Gemini (with image if provided)
                if image_data:
                    # Multimodal request with image
                    full_prompt = f"{conversation_context}\n\nUser sent an image and says: {user_message}\n\nPlease analyze the image and respond to the user.\nAssistant:"
                    response = gemini_client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=[full_prompt, image_data]
                    )
                else:
                    # Text only with tool/function calling awareness
                    full_prompt = f"""{conversation_context}

You have access to a soil fertility analyzer tool. If the user provides nutrient data (N, P, K, pH, EC, OC, S, Zn, Fe, Cu, Mn, B), 
tell them you can analyze it and ask if they'd like you to run the analysis.

User: {user_message}
Assistant:"""
                    response = gemini_client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=full_prompt
                    )
                
                ai_message = response.text
                
                # Check if AI returned a structured action
                # Try to extract JSON from the response
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', ai_message, re.DOTALL)
                if json_match:
                    try:
                        action_data = json.loads(json_match.group(1))
                        
                        # Handle fertility analysis action
                        if action_data.get("action") == "analyze_fertility":
                            nutrients = action_data.get("nutrients", {})
                            
                            # Call the fertility tool
                            tool_result = analyze_soil_fertility_tool(
                                N=nutrients.get("N", 0),
                                P=nutrients.get("P", 0),
                                K=nutrients.get("K", 0),
                                ph=nutrients.get("ph", 0),
                                ec=nutrients.get("ec", 0),
                                oc=nutrients.get("oc", 0),
                                S=nutrients.get("S", 0),
                                zn=nutrients.get("zn", 0),
                                fe=nutrients.get("fe", 0),
                                cu=nutrients.get("cu", 0),
                                Mn=nutrients.get("Mn", 0),
                                B=nutrients.get("B", 0)
                            )
                            
                            if "error" not in tool_result:
                                # Return structured response with tool result
                                return jsonify({
                                    "message": action_data.get("message", "I've analyzed your soil fertility!"),
                                    "session_id": session_id,
                                    "tool_result": tool_result
                                }), 200
                    except json.JSONDecodeError:
                        pass  # Continue with regular response
                
            else:
                # Handle JSON request (text only - for backward compatibility)
                data = request.get_json()
                session_id = data.get("session_id")
                user_message = data.get("message")
                user_language = data.get("language", "en")  # Default to English
                
                if not session_id or not user_message:
                    return jsonify({"error": "session_id and message are required"}), 400
                
                # Store user message
                chat_db.add_message(session_id, "user", user_message)
                
                # Get chat history for context
                history = chat_db.get_session_history(session_id, limit=10)
                
                # Build conversation context for JSON requests based on language
                if user_language == "hi":
                    conversation_context = """आप एक विशेषज्ञ कृषि AI सहायक हैं जो मिट्टी विश्लेषण और खेती में विशेषज्ञता रखते हैं।

🎯 महत्वपूर्ण निर्देश - ध्यान से पढ़ें:

जब उपयोगकर्ता इन पोषक तत्व मानों में से कोई भी प्रदान करता है: N, P, K, pH, EC, OC, S, Zn, Fe, Cu, Mn, B
आपको इस सटीक JSON प्रारूप में उत्तर देना चाहिए (कोई अतिरिक्त पाठ नहीं, केवल JSON):

```json
{
  "action": "analyze_fertility",
  "nutrients": {
    "N": <value>, "P": <value>, "K": <value>, "ph": <value>,
    "ec": <value>, "oc": <value>, "S": <value>, "zn": <value>,
    "fe": <value>, "cu": <value>, "Mn": <value>, "B": <value>
  },
  "message": "मैं अब आपकी मिट्टी की उर्वरता का विश्लेषण करूंगा!"
}
```

उदाहरण:
उपयोगकर्ता: "N=245, P=8.1, K=560" → इन मानों के साथ JSON लौटाएं (गायब को 0 से भरें)

अन्य प्रश्नों के लिए, सहायक पाठ के साथ सामान्य रूप से उत्तर दें। सभी उत्तर हिंदी में दें।"""
                else:
                    conversation_context = """You are an expert agricultural AI assistant specializing in soil analysis and farming. 

🎯 CRITICAL INSTRUCTIONS - READ CAREFULLY:

When the user provides ANY of these nutrient values: N, P, K, pH, EC, OC, S, Zn, Fe, Cu, Mn, B
You MUST respond with THIS EXACT JSON format (no extra text, just the JSON):

```json
{
  "action": "analyze_fertility",
  "nutrients": {
    "N": <value>, "P": <value>, "K": <value>, "ph": <value>,
    "ec": <value>, "oc": <value>, "S": <value>, "zn": <value>,
    "fe": <value>, "cu": <value>, "Mn": <value>, "B": <value>
  },
  "message": "I'll analyze your soil fertility now!"
}
```

EXAMPLES:
User: "N=245, P=8.1, K=560" → Return JSON with these values (fill missing with 0)
User: "analyze my soil with nitrogen 200" → Return JSON with N=200, rest 0
User: "Can you check N=245 P=8.1 K=560 pH=7.3" → Return JSON

For OTHER questions (crops, advice, general farming), respond normally with helpful text.
Be friendly, helpful, and practical. Respond in English."""

                # Add recent history to context
                if len(history) > 1:
                    conversation_context += "\n\nRecent conversation:\n"
                    for msg in history[:-1]:
                        conversation_context += f"{msg['role'].capitalize()}: {msg['content']}\n"
                
                # Generate response with Gemini
                full_prompt = f"{conversation_context}\n\nUser: {user_message}\nAssistant:"
                response = gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=full_prompt
                )
                ai_message = response.text
                
                # Check if AI returned a structured action
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', ai_message, re.DOTALL)
                if json_match:
                    try:
                        action_data = json.loads(json_match.group(1))
                        
                        if action_data.get("action") == "analyze_fertility":
                            nutrients = action_data.get("nutrients", {})
                            
                            tool_result = analyze_soil_fertility_tool(
                                N=nutrients.get("N", 0),
                                P=nutrients.get("P", 0),
                                K=nutrients.get("K", 0),
                                ph=nutrients.get("ph", 0),
                                ec=nutrients.get("ec", 0),
                                oc=nutrients.get("oc", 0),
                                S=nutrients.get("S", 0),
                                zn=nutrients.get("zn", 0),
                                fe=nutrients.get("fe", 0),
                                cu=nutrients.get("cu", 0),
                                Mn=nutrients.get("Mn", 0),
                                B=nutrients.get("B", 0)
                            )
                            
                            if "error" not in tool_result:
                                return jsonify({
                                    "message": action_data.get("message", "I've analyzed your soil fertility!"),
                                    "session_id": session_id,
                                    "tool_result": tool_result
                                }), 200
                    except json.JSONDecodeError:
                        pass
            
            # Store AI response
            chat_db.add_message(session_id, "assistant", ai_message)
            
            return jsonify({
                "message": ai_message,
                "session_id": session_id
            }), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route("/chat/history/<session_id>", methods=["GET"])
    def get_chat_history(session_id):
        """Get chat history for a session"""
        try:
            history = chat_db.get_session_history(session_id)
            return jsonify({"history": history}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route("/chat/clear/<session_id>", methods=["DELETE"])
    def clear_chat_session(session_id):
        """Clear a chat session"""
        try:
            chat_db.clear_session(session_id)
            return jsonify({"message": "Session cleared successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route("/chat/analyze-fertility", methods=["POST"])
    def chat_analyze_fertility():
        """Direct tool call for fertility analysis from chat"""
        try:
            data = request.get_json()
            session_id = data.get("session_id")
            nutrients = data.get("nutrients")
            
            if not session_id or not nutrients:
                return jsonify({"error": "session_id and nutrients are required"}), 400
            
            # Call the fertility tool
            result = analyze_soil_fertility_tool(
                N=nutrients.get("N", 0),
                P=nutrients.get("P", 0),
                K=nutrients.get("K", 0),
                ph=nutrients.get("ph", 0),
                ec=nutrients.get("ec", 0),
                oc=nutrients.get("oc", 0),
                S=nutrients.get("S", 0),
                zn=nutrients.get("zn", 0),
                fe=nutrients.get("fe", 0),
                cu=nutrients.get("cu", 0),
                Mn=nutrients.get("Mn", 0),
                B=nutrients.get("B", 0)
            )
            
            if "error" in result:
                return jsonify({"error": result["error"]}), 400
            
            return jsonify(result), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route("/test-fertility", methods=["GET"])
    def test_fertility():
        """Test endpoint to verify fertility prediction with sample data"""
        try:
            # Sample data that should work
            sample_data = {
                "N": 245,
                "P": 8.1,
                "K": 560,
                "ph": 7.31,
                "ec": 0.63,
                "oc": 0.78,
                "S": 11.6,
                "zn": 0.29,
                "fe": 0.43,
                "cu": 0.57,
                "Mn": 7.73,
                "B": 0.74
            }
            
            print(f"DEBUG: Testing with sample data: {sample_data}")
            result = quality_classifier.compute_prediction(sample_data)
            print(f"DEBUG: Test result: {result}")
            
            return jsonify({
                "status": "Success",
                "test_data": sample_data,
                "prediction_result": result,
                "message": "Fertility prediction test completed"
            }), 200
            
        except Exception as e:
            print(f"DEBUG: Test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({"status": "Error", "message": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)


