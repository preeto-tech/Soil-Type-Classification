#!/bin/bash

echo "========================================="
echo "  AgriSoil Intelligence - Chatbot Setup"
echo "========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env 2>/dev/null || echo "GEMINI_API_KEY=" > .env
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

echo ""
echo "To enable the AI chatbot, you need a Gemini API key."
echo ""
echo "Steps:"
echo "1. Visit: https://makersuite.google.com/app/apikey"
echo "2. Sign in with your Google account"
echo "3. Click 'Create API Key'"
echo "4. Copy your API key"
echo ""
echo "Would you like to enter your API key now? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "Enter your Gemini API key:"
    read -r api_key
    
    if [ -z "$api_key" ]; then
        echo "❌ No API key provided. You can add it manually to .env file later."
    else
        # Update .env file
        if grep -q "GEMINI_API_KEY=" .env; then
            sed -i.bak "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$api_key/" .env && rm .env.bak
        else
            echo "GEMINI_API_KEY=$api_key" >> .env
        fi
        echo "✓ API key saved to .env file"
    fi
else
    echo ""
    echo "You can manually edit the .env file and add:"
    echo "GEMINI_API_KEY=your_api_key_here"
fi

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Make sure your API key is in .env file"
echo "2. Restart the backend: python3 app.py"
echo "3. Go to http://localhost:5174"
echo "4. Click 'AI Assistant' tab"
echo ""
echo "For more info, see CHATBOT_SETUP.md"
echo ""

