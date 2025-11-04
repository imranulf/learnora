"""
Learning Path Progress API Endpoints

Provides REST API for:
- Fetching learning path progress
- Updating concept progress
- Getting next recommended concept
- Syncing progress with Knowledge Graph
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
from pydantic import BaseModel, Field

from app.database import get_db
from app.features.users.users import current_active_user as get_current_user, User
from app.features.learning_path.progress_service import LearningPathProgressService


router = APIRouter(prefix="/progress", tags=["learning-path-progress"])


# Request/Response Models
class UpdateProgressRequest(BaseModel):
    """Request to update progress for a concept"""
    concept_name: str = Field(..., description="Name of the concept to update")
    time_spent: int = Field(default=0, description="Additional seconds spent on this concept")
    completed_content: bool = Field(default=False, description="Whether user completed related content")


class ConceptProgressResponse(BaseModel):
    """Progress information for a single concept"""
    concept_name: str
    mastery_level: float
    status: str
    total_time_spent: int
    content_count: int


class PathProgressResponse(BaseModel):
    """Overall progress for a learning path"""
    total_concepts: int
    completed_concepts: int
    in_progress_concepts: int
    overall_progress: float
    average_mastery: float
    total_time_spent: int
    concepts: list


class NextConceptResponse(BaseModel):
    """Next recommended concept"""
    next_concept: str | None
    message: str | None = None


# API Endpoints
@router.get("/{thread_id}", response_model=Dict)
async def get_learning_path_progress(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get progress for a specific learning path.
    
    Returns overall progress stats and per-concept breakdown including:
    - Total concepts in path
    - Completed/in-progress counts
    - Overall completion percentage
    - Average mastery level
    - Time spent per concept
    
    Args:
        thread_id: Learning path conversation thread ID
        
    Returns:
        Progress statistics and concept-level details
    """
    service = LearningPathProgressService(db)
    progress = await service.get_path_progress(current_user.id, thread_id)
    
    if progress["total_concepts"] == 0:
        # No progress found - might be a new path
        # Return empty structure instead of 404 to allow initialization
        return progress
    
    return progress


@router.post("/{thread_id}/update", response_model=Dict)
async def update_concept_progress(
    thread_id: str,
    request: UpdateProgressRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Update progress for a specific concept in a learning path.
    
    This endpoint is called automatically when:
    - User completes content related to the concept
    - User spends time on concept materials
    - Knowledge graph mastery levels are updated
    
    Progress is calculated by:
    1. Fetching current mastery from Knowledge Graph
    2. Updating time spent and content count
    3. Determining status (not_started → in_progress → mastered)
    
    Args:
        thread_id: Learning path conversation thread ID
        request: Progress update details (concept, time, completion)
        
    Returns:
        Updated concept progress information
    """
    service = LearningPathProgressService(db)
    
    try:
        progress = await service.update_concept_progress(
            user_id=current_user.id,
            thread_id=thread_id,
            concept_name=request.concept_name,
            time_spent=request.time_spent,
            completed_content=request.completed_content
        )
        
        return {
            "concept_name": progress.concept_name,
            "mastery_level": progress.mastery_level,
            "status": progress.status,
            "total_time_spent": progress.total_time_spent,
            "content_count": progress.content_count,
            "last_interaction_at": progress.last_interaction_at.isoformat() if progress.last_interaction_at else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")


@router.get("/{thread_id}/next-concept", response_model=Dict)
async def get_next_concept(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get the next recommended concept to study in the learning path.
    
    Returns the first non-mastered concept in the path order.
    If all concepts are mastered, returns a completion message.
    
    Args:
        thread_id: Learning path conversation thread ID
        
    Returns:
        Next concept name or completion message
    """
    service = LearningPathProgressService(db)
    next_concept = await service.get_next_concept(current_user.id, thread_id)
    
    if not next_concept:
        return {
            "next_concept": None, 
            "message": "🎉 Congratulations! All concepts mastered!"
        }
    
    return {
        "next_concept": next_concept,
        "message": f"Focus on mastering: {next_concept}"
    }


@router.post("/{thread_id}/sync", response_model=Dict)
async def sync_progress_with_kg(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Sync all concept progress with current Knowledge Graph mastery levels.
    
    Useful for batch updates after:
    - Completing assessments
    - Major learning activities
    - Importing external progress
    
    Args:
        thread_id: Learning path conversation thread ID
        
    Returns:
        Number of concepts updated and new progress stats
    """
    service = LearningPathProgressService(db)
    
    try:
        updated_count = await service.sync_all_progress_from_kg(current_user.id, thread_id)
        progress = await service.get_path_progress(current_user.id, thread_id)
        
        return {
            "updated_concepts": updated_count,
            "message": f"Synced {updated_count} concepts with Knowledge Graph",
            "progress": progress
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync progress: {str(e)}")


@router.post("/{thread_id}/initialize", response_model=Dict)
async def initialize_path_progress(
    thread_id: str,
    concept_names: list[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Initialize progress tracking for a new learning path.
    
    Creates progress records for all concepts in the path.
    Should be called when a learning path is first created.
    
    Args:
        thread_id: Learning path conversation thread ID
        concept_names: List of concept names in the path
        
    Returns:
        Number of concepts initialized
    """
    service = LearningPathProgressService(db)
    
    try:
        progress_records = await service.initialize_path_progress(
            user_id=current_user.id,
            thread_id=thread_id,
            concept_names=concept_names
        )
        
        return {
            "initialized_concepts": len(progress_records),
            "concept_names": concept_names,
            "message": f"Progress tracking initialized for {len(progress_records)} concepts"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize progress: {str(e)}")
