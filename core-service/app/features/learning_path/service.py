from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4
from langchain_core.messages import HumanMessage, AIMessage
from rdflib import Graph as RDFGraph, URIRef
from typing import Optional
from app.features.learning_path import crud
from app.features.learning_path.schemas import (
    LearningPathCreate,
    LearningPathUpdate,
    GraphResponse
)
from app.features.learning_path.kg import LearningPathKG
from app.features.concept.service import ConceptService
from app.features.learning_path.utils import (
    extract_json_array_from_message,
    extract_json_from_message,
    parse_and_store_concepts
)
import logging
import asyncio

from app.features import learning_path

logger = logging.getLogger(__name__)

# Timeout configuration for LangGraph operations (in seconds)
LANGGRAPH_INVOKE_TIMEOUT = 120  # 2 minutes for graph invocation


class LearningPathService:
    """Service layer for learning path operations with business logic."""
    
    def __init__(self):
        """Initialize learning path service with KG layer."""
        self.kg = LearningPathKG()
        self.concept_service = ConceptService()
        self._graph = None  # Lazy load the LangGraph
    
    @property
    def graph(self):
        """Lazy load the LangGraph to avoid initialization during testing."""
        if self._graph is None:
            from app.features.learning_path.graph import graph
            self._graph = graph
        return self._graph
    
    # ===== Knowledge Graph Operations =====
    
    def create_learning_path_kg(
        self,
        user_id: str,
        thread_id: str,
        topic: str,
        concept_ids: list[str]
    ) -> URIRef:
        """
        Create a new learning path in the Knowledge Graph.
        
        Business logic: Validates path doesn't exist, validates concepts exist.
        
        Args:
            user_id: User identifier who owns this learning path
            thread_id: Unique thread identifier
            topic: The learning topic/goal
            concept_ids: List of concept IDs to include in the path
            
        Returns:
            URIRef of the created learning path
        """
        # Business validation: check if path already exists
        if self.kg.path_exists(user_id, thread_id):
            logger.warning(f"Learning path {thread_id} already exists for user {user_id}")
            # Could raise an exception or return existing path depending on requirements
        
        # Delegate to KG layer
        path = self.kg.create_path(user_id, thread_id, topic, concept_ids)
        logger.info(f"Created learning path: {thread_id} for user {user_id} with {len(concept_ids)} concepts")
        return path
    
    def get_learning_path_kg(self, user_id: str, thread_id: str) -> Optional[RDFGraph]:
        """
        Get a learning path graph from KG.
        
        Args:
            user_id: User identifier who owns the path
            thread_id: The thread identifier
            
        Returns:
            RDFGraph containing the learning path, or empty graph if not found
        """
        return self.kg.get_path(user_id, thread_id)
    
    def get_learning_path_concepts(self, user_id: str, thread_id: str) -> list[URIRef]:
        """
        Get all concepts in a learning path from KG.
        
        Args:
            user_id: User identifier who owns the path
            thread_id: The thread identifier
            
        Returns:
            List of concept URIRefs in the learning path
        """
        return self.kg.get_path_concepts(user_id, thread_id)
    
    async def get_learning_path_kg_info(self, db: AsyncSession, thread_id: str) -> Optional[dict]:
        """
        Get knowledge graph information for a learning path in API-friendly format.
        
        Args:
            db: Database session
            thread_id: The conversation thread identifier
            
        Returns:
            Dictionary with learning path KG info or None if not found
        """
        # Get from database
        db_path = await crud.get_learning_path_by_thread_id(db, thread_id)
        if not db_path:
            return None
        
        # Get user_id from database record
        user_id = str(db_path.user_id)
        
        # Check if KG data exists
        if not self.kg.path_exists(user_id, thread_id):
            return {
                "thread_id": thread_id,
                "topic": db_path.topic,
                "concepts": [],
                "concept_count": 0
            }
        
        # Get concepts from KG
        concept_uris = await asyncio.to_thread(self.get_learning_path_concepts, user_id, thread_id)
        
        # Format concept information
        concepts_info = []
        for concept_uri in concept_uris:
            concept_id = str(concept_uri).split("#")[-1]
            
            # Get prerequisites
            prereq_uris = await asyncio.to_thread(
                self.concept_service.get_concept_prerequisites,
                concept_id
            )
            prereq_ids = [str(p).split("#")[-1] for p in prereq_uris]
            
            concepts_info.append({
                "id": concept_id,
                "label": concept_id.replace("_", " ").title(),
                "prerequisites": prereq_ids
            })
        
        return {
            "thread_id": thread_id,
            "topic": db_path.topic,
            "concepts": concepts_info,
            "concept_count": len(concepts_info)
        }
    
    # ===== LangGraph Operations =====
    
    async def start_learning_path(self, db: AsyncSession, topic: str, user_id: int) -> GraphResponse:
        """Start a new learning path

        Args:
            db: Database session
            topic: Learning topic
            user_id: User ID (integer from authenticated user)
        """
        # Generate unique thread ID for the conversation
        conversation_thread_id = str(uuid4())
        config = {"configurable": {"thread_id": conversation_thread_id}}
        initial_state = {"topic": topic}

        # Save to database (async)
        learning_path_create = LearningPathCreate(
            conversation_thread_id=conversation_thread_id,
            topic=topic,
            user_id=user_id
        )
        await crud.create_learning_path(db, learning_path_create)

        # Run graph with timeout (sync code - run in thread pool to avoid blocking)
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self.graph.invoke, initial_state, config),
                timeout=LANGGRAPH_INVOKE_TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.error(f"Timeout starting learning path for user {user_id}, topic: {topic}")
            raise HTTPException(
                status_code=504,
                detail="Request timed out while generating learning path. Please try again."
            )
        except Exception as e:
            logger.error(f"Error starting learning path for user {user_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail="An error occurred while starting the learning path. Please try again."
            )

        message_threads = result.get("messages", [])

        # Debug logging to trace the issue
        logger.info(f"Graph result keys: {result.keys() if result else 'None'}")
        logger.info(f"Number of messages: {len(message_threads) if message_threads else 0}")

        # Extract and store concepts from the generated learning path
        user_id_str = str(user_id)
        if message_threads and len(message_threads) > 0:
            last_message = message_threads[-1]
            logger.info(f"Last message type: {type(last_message).__name__}")
            if isinstance(last_message, AIMessage):
                logger.info(f"Last AI message content (first 500 chars): {last_message.content[:500] if last_message.content else 'Empty'}")
                learning_path_json = extract_json_array_from_message(last_message.content)
                logger.info(f"Extracted JSON: {learning_path_json}")
                if learning_path_json:
                    await asyncio.to_thread(
                        parse_and_store_concepts,
                        user_id_str,
                        conversation_thread_id,
                        topic,
                        learning_path_json,
                        self.concept_service,
                        self.create_learning_path_kg
                    )
                    logger.info(f"Extracted and stored {len(learning_path_json)} concepts for thread {conversation_thread_id}")
                else:
                    logger.warning(f"No concepts extracted from learning path for thread {conversation_thread_id}")
            else:
                logger.warning(f"Last message is not an AIMessage, it's: {type(last_message).__name__}")
        else:
            logger.warning(f"No messages in result for thread {conversation_thread_id}")

        logger.info(f"Started learning path with conversation_thread_id: {conversation_thread_id} for user {user_id}")

        return GraphResponse(
            thread_id=conversation_thread_id,
            messages=message_threads
        )
    
    async def resume_learning_path(self, db: AsyncSession, thread_id: str, human_answer: str, user_id: int) -> GraphResponse:
        """Resume an existing learning path

        Args:
            db: Database session
            thread_id: The conversation thread identifier
            human_answer: Human's answer to the previous question
            user_id: User ID (integer from authenticated user)

        Returns:
            GraphResponse with updated conversation
        """

        config = {"configurable": {"thread_id": thread_id}}
        state = {"messages": [HumanMessage(content=human_answer)]}

        # Get learning path from database to retrieve topic and verify ownership
        db_learning_path = await crud.get_learning_path_by_thread_id(db, thread_id)
        if not db_learning_path:
            logger.error(f"Learning path not found for conversation thread {thread_id}")
            raise ValueError(f"Learning path not found for conversation thread {thread_id}")

        # Verify user owns this learning path
        if db_learning_path.user_id != user_id:
            logger.error(f"User {user_id} attempted to access learning path owned by user {db_learning_path.user_id}")
            raise ValueError(f"Not authorized to access this learning path")

        # Convert user_id to string for KG operations
        user_id_str = str(user_id)

        # Update graph state with timeout (sync code - run in thread pool)
        try:
            await asyncio.wait_for(
                asyncio.to_thread(self.graph.update_state, config, state),
                timeout=LANGGRAPH_INVOKE_TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.error(f"Timeout updating state for thread {thread_id}")
            raise HTTPException(
                status_code=504,
                detail="Request timed out. Please try again."
            )

        # Run graph with timeout (sync code - run in thread pool)
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self.graph.invoke, None, config),
                timeout=LANGGRAPH_INVOKE_TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.error(f"Timeout resuming learning path for thread {thread_id}")
            raise HTTPException(
                status_code=504,
                detail="Request timed out while generating learning path. Please try again."
            )
        except Exception as e:
            logger.error(f"Error resuming learning path for thread {thread_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail="An error occurred while resuming the learning path. Please try again."
            )

        message_threads = result.get("messages", {})
        
        # Check if this was the final step (learning path generation)
        # The last message should contain the JSON array of concepts
        if message_threads and len(message_threads) > 0:
            last_message = message_threads[-1]
            if isinstance(last_message, AIMessage):
                # Extract the JSON output and save to variable
                learning_path_json = extract_json_array_from_message(last_message.content)

                if learning_path_json:
                    # Store the extracted concepts in KG using the conversation thread ID
                    topic = db_learning_path.topic
                    await asyncio.to_thread(
                        parse_and_store_concepts,
                        user_id_str,  # Pass user_id as string for KG
                        thread_id,  # conversation_thread_id
                        topic,
                        learning_path_json,
                        self.concept_service,
                        self.create_learning_path_kg
                    )
                    logger.info(f"Extracted and stored {len(learning_path_json)} concepts for thread {thread_id}, user {user_id}")
                else:
                    # Fallback: Try to extract JSON-LD format (backward compatibility)
                    jsonld_data = extract_json_from_message(last_message.content)
                    if jsonld_data and "@graph" in jsonld_data:
                        logger.warning(f"Detected JSON-LD format for thread {thread_id}, this format is deprecated")
                        # You could add backward compatibility handling here if needed
                    else:
                        logger.error(f"Failed to extract learning path JSON for thread {thread_id}")
                        raise HTTPException(
                            status_code=500, 
                            detail="Learning path generation failed. Could not extract valid JSON from AI response."
                        )
        
        logger.info(f"Resumed learning path with conversation_thread_id: {thread_id}")
        
        return GraphResponse(
            thread_id=thread_id,
            messages=message_threads
        )