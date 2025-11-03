# AgriSoil Intelligence - Advanced Soil Analysis Platform

An AI-powered web application that empowers farmers with instant soil analysis using machine learning. The platform offers two main features:

1. **Soil Type Classification** - Upload soil images to identify the soil type
2. **Soil Fertility Analysis** - Input nutrient data to assess soil fertility levels

## Features

### Soil Type Classifier
- Upload soil images for instant classification
- Identifies 5 soil types:
  - Black Soil
  - Cinder Soil
  - Laterite Soil
  - Peat Soil
  - Yellow Soil
- Provides confidence scores for predictions
- Real-time image preview
- Drag-and-drop support

### Fertility Analyzer
- Comprehensive nutrient analysis
- Analyzes 12 soil parameters:
  - Nitrogen (N), Phosphorous (P), Potassium (K)
  - pH, Electrical Conductivity (EC), Organic Carbon (OC)
  - Sulfur (S), Zinc (Zn), Iron (Fe), Copper (Cu), Manganese (Mn), Boron (B)
- Returns fertility classification:
  - Highly Fertile
  - Fertile
  - Less Fertile
- Sample data for testing
- Input validation and error handling

## Tech Stack

### Backend
- **Flask** - Python web framework
- **TensorFlow 2.16** - Deep learning for image classification
- **TensorFlow Hub** - Pre-trained model layers
- **Scikit-learn** - Random Forest classifier for fertility
- **Pandas & NumPy** - Data processing
- **Flask-CORS** - Cross-origin resource sharing

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Shadcn UI** - Component library
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animations
- **Lucide React** - Icon library
- **Axios** - HTTP client

## Project Structure

```
Soil-Type-Classification/
├── app.py                      # Flask backend with both ML models
├── my_model.h5                 # Soil type classification model (CNN)
├── random_forest_pkl.pkl       # Fertility prediction model
├── requirements.txt            # Python dependencies
├── sample.jpg                  # Sample soil image
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # Shadcn UI components
│   │   │   ├── SoilTypeClassifier.tsx
│   │   │   └── SoilFertilityAnalyzer.tsx
│   │   ├── lib/
│   │   │   └── utils.ts       # Utility functions
│   │   ├── App.tsx            # Main application
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
└── templates/
    └── index.html             # Old HTML template (legacy)
```

## Installation & Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Install Python dependencies:
```bash
pip install flask flask-cors tensorflow==2.16.1 tensorflow-hub==0.16.1 tf-keras numpy==1.26.4 Pillow pandas scikit-learn
```

2. Ensure model files exist:
   - `my_model.h5` (Soil type classification model)
   - `random_forest_pkl.pkl` (Fertility prediction model)

3. Start the Flask server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## API Endpoints

### Backend API

#### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "OK"
}
```

#### `POST /predict-type`
Classify soil type from image

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image file)

**Response:**
```json
{
  "predicted_index": 0,
  "predicted_label": "Black Soil",
  "confidence": 0.945632
}
```

#### `POST /predict-fertility`
Predict soil fertility from nutrient data

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
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
```

**Response:**
```json
{
  "status": "Success",
  "prediction": "Highly Fertile"
}
```

## Usage

### Soil Type Classification

1. Navigate to the "Soil Type Classification" tab
2. Click the upload area or drag an image
3. Preview the uploaded image
4. Click "Classify Soil Type"
5. View results with confidence score

### Fertility Analysis

1. Navigate to the "Fertility Analysis" tab
2. Enter soil nutrient values manually or click "Fill Sample Data"
3. Click "Analyze Soil Fertility"
4. View fertility classification and recommendations

## Model Details

### Soil Type Classification Model
- Architecture: MobileNetV2 with transfer learning
- Input: 224x224 RGB images
- Output: 5 soil type classes
- Framework: TensorFlow + TensorFlow Hub

### Fertility Prediction Model
- Algorithm: Random Forest Classifier
- Features: 12 soil nutrient parameters
- Preprocessing: Log10 transformation
- Output: 3 fertility levels

## Development

### Frontend Development

Build for production:
```bash
cd frontend
npm run build
```

Preview production build:
```bash
npm run preview
```

### Backend Development

Run with auto-reload:
```bash
python app.py
```

The Flask app runs in debug mode by default.

## Environment Variables

### Backend
- `MODEL_PATH` - Path to the .h5 model file (default: `./my_model.h5`)
- `PORT` - Port for Flask server (default: `5000`)

### Frontend
Vite proxy is configured to forward API requests to `http://localhost:5000`

## Design Principles

1. **Farmer-First UX** - Simple, intuitive interface designed for users without technical background
2. **No Emojis** - Professional design using icons from Lucide React instead
3. **Responsive** - Works seamlessly on desktop, tablet, and mobile devices
4. **Accessible** - Proper labels, ARIA attributes, and keyboard navigation
5. **Fast** - Optimized performance with code splitting and lazy loading
6. **Beautiful** - Modern gradients, smooth animations, and thoughtful spacing

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

This project is for educational and agricultural purposes.

## Contributing

Contributions are welcome! Please ensure:
- Code follows TypeScript best practices
- Components use Shadcn UI patterns
- Backend endpoints are properly documented
- All features are tested

## Acknowledgments

- Dataset: [Soil Types Dataset on Kaggle](https://www.kaggle.com/datasets/prasanshasatpathy/soil-types)
- MobileNetV2 architecture
- Shadcn UI component library
- The farming community for inspiration

---

Built with care for farmers worldwide. Powered by Machine Learning.

