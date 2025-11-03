"""User Knowledge service - business logic for user knowledge operations."""

from rdflib import URIRef
from app.features.users.knowledge.kg import UserKnowledgeKG
from app.features.users.knowledge.storage import UserKnowledgeStorage
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class UserKnowledgeService:
    """Service layer for managing user knowledge with business logic."""
    
    def __init__(self):
        """Initialize user knowledge service with KG layer and storage."""
        self.kg = UserKnowledgeKG()
        self.storage = UserKnowledgeStorage()
    
    def mark_concept_as_known(self, user_id: str, concept_id: str) -> None:
        """
        Mark that a user knows a concept.
        
        Business logic: Could add validation, notifications, achievements, etc.
        
        Args:
            user_id: The user identifier
            concept_id: The concept identifier
        """
        # Future: Add business logic like checking if user was learning it first,
        # triggering achievement notifications, updating progress tracking, etc.
        
        self.kg.mark_known(user_id, concept_id)
        logger.info(f"User {user_id} now knows concept: {concept_id}")
    
    def mark_concept_as_learning(self, user_id: str, concept_id: str) -> None:
        """
        Mark that a user is currently learning a concept.
        
        Business logic: Could validate prerequisites are met, limit concurrent learning, etc.
        
        Args:
            user_id: The user identifier
            concept_id: The concept identifier
        """
        # Future: Add business logic like checking prerequisites,
        # limiting number of concurrent learning concepts, etc.
        
        self.kg.mark_learning(user_id, concept_id)
        logger.info(f"User {user_id} is learning concept: {concept_id}")
    
    def assign_learning_path_to_user(self, user_id: str, thread_id: str) -> None:
        """
        Assign a learning path to a user.
        
        Business logic: Could check if user already has active paths, send notifications, etc.
        
        Args:
            user_id: The user identifier
            thread_id: The learning path thread identifier
        """
        # Future: Add business logic like checking for existing active paths,
        # sending notifications, updating user dashboard, etc.
        
        self.kg.assign_path(user_id, thread_id)
        logger.info(f"Assigned learning path {thread_id} to user {user_id}")
    
    def get_user_known_concepts(self, user_id: str) -> list[URIRef]:
        """
        Get all concepts a user knows.
        
        Args:
            user_id: The user identifier
            
        Returns:
            List of concept URIRefs the user knows
        """
        return self.kg.get_known_concepts(user_id)
    
    def get_user_learning_concepts(self, user_id: str) -> list[URIRef]:
        """
        Get all concepts a user is currently learning.
        
        Args:
            user_id: The user identifier
            
        Returns:
            List of concept URIRefs the user is learning
        """
        return self.kg.get_learning_concepts(user_id)
    
    def user_knows_concept(self, user_id: str, concept_id: str) -> bool:
        """
        Check if a user knows a specific concept.
        
        Args:
            user_id: The user identifier
            concept_id: The concept identifier
            
        Returns:
            True if user knows the concept, False otherwise
        """
        return self.kg.check_knows_concept(user_id, concept_id)
    
    async def get_user_knowledge_dashboard(
        self,
        user_id: str,
        mastery_filter: str = None,
        sort_by: str = "last_updated"
    ) -> dict:
        """
        Get user knowledge dashboard data with mastery and scores.
        
        Args:
            user_id: User identifier
            mastery_filter: Filter by mastery level (optional)
            sort_by: Sort field (score, last_updated)
            
        Returns:
            Dashboard data with items, total, and summary
        """
        # Get knowledge metadata from storage
        knowledge_data = self.storage.get_user_knowledge(user_id)
        
        # Get concepts from KG
        known_uris = self.kg.get_known_concepts(user_id)
        learning_uris = self.kg.get_learning_concepts(user_id)
        
        # Build items list
        items = []
        for concept_id, metadata in knowledge_data.items():
            # Apply mastery filter
            if mastery_filter and metadata["mastery"] != mastery_filter:
                continue
            
            items.append({
                "id": concept_id,
                "concept": metadata.get("concept", concept_id),
                "mastery": metadata.get("mastery", "not_started"),
                "score": metadata.get("score", 0.0),
                "last_updated": metadata.get("last_updated", datetime.utcnow().isoformat())
            })
        
        # Sort items
        if sort_by == "score":
            items.sort(key=lambda x: x["score"], reverse=True)
        else:  # last_updated
            items.sort(key=lambda x: x["last_updated"], reverse=True)
        
        # Calculate summary
        total_items = len(items)
        known_count = sum(1 for item in items if item["mastery"] == "known")
        learning_count = sum(1 for item in items if item["mastery"] == "learning")
        not_started_count = sum(1 for item in items if item["mastery"] == "not_started")
        avg_score = sum(item["score"] for item in items) / total_items if total_items > 0 else 0.0
        
        summary = {
            "total_concepts": total_items,
            "known": known_count,
            "learning": learning_count,
            "not_started": not_started_count,
            "average_score": round(avg_score, 2),
            "mastery_distribution": {
                "known": known_count,
                "learning": learning_count,
                "not_started": not_started_count
            }
        }
        
        return {
            "items": items,
            "total": total_items,
            "summary": summary
        }
    
    async def update_user_knowledge_item(
        self,
        user_id: str,
        concept_id: str,
        mastery: str = None,
        score: float = None
    ) -> dict:
        """
        Update a user knowledge item.
        
        Args:
            user_id: User identifier
            concept_id: Concept identifier
            mastery: New mastery level (optional)
            score: New score (optional)
            
        Returns:
            Updated knowledge item
        """
        # Update storage
        updated = self.storage.update_concept_knowledge(user_id, concept_id, mastery, score)
        
        # Update KG if mastery changed
        if mastery == "known":
            self.kg.mark_known(user_id, concept_id)
        elif mastery == "learning":
            self.kg.mark_learning(user_id, concept_id)
        
        return {
            "id": concept_id,
            "concept": updated["concept"],
            "mastery": updated["mastery"],
            "score": updated["score"],
            "last_updated": updated["last_updated"]
        }
    
    async def sync_with_latest_assessment(self, user_id: str) -> dict:
        """
        Sync user knowledge with latest assessment results.
        
        Args:
            user_id: User identifier
            
        Returns:
            Sync result with updated concept count
        """
        # This is a placeholder - in a real implementation, this would:
        # 1. Query the Assessment feature for latest results
        # 2. Extract knowledge states and scores
        # 3. Update user knowledge metadata accordingly
        
        # For now, return a mock response
        logger.info(f"Syncing knowledge for user {user_id} with assessment data")
        
        # TODO: Integrate with assessment service
        # from app.features.assessment.service import AssessmentService
        # assessment_service = AssessmentService()
        # latest_results = assessment_service.get_latest_results(int(user_id))
        
        return {
            "updated_concepts": 0,
            "message": "Assessment sync not yet implemented"
        }
