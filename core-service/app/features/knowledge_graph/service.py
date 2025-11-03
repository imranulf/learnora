"""Service layer for knowledge graph visualization."""

from typing import List, Optional, Literal
from app.features.users.knowledge.service import UserKnowledgeService
from app.features.concept.service import ConceptService
import logging

logger = logging.getLogger(__name__)


class KnowledgeGraphService:
    """Service for knowledge graph visualization and management."""
    
    def __init__(self):
        self.user_knowledge_service = UserKnowledgeService()
        self.concept_service = ConceptService()
    
    async def get_user_knowledge_graph(
        self,
        user_id: str,
        category_filter: Optional[str] = None,
        mastery_filter: Optional[str] = None
    ) -> dict:
        """
        Get complete knowledge graph with user-specific mastery levels.
        
        Args:
            user_id: User identifier
            category_filter: Optional category to filter by
            mastery_filter: Optional mastery level to filter by
            
        Returns:
            Dict with nodes, edges, and stats
        """
        # Get all concepts
        all_concept_uris = self.concept_service.get_all_concepts()
        
        # Get user's known and learning concepts
        known_uris = self.user_knowledge_service.get_user_known_concepts(user_id)
        learning_uris = self.user_knowledge_service.get_user_learning_concepts(user_id)
        
        # Convert to sets for faster lookup
        known_ids = {str(uri).split("#")[-1] for uri in known_uris}
        learning_ids = {str(uri).split("#")[-1] for uri in learning_uris}
        
        nodes = []
        edges = []
        
        for concept_uri in all_concept_uris:
            concept_id = str(concept_uri).split("#")[-1]
            
            # Determine mastery level
            if concept_id in known_ids:
                mastery = "known"
            elif concept_id in learning_ids:
                mastery = "learning"
            else:
                mastery = "unknown"
            
            # Apply mastery filter if specified
            if mastery_filter and mastery != mastery_filter:
                continue
            
            # Get prerequisites
            prereq_uris = self.concept_service.get_concept_prerequisites(concept_id)
            prereq_ids = [str(p).split("#")[-1] for p in prereq_uris]
            
            # Determine category (could be enhanced with actual category data)
            category = self._determine_category(concept_id)
            
            # Apply category filter if specified
            if category_filter and category != category_filter:
                continue
            
            # Add node
            nodes.append({
                "id": concept_id,
                "label": concept_id.replace("_", " ").title(),
                "category": category,
                "mastery": mastery,
                "description": f"Learn about {concept_id.replace('_', ' ')}",
                "prerequisites": prereq_ids
            })
            
            # Add edges for prerequisites
            for prereq_id in prereq_ids:
                edges.append({
                    "id": f"{prereq_id}-{concept_id}",
                    "from_node": prereq_id,
                    "to_node": concept_id,
                    "label": "prerequisite"
                })
        
        # Calculate stats
        total_nodes = len(nodes)
        known_count = sum(1 for n in nodes if n["mastery"] == "known")
        learning_count = sum(1 for n in nodes if n["mastery"] == "learning")
        unknown_count = sum(1 for n in nodes if n["mastery"] == "unknown")
        
        stats = {
            "total_nodes": total_nodes,
            "total_edges": len(edges),
            "known": known_count,
            "learning": learning_count,
            "unknown": unknown_count,
            "completion_percentage": round((known_count / total_nodes * 100) if total_nodes > 0 else 0, 1)
        }
        
        return {
            "nodes": nodes,
            "edges": edges,
            "stats": stats
        }
    
    async def update_concept_mastery(
        self,
        user_id: str,
        concept_id: str,
        mastery: Literal["unknown", "learning", "known"]
    ) -> Optional[dict]:
        """
        Update mastery level for a concept.
        
        Args:
            user_id: User identifier
            concept_id: Concept identifier
            mastery: New mastery level
            
        Returns:
            Updated node data or None if concept not found
        """
        # Verify concept exists
        concept_uri = self.concept_service.get_concept(concept_id)
        if not concept_uri:
            return None
        
        # Update based on mastery level
        if mastery == "known":
            self.user_knowledge_service.mark_concept_as_known(user_id, concept_id)
        elif mastery == "learning":
            self.user_knowledge_service.mark_concept_as_learning(user_id, concept_id)
        elif mastery == "unknown":
            # Remove from both known and learning (would need new KG methods)
            # For now, we'll just log this
            logger.info(f"Marking {concept_id} as unknown for user {user_id}")
        
        # Get updated node data
        prereq_uris = self.concept_service.get_concept_prerequisites(concept_id)
        prereq_ids = [str(p).split("#")[-1] for p in prereq_uris]
        
        return {
            "id": concept_id,
            "label": concept_id.replace("_", " ").title(),
            "category": self._determine_category(concept_id),
            "mastery": mastery,
            "description": f"Learn about {concept_id.replace('_', ' ')}",
            "prerequisites": prereq_ids
        }
    
    async def get_all_categories(self) -> List[str]:
        """Get all unique categories from the knowledge graph."""
        all_concept_uris = self.concept_service.get_all_concepts()
        categories = set()
        
        for concept_uri in all_concept_uris:
            concept_id = str(concept_uri).split("#")[-1]
            category = self._determine_category(concept_id)
            categories.add(category)
        
        return sorted(list(categories))
    
    async def get_user_stats(self, user_id: str) -> dict:
        """Get statistics about user's knowledge."""
        known_uris = self.user_knowledge_service.get_user_known_concepts(user_id)
        learning_uris = self.user_knowledge_service.get_user_learning_concepts(user_id)
        all_concept_uris = self.concept_service.get_all_concepts()
        
        total = len(all_concept_uris)
        known = len(known_uris)
        learning = len(learning_uris)
        unknown = total - known - learning
        
        return {
            "total_concepts": total,
            "known": known,
            "learning": learning,
            "unknown": unknown,
            "completion_percentage": round((known / total * 100) if total > 0 else 0, 1),
            "in_progress_percentage": round((learning / total * 100) if total > 0 else 0, 1)
        }
    
    def _determine_category(self, concept_id: str) -> str:
        """
        Determine category for a concept based on naming patterns.
        This is a simple heuristic - could be enhanced with actual category data.
        """
        concept_lower = concept_id.lower()
        
        # Programming languages
        if any(lang in concept_lower for lang in ['python', 'java', 'javascript', 'typescript', 'cpp', 'csharp']):
            return "Programming Languages"
        
        # Web development
        if any(web in concept_lower for web in ['html', 'css', 'react', 'vue', 'angular', 'web', 'frontend', 'backend']):
            return "Web Development"
        
        # Data Science & ML
        if any(ds in concept_lower for ds in ['machine_learning', 'data_science', 'ai', 'neural', 'deep_learning']):
            return "Data Science & ML"
        
        # Algorithms & DS
        if any(algo in concept_lower for algo in ['algorithm', 'data_structure', 'sorting', 'searching', 'tree', 'graph']):
            return "Algorithms & Data Structures"
        
        # Databases
        if any(db in concept_lower for db in ['sql', 'database', 'postgresql', 'mysql', 'mongodb']):
            return "Databases"
        
        # Default
        return "General"
