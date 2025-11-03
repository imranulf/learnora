"""Enhanced Concept service with full CRUD operations."""

from rdflib import URIRef, Literal
from typing import Optional
from datetime import datetime
from app.features.concept.kg import ConceptKG
from app.kg.ontologies import ConceptOntology
import logging
import math

logger = logging.getLogger(__name__)


class ConceptResponse:
    """Simplified response class for concept data."""
    def __init__(self, id: str, label: str, description: str = None, 
                 category: str = None, difficulty: str = None,
                 tags: list = None, prerequisites: list = None,
                 created_at: str = None, updated_at: str = None):
        self.id = id
        self.label = label
        self.description = description
        self.category = category
        self.difficulty = difficulty
        self.tags = tags or []
        self.prerequisites = prerequisites or []
        self.created_at = created_at
        self.updated_at = updated_at


class ConceptListResponse:
    """Paginated list response."""
    def __init__(self, concepts: list, total: int, page: int, page_size: int):
        self.concepts = concepts
        self.total = total
        self.page = page
        self.page_size = page_size
        self.total_pages = math.ceil(total / page_size) if page_size > 0 else 0


class ConceptService:
    """Enhanced service layer for managing concepts with business logic."""
    
    def __init__(self):
        """Initialize concept service with KG layer."""
        self.kg = ConceptKG()
        self.ontology = ConceptOntology()
    
    def add_concept(
        self,
        concept_id: str,
        label: str,
        description: str = None,
        category: str = None,
        difficulty: str = None,
        tags: list[str] = None,
        prerequisites: list[str] = None
    ) -> ConceptResponse:
        """
        Add a new concept with enhanced metadata.
        
        Args:
            concept_id: Unique identifier
            label: Human-readable name
            description: Optional detailed description
            category: Category (e.g., "Programming", "Mathematics")
            difficulty: Difficulty level
            tags: List of tags
            prerequisites: List of prerequisite concept IDs
            
        Returns:
            ConceptResponse object
        """
        # Business validation: verify all prerequisites exist
        if prerequisites:
            for prereq_id in prerequisites:
                if not self.kg.concept_exists(prereq_id):
                    raise ValueError(f"Prerequisite concept '{prereq_id}' does not exist")
        
        # Create concept in KG
        concept_uri = self.kg.create_concept(concept_id, label, description, prerequisites)
        
        # Add extended metadata
        concepts_graph = self.kg.storage.load_concepts()
        
        if category:
            concepts_graph.add((concept_uri, self.ontology.CONCEPT.category, Literal(category)))
        if difficulty:
            concepts_graph.add((concept_uri, self.ontology.CONCEPT.difficulty, Literal(difficulty)))
        if tags:
            for tag in tags:
                concepts_graph.add((concept_uri, self.ontology.CONCEPT.tag, Literal(tag)))
        
        # Add timestamps
        now = datetime.utcnow().isoformat()
        concepts_graph.add((concept_uri, self.ontology.CONCEPT.createdAt, Literal(now)))
        concepts_graph.add((concept_uri, self.ontology.CONCEPT.updatedAt, Literal(now)))
        
        self.kg.storage.save_concepts(concepts_graph)
        logger.info(f"Added concept with extended metadata: {concept_id}")
        
        # Return response
        prereq_uris = self.kg.get_concept_prerequisites(concept_id)
        prereq_ids = [str(p).split("#")[-1] for p in prereq_uris]
        
        return ConceptResponse(
            id=concept_id,
            label=label,
            description=description,
            category=category,
            difficulty=difficulty,
            tags=tags or [],
            prerequisites=prereq_ids,
            created_at=now,
            updated_at=now
        )
    
    def get_concept_detailed(self, concept_id: str) -> Optional[ConceptResponse]:
        """Get detailed concept information."""
        concept_uri = self.kg.get_concept(concept_id)
        if not concept_uri:
            return None
        
        concepts_graph = self.kg.storage.load_concepts()
        
        # Extract metadata
        label = None
        description = None
        category = None
        difficulty = None
        tags = []
        created_at = None
        updated_at = None
        
        for s, p, o in concepts_graph.triples((concept_uri, None, None)):
            pred_name = str(p).split("#")[-1]
            if pred_name == "label":
                label = str(o)
            elif pred_name == "description":
                description = str(o)
            elif pred_name == "category":
                category = str(o)
            elif pred_name == "difficulty":
                difficulty = str(o)
            elif pred_name == "tag":
                tags.append(str(o))
            elif pred_name == "createdAt":
                created_at = str(o)
            elif pred_name == "updatedAt":
                updated_at = str(o)
        
        # Get prerequisites
        prereq_uris = self.kg.get_concept_prerequisites(concept_id)
        prereq_ids = [str(p).split("#")[-1] for p in prereq_uris]
        
        return ConceptResponse(
            id=concept_id,
            label=label or concept_id.replace("_", " ").title(),
            description=description,
            category=category,
            difficulty=difficulty,
            tags=tags,
            prerequisites=prereq_ids,
            created_at=created_at,
            updated_at=updated_at
        )
    
    def get_all_concepts_detailed(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str = None,
        category: str = None,
        difficulty: str = None,
        tag: str = None
    ) -> ConceptListResponse:
        """Get all concepts with pagination and filters."""
        concept_uris = self.kg.get_all_concepts()
        concepts = []
        
        for uri in concept_uris:
            concept_id = str(uri).split("#")[-1]
            concept = self.get_concept_detailed(concept_id)
            if concept:
                # Apply filters
                if search and search.lower() not in concept.label.lower() and (not concept.description or search.lower() not in concept.description.lower()):
                    continue
                if category and concept.category != category:
                    continue
                if difficulty and concept.difficulty != difficulty:
                    continue
                if tag and tag not in concept.tags:
                    continue
                
                concepts.append(concept)
        
        # Pagination
        total = len(concepts)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_concepts = concepts[start_idx:end_idx]
        
        return ConceptListResponse(
            concepts=paginated_concepts,
            total=total,
            page=page,
            page_size=page_size
        )
    
    def update_concept(
        self,
        concept_id: str,
        label: str = None,
        description: str = None,
        category: str = None,
        difficulty: str = None,
        tags: list[str] = None,
        prerequisites: list[str] = None
    ) -> Optional[ConceptResponse]:
        """Update an existing concept."""
        concept_uri = self.kg.get_concept(concept_id)
        if not concept_uri:
            return None
        
        concepts_graph = self.kg.storage.load_concepts()
        
        # Validate prerequisites if provided
        if prerequisites:
            for prereq_id in prerequisites:
                if not self.kg.concept_exists(prereq_id):
                    raise ValueError(f"Prerequisite concept '{prereq_id}' does not exist")
        
        # Update fields
        if label:
            # Remove old label
            concepts_graph.remove((concept_uri, self.ontology.CONCEPT.label, None))
            concepts_graph.add((concept_uri, self.ontology.CONCEPT.label, Literal(label)))
        
        if description is not None:
            concepts_graph.remove((concept_uri, self.ontology.CONCEPT.description, None))
            if description:
                concepts_graph.add((concept_uri, self.ontology.CONCEPT.description, Literal(description)))
        
        if category is not None:
            concepts_graph.remove((concept_uri, self.ontology.CONCEPT.category, None))
            if category:
                concepts_graph.add((concept_uri, self.ontology.CONCEPT.category, Literal(category)))
        
        if difficulty is not None:
            concepts_graph.remove((concept_uri, self.ontology.CONCEPT.difficulty, None))
            if difficulty:
                concepts_graph.add((concept_uri, self.ontology.CONCEPT.difficulty, Literal(difficulty)))
        
        if tags is not None:
            # Remove all old tags
            concepts_graph.remove((concept_uri, self.ontology.CONCEPT.tag, None))
            # Add new tags
            for tag in tags:
                concepts_graph.add((concept_uri, self.ontology.CONCEPT.tag, Literal(tag)))
        
        if prerequisites is not None:
            # Remove old prerequisites
            concepts_graph.remove((concept_uri, self.ontology.CONCEPT.requires, None))
            # Add new prerequisites
            for prereq_id in prerequisites:
                prereq_uri = self.ontology.get_concept_by_id(concepts_graph, prereq_id)
                self.ontology.add_prerequisite(concepts_graph, concept_uri, prereq_uri)
        
        # Update timestamp
        now = datetime.utcnow().isoformat()
        concepts_graph.remove((concept_uri, self.ontology.CONCEPT.updatedAt, None))
        concepts_graph.add((concept_uri, self.ontology.CONCEPT.updatedAt, Literal(now)))
        
        self.kg.storage.save_concepts(concepts_graph)
        logger.info(f"Updated concept: {concept_id}")
        
        return self.get_concept_detailed(concept_id)
    
    def delete_concept(self, concept_id: str) -> bool:
        """Delete a concept from the knowledge graph."""
        concept_uri = self.kg.get_concept(concept_id)
        if not concept_uri:
            return False
        
        concepts_graph = self.kg.storage.load_concepts()
        
        # Check if any other concepts depend on this one
        dependents = []
        for s, p, o in concepts_graph.triples((None, self.ontology.CONCEPT.requires, concept_uri)):
            dependent_id = str(s).split("#")[-1]
            dependents.append(dependent_id)
        
        if dependents:
            raise ValueError(f"Cannot delete concept '{concept_id}' because it is a prerequisite for: {', '.join(dependents)}")
        
        # Remove all triples related to this concept
        concepts_graph.remove((concept_uri, None, None))
        concepts_graph.remove((None, None, concept_uri))
        
        self.kg.storage.save_concepts(concepts_graph)
        logger.info(f"Deleted concept: {concept_id}")
        
        return True
    
    # Keep original methods for backwards compatibility
    def get_concept(self, concept_id: str) -> Optional[URIRef]:
        """Get a concept URI by its ID."""
        return self.kg.get_concept(concept_id)
    
    def get_all_concepts(self) -> list[URIRef]:
        """Get all concepts."""
        return self.kg.get_all_concepts()
    
    def get_concept_prerequisites(self, concept_id: str) -> list[URIRef]:
        """Get all prerequisites for a concept."""
        return self.kg.get_concept_prerequisites(concept_id)
