from pydantic import BaseModel
from typing import Optional, Any, List, Literal

from app.features.agent.type import AgentMode


class BaseChatRequest(BaseModel):
    """Base schema for chat requests."""
    message: str


class ChatRequest(BaseChatRequest):
    """Request schema for continuing a chat."""
    message: str
    mode: Optional[AgentMode] = None


class InitChatRequest(BaseChatRequest):
    """Request schema for starting a new chat."""
    message: Optional[str] = None
    mode: Optional[AgentMode] = AgentMode.BASIC


class ChatMessage(BaseModel):
    """Individual message in a conversation."""
    role: Literal["human", "ai", "system"]
    content: str


class ChatResponse(BaseModel):
    """Response schema for chat interactions."""
    thread_id: str
    messages: List[ChatMessage]
    topic: Optional[str] = None
    learning_path_json: Optional[Any] = None
    learning_path: Optional[Any] = None
