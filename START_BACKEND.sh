#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Soil Analysis Backend${NC}"
echo ""

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${RED}❌ GEMINI_API_KEY is not set!${NC}"
    echo ""
    echo -e "${YELLOW}Please get your API key from: https://aistudio.google.com/app/apikey${NC}"
    echo ""
    echo -e "${GREEN}Then run:${NC}"
    echo "  export GEMINI_API_KEY='your-api-key-here'"
    echo "  ./START_BACKEND.sh"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ GEMINI_API_KEY is set${NC}"
echo ""

# Kill any existing process on port 5000
echo -e "${YELLOW}Cleaning up port 5000...${NC}"
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 1

# Start the backend
echo -e "${GREEN}Starting Flask backend...${NC}"
echo ""
cd "$(dirname "$0")"
python3 app.py

