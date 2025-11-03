from sqlalchemy import Column, String, Integer, ForeignKey
from app.database.base import BaseModel


class LearningPath(BaseModel):
    """SQLAlchemy model for learning paths"""
    __tablename__ = "learning_path"

    topic = Column(String(255), nullable=False)
    conversation_thread_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)

    def __repr__(self):
        return f"<LearningPath(id={self.id}, topic={self.topic}, conversation_thread_id={self.conversation_thread_id}, user_id={self.user_id})>"