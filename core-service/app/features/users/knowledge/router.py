"""API router for user knowledge operations."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.features.users.knowledge.service import UserKnowledgeService
from app.features.users.models import User
from app.features.users.users import current_active_user as get_current_user

router = APIRouter()
service = UserKnowledgeService()


class MarkKnownRequest(BaseModel):
    """Request to mark a concept as known."""
    user_id: str
    concept_id: str


class MarkLearningRequest(BaseModel):
    """Request to mark a concept as currently learning."""
    user_id: str
    concept_id: str


class AssignPathRequest(BaseModel):
    """Request to assign a learning path to a user."""
    user_id: str
    thread_id: str


class UserKnowledgeResponse(BaseModel):
    """Response with user knowledge information."""
    user_id: str
    known_concepts: List[str]
    learning_concepts: List[str]


class UserKnowledgeItem(BaseModel):
    """Individual user knowledge item for dashboard."""
    id: str
    concept: str
    mastery: str  # "known", "learning", "not_started"
    score: float  # 0.0 to 1.0
    last_updated: datetime


class UserKnowledgeDashboardResponse(BaseModel):
    """Response for user knowledge dashboard."""
    items: List[UserKnowledgeItem]
    total: int
    summary: dict


class UpdateUserKnowledgeRequest(BaseModel):
    """Request to update user knowledge item."""
    mastery: Optional[str] = None
    score: Optional[float] = None


@router.post("/mark-known")
def mark_concept_known(request: MarkKnownRequest):
    """
    Mark that a user knows a concept.
    
    - **user_id**: The user identifier
    - **concept_id**: The concept identifier
    """
    try:
        service.mark_concept_as_known(request.user_id, request.concept_id)
        return {"message": f"Concept {request.concept_id} marked as known for user {request.user_id}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mark-learning")
def mark_concept_learning(request: MarkLearningRequest):
    """
    Mark that a user is currently learning a concept.
    
    - **user_id**: The user identifier
    - **concept_id**: The concept identifier
    """
    try:
        service.mark_concept_as_learning(request.user_id, request.concept_id)
        return {"message": f"Concept {request.concept_id} marked as learning for user {request.user_id}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/assign-path")
def assign_learning_path(request: AssignPathRequest):
    """
    Assign a learning path to a user.
    
    - **user_id**: The user identifier
    - **thread_id**: The learning path thread identifier
    """
    try:
        service.assign_learning_path_to_user(request.user_id, request.thread_id)
        return {"message": f"Learning path {request.thread_id} assigned to user {request.user_id}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{user_id}", response_model=UserKnowledgeResponse)
def get_user_knowledge(user_id: str):
    """
    Get all knowledge information for a user.
    
    - **user_id**: The user identifier
    """
    # Get known concepts
    known_uris = service.get_user_known_concepts(user_id)
    known_ids = [str(uri).split("#")[-1] for uri in known_uris]
    
    # Get learning concepts
    learning_uris = service.get_user_learning_concepts(user_id)
    learning_ids = [str(uri).split("#")[-1] for uri in learning_uris]
    
    return UserKnowledgeResponse(
        user_id=user_id,
        known_concepts=known_ids,
        learning_concepts=learning_ids
    )


@router.get("/{user_id}/knows/{concept_id}")
def check_user_knows_concept(user_id: str, concept_id: str):
    """
    Check if a user knows a specific concept.
    
    - **user_id**: The user identifier
    - **concept_id**: The concept identifier
    """
    knows = service.user_knows_concept(user_id, concept_id)
    return {
        "user_id": user_id,
        "concept_id": concept_id,
        "knows": knows
    }


@router.get("/dashboard", response_model=UserKnowledgeDashboardResponse)
async def get_user_knowledge_dashboard(
    current_user: User = Depends(get_current_user),
    mastery: Optional[str] = None,
    sort_by: Optional[str] = "last_updated"
):
    """
    Get user knowledge dashboard with mastery and scores.
    
    - **mastery**: Filter by mastery level (known, learning, not_started)
    - **sort_by**: Sort by field (score, last_updated)
    """
    try:
        dashboard_data = await service.get_user_knowledge_dashboard(
            user_id=str(current_user.id),
            mastery_filter=mastery,
            sort_by=sort_by
        )
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/dashboard/{concept_id}")
async def update_user_knowledge_item(
    concept_id: str,
    update_data: UpdateUserKnowledgeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Update a user knowledge item (mastery level or score).
    
    - **concept_id**: The concept identifier
    - **mastery**: New mastery level (optional)
    - **score**: New score (optional)
    """
    try:
        result = await service.update_user_knowledge_item(
            user_id=str(current_user.id),
            concept_id=concept_id,
            mastery=update_data.mastery,
            score=update_data.score
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/dashboard/sync")
async def sync_with_assessment(current_user: User = Depends(get_current_user)):
    """
    Sync user knowledge with latest assessment results.
    
    This endpoint pulls data from the assessment feature and updates
    the user's knowledge state based on their latest test results.
    """
    try:
        result = await service.sync_with_latest_assessment(user_id=str(current_user.id))
        return {
            "message": "Successfully synced with latest assessment",
            "updated_concepts": result.get("updated_concepts", 0),
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
