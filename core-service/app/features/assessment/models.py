"""
Database models for Assessment and Dynamic Knowledge Evaluation.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base


class Assessment(Base):
    """Assessment session tracking."""
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    skill_domain = Column(String(100), nullable=False)  # e.g., "algebra", "probability"
    theta_estimate = Column(Float, nullable=True)  # IRT ability estimate
    theta_se = Column(Float, nullable=True)  # Standard error
    llm_overall_score = Column(Float, nullable=True)
    concept_map_score = Column(Float, nullable=True)
    status = Column(String(20), default="in_progress")  # in_progress, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    dashboard_data = Column(JSON, nullable=True)  # Complete dashboard JSON

    # Relationships
    user = relationship("User", back_populates="assessments")
    responses = relationship("AssessmentResponse", back_populates="assessment", cascade="all, delete-orphan")
    knowledge_states = relationship("KnowledgeState", back_populates="assessment", cascade="all, delete-orphan")
    learning_gaps = relationship("LearningGap", back_populates="assessment", cascade="all, delete-orphan")


class AssessmentItem(Base):
    """Item bank for adaptive testing."""
    __tablename__ = "assessment_items"

    id = Column(Integer, primary_key=True, index=True)
    item_code = Column(String(50), unique=True, nullable=False, index=True)
    skill = Column(String(100), nullable=False, index=True)
    discrimination = Column(Float, nullable=False)  # IRT parameter 'a'
    difficulty = Column(Float, nullable=False)  # IRT parameter 'b'
    text = Column(Text, nullable=False)
    choices = Column(JSON, nullable=True)  # List of answer choices
    correct_index = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    item_metadata = Column(JSON, nullable=True)

    # Relationships
    responses = relationship("AssessmentResponse", back_populates="item")


class AssessmentResponse(Base):
    """User responses to assessment items."""
    __tablename__ = "assessment_responses"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("assessment_items.id"), nullable=False)
    user_response = Column(Integer, nullable=False)  # 1=correct, 0=incorrect
    time_taken_seconds = Column(Integer, nullable=True)
    theta_at_response = Column(Float, nullable=True)  # Ability estimate when item was presented
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assessment = relationship("Assessment", back_populates="responses")
    item = relationship("AssessmentItem", back_populates="responses")


class KnowledgeState(Base):
    """BKT-based knowledge state tracking per skill."""
    __tablename__ = "knowledge_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=True)
    skill = Column(String(100), nullable=False, index=True)
    mastery_probability = Column(Float, nullable=False)  # BKT P(known)
    confidence_level = Column(Float, nullable=True)  # Self-assessment score
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    state_metadata = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="knowledge_states")
    assessment = relationship("Assessment", back_populates="knowledge_states")


class LearningGap(Base):
    """Identified learning gaps from assessment."""
    __tablename__ = "learning_gaps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    skill = Column(String(100), nullable=False, index=True)
    mastery_level = Column(Float, nullable=False)
    priority = Column(String(20), nullable=False)  # high, medium, low
    recommended_difficulty = Column(String(20), nullable=False)  # beginner, intermediate, advanced
    estimated_study_time = Column(Integer, nullable=False)  # minutes
    rationale = Column(Text, nullable=True)
    is_addressed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    addressed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="learning_gaps")
    assessment = relationship("Assessment", back_populates="learning_gaps")


class Quiz(Base):
    """Generated quizzes for practice."""
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    title = Column(String(200), nullable=False)
    skill = Column(String(100), nullable=False)
    difficulty = Column(String(20), nullable=False)
    items = Column(JSON, nullable=False)  # List of item IDs
    total_items = Column(Integer, nullable=False)
    is_adaptive = Column(Boolean, default=False)
    status = Column(String(20), default="active")  # active, completed, expired
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    quiz_metadata = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="quizzes")
    results = relationship("QuizResult", back_populates="quiz", cascade="all, delete-orphan")


class QuizResult(Base):
    """Results from completed quizzes."""
    __tablename__ = "quiz_results"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    score = Column(Float, nullable=False)  # 0.0 to 1.0
    correct_count = Column(Integer, nullable=False)
    total_count = Column(Integer, nullable=False)
    time_taken_minutes = Column(Integer, nullable=True)
    responses = Column(JSON, nullable=False)  # Detailed response log
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    quiz = relationship("Quiz", back_populates="results")
    user = relationship("User", back_populates="quiz_results")
