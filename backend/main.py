import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import grpc

from schemas import ChatRequest, ChatChunk, HealthResponse, ErrorResponse
from grpc_client import SuperBuilderClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("uvicorn")

# Global gRPC client instance
sb_client: SuperBuilderClient = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Handles startup and shutdown events.
    """
    global sb_client
    
    # Startup
    logger.info("=" * 60)
    logger.info("Starting Intel Super Builder Chat Backend")
    logger.info("=" * 60)
    
    sb_client = SuperBuilderClient()
    
    # Try to connect to Super Builder
    connected = sb_client.connect()
    if not connected:
        logger.warning(
            "⚠️  Failed to connect to Super Builder service on startup.\n"
            "   Make sure Intel AI Super Builder service is running on localhost:5006"
        )
    else:
        # Try to load models
        models_loaded = sb_client.load_models()
        if not models_loaded:
            logger.warning("⚠️  Models not loaded. Chat may not work until models are ready.")
    
    logger.info("FastAPI backend is ready")
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    if sb_client:
        sb_client.disconnect()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Intel Super Builder Chat API",
    description="REST API interface for Intel AI Super Builder chat functionality",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware to allow Streamlit frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API information"""
    return {
        "name": "Intel Super Builder Chat API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Check service health status"
)
async def health_check():
    """
    Check the health status of the Super Builder service and LLM models.
    
    Returns:
        HealthResponse with connection and readiness status
    """
    if not sb_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Super Builder client not initialized"
        )
    
    health_status = sb_client.check_health()
    
    return HealthResponse(
        status="healthy" if health_status["llm_ready"] else "degraded",
        superbuilder_connected=health_status["connected"],
        llm_ready=health_status["llm_ready"],
        message=health_status["message"]
    )


@app.post(
    "/chat",
    response_class=StreamingResponse,
    tags=["Chat"],
    summary="Send chat message and stream response"
)
async def chat(request: ChatRequest):
    """
    Send a chat message to the LLM and stream the response back.
    
    Args:
        request: ChatRequest containing the prompt and optional session_id
    
    Returns:
        StreamingResponse with text/event-stream content type
        
    Raises:
        HTTPException: If service is unavailable or chat fails
    """
    if not sb_client or not sb_client.is_connected():
        # Try to reconnect
        if sb_client:
            connected = sb_client.connect()
            if not connected:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Cannot connect to Super Builder service. Please ensure Intel AI Super Builder is running on localhost:5006"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Super Builder client not initialized"
            )
    
    # Check if LLM is ready
    health = sb_client.check_health()
    if not health["llm_ready"]:
        logger.warning("LLM not ready, attempting to load models...")
        loaded = sb_client.load_models()
        if not loaded:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM models not loaded. Please wait and try again."
            )
    
    async def generate_response() -> AsyncIterator[str]:
        """
        Generator function to stream chat response.
        
        Yields:
            Text chunks from the LLM response
        """
        try:
            logger.info(f"Processing chat request: '{request.prompt[:50]}...'")
            
            for chunk in sb_client.chat(
                prompt=request.prompt,
                session_id=request.session_id,
                name=request.name
            ):
                # Stream each chunk as plain text
                yield chunk
                
        except grpc.RpcError as e:
            error_msg = f"gRPC Error: {e.code()} - {e.details()}"
            logger.error(error_msg)
            yield f"\n\n[ERROR] {error_msg}"
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            yield f"\n\n[ERROR] {error_msg}"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/plain"
    )


@app.post(
    "/reconnect",
    tags=["Admin"],
    summary="Reconnect to Super Builder service"
)
async def reconnect():
    """
    Manually trigger reconnection to Super Builder service.
    Useful if the service was started after this API.
    
    Returns:
        Connection status
    """
    if not sb_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Client not initialized"
        )
    
    # Disconnect if already connected
    if sb_client.is_connected():
        sb_client.disconnect()
    
    # Reconnect
    connected = sb_client.connect()
    
    if connected:
        # Try to load models
        models_loaded = sb_client.load_models()
        return {
            "status": "connected",
            "models_loaded": models_loaded,
            "message": "Successfully reconnected to Super Builder service"
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to reconnect to Super Builder service"
        )


if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting development server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    )
