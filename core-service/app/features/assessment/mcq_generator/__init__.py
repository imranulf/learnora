"""MCQ Generator module for creating AI-powered multiple choice questions.

This module provides LLM-based question generation with:
- Structured output validation using Pydantic
- Learning path context integration
- Difficulty-aware question generation
- Integration with the assessment item bank
"""

from app.features.assessment.mcq_generator.schemas import (
    DifficultyLevel,
    MCQOption,
    MCQQuestion,
    MCQGenerationRequest,
    MCQGenerationResponse,
)
from app.features.assessment.mcq_generator.service import (
    MCQGeneratorAgent,
    get_mcq_agent,
)

__all__ = [
    "DifficultyLevel",
    "MCQOption",
    "MCQQuestion",
    "MCQGenerationRequest",
    "MCQGenerationResponse",
    "MCQGeneratorAgent",
    "get_mcq_agent",
]
