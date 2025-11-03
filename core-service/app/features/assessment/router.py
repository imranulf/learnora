"""
FastAPI router for Assessment and Dynamic Knowledge Evaluation endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.database.session import get_db as get_async_session
from app.features.users.users import current_active_user as get_current_user
from app.features.users.models import User

from .models import (
    Assessment, AssessmentItem, AssessmentResponse as DBAssessmentResponse,
    KnowledgeState, LearningGap, Quiz, QuizResult
)
from .schemas import (
    AssessmentCreate, AssessmentResponse, AssessmentDashboard,
    ItemCreate, ItemResponse, ItemResponseSubmit, NextItemResponse,
    KnowledgeStateResponse, LearningGapResponse,
    SelfAssessmentSubmit, ConceptMapSubmit, FreeTextAssessmentSubmit,
    QuizCreate, QuizResponse, QuizSubmit, QuizResultResponse,
    RecommendationBundleResponse, ProgressUpdate, ProgressResponse
)
from .dke import (
    ItemBank, Item, CATEngine, CATConfig, CATState,
    KnowledgeTracer, BKTParams, SelfAssessment as DKESelfAssessment,
    DKEPipeline, Rubric
)
from .integration import AdaptiveLearningPipeline, DKEContentAdapter

router = APIRouter(prefix="/assessment", tags=["assessment"])


# ----------------------------
# Helper Functions
# ----------------------------

async def get_user_item_bank(db: AsyncSession, skill_domain: str) -> ItemBank:
    """Load item bank for a skill domain from database."""
    result = await db.execute(
        select(AssessmentItem).where(
            AssessmentItem.skill.in_([skill_domain]),
            AssessmentItem.is_active == True
        )
    )
    items = result.scalars().all()
    
    bank = ItemBank()
    for db_item in items:
        item = Item(
            id=db_item.item_code,
            skill=db_item.skill,
            a=db_item.discrimination,
            b=db_item.difficulty,
            text=db_item.text,
            choices=db_item.choices,
            correct_index=db_item.correct_index
        )
        bank.add(item)
    
    return bank


# ----------------------------
# Item Management Endpoints
# ----------------------------

@router.post("/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment_item(
    item: ItemCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new assessment item in the item bank."""
    db_item = AssessmentItem(
        item_code=item.item_code,
        skill=item.skill,
        discrimination=item.discrimination,
        difficulty=item.difficulty,
        text=item.text,
        choices=item.choices,
        correct_index=item.correct_index,
        metadata=item.metadata
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


@router.get("/items", response_model=List[ItemResponse])
async def list_assessment_items(
    skill: str = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """List all assessment items, optionally filtered by skill."""
    query = select(AssessmentItem).where(AssessmentItem.is_active == True)
    if skill:
        query = query.where(AssessmentItem.skill == skill)
    
    result = await db.execute(query)
    items = result.scalars().all()
    return items


# ----------------------------
# Assessment Session Endpoints
# ----------------------------

@router.post("/sessions", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment_session(
    assessment_data: AssessmentCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Start a new assessment session."""
    db_assessment = Assessment(
        user_id=current_user.id,
        skill_domain=assessment_data.skill_domain,
        status="in_progress"
    )
    db.add(db_assessment)
    await db.commit()
    await db.refresh(db_assessment)
    
    # Initialize knowledge states for skills
    for skill in assessment_data.skills:
        knowledge_state = KnowledgeState(
            user_id=current_user.id,
            assessment_id=db_assessment.id,
            skill=skill,
            mastery_probability=0.2  # BKT default initial
        )
        db.add(knowledge_state)
    
    await db.commit()
    return db_assessment


@router.get("/sessions/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment_session(
    assessment_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get assessment session details."""
    result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.user_id == current_user.id
        )
    )
    assessment = result.scalar_one_or_none()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return assessment


@router.get("/sessions", response_model=List[AssessmentResponse])
async def list_assessment_sessions(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """List all assessment sessions for current user."""
    result = await db.execute(
        select(Assessment).where(Assessment.user_id == current_user.id)
        .order_by(Assessment.created_at.desc())
    )
    assessments = result.scalars().all()
    return assessments


# ----------------------------
# Adaptive Testing Endpoints
# ----------------------------

@router.get("/sessions/{assessment_id}/next-item", response_model=NextItemResponse)
async def get_next_adaptive_item(
    assessment_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get next item in adaptive test using CAT algorithm."""
    # Get assessment
    result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.user_id == current_user.id
        )
    )
    assessment = result.scalar_one_or_none()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if assessment.status != "in_progress":
        raise HTTPException(status_code=400, detail="Assessment is not in progress")
    
    # Load item bank
    bank = await get_user_item_bank(db, assessment.skill_domain)
    
    if not bank.items:
        raise HTTPException(status_code=404, detail="No items found for this skill domain")
    
    # Get previous responses
    result = await db.execute(
        select(DBAssessmentResponse).where(
            DBAssessmentResponse.assessment_id == assessment_id
        )
    )
    responses = result.scalars().all()
    
    # Build CAT state
    cat_state = CATState(
        asked=[r.item.item_code for r in responses],
        responses={r.item.item_code: r.user_response for r in responses},
        theta=assessment.theta_estimate or 0.0,
        se=assessment.theta_se or float("inf")
    )
    
    # Select next item
    cat_config = CATConfig(max_items=15, se_stop=0.35)
    cat_engine = CATEngine(bank, cat_config)
    
    next_item = cat_engine.select_next(cat_state)
    
    if not next_item:
        # Assessment complete
        assessment.status = "completed"
        assessment.completed_at = datetime.utcnow()
        await db.commit()
        
        return NextItemResponse(
            item_code="",
            text="Assessment complete",
            choices=None,
            skill="",
            is_last=True,
            current_theta=cat_state.theta
        )
    
    return NextItemResponse(
        item_code=next_item.id,
        text=next_item.text,
        choices=next_item.choices,
        skill=next_item.skill,
        is_last=False,
        current_theta=cat_state.theta
    )


@router.post("/sessions/{assessment_id}/respond")
async def submit_item_response(
    assessment_id: int,
    response_data: ItemResponseSubmit,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Submit response to an assessment item and update ability estimate."""
    # Get assessment
    result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.user_id == current_user.id
        )
    )
    assessment = result.scalar_one_or_none()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Get item
    result = await db.execute(
        select(AssessmentItem).where(AssessmentItem.item_code == response_data.item_code)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Save response
    db_response = DBAssessmentResponse(
        assessment_id=assessment_id,
        item_id=item.id,
        user_response=response_data.user_response,
        time_taken_seconds=response_data.time_taken_seconds,
        theta_at_response=assessment.theta_estimate
    )
    db.add(db_response)
    
    # Update theta using CAT engine
    bank = await get_user_item_bank(db, assessment.skill_domain)
    result = await db.execute(
        select(DBAssessmentResponse).where(
            DBAssessmentResponse.assessment_id == assessment_id
        )
    )
    all_responses = result.scalars().all()
    
    cat_state = CATState(
        asked=[r.item.item_code for r in all_responses] + [response_data.item_code],
        responses={r.item.item_code: r.user_response for r in all_responses} | 
                  {response_data.item_code: response_data.user_response},
        theta=assessment.theta_estimate or 0.0
    )
    
    cat_config = CATConfig(max_items=15, se_stop=0.35)
    cat_engine = CATEngine(bank, cat_config)
    new_theta, new_se = cat_engine.update_theta(cat_state)
    
    assessment.theta_estimate = new_theta
    assessment.theta_se = new_se
    
    # Update knowledge state (BKT)
    result = await db.execute(
        select(KnowledgeState).where(
            KnowledgeState.assessment_id == assessment_id,
            KnowledgeState.skill == item.skill
        )
    )
    knowledge_state = result.scalar_one_or_none()
    
    if knowledge_state:
        kt = KnowledgeTracer([item.skill])
        kt.state.mastery[item.skill] = knowledge_state.mastery_probability
        kt.update(item.skill, response_data.user_response)
        knowledge_state.mastery_probability = kt.state.mastery[item.skill]
    
    await db.commit()
    
    return {
        "message": "Response recorded",
        "new_theta": new_theta,
        "new_se": new_se,
        "mastery_updated": knowledge_state is not None
    }


# ----------------------------
# Knowledge State Endpoints
# ----------------------------

@router.get("/knowledge-state", response_model=List[KnowledgeStateResponse])
async def get_knowledge_states(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get current knowledge states for all skills."""
    result = await db.execute(
        select(KnowledgeState).where(KnowledgeState.user_id == current_user.id)
        .order_by(KnowledgeState.last_updated.desc())
    )
    states = result.scalars().all()
    return states


@router.get("/learning-gaps", response_model=List[LearningGapResponse])
async def get_learning_gaps(
    assessment_id: int = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get identified learning gaps, optionally filtered by assessment."""
    query = select(LearningGap).where(
        LearningGap.user_id == current_user.id,
        LearningGap.is_addressed == False
    )
    
    if assessment_id:
        query = query.where(LearningGap.assessment_id == assessment_id)
    
    result = await db.execute(query.order_by(LearningGap.priority.desc()))
    gaps = result.scalars().all()
    return gaps


# ----------------------------
# Dashboard Endpoint
# ----------------------------

@router.get("/sessions/{assessment_id}/dashboard", response_model=AssessmentDashboard)
async def get_assessment_dashboard(
    assessment_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive assessment dashboard."""
    result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.user_id == current_user.id
        )
    )
    assessment = result.scalar_one_or_none()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if not assessment.dashboard_data:
        raise HTTPException(status_code=400, detail="Assessment dashboard not yet generated")
    
    return AssessmentDashboard(
        assessment_id=assessment_id,
        **assessment.dashboard_data
    )


# Note: Additional endpoints for quizzes, recommendations, etc. would follow similar patterns
