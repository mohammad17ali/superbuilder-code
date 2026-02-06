# SuperBuilder Chat - VS Code Extension

An AI-powered coding assistant VS Code extension that integrates with Intel Super Builder for intelligent chat capabilities.

## 🚀 Features

- **Chat Participant Interface**: Interact with AI directly in VS Code's chat panel
- **Real-time Streaming**: Get responses streamed in real-time from your backend
- **Backend Integration**: Seamlessly connects to your FastAPI backend running locally
- **Health Monitoring**: Check backend and LLM status with `/status` command

## 📋 Prerequisites

Before setting up the extension, ensure you have:

1. **VS Code**: Version 1.85 or higher
2. **Node.js**: Version 18 or higher
3. **npm**: Comes with Node.js
4. **Backend Running**: Your FastAPI backend must be running on `http://localhost:8003`

## 🛠️ Development Setup

### 1. Install Dependencies

```bash
cd supercode
npm install
```

This will install:
- TypeScript compiler
- VS Code extension API types
- ESLint for code quality
- Testing utilities

### 2. Compile TypeScript

```bash
# One-time compilation
npm run compile

# Watch mode (automatically recompiles on file changes)
npm run watch
```

The compiled JavaScript files will be in the `out/` directory.

### 3. Start Your Backend

Make sure your FastAPI backend is running:

```bash
cd ../backend
# Activate your Python environment if needed
python main.py
```

The backend should be accessible at `http://localhost:8003`.

## 🧪 Testing the Extension

### Method 1: Press F5 (Recommended)

1. Open the `supercode/` folder in VS Code
2. Press **F5** (or Run → Start Debugging)
3. A new "Extension Development Host" window will open
4. In the new window:
   - Press **Ctrl+Alt+I** (Windows/Linux) or **Cmd+Alt+I** (Mac) to open the chat panel
   - Type `@superbuilder` followed by your question
   - Example: `@superbuilder hello, can you help me with Python?`

### Method 2: Manual Launch

1. Compile the extension: `npm run compile`
2. Press **Ctrl+Shift+P** (Cmd+Shift+P on Mac)
3. Type "Developer: Show Running Extensions"
4. Look for "SuperBuilder Chat" in the list

## 📝 Using the Extension

### Basic Chat

Open the chat panel and use the `@superbuilder` participant:

```
@superbuilder How do I create a REST API in Python?
```

### Commands

- `/help` - Show available commands
- `/status` - Check backend connection and LLM status

### Check Backend Status

From the Command Palette (Ctrl+Shift+P):
```
SuperBuilder: Check Backend Status
```

## 🔧 Configuration

### Changing Backend URL

Edit [src/extension.ts](src/extension.ts#L5):

```typescript
const BACKEND_URL = 'http://localhost:8003';  // Change port if needed
```

### Extension Settings

The extension is configured in [package.json](package.json):

- **Chat Participant ID**: `superbuilder-chat.assistant`
- **Display Name**: `@superbuilder`
- **Activation**: Starts on VS Code startup

## 📁 Project Structure

```
supercode/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── backendClient.ts      # HTTP client for backend API
├── out/                      # Compiled JavaScript (generated)
├── .vscode/
│   ├── launch.json           # Debug configuration
│   ├── tasks.json            # Build tasks
│   └── extensions.json       # Recommended extensions
└── media/
    └── icon.svg              # Extension icon
```

## 🐛 Troubleshooting

### Extension Not Activating

1. Check the Debug Console for errors
2. Ensure TypeScript compiled successfully: `npm run compile`
3. Look for errors in Output → Extension Host

### Backend Connection Failed

**Error**: "⚠️ SuperBuilder backend not available"

**Solutions**:
1. Verify backend is running: `curl http://localhost:8003/health`
2. Check if port 8003 is correct
3. Review backend logs for errors
4. Run `/status` command in chat to get detailed info

### Chat Responses Not Streaming

1. Check backend logs for errors
2. Verify LLM is loaded: `/status` command
3. Test backend directly:
   ```bash
   curl -X POST http://localhost:8003/chat \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello", "name": "Test"}'
   ```

### TypeScript Compilation Errors

```bash
# Clean and rebuild
rm -rf out/
npm run compile
```

## 🔒 Permissions Required

The extension requires these VS Code API permissions:

- **`vscode.chat`**: To create chat participants
- **`vscode.window`**: For showing notifications
- **`vscode.commands`**: To register commands

These are automatically granted for local development. No special setup needed!

## 📦 Building for Distribution

To package the extension for distribution:

```bash
# Install vsce (VS Code Extension Manager)
npm install -g @vscode/vsce

# Package the extension
vsce package
```

This creates a `.vsix` file you can install in VS Code or publish to the marketplace.

## 🚀 Next Steps

Now that you have basic chat working, you can:

1. **Add Context Awareness**: Send file contents, workspace info to backend
2. **Implement Code Actions**: Add commands for code explanation, refactoring
3. **Enhance UI**: Add progress indicators, error handling
4. **Add Telemetry**: Track usage and errors
5. **Improve Streaming**: Handle partial markdown rendering

## 📚 Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Chat Extension Guide](https://code.visualstudio.com/api/extension-guides/chat)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)

## 🤝 Development Workflow

1. Make changes to TypeScript files in `src/`
2. Compile: `npm run compile` (or use watch mode)
3. Press F5 to test
4. Iterate!

For continuous development, keep `npm run watch` running in a terminal - it will automatically recompile when you save files.

---

**Happy Coding! 🎉**
