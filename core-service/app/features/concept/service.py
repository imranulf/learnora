"""Concept service - business logic for concept operations."""

from rdflib import URIRef
from typing import Optional, Dict, List
from app.features.concept.kg import ConceptKG
from app.features.concept.storage import ConceptStorage
import logging
import math

logger = logging.getLogger(__name__)


class ConceptService:
    """Service layer for managing concepts with business logic."""
    
    def __init__(self):
        """Initialize concept service with KG layer and metadata storage."""
        self.kg = ConceptKG()
        self.storage = ConceptStorage()
    
    def add_concept(
        self,
        concept_id: str,
        label: str,
        description: str = None,
        prerequisites: list[str] = None
    ) -> URIRef:
        """
        Add a new concept (legacy method for backward compatibility).
        
        Business logic: Validates prerequisites exist before adding.
        If concept already exists, adds any new prerequisites.
        
        Args:
            concept_id: Unique identifier (e.g., "Python", "MachineLearning")
            label: Human-readable name
            description: Optional detailed description
            prerequisites: List of prerequisite concept IDs
            
        Returns:
            URIRef of the created concept
        """
        # Business validation: verify all prerequisites exist
        if prerequisites:
            for prereq_id in prerequisites:
                if not self.kg.concept_exists(prereq_id):
                    raise ValueError(f"Prerequisite concept '{prereq_id}' does not exist")
        
        # Delegate to KG layer (handles duplicates)
        concept = self.kg.create_concept(concept_id, label, description, prerequisites)
        logger.info(f"Added concept: {concept_id}")
        return concept
    
    def create_concept_extended(
        self,
        concept_id: str,
        label: str,
        description: Optional[str] = None,
        category: str = "General",
        difficulty: str = "Beginner",
        tags: Optional[List[str]] = None,
        prerequisites: Optional[List[str]] = None
    ) -> Dict:
        """
        Create a new concept with extended metadata.
        
        Args:
            concept_id: Unique identifier
            label: Human-readable name
            description: Detailed description
            category: Category (e.g., Programming, Math)
            difficulty: Difficulty level
            tags: List of tags
            prerequisites: List of prerequisite concept IDs
            
        Returns:
            Dict with concept details
        """
        # Validate prerequisites
        if prerequisites:
            for prereq_id in prerequisites:
                if not self.kg.concept_exists(prereq_id):
                    raise ValueError(f"Prerequisite concept '{prereq_id}' does not exist")
        
        # Create in knowledge graph
        self.kg.create_concept(concept_id, label, description, prerequisites)
        
        # Save metadata
        self.storage.save_concept_metadata(
            concept_id=concept_id,
            label=label,
            description=description,
            category=category,
            difficulty=difficulty,
            tags=tags or []
        )
        
        # Get prerequisites
        prereq_uris = self.kg.get_concept_prerequisites(concept_id)
        prereq_ids = [str(p).split("#")[-1] for p in prereq_uris]
        
        metadata = self.storage.get_concept_metadata(concept_id) or {}
        
        logger.info(f"Created concept with extended metadata: {concept_id}")
        
        return {
            "id": concept_id,
            "label": label,
            "description": description,
            "category": category,
            "difficulty": difficulty,
            "tags": tags or [],
            "prerequisites": prereq_ids,
            "created_at": metadata.get("created_at")
        }
    
    def get_concept_details(self, concept_id: str) -> Optional[Dict]:
        """
        Get detailed concept information including metadata.
        
        Args:
            concept_id: The concept identifier
            
        Returns:
            Dict with concept details or None if not found
        """
        # Check if exists in KG
        concept_uri = self.kg.get_concept(concept_id)
        if not concept_uri:
            return None
        
        # Get metadata
        metadata = self.storage.get_concept_metadata(concept_id) or {}
        
        # Get prerequisites
        prereq_uris = self.kg.get_concept_prerequisites(concept_id)
        prereq_ids = [str(p).split("#")[-1] for p in prereq_uris]
        
        return {
            "id": concept_id,
            "label": metadata.get("label", concept_id.replace("_", " ").title()),
            "description": metadata.get("description"),
            "category": metadata.get("category", "General"),
            "difficulty": metadata.get("difficulty", "Beginner"),
            "tags": metadata.get("tags", []),
            "prerequisites": prereq_ids,
            "created_at": metadata.get("created_at")
        }
    
    def list_concepts_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        category: Optional[str] = None,
        difficulty: Optional[str] = None
    ) -> Dict:
        """
        List concepts with pagination and filters.
        
        Args:
            page: Page number (1-indexed)
            page_size: Items per page
            search: Search query
            category: Filter by category
            difficulty: Filter by difficulty
            
        Returns:
            Dict with paginated results
        """
        # Get all concepts from KG
        concept_uris = self.kg.get_all_concepts()
        concept_ids = [str(uri).split("#")[-1] for uri in concept_uris]
        
        # Get metadata for all concepts
        all_metadata = self.storage.get_all_metadata()
        
        # Build concept list with metadata
        concepts = []
        for concept_id in concept_ids:
            metadata = all_metadata.get(concept_id, {})
            prereq_uris = self.kg.get_concept_prerequisites(concept_id)
            prereq_ids = [str(p).split("#")[-1] for p in prereq_uris]
            
            concept = {
                "id": concept_id,
                "label": metadata.get("label", concept_id.replace("_", " ").title()),
                "description": metadata.get("description"),
                "category": metadata.get("category", "General"),
                "difficulty": metadata.get("difficulty", "Beginner"),
                "tags": metadata.get("tags", []),
                "prerequisites": prereq_ids,
                "created_at": metadata.get("created_at")
            }
            concepts.append(concept)
        
        # Apply filters
        if search:
            search_lower = search.lower()
            concepts = [
                c for c in concepts
                if search_lower in c["label"].lower()
                or (c["description"] and search_lower in c["description"].lower())
                or any(search_lower in tag.lower() for tag in c["tags"])
            ]
        
        if category:
            concepts = [c for c in concepts if c["category"] == category]
        
        if difficulty:
            concepts = [c for c in concepts if c["difficulty"] == difficulty]
        
        # Calculate pagination
        total = len(concepts)
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        paginated_concepts = concepts[start_idx:end_idx]
        
        return {
            "items": paginated_concepts,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    
    def update_concept(self, concept_id: str, updates: Dict) -> Optional[Dict]:
        """
        Update a concept.
        
        Args:
            concept_id: The concept identifier
            updates: Dict of fields to update
            
        Returns:
            Updated concept dict or None if not found
        """
        # Check if exists
        concept_uri = self.kg.get_concept(concept_id)
        if not concept_uri:
            return None
        
        # Handle prerequisites update
        if "prerequisites" in updates:
            # Validate prerequisites exist
            for prereq_id in updates["prerequisites"]:
                if not self.kg.concept_exists(prereq_id):
                    raise ValueError(f"Prerequisite concept '{prereq_id}' does not exist")
            # TODO: Update prerequisites in KG (would need new KG method)
        
        # Update metadata
        metadata_updates = {k: v for k, v in updates.items() if k != "prerequisites"}
        if metadata_updates:
            self.storage.update_concept_metadata(concept_id, metadata_updates)
        
        logger.info(f"Updated concept: {concept_id}")
        
        # Return updated concept
        return self.get_concept_details(concept_id)
    
    def delete_concept(self, concept_id: str) -> bool:
        """
        Delete a concept.
        
        Args:
            concept_id: The concept identifier
            
        Returns:
            True if deleted, False if not found
        """
        # Check if exists
        concept_uri = self.kg.get_concept(concept_id)
        if not concept_uri:
            return False
        
        # Delete metadata
        self.storage.delete_concept_metadata(concept_id)
        
        # Note: Not deleting from KG to preserve graph integrity
        # In production, would need to check for dependencies
        
        logger.info(f"Deleted concept metadata: {concept_id}")
        return True
    
    def get_concept(self, concept_id: str) -> Optional[URIRef]:
        """
        Get a concept URI by its ID.
        
        Args:
            concept_id: The concept identifier
            
        Returns:
            URIRef of the concept, or None if not found
        """
        return self.kg.get_concept(concept_id)
    
    def get_all_concepts(self) -> list[URIRef]:
        """
        Get all concepts.
        
        Returns:
            List of concept URIRefs
        """
        return self.kg.get_all_concepts()
    
    def get_concept_prerequisites(self, concept_id: str) -> list[URIRef]:
        """
        Get all prerequisites for a concept.
        
        Args:
            concept_id: The concept identifier
            
        Returns:
            List of prerequisite concept URIRefs
        """
        return self.kg.get_concept_prerequisites(concept_id)
