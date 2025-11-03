"""
Database package initialization (async-only).
Exports commonly used async database components.
"""
from app.database.connection import engine, SessionLocal, init_db, drop_db
from app.database.base import Base, BaseModel
from app.database.session import get_db

# Import all models so they're registered with SQLAlchemy
from app.features.users.users import User  # noqa
from app.features.assessment.models import (  # noqa
    Assessment,
    AssessmentItem,
    AssessmentResponse,
    KnowledgeState,
    LearningGap,
    Quiz,
    QuizResult,
)

__all__ = [
    "engine",
    "SessionLocal",
    "Base",
    "BaseModel",
    "get_db",
    "init_db",
    "drop_db",
]
