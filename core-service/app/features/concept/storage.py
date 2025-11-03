"""Simple JSON storage for concept metadata (category, difficulty, tags)."""

import json
import os
from pathlib import Path
from typing import Dict, Optional, List
from datetime import datetime

CONCEPTS_DATA_FILE = Path("data/concepts_metadata.json")


class ConceptStorage:
    """Storage layer for concept metadata."""
    
    def __init__(self):
        """Initialize storage and ensure data directory exists."""
        CONCEPTS_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        if not CONCEPTS_DATA_FILE.exists():
            self._save_data({})
    
    def _load_data(self) -> Dict:
        """Load all concept metadata from JSON file."""
        try:
            with open(CONCEPTS_DATA_FILE, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _save_data(self, data: Dict):
        """Save all concept metadata to JSON file."""
        with open(CONCEPTS_DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    
    def save_concept_metadata(
        self,
        concept_id: str,
        label: str,
        description: Optional[str] = None,
        category: str = "General",
        difficulty: str = "Beginner",
        tags: Optional[List[str]] = None
    ):
        """Save concept metadata."""
        data = self._load_data()
        
        now = datetime.utcnow().isoformat()
        if concept_id in data:
            # Update existing
            data[concept_id].update({
                "label": label,
                "description": description,
                "category": category,
                "difficulty": difficulty,
                "tags": tags or [],
                "updated_at": now
            })
        else:
            # Create new
            data[concept_id] = {
                "label": label,
                "description": description,
                "category": category,
                "difficulty": difficulty,
                "tags": tags or [],
                "created_at": now,
                "updated_at": now
            }
        
        self._save_data(data)
    
    def get_concept_metadata(self, concept_id: str) -> Optional[Dict]:
        """Get concept metadata."""
        data = self._load_data()
        return data.get(concept_id)
    
    def get_all_metadata(self) -> Dict:
        """Get all concept metadata."""
        return self._load_data()
    
    def delete_concept_metadata(self, concept_id: str) -> bool:
        """Delete concept metadata."""
        data = self._load_data()
        if concept_id in data:
            del data[concept_id]
            self._save_data(data)
            return True
        return False
    
    def update_concept_metadata(self, concept_id: str, updates: Dict) -> bool:
        """Update specific fields of concept metadata."""
        data = self._load_data()
        if concept_id not in data:
            return False
        
        data[concept_id].update(updates)
        data[concept_id]["updated_at"] = datetime.utcnow().isoformat()
        self._save_data(data)
        return True
