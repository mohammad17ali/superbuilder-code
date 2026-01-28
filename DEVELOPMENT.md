# Development Notes

## Architecture Overview

This application is a three-tier architecture:

```
Frontend (Streamlit) → Backend (FastAPI) → Super Builder Service (gRPC)
    Port 8501            Port 8000              Port 5006
```

## Key Design Decisions

### 1. Synchronous gRPC Client
- Using `grpc.insecure_channel` (not `grpc.aio`)
- Rationale: Simpler implementation, adequate for single-user app
- FastAPI handles async at the HTTP layer

### 2. Streaming Response
- Backend streams from gRPC to HTTP using `StreamingResponse`
- Frontend displays chunks in real-time using Streamlit's chat interface
- No buffering - true real-time streaming

### 3. Session Management
- Simple integer session IDs generated client-side
- Super Builder maintains conversation history server-side
- No persistent storage needed in our app

### 4. Error Handling
- Connection errors gracefully handled at each layer
- Health checks available via sidebar
- Manual reconnect option if service restarts

## Code Organization

### Backend (`backend/`)

**`main.py`**
- FastAPI application with lifespan management
- REST endpoints for chat, health, reconnect
- CORS enabled for cross-origin requests

**`grpc_client.py`**
- Wrapper around gRPC stub
- Connection management and health checks
- Chat streaming interface

**`schemas.py`**
- Pydantic models for request/response validation
- API documentation via type hints

**`proto/`**
- Protocol buffer definitions
- Generated Python stubs (compile with script)

### Frontend (`frontend/`)

**`app.py`**
- Streamlit single-page application
- Chat interface with message history
- Real-time health monitoring in sidebar
- Session state management

### Scripts (`scripts/`)

All helper scripts for common tasks:
- `setup.sh` - One-time environment setup
- `compile_proto.sh` - Regenerate gRPC stubs
- `run_backend.sh` - Start FastAPI server
- `run_frontend.sh` - Start Streamlit app

## API Flow

### Chat Request Flow

1. **User types message** in Streamlit
2. **Streamlit** sends POST to `/chat` with JSON body:
   ```json
   {
     "prompt": "user message",
     "session_id": 12345678,
     "name": "Streamlit Client"
   }
   ```
3. **FastAPI** validates request with Pydantic
4. **FastAPI** calls `sb_client.chat()` which:
   - Creates gRPC `ChatRequest`
   - Calls `stub.Chat(request)`
   - Yields response chunks
5. **FastAPI** streams chunks via `StreamingResponse`
6. **Streamlit** displays chunks with streaming cursor effect

### Health Check Flow

1. **Streamlit** sends GET to `/health`
2. **FastAPI** calls `sb_client.check_health()` which:
   - Calls `SayHello()` for middleware
   - Calls `SayHelloPyllm()` for LLM status
3. **FastAPI** returns structured health data
4. **Streamlit** updates status indicators in sidebar

## Important Lifecycle Details

### Super Builder Service Lifecycle

The Super Builder service requires this sequence:

1. **Connect** - Establish gRPC channel
2. **Health Check** - Verify middleware is responsive
3. **Load Models** - One-time blocking call to load weights into NPU
4. **Chat** - Can now send chat requests

Our app handles this in the FastAPI lifespan:
- Connect on startup
- Load models if not already loaded
- Keep connection alive
- Disconnect on shutdown

### When Models Need Reloading

Models need to be loaded if:
- Super Builder service was restarted
- Models were changed in Super Builder UI
- `LoadModels()` wasn't called yet

Our app automatically attempts to load models in these situations.

## Platform Considerations

### Cross-Platform Development

**Developing on Linux:**
- FastAPI backend is fully platform-agnostic
- gRPC communication works identically on Linux/Windows
- Proto file compilation works the same

**Running on Windows:**
- Super Builder service only runs on Windows
- Port 5006 must be accessible
- Can develop on Linux and SSH tunnel if needed:
  ```bash
  ssh -L 5006:localhost:5006 windows-machine
  ```

### Port Forwarding for Remote Development

If developing on Linux and testing against Windows:

```bash
# On Linux development machine
ssh -L 5006:localhost:5006 user@windows-machine

# Now your Linux machine can access Super Builder on localhost:5006
```

## Extending the Application

### Adding RAG Support

To add document upload and RAG:

1. Add endpoint in `backend/main.py`:
   ```python
   @app.post("/upload")
   async def upload_files(files: List[UploadFile]):
       # Call sb_client.upload_files()
   ```

2. Add method in `grpc_client.py`:
   ```python
   def upload_files(self, file_paths: List[str]):
       request = sb.AddFilesRequest(filesToUpload=json.dumps(file_paths))
       for response in self.stub.AddFiles(request):
           yield response
   ```

3. Add UI in `frontend/app.py`:
   ```python
   uploaded_files = st.file_uploader("Upload documents", accept_multiple_files=True)
   ```

### Adding Specialized Workflows

For workflows like summarization, image query, etc:

1. Import prompt options in `grpc_client.py`
2. Add workflow parameter to `chat()` method
3. Create `PromptOptions` with the desired workflow
4. Update frontend with workflow selector

Example:
```python
prompt_options = sb.PromptOptions(
    summarizePrompt=sb.PromptOptions.SummarizePrompt()
)
```

## Testing

### Backend Testing

```bash
# Health check
curl http://localhost:8000/health

# Chat (simple)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello!"}'

# Interactive API docs
open http://localhost:8000/docs
```

### Frontend Testing

1. Start backend
2. Start frontend
3. Check sidebar status indicators
4. Send test messages
5. Verify streaming works

### gRPC Testing

For direct gRPC testing, use the examples in:
`/user-ali/intel-ai-super-builder/example/python/`

## Common Development Tasks

### Updating Proto Definitions

If Intel releases new Super Builder version with updated proto:

1. Copy new proto file to `backend/proto/`
2. Run `./scripts/compile_proto.sh`
3. Update `grpc_client.py` if new methods added
4. Update schemas if new message types

### Adding Logging

Add to any module:
```python
import logging
logger = logging.getLogger("uvicorn")

logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
```

### Debugging gRPC

Enable gRPC debug logging:
```python
import os
os.environ['GRPC_VERBOSITY'] = 'DEBUG'
os.environ['GRPC_TRACE'] = 'all'
```

## Performance Considerations

### Streaming Performance

- No buffering in FastAPI → immediate streaming
- Streamlit updates UI on each chunk
- Network latency minimal (localhost)

### Model Loading Time

- First `LoadModels()` call: 30-60 seconds
- Subsequent chats: instant
- Models stay loaded until service restart

### Memory Usage

- FastAPI backend: ~50MB
- Streamlit frontend: ~100MB
- Super Builder service: 2-8GB (depends on model)

## Security Notes

### For Production Use

Current implementation is for **local development only**. For production:

1. **Add Authentication**
   - Use OAuth2 with FastAPI
   - Protect all endpoints

2. **Enable HTTPS**
   - Use TLS for FastAPI
   - Get proper certificates

3. **Restrict CORS**
   - Change `allow_origins=["*"]` to specific domains

4. **Add Rate Limiting**
   - Prevent abuse of chat endpoint

5. **Secure Logging**
   - Don't log sensitive user data
   - Rotate logs regularly

### Current Security Model

- All communication over localhost
- No authentication required
- Assumes trusted single-user environment
- Data never leaves the machine

## Troubleshooting Tips

### Proto Import Errors

If you see: `ModuleNotFoundError: No module named 'superbuilder_service_pb2'`

**Solution:**
```bash
cd /user-ali/superbuilder-app
./scripts/compile_proto.sh
```

### gRPC Connection Timeouts

If connection takes too long:

1. Increase timeout in `grpc_client.py`:
   ```python
   def connect(self, timeout: int = 30):  # Increase from 15
   ```

2. Check Windows firewall settings

### Streamlit Won't Connect to Backend

Check these in order:
1. Is backend running? `curl http://localhost:8000/health`
2. Is port 8000 open? `netstat -an | grep 8000`
3. Is firewall blocking? Temporarily disable to test

## Future Enhancements

Potential features to add:

1. **Multi-model Support**
   - Switch between different LLMs
   - Compare responses side-by-side

2. **Conversation Management**
   - Save/load chat sessions
   - Export conversations

3. **RAG Integration**
   - Document upload
   - Knowledge base management
   - Citation display

4. **Advanced Workflows**
   - Image analysis
   - Document summarization
   - Resume scoring

5. **Analytics**
   - Token usage tracking
   - Response time metrics
   - Model performance stats

## Contributing

When contributing:

1. Follow existing code style
2. Add docstrings to new functions
3. Update README if adding features
4. Test on both Linux and Windows if possible
5. Add logging for important events

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Streamlit Documentation](https://docs.streamlit.io/)
- [gRPC Python Guide](https://grpc.io/docs/languages/python/)
- [Intel Super Builder](https://aibuilder.intel.com/)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)

---

**Last Updated:** January 28, 2026
