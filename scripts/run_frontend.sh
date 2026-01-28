#!/bin/bash

# Script to run the Streamlit frontend

set -e

echo "Starting Streamlit Frontend..."
echo "=============================="

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Run Streamlit
echo "Starting Streamlit app..."
echo "App will open in your browser at http://localhost:8501"
echo ""

streamlit run frontend/app.py
