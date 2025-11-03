from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.features.users.users import current_active_user as get_current_user, User
from app.features.learning_path.schemas import (
    LearningPathCreate,
    StartRequest,
    ResumeRequest,
    GraphResponse,
    LearningPathResponse,
    LearningPathKGResponse
)
from app.features.learning_path.service import LearningPathService
from app.features.learning_path import crud
from typing import List

router = APIRouter()
service = LearningPathService()


@router.post("/start", response_model=GraphResponse)
async def start_graph(
    request: StartRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new learning path (requires authentication)"""
    return await service.start_learning_path(db, request.learning_topic, current_user.id)


@router.post("/resume", response_model=GraphResponse)
async def resume_graph(
    request: ResumeRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resume an existing learning path (requires authentication)"""
    try:
        return await service.resume_learning_path(
            db, request.thread_id, request.human_answer, current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{thread_id}", response_model=LearningPathResponse)
async def get_learning_path(
    thread_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get learning path details by conversation thread ID (requires authentication)"""
    db_learning_path = await crud.get_learning_path_by_thread_id(db, thread_id)
    if not db_learning_path:
        raise HTTPException(status_code=404, detail="Learning path not found")
    
    # Verify ownership
    if db_learning_path.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this learning path")
    
    return db_learning_path


@router.get("/{thread_id}/knowledge-graph", response_model=LearningPathKGResponse)
async def get_learning_path_kg(
    thread_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get knowledge graph information for a learning path (requires authentication)"""
    # Verify ownership first
    db_learning_path = await crud.get_learning_path_by_thread_id(db, thread_id)
    if not db_learning_path:
        raise HTTPException(status_code=404, detail="Learning path not found")
    if db_learning_path.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this learning path")
    
    kg_info = await service.get_learning_path_kg_info(db, thread_id)
    if not kg_info:
        raise HTTPException(status_code=404, detail="Learning path not found")
    return kg_info


@router.get("/", response_model=List[LearningPathResponse])
async def list_learning_paths(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's learning paths (requires authentication)"""
    return await crud.get_user_learning_paths(db, current_user.id, skip=skip, limit=limit)

@router.post("/", response_model=LearningPathResponse)
async def create_learning_path(
    request: LearningPathCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new learning path (requires authentication)"""
    # Override user_id with authenticated user
    request.user_id = current_user.id
    return await crud.create_learning_path(db, request)