"""Dashboard API router for aggregated user statistics."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
from datetime import datetime, timedelta

from app.database.session import get_db as get_async_session
from app.features.users.users import current_active_user
from app.features.users.models import User
from app.features.learning_path.models import LearningPath
from app.features.assessment.models import Assessment, KnowledgeState
from app.features.users.knowledge.service import UserKnowledgeService
from app.features.users.preferences import ContentInteraction

from .schemas import DashboardStatsResponse, RecentActivity, QuickAction

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """
    Get comprehensive dashboard statistics for the home page.
    
    Returns aggregated data from:
    - Learning paths (active count)
    - User knowledge (concepts learned count)
    - Assessments (completed count)
    - Knowledge states (average mastery)
    - Recent activity feed
    """
    user_id = current_user.id
    
    # 1. Get active learning paths count
    result = await db.execute(
        select(func.count(LearningPath.id))
        .where(LearningPath.user_id == user_id)
    )
    active_paths = result.scalar() or 0
    
    # 2. Get concepts learned count (from user knowledge service)
    uk_service = UserKnowledgeService()
    try:
        uk_dashboard = await uk_service.get_user_knowledge_dashboard(
            user_id=str(user_id),
            mastery_filter="known"
        )
        concepts_learned = uk_dashboard.get("summary", {}).get("known", 0)
    except Exception as e:
        print(f"Error fetching user knowledge: {e}")
        concepts_learned = 0
    
    # 3. Get completed assessments count
    result = await db.execute(
        select(func.count(Assessment.id))
        .where(
            Assessment.user_id == user_id,
            Assessment.status == "completed"
        )
    )
    assessments_completed = result.scalar() or 0
    
    # 4. Get average progress (from knowledge states)
    result = await db.execute(
        select(func.avg(KnowledgeState.mastery_probability))
        .where(KnowledgeState.user_id == user_id)
    )
    avg_mastery = result.scalar()
    average_progress = round(float(avg_mastery) * 100, 1) if avg_mastery else 0.0
    
    # 5. Get recent activity (last 7 days)
    recent_activity = await _get_recent_activity(db, user_id)
    
    # 6. Get quick actions based on user state
    quick_actions = _generate_quick_actions(
        active_paths, concepts_learned, assessments_completed
    )
    
    return DashboardStatsResponse(
        active_paths=active_paths,
        concepts_learned=concepts_learned,
        assessments_completed=assessments_completed,
        average_progress=average_progress,
        recent_activity=recent_activity,
        quick_actions=quick_actions,
        updated_at=datetime.utcnow()
    )


async def _get_recent_activity(
    db: AsyncSession, 
    user_id: int
) -> List[RecentActivity]:
    """Get recent activity for the last 7 days."""
    activities = []
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    # Recent learning paths
    result = await db.execute(
        select(LearningPath)
        .where(
            LearningPath.user_id == user_id,
            LearningPath.created_at >= seven_days_ago
        )
        .order_by(LearningPath.created_at.desc())
        .limit(3)
    )
    paths = result.scalars().all()
    for path in paths:
        activities.append(RecentActivity(
            type="learning_path_created",
            title=f"Started learning {path.topic}",
            description=f"New learning path created",
            timestamp=path.created_at,
            icon="School"
        ))
    
    # Recent completed assessments
    result = await db.execute(
        select(Assessment)
        .where(
            Assessment.user_id == user_id,
            Assessment.status == "completed",
            Assessment.completed_at >= seven_days_ago
        )
        .order_by(Assessment.completed_at.desc())
        .limit(3)
    )
    assessments = result.scalars().all()
    for assessment in assessments:
        activities.append(RecentActivity(
            type="assessment_completed",
            title=f"Completed {assessment.skill_domain} assessment",
            description=f"Ability estimate: {assessment.theta_estimate:.2f}" if assessment.theta_estimate else "Assessment completed",
            timestamp=assessment.completed_at or assessment.created_at,
            icon="Assessment"
        ))
    
    # Recent content interactions (watched/clicked content)
    result = await db.execute(
        select(ContentInteraction)
        .where(
            ContentInteraction.user_id == user_id,
            ContentInteraction.timestamp >= seven_days_ago
        )
        .order_by(ContentInteraction.timestamp.desc())
        .limit(5)
    )
    interactions = result.scalars().all()
    for interaction in interactions:
        # Map interaction type to user-friendly text
        interaction_text = {
            "clicked": "Viewed",
            "viewed": "Watched",
            "completed": "Completed"
        }.get(interaction.interaction_type.value, "Interacted with")
        
        # Create description based on content type and details
        description_parts = []
        if interaction.content_type:
            description_parts.append(f"{interaction.content_type.capitalize()}")
        if interaction.content_duration_minutes and interaction.content_duration_minutes > 0:
            description_parts.append(f"{interaction.content_duration_minutes} min")
        if interaction.completion_percentage and interaction.completion_percentage > 0:
            description_parts.append(f"{interaction.completion_percentage}% complete")
        
        description = " • ".join(description_parts) if description_parts else "Learning content"
        
        activities.append(RecentActivity(
            type=f"content_{interaction.interaction_type.value}",
            title=f"{interaction_text}: {interaction.content_title or 'Content'}",
            description=description,
            timestamp=interaction.timestamp,
            icon="PlayCircle" if interaction.content_type == "video" else "Article"
        ))
    
    # Sort by timestamp and limit to 10
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:10]


def _generate_quick_actions(
    active_paths: int,
    concepts_learned: int,
    assessments_completed: int
) -> List[QuickAction]:
    """Generate personalized quick actions based on user state."""
    actions = []
    
    # Always show create learning path
    actions.append(QuickAction(
        id="create_path",
        title="Create Learning Path",
        description="Start a new AI-guided learning journey",
        icon="School",
        route="/learning-path",
        priority=1 if active_paths == 0 else 3
    ))
    
    # Show assessment if user has paths but few assessments
    if active_paths > 0 and assessments_completed < 3:
        actions.append(QuickAction(
            id="take_assessment",
            title="Take Assessment",
            description="Evaluate your knowledge with adaptive testing",
            icon="Assessment",
            route="/assessment",
            priority=2
        ))
    
    # Show browse concepts if user has started learning
    if concepts_learned > 0 or active_paths > 0:
        actions.append(QuickAction(
            id="browse_concepts",
            title="Browse Knowledge",
            description="Review your learned concepts",
            icon="Psychology",
            route="/user-knowledge",
            priority=3
        ))
    
    # Show content discovery
    actions.append(QuickAction(
        id="discover_content",
        title="Discover Content",
        description="Find learning resources",
        icon="Search",
        route="/content-discovery",
        priority=4
    ))
    
    # Sort by priority
    actions.sort(key=lambda x: x.priority)
    return actions[:4]
