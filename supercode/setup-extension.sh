#!/bin/bash

# SuperBuilder Chat Extension - Setup Script
# This script sets up the development environment

set -e  # Exit on error

echo "=================================================="
echo "  SuperBuilder Chat Extension - Setup"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the supercode/ directory."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Compiling TypeScript..."
npm run compile

echo ""
echo "✅ Setup complete!"
echo ""
echo "=================================================="
echo "  Next Steps:"
echo "=================================================="
echo ""
echo "1. Start your backend (in another terminal):"
echo "   cd ../backend"
echo "   python main.py"
echo ""
echo "2. Test the extension:"
echo "   - Press F5 in VS Code"
echo "   - In the Extension Development Host window:"
echo "     - Press Ctrl+Alt+I (or Cmd+Alt+I on Mac)"
echo "     - Type: @superbuilder hello!"
echo ""
echo "3. For continuous development:"
echo "   npm run watch"
echo ""
echo "📖 See DEVELOPMENT.md for more details"
echo "=================================================="
