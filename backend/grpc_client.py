"""
gRPC Client for Intel Super Builder Service

This module handles all gRPC communication with the Intel AI Super Builder
middleware service running on localhost:5006.

For WSL users: Set SUPERBUILDER_GRPC_HOST environment variable to the Windows host IP.
"""
import logging
import grpc
import json
import os
import random
import string
from pathlib import Path
from typing import Optional, Iterator

from dotenv import load_dotenv

# Load environment variables from .env file (from project root)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# gRPC connection settings - configurable via environment variables or .env file
# WSL users should set SUPERBUILDER_GRPC_HOST to their Windows host IP (e.g., 172.19.48.1)
GRPC_HOST = os.environ.get("SUPERBUILDER_GRPC_HOST", "localhost")
GRPC_PORT = os.environ.get("SUPERBUILDER_GRPC_PORT", "5006")

# Import generated proto stubs
import sys
from pathlib import Path

# Add proto directory to path
proto_path = Path(__file__).parent / "proto"
sys.path.insert(0, str(proto_path))

try:
    import superbuilder_service_pb2 as sb
    import superbuilder_service_pb2_grpc as sbg
except ImportError as e:
    raise ImportError(
        f"Failed to import generated proto files. "
        f"Please run 'scripts/compile_proto.sh' first. Error: {e}"
    )

logger = logging.getLogger("uvicorn")


class SuperBuilderClient:
    """
    Client for communicating with Intel Super Builder service via gRPC.
    
    The service runs on localhost:5006 and provides LLM inference capabilities.
    
    For WSL users: Set SUPERBUILDER_GRPC_HOST environment variable to the Windows
    host IP (e.g., 172.19.48.1) to reach the service running on Windows.
    """
    
    def __init__(self, grpc_address: str = None):
        """
        Initialize the Super Builder gRPC client.
        
        Args:
            grpc_address: Address of the Super Builder service. 
                          If None, uses SUPERBUILDER_GRPC_HOST:SUPERBUILDER_GRPC_PORT
                          environment variables (defaults to localhost:5006).
        """
        if grpc_address is None:
            grpc_address = f"{GRPC_HOST}:{GRPC_PORT}"
        self.grpc_address = grpc_address
        self.channel: Optional[grpc.Channel] = None
        self.stub: Optional[sbg.SuperBuilderStub] = None
        self._connected = False
        
    def connect(self, timeout: int = 15) -> bool:
        """
        Establish connection to Super Builder service.
        
        Args:
            timeout: Connection timeout in seconds
            
        Returns:
            True if connection successful, False otherwise
        """
        try:
            logger.info(f"Connecting to Super Builder at {self.grpc_address}...")
            self.channel = grpc.insecure_channel(self.grpc_address)
            
            # Wait for channel to be ready
            grpc.channel_ready_future(self.channel).result(timeout=timeout)
            
            self.stub = sbg.SuperBuilderStub(self.channel)
            self._connected = True
            
            logger.info("✓ Connected to Super Builder service")
            return True
            
        except grpc.FutureTimeoutError:
            logger.error("✗ Connection timeout - Super Builder service may not be running")
            self._connected = False
            return False
            
        except grpc.RpcError as e:
            logger.error(f"✗ gRPC connection error: {e.details()}")
            self._connected = False
            return False
            
        except Exception as e:
            logger.error(f"✗ Unexpected connection error: {e}")
            self._connected = False
            return False
    
    def disconnect(self):
        """Gracefully disconnect from Super Builder service."""
        if self.stub and self._connected:
            try:
                self.stub.DisconnectClient(sb.DisconnectClientRequest())
                logger.info("Disconnected from Super Builder")
            except Exception as e:
                logger.warning(f"Error during disconnect: {e}")
        
        if self.channel:
            self.channel.close()
            self.channel = None
            
        self.stub = None
        self._connected = False
    
    def is_connected(self) -> bool:
        """Check if client is connected to the service."""
        return self._connected and self.stub is not None
    
    def check_health(self) -> dict:
        """
        Check health status of Super Builder middleware and LLM backend.
        
        Returns:
            Dictionary with health status information
        """
        if not self.is_connected():
            return {
                "connected": False,
                "middleware_ready": False,
                "llm_ready": False,
                "message": "Not connected to Super Builder service"
            }
        
        try:
            # Check middleware
            response = self.stub.SayHello(sb.SayHelloRequest(name="FastAPI Client"))
            middleware_ready = bool(response.message)
            
            # Check LLM backend
            llm_response = self.stub.SayHelloPyllm(sb.SayHelloRequest(name="FastAPI Client"))
            llm_ready = llm_response.message == "ready"
            
            return {
                "connected": True,
                "middleware_ready": middleware_ready,
                "llm_ready": llm_ready,
                "message": "All systems operational" if llm_ready else "Models not loaded"
            }
            
        except grpc.RpcError as e:
            logger.error(f"Health check failed: {e.details()}")
            return {
                "connected": self._connected,
                "middleware_ready": False,
                "llm_ready": False,
                "message": f"Health check error: {e.details()}"
            }
    
    def load_models(self) -> bool:
        """
        Load LLM models into memory.
        
        This is a blocking call that loads model weights into NPU/GPU.
        Must be called before chatting.
        
        Returns:
            True if models loaded successfully
        """
        if not self.is_connected():
            logger.error("Cannot load models - not connected to service")
            return False
        
        try:
            logger.info("Loading models... (this may take a minute)")
            response = self.stub.LoadModels(sb.LoadModelsRequest())
            
            if response.status:
                logger.info("✓ Models loaded successfully")
                return True
            else:
                logger.error("✗ Model loading failed")
                return False
                
        except grpc.RpcError as e:
            logger.error(f"Model loading error: {e.details()}")
            return False
    
    def get_chat_history(self) -> list:
        """
        Retrieve chat history from the server.
        
        Returns:
            List of chat sessions
        """
        if not self.is_connected():
            return []
        
        try:
            response = self.stub.GetChatHistory(sb.GetChatHistoryRequest())
            return json.loads(response.data)
        except Exception as e:
            logger.error(f"Failed to get chat history: {e}")
            return []
    
    def generate_session_id(self) -> int:
        """
        Generate a unique random session ID.
        
        Returns:
            Unique 8-digit session ID
        """
        chat_history = self.get_chat_history()
        existing_ids = {session.get('sid') for session in chat_history if 'sid' in session}
        
        while True:
            new_id = ''.join(random.choices(string.digits, k=8))
            session_id = int(new_id)
            if session_id not in existing_ids:
                return session_id
    
    def chat(
        self,
        prompt: str,
        session_id: Optional[int] = None,
        name: str = "FastAPI Client"
    ) -> Iterator[str]:
        """
        Send chat message and stream the response.
        
        Args:
            prompt: The user's chat message
            session_id: Optional session ID for maintaining conversation history
            name: Client name for identification
            
        Yields:
            Streamed response chunks as strings
            
        Raises:
            grpc.RpcError: If gRPC call fails
        """
        if not self.is_connected():
            raise ConnectionError("Not connected to Super Builder service")
        
        # Generate session ID if not provided
        if session_id is None:
            session_id = self.generate_session_id()
        
        # Create chat request
        request = sb.ChatRequest(
            name=name,
            prompt=prompt,
            sessionId=session_id,
            attachedFiles=None  # No RAG files for simple chat
        )
        
        logger.info(f"Sending chat request - Session: {session_id}")
        logger.debug(f"Prompt: {prompt}")
        
        try:
            # Stream response from Super Builder
            response_stream = self.stub.Chat(request)
            
            for chunk in response_stream:
                if chunk.message:
                    yield chunk.message
                    
        except grpc.RpcError as e:
            logger.error(f"Chat error: {e.code()} - {e.details()}")
            raise
        
        logger.info(f"Chat completed - Session: {session_id}")
    
    def remove_session(self, session_id: int) -> bool:
        """
        Remove a chat session from the server.
        
        Args:
            session_id: The session ID to remove
            
        Returns:
            True if session removed successfully
        """
        if not self.is_connected():
            return False
        
        try:
            response = self.stub.RemoveSession(sb.RemoveSessionRequest(sessionId=session_id))
            return response.success
        except Exception as e:
            logger.error(f"Failed to remove session {session_id}: {e}")
            return False
    
    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()
