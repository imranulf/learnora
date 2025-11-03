"""
Learning Path Progress Tracking Models

Tracks user progress through learning path concepts, including:
- Mastery levels (synced from Knowledge Graph)
- Progress status (not_started, in_progress, mastered)
- Time spent and content completion statistics
"""

from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database.base import BaseModel
from enum import Enum


class ProgressStatus(str, Enum):
    """Progress status for learning path concepts"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    MASTERED = "mastered"


class LearningPathProgress(BaseModel):
    """
    Track user progress through learning path concepts.
    
    Progress is automatically calculated from:
    - Knowledge Graph mastery levels
    - Content interaction tracking
    - Time spent on concept materials
    """
    __tablename__ = "learning_path_progress"

    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    thread_id = Column(String(50), ForeignKey("learning_path.conversation_thread_id"), nullable=False, index=True)
    concept_name = Column(String(255), nullable=False)
    
    # Progress metrics
    mastery_level = Column(Float, default=0.0, nullable=False)  # 0.0 to 1.0
    status = Column(String(20), default=ProgressStatus.NOT_STARTED.value, nullable=False, index=True)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_interaction_at = Column(DateTime(timezone=True), nullable=True)
    
    # Statistics
    total_time_spent = Column(Integer, default=0, nullable=False)  # seconds
    content_count = Column(Integer, default=0, nullable=False)  # completed content items
    
    # Unique constraint: one progress record per user/path/concept
    __table_args__ = (
        UniqueConstraint('user_id', 'thread_id', 'concept_name', name='uix_user_thread_concept'),
    )
    
    def __repr__(self):
        return f"<LearningPathProgress(user={self.user_id}, concept={self.concept_name}, mastery={self.mastery_level:.2f}, status={self.status})>"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "thread_id": self.thread_id,
            "concept_name": self.concept_name,
            "mastery_level": self.mastery_level,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "last_interaction_at": self.last_interaction_at.isoformat() if self.last_interaction_at else None,
            "total_time_spent": self.total_time_spent,
            "content_count": self.content_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
