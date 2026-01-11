"""Knowledge Graph operations for learning paths."""

from rdflib import Graph as RDFGraph, URIRef
from typing import Optional
from app.kg.storage import KGStorage
from app.kg.ontologies import ConceptOntology, LearningPathOntology, UserKnowledgeOntology
import logging

logger = logging.getLogger(__name__)

class LearningPathKG:
    """Knowledge Graph layer for learning path operations.
    
    Note: Learning paths are now stored within user graphs, not as separate files.
    """
    
    def __init__(self):
        """Initialize with KG storage and ontology helpers."""
        self.storage = KGStorage()
        self.learning_path_ontology = LearningPathOntology()
        self.concept_ontology = ConceptOntology()
        self.user_ontology = UserKnowledgeOntology()
    
    def create_path(
        self,
        user_id: str,
        thread_id: str,
        topic: str,
        concept_ids: list[str]
    ) -> URIRef:
        """
        Create a new learning path in the Knowledge Graph.
        Learning path is stored within the user's graph.

        Args:
            user_id: User identifier who owns this learning path
            thread_id: Unique thread identifier
            topic: The learning topic/goal
            concept_ids: List of concept IDs to include in the path

        Returns:
            URIRef of the created learning path

        Raises:
            IOError: If file operations fail
            ValueError: If concept IDs are invalid
        """
        try:
            # Load user's graph
            user_graph = self.storage.load_user_graph(user_id)

            # Ensure user exists in the graph
            self.user_ontology.ensure_user_exists(user_graph, user_id)

            # Create new graph for this learning path
            path_graph = self.storage.create_graph()

            # Add the learning path with user association
            path = self.learning_path_ontology.add_learning_path(
                path_graph,
                thread_id=thread_id,
                topic=topic,
                user_id=user_id
            )

            # Add concepts to the path with validation
            concepts_graph = self.storage.load_concepts()
            added_concepts = 0
            for concept_id in concept_ids:
                try:
                    concept = self.concept_ontology.get_concept_by_id(concepts_graph, concept_id)
                    if concept is not None:
                        self.learning_path_ontology.add_concept_to_path(path_graph, path, concept)
                        added_concepts += 1
                    else:
                        logger.warning(f"Concept not found: {concept_id}")
                except Exception as e:
                    logger.warning(f"Failed to add concept {concept_id}: {e}")
                    continue

            # Save the learning path into user's graph
            self.storage.save_learning_path(user_id, thread_id, path_graph)
            logger.info(f"Created learning path in KG: {thread_id} for user {user_id} with {added_concepts} concepts")

            return path

        except IOError as e:
            logger.error(f"File I/O error creating learning path {thread_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating learning path {thread_id}: {e}")
            raise
    
    def get_path(self, user_id: str, thread_id: str) -> Optional[RDFGraph]:
        """
        Get a learning path graph from KG.

        Args:
            user_id: The user identifier who owns the path
            thread_id: The thread identifier

        Returns:
            RDFGraph containing the learning path, or empty graph if not found
        """
        try:
            return self.storage.load_learning_path(user_id, thread_id)
        except IOError as e:
            logger.error(f"Failed to load learning path {thread_id} for user {user_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error loading learning path {thread_id}: {e}")
            return None
    
    def get_path_concepts(self, user_id: str, thread_id: str) -> list[URIRef]:
        """
        Get all concepts in a learning path from KG.

        Args:
            user_id: The user identifier who owns the path
            thread_id: The thread identifier

        Returns:
            List of concept URIRefs in the learning path (empty list on error)
        """
        try:
            path_graph = self.storage.load_learning_path(user_id, thread_id)
            if path_graph is None:
                logger.warning(f"No path graph found for {thread_id}")
                return []

            path = self.learning_path_ontology.get_learning_path_by_thread(path_graph, thread_id)
            if path is None:
                logger.warning(f"Learning path not found in graph: {thread_id}")
                return []

            return self.learning_path_ontology.get_path_concepts(path_graph, path)

        except IOError as e:
            logger.error(f"Failed to get concepts for path {thread_id}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error getting path concepts {thread_id}: {e}")
            return []
    
    def path_exists(self, user_id: str, thread_id: str) -> bool:
        """
        Check if a learning path exists in the KG.
        
        Args:
            user_id: The user identifier who owns the path
            thread_id: The thread identifier
            
        Returns:
            True if path exists, False otherwise
        """
        return self.storage.learning_path_exists(user_id, thread_id)
    
    def get_user_learning_paths(self, user_id: str) -> list[URIRef]:
        """
        Get all learning paths for a user.

        Args:
            user_id: The user identifier

        Returns:
            List of learning path URIRefs (empty list on error)
        """
        try:
            user_graph = self.storage.load_user_graph(user_id)
            if user_graph is None:
                logger.warning(f"No user graph found for user {user_id}")
                return []

            user = self.user_ontology.get_user_by_id(user_graph, user_id)
            if user is None:
                logger.warning(f"User not found in graph: {user_id}")
                return []

            return self.user_ontology.get_user_learning_paths(user_graph, user)

        except IOError as e:
            logger.error(f"Failed to get learning paths for user {user_id}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error getting user learning paths: {e}")
            return []
