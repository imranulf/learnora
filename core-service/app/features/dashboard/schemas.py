"""Pydantic schemas for dashboard API."""

from pydantic import BaseModel
from typing import List
from datetime import datetime


class RecentActivity(BaseModel):
    """Recent activity item."""
    type: str  # learning_path_created, assessment_completed, concept_learned
    title: str
    description: str
    timestamp: datetime
    icon: str  # Material-UI icon name


class QuickAction(BaseModel):
    """Quick action button."""
    id: str
    title: str
    description: str
    icon: str  # Material-UI icon name
    route: str  # Frontend route
    priority: int  # Lower is higher priority


class DashboardStatsResponse(BaseModel):
    """Dashboard statistics response."""
    active_paths: int
    concepts_learned: int
    assessments_completed: int
    average_progress: float  # 0-100 percentage
    recent_activity: List[RecentActivity]
    quick_actions: List[QuickAction]
    updated_at: datetime
