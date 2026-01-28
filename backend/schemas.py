"""
Pydantic schemas for FastAPI request/response validation
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    prompt: str = Field(..., description="The user's chat message")
    session_id: Optional[int] = Field(None, description="Optional session ID for maintaining conversation history")
    name: str = Field(default="FastAPI Client", description="Client name for identification")

    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "What can you help me with?",
                "session_id": None,
                "name": "FastAPI Client"
            }
        }


class ChatChunk(BaseModel):
    """Individual chunk from streaming chat response"""
    content: str = Field(..., description="Text content of the chunk")


class HealthResponse(BaseModel):
    """Response model for health check endpoint"""
    status: str = Field(..., description="Overall service status")
    superbuilder_connected: bool = Field(..., description="Whether connected to Super Builder service")
    llm_ready: bool = Field(default=False, description="Whether LLM models are loaded and ready")
    message: Optional[str] = Field(None, description="Additional status message")


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Additional error details")
