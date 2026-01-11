"""Pydantic schemas for MCQ generation.

Provides request/response models for the MCQ generator agent with
structured output validation.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional
from enum import Enum


class DifficultyLevel(str, Enum):
    """Difficulty levels for MCQ questions."""
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"


class MCQOption(BaseModel):
    """Single MCQ option with four choices."""
    A: str = Field(description="Option A text")
    B: str = Field(description="Option B text")
    C: str = Field(description="Option C text")
    D: str = Field(description="Option D text")


class MCQQuestion(BaseModel):
    """Single multiple-choice question with answer and explanation."""

    question: str = Field(
        description="Clear, conceptual question testing understanding (not rote facts)"
    )
    options: MCQOption = Field(
        description="Four answer options labeled A through D"
    )
    correct_answer: Literal["A", "B", "C", "D"] = Field(
        description="The letter of the correct answer (A, B, C, or D)"
    )
    explanation: str = Field(
        description="Brief explanation of why the correct answer is right and why others are wrong"
    )


class MCQGenerationResponse(BaseModel):
    """Complete response from MCQ generation agent."""

    questions: List[MCQQuestion] = Field(
        description="List of generated MCQ questions",
        min_length=1
    )


class MCQGenerationRequest(BaseModel):
    """Request model for MCQ generation."""

    concept_name: str = Field(
        description="The concept for which questions should be generated"
    )
    concept_description: Optional[str] = Field(
        default=None,
        description="Optional description or summary of the concept"
    )
    difficulty_level: DifficultyLevel = Field(
        default=DifficultyLevel.INTERMEDIATE,
        description="Difficulty level for the questions"
    )
    question_count: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of questions to generate (1-20)"
    )
    learning_path_thread_id: Optional[str] = Field(
        default=None,
        description="Thread ID of the learning path to use for context"
    )
    concept_id: Optional[str] = Field(
        default=None,
        description="Optional concept ID to extract prerequisites from learning path"
    )
    skill_tag: Optional[str] = Field(
        default=None,
        description="Optional skill tag for IRT item bank integration"
    )


class MCQToItemBankRequest(BaseModel):
    """Request to convert generated MCQs to assessment items."""

    questions: List[MCQQuestion] = Field(
        description="MCQ questions to convert"
    )
    skill: str = Field(
        description="Skill/knowledge domain for the items"
    )
    difficulty_level: DifficultyLevel = Field(
        description="Difficulty level (maps to IRT difficulty parameter)"
    )
    item_code_prefix: str = Field(
        default="MCQ",
        description="Prefix for generated item codes"
    )
