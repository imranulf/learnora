import uuid
import json
import re
from enum import Enum
from typing import Optional, List, Any
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from app.features.agent.learning_path_graph.learning_path_graph import learning_path_graph as graph
from app.features.agent.schemas import ChatResponse, ChatMessage
import logging
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from app.features.learning_path.service import LearningPathService
from app.features.learning_path.utils import parse_and_store_concepts
from app.features.learning_path import crud
from app.features.learning_path.schemas import LearningPathCreate
from app.features.users.models import User
from app.features.agent.type import AgentMode

logger = logging.getLogger(__name__)


class GraphStage(Enum):
    """Enum to represent different stages of graph invocation."""
    NEW_CONVERSATION = "new"
    RESUME_CONVERSATION = "resume"


class AgentService:
    """Service layer for agent graph interactions."""

    def __init__(self):
        self.learning_path_service = LearningPathService()

    def _determine_graph_stage(
        self, thread_id: Optional[str]
    ) -> tuple[GraphStage, str]:
        """Determine the graph stage based on thread_id."""
        if thread_id is None:
            return GraphStage.NEW_CONVERSATION, str(uuid.uuid4())
        else:
            return GraphStage.RESUME_CONVERSATION, thread_id

    async def invoke_graph(
        self,
        db: AsyncSession,
        user: User,
        message: str,
        thread_id: Optional[str] = None,
        mode: Optional[AgentMode] = None,
    ) -> ChatResponse:
        """
        Unified method to handle all graph interactions.

        Handles both new conversations and resuming existing ones.
        When the LPP pipeline completes (concept_graph generated),
        it saves the learning path to DB and KG.
        """
        state = {}
        state["mode"] = mode

        stage, resolved_thread_id = self._determine_graph_stage(thread_id)
        logger.info(f"{'Starting new' if stage == GraphStage.NEW_CONVERSATION else 'Resuming'} conversation: {resolved_thread_id}")

        config = {"configurable": {"thread_id": resolved_thread_id}}
        graph_state = graph.get_state(config)

        try:
            # Add message to state
            if message:
                if "messages" in state:
                    state["messages"].append(HumanMessage(content=message))
                else:
                    state["messages"] = [HumanMessage(content=message)]

            # Invoke graph based on stage
            if stage == GraphStage.RESUME_CONVERSATION:
                if graph_state.next:
                    # Resume from interrupt: as_node must be the interrupted node
                    # so invoke(None) continues to the NEXT node, not re-runs the interrupt
                    interrupted_node = graph_state.next[0]
                    logger.info(f"Resuming from interrupt at '{interrupted_node}' for thread {resolved_thread_id}")
                    graph.update_state(config, state, as_node=interrupted_node)
                    result = await asyncio.to_thread(graph.invoke, None, config)
                else:
                    result = await asyncio.to_thread(graph.invoke, state, config)
            else:
                result = await asyncio.to_thread(graph.invoke, state, config)

            # Get the final state from both invoke result and checkpointer
            state = graph.get_state(config)

            # Format messages
            formatted_messages = self._format_messages(result.get("messages", []))

            # Parse and save learning path if concept graph was generated
            # Use result (direct invoke output) as primary source, fall back to checkpointer state
            concept_graph = result.get('concept_graph') or state.values.get('concept_graph')
            if concept_graph:
                try:
                    topic = result.get('topic') or state.values.get('topic') or 'Untitled'
                    logger.info(f"Concept graph generated for thread {resolved_thread_id}, topic='{topic}', saving learning path...")
                    learning_path_create = LearningPathCreate(
                        conversation_thread_id=resolved_thread_id,
                        topic=topic,
                        user_id=user.id
                    )
                    await crud.create_learning_path(db, learning_path_create)

                    # Store concepts in KG
                    user_id_str = str(user.id)
                    await asyncio.to_thread(
                        parse_and_store_concepts,
                        user_id_str,
                        resolved_thread_id,
                        topic,
                        concept_graph,
                        self.learning_path_service.concept_service,
                        self.learning_path_service.create_learning_path_kg
                    )
                    logger.info(f"Saved learning path with {len(concept_graph)} concepts for thread {resolved_thread_id}")

                    # Reset state values after successful save
                    graph.update_state(config, {
                        "concept_graph": None,
                        "desired_outcome": None,
                        "context": None,
                        "topic": None,
                        "is_intention_clear": False,
                        "follow_up_count": 0,
                        "learning_goal": None,
                        "competencies": None,
                        "success_criteria": None
                    })
                except Exception as e:
                    logger.error(f"Error saving learning path for thread {resolved_thread_id}: {str(e)}")
                    raise

            return ChatResponse(
                thread_id=resolved_thread_id,
                messages=formatted_messages,
                topic=result.get('topic') or state.values.get('topic'),
                learning_path_json=concept_graph,
            )

        except Exception as e:
            logger.error(f"Error invoking graph for thread {resolved_thread_id}: {str(e)}")
            # Surface rate limit errors clearly
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower() or "ResourceExhausted" in error_str:
                raise ValueError(
                    "API rate limit reached. The free tier allows 20 requests/day. "
                    "Please wait or upgrade your Gemini API plan."
                )
            raise

    def get_conversation(self, thread_id: str) -> ChatResponse:
        """Retrieve conversation state without invoking the graph."""
        config = {"configurable": {"thread_id": thread_id}}

        try:
            state = graph.get_state(config)

            if not state or not state.values:
                raise ValueError(f"Thread {thread_id} not found")

            messages = state.values.get("messages", [])
            formatted_messages = self._format_messages(messages)

            return ChatResponse(
                thread_id=thread_id,
                messages=formatted_messages,
                topic=state.values.get('topic'),
            )

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error retrieving conversation {thread_id}: {str(e)}")
            raise

    def _format_messages(self, messages: List[BaseMessage]) -> List[ChatMessage]:
        """Convert LangChain messages to API schema format."""
        formatted = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                role = "human"
            elif isinstance(msg, AIMessage):
                role = "ai"
            elif isinstance(msg, SystemMessage):
                role = "system"
            else:
                role = "system"

            formatted.append(ChatMessage(
                role=role,
                content=msg.content
            ))

        return formatted
