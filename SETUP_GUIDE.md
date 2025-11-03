# Setup Guide - Soil Type Classification Application

## ⚠️ Important: Python Version Compatibility Issue

**Your current Python version is 3.14.0**, which is too new for TensorFlow. TensorFlow 2.16.1 (required by this project) does not have wheels built for Python 3.14 yet.

### Solutions

#### Option 1: Use Python 3.11 or 3.12 (Recommended)

1. **Install Python 3.11 or 3.12:**
   - Download from: https://www.python.org/downloads/
   - During installation, check "Add Python to PATH"

2. **Create a new virtual environment:**
   ```powershell
   python3.11 -m venv .venv
   # or
   python3.12 -m venv .venv
   ```

3. **Activate the virtual environment:**
   ```powershell
   .venv\Scripts\Activate.ps1
   ```

4. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

#### Option 2: Modify Requirements (Advanced)

If you want to try with Python 3.14, you can modify `requirements.txt` to use newer versions, but this may break compatibility:

```txt
tensorflow>=2.17.0  # If available for Python 3.14
```

**Note:** This may not work as TensorFlow support for Python 3.14 is not yet available.

## Current Status

### ✅ What's Installed
- Flask (backend framework)
- Flask-CORS
- NumPy, Pandas, Pillow
- Scikit-learn (for fertility analysis)
- Google GenAI (for chatbot)
- TensorFlow Hub
- **Frontend dependencies** (already installed)

### ❌ What's Missing
- **TensorFlow 2.16.1** - Cannot install on Python 3.14
- **tf-keras 2.16.0** - Depends on TensorFlow
- **opencv-python-headless** - May have compatibility issues

## Running the Servers

### Backend (Flask) - Port 5000

**If you have Python 3.11/3.12 with TensorFlow installed:**

```powershell
# Navigate to project root
cd "C:\Users\preet\OneDrive\Desktop\Workspace\Soil-Type-Classification"

# Activate virtual environment (if using one)
.venv\Scripts\Activate.ps1

# Start Flask server
python app.py
```

The server will start at: **http://localhost:5000**

**If TensorFlow is not installed:**
- The server may start but soil type classification will fail
- Fertility analysis should still work
- Chatbot should still work (if GEMINI_API_KEY is set)

### Frontend (Vite/React) - Port 5173

```powershell
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev
```

The frontend will start at: **http://localhost:5173**

## Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Soil Type Classification | ❌ Requires TensorFlow | Needs Python 3.11/3.12 |
| Fertility Analysis | ✅ Should work | Uses Random Forest (scikit-learn) |
| AI Chatbot | ✅ Should work | Requires GEMINI_API_KEY |

## Environment Variables

Create a `.env` file in the project root (optional):

```env
# Optional: For AI Chatbot
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Model paths (defaults work)
MODEL_PATH=./my_model.h5
PORT=5000
```

## Testing the Application

### Test Fertility Analysis (Should Work)
1. Open http://localhost:5173
2. Click "Fertility Analysis" tab
3. Click "Fill Sample Data"
4. Click "Analyze Soil Fertility"
5. Should see fertility prediction

### Test Soil Type Classification (Won't Work Without TensorFlow)
1. Open http://localhost:5173
2. Click "Soil Type Classification" tab
3. Upload an image
4. Will fail if TensorFlow is not installed

### Test Chatbot (Should Work with API Key)
1. Open http://localhost:5173
2. Click "AI Assistant" tab
3. Ask questions about soil or farming
4. Requires GEMINI_API_KEY in environment

## Troubleshooting

### Flask Server Won't Start
- Check if TensorFlow import fails
- Try commenting out TensorFlow imports temporarily
- Check if port 5000 is already in use

### Frontend Won't Connect to Backend
- Ensure Flask server is running on port 5000
- Check CORS settings in `app.py`
- Verify Vite proxy configuration in `frontend/vite.config.ts`

### Module Not Found Errors
- Ensure virtual environment is activated
- Install missing dependencies: `pip install <package>`

## Quick Start Commands

**Terminal 1 - Backend:**
```powershell
cd "C:\Users\preet\OneDrive\Desktop\Workspace\Soil-Type-Classification"
python app.py
```

**Terminal 2 - Frontend:**
```powershell
cd "C:\Users\preet\OneDrive\Desktop\Workspace\Soil-Type-Classification\frontend"
npm run dev
```

## Next Steps

1. **Install Python 3.11 or 3.12** (recommended)
2. **Set up virtual environment** with Python 3.11/3.12
3. **Install all dependencies** including TensorFlow
4. **Start both servers**
5. **Test all features**

---

**Note:** The application is designed to work with Python 3.11 or 3.12. Python 3.14 support will come when TensorFlow releases compatible wheels.


