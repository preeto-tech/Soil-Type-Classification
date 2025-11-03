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
        # JSON to pandas DataFrame
        input_data = pd.DataFrame(input_data, index=[0])
        
        # Apply log transformation (same as training preprocessing)
        transformed_data = input_data.apply(lambda x: np.log10(x) if np.issubdtype(x.dtype, np.number) else x)
        
        return transformed_data

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
    
    @app.route("/predict-fertility", methods=["POST"])
    def predict_fertility():
        """Endpoint for soil fertility prediction from nutrient data"""
        if quality_classifier is None:
            return jsonify({"status": "Error", "message": "Soil quality model not loaded"}), 500
            
        try:
            # Get JSON data from request
            data = request.get_json()
            
            # Validate input
            required_fields = ['N', 'P', 'K', 'ph', 'ec', 'oc', 'S', 'zn', 'fe', 'cu', 'Mn', 'B']
            for field in required_fields:
                if field not in data:
                    return jsonify({"status": "Error", "message": f"Missing field: {field}"}), 400
            
            # Make prediction
            result = quality_classifier.compute_prediction(data)
            
            if result["status"] == "Success":
                return jsonify(result), 200
            else:
                return jsonify(result), 400
                
        except Exception as e:
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
                
                # Build conversation context
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

Be friendly, helpful, and practical."""
                
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
                
                if not session_id or not user_message:
                    return jsonify({"error": "session_id and message are required"}), 400
                
                # Store user message
                chat_db.add_message(session_id, "user", user_message)
                
                # Get chat history for context
                history = chat_db.get_session_history(session_id, limit=10)
                
                # Build conversation context
                conversation_context = """You are an expert agricultural AI assistant specializing in soil analysis and farming. 
You help farmers understand soil types, fertility, and provide actionable farming advice. 
Be friendly, helpful, and practical in your responses. Keep answers concise but informative."""
                
                # Add recent history to context
                if len(history) > 1:
                    conversation_context += "\n\nRecent conversation:\n"
                    for msg in history[:-1]:
                        conversation_context += f"{msg['role'].capitalize()}: {msg['content']}\n"
                
                # Build conversation context for JSON requests
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
Be friendly, helpful, and practical."""

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

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)


