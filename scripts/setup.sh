#!/bin/bash

# Setup script for Intel Super Builder Chat Application
# This script sets up the Python environment and compiles proto files

set -e  # Exit on error

echo "================================================"
echo "Intel Super Builder Chat App - Setup"
echo "================================================"

# Check Python version
echo -e "\n📋 Checking Python version..."
python_version=$(python3 --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Error: Python 3.8 or higher is required"
    exit 1
fi
echo "✅ Python $python_version found"

# Create virtual environment
echo -e "\n📦 Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "ℹ️  Virtual environment already exists"
fi

# Activate virtual environment
echo -e "\n🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo -e "\n⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo -e "\n📥 Installing dependencies..."
pip install -r requirements.txt

# Compile proto files
echo -e "\n🔨 Compiling gRPC proto files..."
./scripts/compile_proto.sh

echo -e "\n================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Ensure Intel AI Super Builder is running on Windows (localhost:5006)"
echo "  2. Activate the virtual environment: source venv/bin/activate"
echo "  3. Start the backend: cd backend && python main.py"
echo "  4. In a new terminal, start the frontend: streamlit run frontend/app.py"
echo ""
echo "Or use the provided run scripts:"
echo "  - ./scripts/run_backend.sh"
echo "  - ./scripts/run_frontend.sh"
echo ""
