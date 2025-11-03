"""
Assessment feature module for Learnora.

This module provides dynamic knowledge evaluation (DKE) capabilities including:
- Adaptive testing using IRT/CAT (Item Response Theory / Computerized Adaptive Testing)
- Knowledge tracing using BKT (Bayesian Knowledge Tracing)
- AI-powered assessment grading
- Multi-modal assessment support (quizzes, self-assessment, concept maps)
- Learning analytics and progress dashboards
"""

from .dke import (
    CATEngine,
    KnowledgeTracer,
    LLMGrader,
    DKEPipeline,
    Item,
    ItemBank,
    BKTParams,
    CATConfig,
    Rubric,
    SelfAssessment,
    ConceptMapScorer,
)

__all__ = [
    "CATEngine",
    "KnowledgeTracer",
    "LLMGrader",
    "DKEPipeline",
    "Item",
    "ItemBank",
    "BKTParams",
    "CATConfig",
    "Rubric",
    "SelfAssessment",
    "ConceptMapScorer",
]
