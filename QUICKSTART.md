# Quick Start Guide

Get up and running with Intel Super Builder Chat in 5 minutes!

## Prerequisites Check

Before starting, ensure you have:

- [ ] Intel AI Super Builder installed and running on Windows
- [ ] Python 3.8+ installed
- [ ] Git installed

## Step-by-Step Setup

### 1. Get the Code

```bash
cd /path/to/superbuilder-app
```

### 2. Run Setup

```bash
./scripts/setup.sh
```

This will:
- Create a Python virtual environment
- Install all dependencies
- Compile gRPC proto files

### 3. Start the Backend

Open a terminal and run:

```bash
./scripts/run_backend.sh
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
Connected to Super Builder service
Models loaded successfully
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 4. Start the Frontend

Open a **new terminal** and run:

```bash
./scripts/run_frontend.sh
```

Your browser will open automatically to http://localhost:8501

### 5. Start Chatting!

1. Check the sidebar for system status (should be all green ✅)
2. Type a message in the chat input
3. Watch the AI respond in real-time!

## Verification

### Check Backend Health

```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "superbuilder_connected": true,
  "llm_ready": true,
  "message": "All systems operational"
}
```

### Test Chat API

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, who are you?"}'
```

## Common Issues

### "Cannot connect to Super Builder service"

**Solution:** 
1. Make sure Intel AI Super Builder is installed on Windows
2. Check that it's running (look for `IntelAiaService.exe` in Task Manager)
3. Verify it's listening on port 5006

### "LLM models not loaded"

**Solution:**
1. Wait 1-2 minutes for models to load
2. Check Super Builder UI - ensure models are selected
3. Try clicking "Reconnect" in the API docs: http://localhost:8000/docs

### "Proto files not found"

**Solution:**
```bash
./scripts/compile_proto.sh
```

## What's Next?

- Explore the API documentation: http://localhost:8000/docs
- Read the full README.md for architecture details
- Try different prompts and see the streaming responses!

## Need Help?

- Check the [Troubleshooting](README.md#troubleshooting) section
- Review [Intel Super Builder docs](https://aibuilder.intel.com)

---

**Happy Chatting! 🤖**
