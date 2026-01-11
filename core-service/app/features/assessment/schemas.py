"""
Pydantic schemas for Assessment API.
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Any
from datetime import datetime


# --- Item Schemas ---

class ItemBase(BaseModel):
    """Base schema for assessment items."""
    skill: str = Field(..., min_length=1, max_length=100, description="Skill/knowledge component tag")
    discrimination: float = Field(
        ...,
        alias="a",
        gt=0.0,
        le=10.0,
        description="IRT discrimination parameter (must be > 0)"
    )
    difficulty: float = Field(
        ...,
        alias="b",
        ge=-5.0,
        le=5.0,
        description="IRT difficulty parameter (typically in [-5, 5])"
    )
    text: str = Field(..., min_length=1, max_length=10000, description="Item stem/prompt")
    choices: Optional[List[str]] = Field(None, max_length=10, description="Multiple choice options")
    correct_index: Optional[int] = Field(None, ge=0, description="Index of correct choice")


class ItemCreate(ItemBase):
    """Schema for creating an assessment item."""
    item_code: str
    metadata: Optional[Dict[str, Any]] = None


class ItemResponse(ItemBase):
    """Schema for item response."""
    id: int
    item_code: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Assessment Schemas ---

class AssessmentCreate(BaseModel):
    """Schema for creating an assessment session."""
    skill_domain: str
    skills: List[str]


class AssessmentResponse(BaseModel):
    """Schema for assessment response."""
    id: int
    user_id: int
    skill_domain: str
    theta_estimate: Optional[float]
    theta_se: Optional[float]
    llm_overall_score: Optional[float]
    concept_map_score: Optional[float]
    status: str
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AssessmentDashboard(BaseModel):
    """Complete assessment dashboard."""
    assessment_id: int
    ability_estimate: float
    ability_se: float
    mastery: Dict[str, float]
    llm_scores: Dict[str, float]
    llm_overall: float
    self_assessment: Dict[str, float]
    concept_map_score: float
    recommendations: List[str]


# --- Response Schemas ---

class ItemResponseSubmit(BaseModel):
    """Schema for submitting item response."""
    assessment_id: int = Field(..., gt=0, description="Assessment session ID")
    item_code: str = Field(..., min_length=1, max_length=100, description="Item code")
    user_response: int = Field(
        ...,
        ge=0,
        le=1,
        description="1 for correct, 0 for incorrect"
    )
    time_taken_seconds: Optional[int] = Field(
        None,
        ge=0,
        le=3600,  # Max 1 hour per item
        description="Time taken in seconds"
    )


class NextItemResponse(BaseModel):
    """Schema for next item in adaptive test."""
    item_code: str
    text: str
    choices: Optional[List[str]]
    skill: str
    is_last: bool = False
    current_theta: Optional[float] = None


# --- Knowledge State Schemas ---

class KnowledgeStateResponse(BaseModel):
    """Schema for knowledge state."""
    id: int
    skill: str
    mastery_probability: float
    confidence_level: Optional[float]
    last_updated: datetime

    class Config:
        from_attributes = True


# --- Learning Gap Schemas ---

class LearningGapResponse(BaseModel):
    """Schema for learning gap."""
    id: int
    skill: str
    mastery_level: float
    priority: str
    recommended_difficulty: str
    estimated_study_time: int
    rationale: Optional[str]
    is_addressed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Self Assessment Schemas ---

class SelfAssessmentSubmit(BaseModel):
    """Schema for self-assessment submission."""
    confidence: Dict[str, int] = Field(..., description="Skill -> Likert 1-5")

    @field_validator('confidence')
    @classmethod
    def validate_likert_scale(cls, v: Dict[str, int]) -> Dict[str, int]:
        """Validate all confidence values are in Likert 1-5 range."""
        for skill, score in v.items():
            if not isinstance(score, int) or not (1 <= score <= 5):
                raise ValueError(
                    f"Confidence score for '{skill}' must be an integer between 1 and 5, got {score}"
                )
        return v


# --- Concept Map Schemas ---

class ConceptMapEdge(BaseModel):
    """Schema for concept map edge."""
    source: str
    target: str


class ConceptMapSubmit(BaseModel):
    """Schema for concept map submission."""
    edges: List[ConceptMapEdge]


# --- Free Text Assessment Schemas ---

class FreeTextAssessmentSubmit(BaseModel):
    """Schema for free-text assessment submission."""
    assessment_id: int
    response_text: str
    reference_text: str


# --- Quiz Schemas ---

class QuizCreate(BaseModel):
    """Schema for creating a quiz."""
    title: str
    skill: str
    difficulty: str
    total_items: int = 10
    is_adaptive: bool = False


class QuizResponse(BaseModel):
    """Schema for quiz response."""
    id: int
    title: str
    skill: str
    difficulty: str
    total_items: int
    is_adaptive: bool
    status: str
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class QuizSubmit(BaseModel):
    """Schema for quiz submission."""
    quiz_id: int
    responses: List[Dict[str, Any]]


class QuizResultResponse(BaseModel):
    """Schema for quiz result with IRT ability estimates."""
    id: int
    quiz_id: int
    score: float
    correct_count: int
    total_count: int
    time_taken_minutes: Optional[int]
    created_at: datetime

    # IRT ability estimates
    theta_estimate: Optional[float] = None  # Updated ability after quiz
    theta_se: Optional[float] = None  # Standard error
    theta_before: Optional[float] = None  # Ability before quiz
    mastery_updated: bool = False  # Whether BKT was updated

    class Config:
        from_attributes = True


# --- Recommendation Schemas ---

class RecommendationBundleResponse(BaseModel):
    """Schema for recommendation bundle."""
    user_id: str
    assessment_summary: Dict[str, Any]
    learning_gaps: List[LearningGapResponse]
    recommended_content: List[Dict[str, Any]]
    learning_path: List[str]
    estimated_completion_time: int
    next_assessment_trigger: str
    created_at: datetime


# --- Progress Schemas ---

class ProgressUpdate(BaseModel):
    """Schema for progress update."""
    completed_content_ids: List[str]
    learning_time_minutes: int


class ProgressResponse(BaseModel):
    """Schema for progress response."""
    user_id: str
    completed_content: List[str]
    time_invested: int
    timestamp: str
    message: str
