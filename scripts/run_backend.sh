#!/bin/bash

# Script to run the FastAPI backend server

set -e

echo "Starting FastAPI Backend..."
echo "=========================="

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Navigate to backend directory
cd backend

# Run the FastAPI server
echo "Starting server on http://localhost:8000"
echo "API docs available at http://localhost:8000/docs"
echo ""

python main.py
