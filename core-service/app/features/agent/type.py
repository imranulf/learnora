from enum import Enum
from typing_extensions import Annotated, TypedDict
from langgraph.graph import START, END, MessagesState, StateGraph
from langchain_core.messages import BaseMessage
from typing import Optional, Sequence
from langgraph.graph.message import add_messages


class AgentMode(Enum):
    """Enum to represent different modes of agent interaction."""
    BASIC = "basic"  # General chat conversation
    LPP = "lpp"  # Learning path planning


class AgentState(MessagesState):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    mode: Optional["AgentMode"] = None
