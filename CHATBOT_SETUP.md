# AI Chatbot Setup Guide

## Overview

Your AgriSoil Intelligence platform now includes an AI-powered chatbot using Google's Gemini AI. The chatbot can answer questions about soil, crops, and farming while maintaining conversation history using SQLite.

## Features

- Real-time chat with Gemini AI
- Conversation history stored in SQLite
- Context-aware responses using chat history
- Beautiful UI with message animations
- Clear chat functionality
- Session management

## Setup Instructions

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variable

**Option A: Using .env file (Recommended)**

1. Create a `.env` file in the project root:
```bash
cd /Users/achintya/Downloads/Soil-Type-Classification
touch .env
```

2. Add your API key to `.env`:
```
GEMINI_API_KEY=your_actual_api_key_here
```

**Option B: Export in Terminal**

```bash
export GEMINI_API_KEY="your_actual_api_key_here"
```

### 3. Install python-dotenv (Optional, for .env file support)

```bash
pip install python-dotenv
```

Then add this to the top of `app.py`:
```python
from dotenv import load_dotenv
load_dotenv()
```

### 4. Restart Backend Server

```bash
cd /Users/achintya/Downloads/Soil-Type-Classification
python3 app.py
```

You should see:
```
Gemini AI initialized successfully
```

## Usage

### Access the Chatbot

1. Open http://localhost:5174
2. Click the **"AI Assistant"** tab
3. Start chatting!

### Example Questions

- "What is black soil good for?"
- "How can I improve soil fertility?"
- "What crops grow best in laterite soil?"
- "What are the signs of nitrogen deficiency?"
- "How do I test soil pH at home?"

## Database

Chat history is automatically stored in `chat_history.db` (SQLite database).

### Database Schema

**sessions table:**
- session_id (TEXT, PRIMARY KEY)
- created_at (TIMESTAMP)
- last_activity (TIMESTAMP)

**messages table:**
- id (INTEGER, PRIMARY KEY)
- session_id (TEXT, FOREIGN KEY)
- role (TEXT: "user" or "assistant")
- content (TEXT)
- timestamp (TIMESTAMP)

### View Chat History

```bash
sqlite3 chat_history.db "SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10;"
```

### Clear All Chat Data

```bash
rm chat_history.db
```

The database will be recreated automatically on next chat.

## API Endpoints

### POST /chat/session
Create a new chat session.

**Response:**
```json
{
  "session_id": "uuid-here"
}
```

### POST /chat/message
Send a message and get AI response.

**Request:**
```json
{
  "session_id": "uuid-here",
  "message": "What is black soil?"
}
```

**Response:**
```json
{
  "message": "AI response here",
  "session_id": "uuid-here"
}
```

### GET /chat/history/<session_id>
Get chat history for a session.

**Response:**
```json
{
  "history": [
    {
      "role": "user",
      "content": "What is black soil?",
      "timestamp": "2025-11-03 20:00:00"
    },
    {
      "role": "assistant",
      "content": "Black soil is...",
      "timestamp": "2025-11-03 20:00:01"
    }
  ]
}
```

### DELETE /chat/clear/<session_id>
Clear a chat session.

**Response:**
```json
{
  "message": "Session cleared successfully"
}
```

## Troubleshooting

### "Chatbot service not available" Error

**Cause:** GEMINI_API_KEY is not set or invalid.

**Solution:**
1. Check if `.env` file exists with valid API key
2. Or export the key in terminal before running the app
3. Verify the API key at Google AI Studio

### No Response from Chatbot

**Possible causes:**
- Network connectivity issues
- API quota exceeded (free tier has limits)
- Invalid API key

**Solution:**
- Check backend terminal for error messages
- Verify your API key is active
- Check Gemini API quota at Google AI Studio

### Database Errors

**Cause:** Permission issues or corrupted database.

**Solution:**
```bash
rm chat_history.db
python3 app.py  # Will recreate the database
```

## Customization

### Change AI Personality

Edit the `conversation_context` in `app.py` (line 217):

```python
conversation_context = """You are an expert agricultural AI assistant specializing in soil analysis and farming. 
You help farmers understand soil types, fertility, and provide actionable farming advice. 
Be friendly, helpful, and practical in your responses. Keep answers concise but informative."""
```

### Adjust Chat History Length

Change the `limit` parameter in `app.py` (line 214):

```python
history = chat_db.get_session_history(session_id, limit=10)  # Change 10 to desired number
```

### Modify UI Colors

Edit `frontend/src/components/ChatBot.tsx` to change colors:

```tsx
className="bg-primary text-primary-foreground"  // User messages
className="bg-muted"  // AI messages
```

## Cost Information

**Gemini API Pricing (as of 2025):**
- **Free Tier:** 60 requests per minute
- **Pro Tier:** Higher limits with paid account

The free tier is sufficient for most development and small-scale use.

Check current pricing: https://ai.google.dev/pricing

## Security Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Don't share your API key** - Treat it like a password
3. **Rotate keys regularly** - Generate new keys periodically
4. **Use environment variables** - Don't hardcode API keys

## Features Coming Soon

- [ ] File upload in chat (image analysis)
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Export chat history
- [ ] Custom AI models
- [ ] Chat analytics

---

**Need help?** Check the [PROJECT_README.md](PROJECT_README.md) for more information.

