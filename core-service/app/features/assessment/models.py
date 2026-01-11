"""
Database models for Assessment and Dynamic Knowledge Evaluation.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base


class Assessment(Base):
    """Assessment session tracking."""
    __tablename__ = "assessments"
    __table_args__ = (
        CheckConstraint("theta_estimate IS NULL OR (theta_estimate >= -5.0 AND theta_estimate <= 5.0)", name="ck_theta_estimate_range"),
        CheckConstraint("theta_se IS NULL OR theta_se >= 0.0", name="ck_theta_se_positive"),
        CheckConstraint("llm_overall_score IS NULL OR (llm_overall_score >= 0.0 AND llm_overall_score <= 1.0)", name="ck_llm_score_range"),
        CheckConstraint("concept_map_score IS NULL OR (concept_map_score >= 0.0 AND concept_map_score <= 1.0)", name="ck_concept_map_score_range"),
        CheckConstraint("status IN ('in_progress', 'completed', 'abandoned')", name="ck_assessment_status"),
    )

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
    __table_args__ = (
        CheckConstraint("discrimination > 0.0 AND discrimination <= 10.0", name="ck_discrimination_range"),
        CheckConstraint("difficulty >= -5.0 AND difficulty <= 5.0", name="ck_difficulty_range"),
        CheckConstraint("correct_index IS NULL OR correct_index >= 0", name="ck_correct_index_positive"),
    )

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
    __table_args__ = (
        CheckConstraint("user_response IN (0, 1)", name="ck_user_response_binary"),
        CheckConstraint("time_taken_seconds IS NULL OR (time_taken_seconds >= 0 AND time_taken_seconds <= 3600)", name="ck_time_taken_range"),
        CheckConstraint("theta_at_response IS NULL OR (theta_at_response >= -5.0 AND theta_at_response <= 5.0)", name="ck_theta_at_response_range"),
    )

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
    __table_args__ = (
        CheckConstraint("mastery_probability >= 0.0 AND mastery_probability <= 1.0", name="ck_mastery_probability_range"),
        CheckConstraint("confidence_level IS NULL OR (confidence_level >= 0.0 AND confidence_level <= 1.0)", name="ck_confidence_level_range"),
    )

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
    __table_args__ = (
        CheckConstraint("mastery_level >= 0.0 AND mastery_level <= 1.0", name="ck_mastery_level_range"),
        CheckConstraint("priority IN ('high', 'medium', 'low')", name="ck_priority_values"),
        CheckConstraint("recommended_difficulty IN ('beginner', 'intermediate', 'advanced')", name="ck_recommended_difficulty_values"),
        CheckConstraint("estimated_study_time > 0", name="ck_study_time_positive"),
    )

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
    __table_args__ = (
        CheckConstraint("difficulty IN ('beginner', 'intermediate', 'advanced')", name="ck_quiz_difficulty_values"),
        CheckConstraint("total_items > 0", name="ck_quiz_total_items_positive"),
        CheckConstraint("status IN ('active', 'completed', 'expired')", name="ck_quiz_status_values"),
    )

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
    __table_args__ = (
        CheckConstraint("score >= 0.0 AND score <= 1.0", name="ck_quiz_score_range"),
        CheckConstraint("correct_count >= 0", name="ck_correct_count_positive"),
        CheckConstraint("total_count > 0", name="ck_total_count_positive"),
        CheckConstraint("correct_count <= total_count", name="ck_correct_lte_total"),
        CheckConstraint("time_taken_minutes IS NULL OR time_taken_minutes >= 0", name="ck_time_taken_positive"),
    )

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    score = Column(Float, nullable=False)  # 0.0 to 1.0
    correct_count = Column(Integer, nullable=False)
    total_count = Column(Integer, nullable=False)
    time_taken_minutes = Column(Integer, nullable=True)
    responses = Column(JSON, nullable=False)  # Detailed response log
    created_at = Column(DateTime, default=datetime.utcnow)

    # IRT ability estimates after quiz
    theta_estimate = Column(Float, nullable=True)  # Updated ability estimate
    theta_se = Column(Float, nullable=True)  # Standard error of estimate
    theta_before = Column(Float, nullable=True)  # Ability before quiz
    mastery_updated = Column(Boolean, default=False)  # Whether BKT mastery was updated

    # Relationships
    quiz = relationship("Quiz", back_populates="results")
    user = relationship("User", back_populates="quiz_results")
