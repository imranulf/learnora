"""Storage layer for user knowledge metadata (scores, mastery levels, timestamps)."""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class UserKnowledgeStorage:
    """Manages user knowledge metadata in JSON format."""
    
    def __init__(self, storage_path: str = "data/user_knowledge_metadata.json"):
        """
        Initialize storage.
        
        Args:
            storage_path: Path to JSON storage file
        """
        self.storage_path = Path(storage_path)
        self._ensure_storage_exists()
    
    def _ensure_storage_exists(self) -> None:
        """Ensure storage directory and file exist."""
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.storage_path.exists():
            self._write_data({})
    
    def _read_data(self) -> Dict:
        """Read all data from storage."""
        try:
            with open(self.storage_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _write_data(self, data: Dict) -> None:
        """Write all data to storage."""
        with open(self.storage_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str)
    
    def get_user_knowledge(self, user_id: str) -> Dict[str, Dict]:
        """
        Get all knowledge items for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary mapping concept_id to knowledge metadata
        """
        data = self._read_data()
        return data.get(user_id, {})
    
    def get_concept_knowledge(self, user_id: str, concept_id: str) -> Optional[Dict]:
        """
        Get knowledge metadata for a specific concept.
        
        Args:
            user_id: User identifier
            concept_id: Concept identifier
            
        Returns:
            Knowledge metadata dict or None
        """
        user_data = self.get_user_knowledge(user_id)
        return user_data.get(concept_id)
    
    def save_concept_knowledge(
        self,
        user_id: str,
        concept_id: str,
        mastery: str,
        score: float,
        last_updated: Optional[datetime] = None
    ) -> None:
        """
        Save or update knowledge metadata for a concept.
        
        Args:
            user_id: User identifier
            concept_id: Concept identifier
            mastery: Mastery level (known, learning, not_started)
            score: Score from 0.0 to 1.0
            last_updated: Timestamp (defaults to now)
        """
        data = self._read_data()
        
        if user_id not in data:
            data[user_id] = {}
        
        data[user_id][concept_id] = {
            "concept": concept_id,
            "mastery": mastery,
            "score": score,
            "last_updated": (last_updated or datetime.utcnow()).isoformat()
        }
        
        self._write_data(data)
        logger.info(f"Saved knowledge for user {user_id}, concept {concept_id}")
    
    def update_concept_knowledge(
        self,
        user_id: str,
        concept_id: str,
        mastery: Optional[str] = None,
        score: Optional[float] = None
    ) -> Dict:
        """
        Update existing knowledge metadata.
        
        Args:
            user_id: User identifier
            concept_id: Concept identifier
            mastery: New mastery level (optional)
            score: New score (optional)
            
        Returns:
            Updated knowledge metadata
        """
        data = self._read_data()
        
        if user_id not in data or concept_id not in data[user_id]:
            raise ValueError(f"Knowledge item not found for user {user_id}, concept {concept_id}")
        
        if mastery is not None:
            data[user_id][concept_id]["mastery"] = mastery
        
        if score is not None:
            data[user_id][concept_id]["score"] = score
        
        data[user_id][concept_id]["last_updated"] = datetime.utcnow().isoformat()
        
        self._write_data(data)
        logger.info(f"Updated knowledge for user {user_id}, concept {concept_id}")
        
        return data[user_id][concept_id]
    
    def delete_concept_knowledge(self, user_id: str, concept_id: str) -> None:
        """
        Delete knowledge metadata for a concept.
        
        Args:
            user_id: User identifier
            concept_id: Concept identifier
        """
        data = self._read_data()
        
        if user_id in data and concept_id in data[user_id]:
            del data[user_id][concept_id]
            self._write_data(data)
            logger.info(f"Deleted knowledge for user {user_id}, concept {concept_id}")
    
    def get_all_users(self) -> List[str]:
        """Get list of all user IDs with knowledge data."""
        data = self._read_data()
        return list(data.keys())
