"""
DKE + Content Discovery Integration Module for Learnora
========================================================

This module integrates the Dynamic Knowledge Evaluation (DKE) system with the
Content Discovery System to create a complete adaptive learning pipeline.

Workflow:
---------
  [Assessment] --> [Gap Analysis] --> [Content Discovery] 
      --> [Recommendations] --> [Learning] --> [Re-assessment]

This is adapted from the reference implementation for production use with FastAPI.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple, Any
from datetime import datetime

from .dke import (
    DKEPipeline, DKEResult, ItemBank, Item, CATConfig,
    BKTParams, SelfAssessment, Rubric, LLMGrader
)

# Content Discovery imports
try:
    from app.features.content_discovery.service import LearnoraContentDiscovery
    from app.features.content_discovery.models import UserProfile
    CONTENT_DISCOVERY_AVAILABLE = True
except ImportError:
    LearnoraContentDiscovery = None
    UserProfile = None
    CONTENT_DISCOVERY_AVAILABLE = False


# ----------------------------
# Integration Data Structures
# ----------------------------

@dataclass
class LearningGap:
    """Represents a knowledge gap identified by DKE assessment."""
    skill: str
    mastery_level: float  # 0.0 to 1.0 from BKT
    theta_estimate: float  # IRT ability estimate
    priority: str  # "high", "medium", "low"
    recommended_difficulty: str  # "beginner", "intermediate", "advanced"
    estimated_study_time: int  # minutes
    rationale: str


@dataclass
class RecommendationBundle:
    """Package of learning recommendations based on DKE assessment."""
    user_id: str
    assessment_summary: Dict[str, Any]
    learning_gaps: List[LearningGap]
    recommended_content: List[Dict[str, Any]]
    learning_path: List[str]  # ordered sequence of content IDs
    estimated_completion_time: int  # total minutes
    next_assessment_trigger: str  # when to re-assess
    created_at: datetime = field(default_factory=datetime.utcnow)


# ----------------------------
# Integration Engine
# ----------------------------

class DKEContentAdapter:
    """Translates DKE assessment results into content discovery queries."""

    @staticmethod
    def map_mastery_to_difficulty(mastery: float) -> str:
        """Convert BKT mastery probability to content difficulty level."""
        if mastery < 0.4:
            return "beginner"
        elif mastery < 0.7:
            return "intermediate"
        else:
            return "advanced"

    @staticmethod
    def map_theta_to_difficulty(theta: float) -> str:
        """Convert IRT theta to content difficulty level."""
        if theta < -0.5:
            return "beginner"
        elif theta < 0.5:
            return "intermediate"
        else:
            return "advanced"

    @staticmethod
    def prioritize_gaps(mastery: Dict[str, float], llm_scores: Dict[str, float]) -> List[str]:
        """
        Determine which skills need immediate attention.
        Returns list of skills ordered by priority (high to low).
        """
        priorities = []

        # Skills with low mastery get high priority
        for skill, score in mastery.items():
            if score < 0.4:
                priorities.append((skill, "high", score))
            elif score < 0.6:
                priorities.append((skill, "medium", score))
            else:
                priorities.append((skill, "low", score))

        # Sort by priority (high first), then by score (lowest first)
        priority_order = {"high": 0, "medium": 1, "low": 2}
        priorities.sort(key=lambda x: (priority_order[x[1]], x[2]))

        return [skill for skill, _, _ in priorities]

    @staticmethod
    def estimate_study_time(mastery: float, skill: str) -> int:
        """Estimate time needed to improve mastery (in minutes)."""
        gap = 1.0 - mastery
        # Base time: 30 minutes per 0.1 mastery gap
        base_time = int(gap * 300)
        # Minimum 15 minutes, maximum 120 minutes per skill
        return max(15, min(120, base_time))

    def identify_learning_gaps(
        self,
        dke_result: DKEResult
    ) -> List[LearningGap]:
        """Convert DKE results into structured learning gaps."""
        gaps = []

        prioritized_skills = self.prioritize_gaps(
            dke_result.mastery,
            dke_result.llm_scores
        )

        for skill in prioritized_skills:
            mastery = dke_result.mastery[skill]

            # Determine priority based on mastery
            if mastery < 0.4:
                priority = "high"
            elif mastery < 0.6:
                priority = "medium"
            else:
                priority = "low"

            # Only create gap entries for skills that need work
            if mastery < 0.8:
                gap = LearningGap(
                    skill=skill,
                    mastery_level=mastery,
                    theta_estimate=dke_result.theta,
                    priority=priority,
                    recommended_difficulty=self.map_mastery_to_difficulty(mastery),
                    estimated_study_time=self.estimate_study_time(mastery, skill),
                    rationale=f"Current mastery at {mastery:.1%}. "
                              f"Recommended practice with {self.map_mastery_to_difficulty(mastery)} level content."
                )
                gaps.append(gap)

        return gaps

    def create_discovery_queries(
        self,
        learning_gaps: List[LearningGap],
        context: Optional[str] = None
    ) -> List[Tuple[str, str, int]]:
        """
        Generate search queries for content discovery.
        Returns: List of (query, difficulty, time_budget) tuples
        """
        queries = []

        for gap in learning_gaps:
            # Construct search query
            if context:
                query = f"{gap.skill} {context} tutorial practice"
            else:
                query = f"{gap.skill} tutorial practice exercises"

            queries.append((query, gap.recommended_difficulty, gap.estimated_study_time))

        return queries


class AdaptiveLearningPipeline:
    """
    Complete adaptive learning system that combines DKE assessment
    with content discovery and recommendation.
    """

    def __init__(
        self,
        dke_pipeline: Optional[DKEPipeline] = None,
        content_discovery = None,
        adapter: Optional[DKEContentAdapter] = None
    ):
        self.dke = dke_pipeline
        self.discovery = content_discovery
        self.adapter = adapter or DKEContentAdapter()

    def run_assessment_and_recommend(
        self,
        user_id: str,
        response_free_text: str,
        reference_text: str,
        self_assess: SelfAssessment,
        concept_edges: List[Tuple[str, str]],
        required_edges: List[Tuple[str, str]],
        oracle: Callable[[Item], int],
        user_profile: Optional[Any] = None,
        context: Optional[str] = None
    ) -> RecommendationBundle:
        """
        Run complete pipeline: assessment → gap analysis → content recommendation.

        Args:
            user_id: Unique user identifier
            response_free_text: User's free-text response for LLM grading
            reference_text: Reference/ideal answer for comparison
            self_assess: User's self-assessment scores
            concept_edges: User-drawn concept map edges
            required_edges: Expected concept map edges
            oracle: Function that simulates user responses to adaptive test items
            user_profile: Optional user profile for personalization
            context: Optional context to refine content search

        Returns:
            RecommendationBundle with assessment results and content recommendations
        """

        # Step 1: Run DKE Assessment
        if not self.dke:
            raise ValueError("DKE pipeline not initialized. Please provide a DKEPipeline instance.")

        dke_result = self.dke.run(
            response_free_text=response_free_text,
            reference_text=reference_text,
            self_assess=self_assess,
            concept_edges=concept_edges,
            required_edges=required_edges,
            oracle=oracle
        )

        # Step 2: Analyze gaps
        learning_gaps = self.adapter.identify_learning_gaps(dke_result)

        # Step 3: Generate content queries
        queries = self.adapter.create_discovery_queries(learning_gaps, context)

        # Step 4: Discover and rank content
        recommended_content = []
        learning_path = []

        if self.discovery and user_profile:
            for query, difficulty, time_budget in queries:
                # Update profile with time constraint
                if hasattr(user_profile, 'available_time_daily'):
                    user_profile.available_time_daily = time_budget

                try:
                    results = self.discovery.discover_and_personalize(
                        query=query,
                        user_profile=user_profile,
                        strategy="hybrid",
                        top_k=3  # Top 3 per gap
                    )

                    # Filter by difficulty
                    for item in results.get("results", []):
                        if item.get("difficulty") == difficulty:
                            recommended_content.append(item)
                            learning_path.append(item["id"])
                except Exception as e:
                    print(f"Warning: Content discovery failed for query '{query}': {e}")

        # Step 5: Calculate total time estimate
        total_time = sum(gap.estimated_study_time for gap in learning_gaps)

        # Step 6: Determine when to re-assess
        if dke_result.theta < -0.3 or any(g.priority == "high" for g in learning_gaps):
            next_trigger = "after_completing_3_items"
        else:
            next_trigger = "weekly"

        # Create recommendation bundle
        return RecommendationBundle(
            user_id=user_id,
            assessment_summary={
                "theta": dke_result.theta,
                "theta_se": dke_result.theta_se,
                "mastery_scores": dke_result.mastery,
                "llm_overall": dke_result.llm_overall,
                "concept_map_score": dke_result.concept_map_score,
                "recommendations": dke_result.dashboard["recommendations"]
            },
            learning_gaps=learning_gaps,
            recommended_content=recommended_content,
            learning_path=learning_path,
            estimated_completion_time=total_time,
            next_assessment_trigger=next_trigger
        )

    def update_after_learning(
        self,
        user_id: str,
        completed_content_ids: List[str],
        learning_time_minutes: int,
        oracle: Callable[[Item], int]
    ) -> Dict[str, Any]:
        """
        Update knowledge state after user completes learning activities.
        Re-run mini assessment to check progress.

        Returns:
            Progress report with updated mastery levels
        """

        if not self.dke:
            raise ValueError("DKE pipeline not initialized.")

        # Run short re-assessment (fewer items)
        # This is simplified - in production you'd create a mini assessment
        progress = {
            "user_id": user_id,
            "completed_content": completed_content_ids,
            "time_invested": learning_time_minutes,
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Progress tracked. Run full assessment to update mastery."
        }

        return progress
