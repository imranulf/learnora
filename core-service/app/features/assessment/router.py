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

async def get_user_current_theta(db: AsyncSession, user_id, skill: str) -> float:
    """Get user's current ability estimate for a skill.

    Checks recent assessments and quiz results to find the latest theta.
    Returns 0.0 (average ability) if no prior data exists.
    """
    # Check latest assessment with theta estimate for this skill
    result = await db.execute(
        select(Assessment)
        .where(
            Assessment.user_id == user_id,
            Assessment.skill_domain == skill,
            Assessment.theta_estimate.isnot(None)
        )
        .order_by(Assessment.updated_at.desc())
        .limit(1)
    )
    assessment = result.scalar_one_or_none()

    if assessment and assessment.theta_estimate is not None:
        return assessment.theta_estimate

    # Check knowledge state for mastery-based theta approximation
    result = await db.execute(
        select(KnowledgeState)
        .where(
            KnowledgeState.user_id == user_id,
            KnowledgeState.skill == skill
        )
        .order_by(KnowledgeState.last_updated.desc())
        .limit(1)
    )
    knowledge_state = result.scalar_one_or_none()

    if knowledge_state:
        # Convert mastery probability to theta approximation
        # mastery 0.2 -> theta -1.5, mastery 0.5 -> theta 0, mastery 0.8 -> theta 1.5
        mastery = knowledge_state.mastery_probability
        theta = (mastery - 0.5) * 3.0  # Linear mapping
        return max(-3.0, min(3.0, theta))  # Clamp to reasonable range

    return 0.0  # Default: average ability


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


# ----------------------------
# Quiz Endpoints
# ----------------------------

@router.post("/quizzes", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_data: QuizCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new quiz.

    For adaptive quizzes (is_adaptive=True):
    - Uses CAT engine to select items based on user's current ability
    - Items are selected to maximize information at user's theta level
    - Provides personalized difficulty matching

    For non-adaptive quizzes:
    - Random selection from available items
    """
    import random

    # Validate difficulty
    valid_difficulties = ['beginner', 'intermediate', 'advanced']
    if quiz_data.difficulty.lower() not in valid_difficulties:
        raise HTTPException(
            status_code=400,
            detail=f"Difficulty must be one of: {', '.join(valid_difficulties)}"
        )

    # Get items for the quiz (filter by skill)
    result = await db.execute(
        select(AssessmentItem).where(
            AssessmentItem.skill == quiz_data.skill,
            AssessmentItem.is_active == True
        )
    )
    available_items = result.scalars().all()

    if len(available_items) < quiz_data.total_items:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough items available. Found {len(available_items)}, need {quiz_data.total_items}"
        )

    # Get user's current ability estimate
    user_theta = await get_user_current_theta(db, current_user.id, quiz_data.skill)

    if quiz_data.is_adaptive:
        # CAT-based adaptive item selection
        # Build item bank from available items
        bank = ItemBank()
        for db_item in available_items:
            item = Item(
                id=str(db_item.id),
                skill=db_item.skill,
                a=db_item.discrimination,
                b=db_item.difficulty,
                text=db_item.text,
                choices=db_item.choices,
                correct_index=db_item.correct_index
            )
            bank.add(item)

        # Use CAT engine to select items with maximum information
        cat_config = CATConfig(max_items=quiz_data.total_items, se_stop=0.3)
        cat_engine = CATEngine(bank, cat_config)

        selected_item_ids = []
        cat_state = CATState(asked=[], responses={}, theta=user_theta, se=float("inf"))

        # Select items one by one using Fisher information
        for _ in range(quiz_data.total_items):
            next_item = cat_engine.select_next(cat_state)
            if next_item:
                selected_item_ids.append(int(next_item.id))
                cat_state.asked.append(next_item.id)
                # Simulate neutral response for next selection (doesn't affect actual quiz)
                cat_state.responses[next_item.id] = 0
            else:
                break

        # If CAT couldn't select enough items, fill with random
        if len(selected_item_ids) < quiz_data.total_items:
            remaining_items = [i for i in available_items if i.id not in selected_item_ids]
            needed = quiz_data.total_items - len(selected_item_ids)
            if remaining_items:
                extra = random.sample(remaining_items, min(needed, len(remaining_items)))
                selected_item_ids.extend([i.id for i in extra])

        item_ids = selected_item_ids
    else:
        # Non-adaptive: Random selection with difficulty-based filtering
        difficulty_ranges = {
            'beginner': (-3.0, -0.5),
            'intermediate': (-0.5, 0.5),
            'advanced': (0.5, 3.0)
        }
        diff_range = difficulty_ranges.get(quiz_data.difficulty.lower(), (-3.0, 3.0))

        # Filter items by difficulty range
        filtered_items = [
            i for i in available_items
            if diff_range[0] <= i.difficulty <= diff_range[1]
        ]

        # Fall back to all items if not enough in range
        if len(filtered_items) < quiz_data.total_items:
            filtered_items = available_items

        selected_items = random.sample(filtered_items, quiz_data.total_items)
        item_ids = [item.id for item in selected_items]

    # Create quiz with initial theta stored
    db_quiz = Quiz(
        user_id=current_user.id,
        title=quiz_data.title,
        skill=quiz_data.skill,
        difficulty=quiz_data.difficulty.lower(),
        items=item_ids,
        total_items=quiz_data.total_items,
        is_adaptive=quiz_data.is_adaptive,
        status="active"
    )
    db.add(db_quiz)
    await db.commit()
    await db.refresh(db_quiz)

    return db_quiz


@router.get("/quizzes", response_model=List[QuizResponse])
async def list_quizzes(
    status_filter: str = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """List all quizzes for current user."""
    query = select(Quiz).where(Quiz.user_id == current_user.id)

    if status_filter:
        query = query.where(Quiz.status == status_filter)

    result = await db.execute(query.order_by(Quiz.created_at.desc()))
    quizzes = result.scalars().all()
    return quizzes


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get quiz details."""
    result = await db.execute(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.user_id == current_user.id
        )
    )
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return quiz


@router.get("/quizzes/{quiz_id}/items", response_model=List[ItemResponse])
async def get_quiz_items(
    quiz_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get all items for a quiz."""
    # Get quiz
    result = await db.execute(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.user_id == current_user.id
        )
    )
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Get items
    result = await db.execute(
        select(AssessmentItem).where(AssessmentItem.id.in_(quiz.items))
    )
    items = result.scalars().all()

    return items


@router.post("/quizzes/{quiz_id}/submit", response_model=QuizResultResponse)
async def submit_quiz(
    quiz_id: int,
    submission: QuizSubmit,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Submit quiz responses and get results.

    This endpoint:
    1. Grades quiz responses
    2. Updates user's ability estimate (theta) using IRT 2PL MLE
    3. Updates BKT mastery probability for the skill
    4. Stores detailed results for learning analytics
    """
    # Get quiz
    result = await db.execute(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.user_id == current_user.id
        )
    )
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.status != "active":
        raise HTTPException(status_code=400, detail="Quiz is not active")

    # Get items for grading
    result = await db.execute(
        select(AssessmentItem).where(AssessmentItem.id.in_(quiz.items))
    )
    db_items = {item.id: item for item in result.scalars().all()}

    # Get user's current ability estimate before quiz
    theta_before = await get_user_current_theta(db, current_user.id, quiz.skill)

    # Grade responses and build response map for IRT
    correct_count = 0
    response_log = []
    response_map = {}  # item_id -> 1 (correct) or 0 (incorrect)

    for response in submission.responses:
        item_id = response.get("item_id")
        selected_index = response.get("selected_index")

        if item_id in db_items:
            item = db_items[item_id]
            is_correct = selected_index == item.correct_index
            if is_correct:
                correct_count += 1

            response_log.append({
                "item_id": item_id,
                "selected_index": selected_index,
                "correct_index": item.correct_index,
                "is_correct": is_correct
            })
            response_map[str(item_id)] = 1 if is_correct else 0

    # Calculate basic score
    total_count = len(quiz.items)
    score = correct_count / total_count if total_count > 0 else 0.0

    # --- IRT 2PL Ability Update ---
    # Build item bank for IRT calculation
    bank = ItemBank()
    for item_id, db_item in db_items.items():
        item = Item(
            id=str(item_id),
            skill=db_item.skill,
            a=db_item.discrimination,
            b=db_item.difficulty,
            text=db_item.text,
            choices=db_item.choices,
            correct_index=db_item.correct_index
        )
        bank.add(item)

    # Build CAT state with responses
    cat_state = CATState(
        asked=list(response_map.keys()),
        responses=response_map,
        theta=theta_before,
        se=float("inf")
    )

    # Calculate new theta using MLE
    cat_config = CATConfig(max_items=total_count, se_stop=0.3)
    cat_engine = CATEngine(bank, cat_config)
    new_theta, new_se = cat_engine.update_theta(cat_state)

    # --- BKT Mastery Update ---
    mastery_updated = False

    # Get or create knowledge state for this skill
    result = await db.execute(
        select(KnowledgeState).where(
            KnowledgeState.user_id == current_user.id,
            KnowledgeState.skill == quiz.skill
        ).order_by(KnowledgeState.last_updated.desc())
        .limit(1)
    )
    knowledge_state = result.scalar_one_or_none()

    if knowledge_state:
        # Update existing knowledge state with BKT
        kt = KnowledgeTracer([quiz.skill])
        kt.state.mastery[quiz.skill] = knowledge_state.mastery_probability

        # Update mastery based on each response
        for item_id_str, is_correct in response_map.items():
            kt.update(quiz.skill, is_correct)

        knowledge_state.mastery_probability = kt.state.mastery[quiz.skill]
        knowledge_state.last_updated = datetime.utcnow()
        mastery_updated = True
    else:
        # Create new knowledge state
        kt = KnowledgeTracer([quiz.skill])

        # Update with all responses
        for item_id_str, is_correct in response_map.items():
            kt.update(quiz.skill, is_correct)

        new_knowledge_state = KnowledgeState(
            user_id=current_user.id,
            skill=quiz.skill,
            mastery_probability=kt.state.mastery[quiz.skill]
        )
        db.add(new_knowledge_state)
        mastery_updated = True

    # Create result with IRT estimates
    db_result = QuizResult(
        quiz_id=quiz_id,
        user_id=current_user.id,
        score=score,
        correct_count=correct_count,
        total_count=total_count,
        responses=response_log,
        theta_before=theta_before,
        theta_estimate=new_theta,
        theta_se=new_se,
        mastery_updated=mastery_updated
    )
    db.add(db_result)

    # Update quiz status
    quiz.status = "completed"

    await db.commit()
    await db.refresh(db_result)

    return db_result


@router.get("/quizzes/{quiz_id}/results", response_model=List[QuizResultResponse])
async def get_quiz_results(
    quiz_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get results for a quiz."""
    result = await db.execute(
        select(QuizResult).where(
            QuizResult.quiz_id == quiz_id,
            QuizResult.user_id == current_user.id
        ).order_by(QuizResult.created_at.desc())
    )
    results = result.scalars().all()
    return results


# ----------------------------
# Adaptive Quiz (Item-by-Item) Endpoints
# ----------------------------

@router.get("/quizzes/{quiz_id}/next-item", response_model=NextItemResponse)
async def get_next_quiz_item(
    quiz_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get the next adaptive item for a quiz.

    For adaptive quizzes, items are selected one-by-one based on:
    - User's current ability estimate (theta)
    - Fisher information maximization
    - Items not yet answered

    Returns the next item to present, or signals quiz completion.
    """
    # Get quiz
    result = await db.execute(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.user_id == current_user.id
        )
    )
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.status != "active":
        raise HTTPException(status_code=400, detail="Quiz is not active")

    # Get quiz items
    result = await db.execute(
        select(AssessmentItem).where(AssessmentItem.id.in_(quiz.items))
    )
    db_items = {item.id: item for item in result.scalars().all()}

    # Get existing responses for this quiz (from quiz_progress in metadata or separate tracking)
    # For now, we'll use a simplified approach - track via quiz metadata
    quiz_progress = quiz.quiz_metadata.get("progress", {}) if quiz.quiz_metadata else {}
    answered_items = quiz_progress.get("answered", [])
    current_theta = quiz_progress.get("theta", 0.0)

    # Check if quiz is complete
    if len(answered_items) >= quiz.total_items:
        return NextItemResponse(
            item_code="",
            text="Quiz complete. Please submit to see results.",
            choices=None,
            skill=quiz.skill,
            is_last=True,
            current_theta=current_theta
        )

    if not quiz.is_adaptive:
        # Non-adaptive: return items in order
        for item_id in quiz.items:
            if item_id not in answered_items:
                item = db_items.get(item_id)
                if item:
                    return NextItemResponse(
                        item_code=str(item.id),
                        text=item.text,
                        choices=item.choices,
                        skill=item.skill,
                        is_last=(len(answered_items) + 1 >= quiz.total_items),
                        current_theta=current_theta
                    )

    # Adaptive: use CAT to select next item
    bank = ItemBank()
    for item_id, db_item in db_items.items():
        if item_id not in answered_items:
            item = Item(
                id=str(item_id),
                skill=db_item.skill,
                a=db_item.discrimination,
                b=db_item.difficulty,
                text=db_item.text,
                choices=db_item.choices,
                correct_index=db_item.correct_index
            )
            bank.add(item)

    if not bank.items:
        return NextItemResponse(
            item_code="",
            text="Quiz complete. Please submit to see results.",
            choices=None,
            skill=quiz.skill,
            is_last=True,
            current_theta=current_theta
        )

    # Select next item using Fisher information
    cat_state = CATState(
        asked=[str(i) for i in answered_items],
        responses=quiz_progress.get("responses", {}),
        theta=current_theta,
        se=quiz_progress.get("se", float("inf"))
    )

    cat_config = CATConfig(max_items=quiz.total_items, se_stop=0.3)
    cat_engine = CATEngine(bank, cat_config)
    next_item = cat_engine.select_next(cat_state)

    if not next_item:
        return NextItemResponse(
            item_code="",
            text="Quiz complete. Please submit to see results.",
            choices=None,
            skill=quiz.skill,
            is_last=True,
            current_theta=current_theta
        )

    return NextItemResponse(
        item_code=next_item.id,
        text=next_item.text,
        choices=next_item.choices,
        skill=next_item.skill,
        is_last=(len(answered_items) + 1 >= quiz.total_items),
        current_theta=current_theta
    )


@router.post("/quizzes/{quiz_id}/respond-item")
async def submit_quiz_item_response(
    quiz_id: int,
    item_id: int,
    selected_index: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Submit a single item response for an adaptive quiz.

    Updates the user's ability estimate (theta) after each response
    using IRT 2PL MLE. This enables true adaptive testing where
    each subsequent item is selected based on updated ability.

    Returns:
        - is_correct: Whether the response was correct
        - new_theta: Updated ability estimate
        - new_se: Standard error of the estimate
        - items_remaining: Number of items left in the quiz
    """
    # Get quiz
    result = await db.execute(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.user_id == current_user.id
        )
    )
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.status != "active":
        raise HTTPException(status_code=400, detail="Quiz is not active")

    # Get item
    result = await db.execute(
        select(AssessmentItem).where(AssessmentItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item_id not in quiz.items:
        raise HTTPException(status_code=400, detail="Item not part of this quiz")

    # Get current progress
    quiz_progress = quiz.quiz_metadata.get("progress", {}) if quiz.quiz_metadata else {}
    answered_items = quiz_progress.get("answered", [])
    responses = quiz_progress.get("responses", {})
    current_theta = quiz_progress.get("theta", 0.0)

    # Check if already answered
    if item_id in answered_items:
        raise HTTPException(status_code=400, detail="Item already answered")

    # Grade response
    is_correct = selected_index == item.correct_index

    # Update responses
    answered_items.append(item_id)
    responses[str(item_id)] = 1 if is_correct else 0

    # Update theta using IRT 2PL
    bank = ItemBank()
    result = await db.execute(
        select(AssessmentItem).where(AssessmentItem.id.in_(answered_items))
    )
    for db_item in result.scalars().all():
        bank.add(Item(
            id=str(db_item.id),
            skill=db_item.skill,
            a=db_item.discrimination,
            b=db_item.difficulty,
            text=db_item.text,
            choices=db_item.choices,
            correct_index=db_item.correct_index
        ))

    cat_state = CATState(
        asked=[str(i) for i in answered_items],
        responses=responses,
        theta=current_theta,
        se=float("inf")
    )

    cat_config = CATConfig(max_items=quiz.total_items, se_stop=0.3)
    cat_engine = CATEngine(bank, cat_config)
    new_theta, new_se = cat_engine.update_theta(cat_state)

    # Update quiz progress
    quiz_progress = {
        "answered": answered_items,
        "responses": responses,
        "theta": new_theta,
        "se": new_se
    }

    if quiz.quiz_metadata:
        quiz.quiz_metadata["progress"] = quiz_progress
    else:
        quiz.quiz_metadata = {"progress": quiz_progress}

    # Mark for update (SQLAlchemy JSON mutation detection)
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(quiz, "quiz_metadata")

    await db.commit()

    items_remaining = quiz.total_items - len(answered_items)

    return {
        "is_correct": is_correct,
        "correct_index": item.correct_index,
        "explanation": item.item_metadata.get("explanation") if item.item_metadata else None,
        "new_theta": new_theta,
        "new_se": new_se,
        "items_answered": len(answered_items),
        "items_remaining": items_remaining,
        "quiz_complete": items_remaining == 0
    }


# ----------------------------
# MCQ Generation Endpoints
# ----------------------------

@router.post("/mcq/generate", status_code=status.HTTP_201_CREATED)
async def generate_mcq_questions(
    concept_name: str,
    difficulty: str = "Intermediate",
    question_count: int = 5,
    concept_description: str = None,
    learning_path_thread_id: str = None,
    concept_id: str = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Generate MCQ questions using AI.

    Args:
        concept_name: The concept to generate questions for
        difficulty: Beginner, Intermediate, or Advanced
        question_count: Number of questions (1-20)
        concept_description: Optional context about the concept
        learning_path_thread_id: Optional thread ID for learning path context
        concept_id: Optional concept ID for prerequisite extraction
    """
    from app.features.assessment.mcq_generator import (
        get_mcq_agent,
        DifficultyLevel,
    )

    # Validate difficulty
    try:
        difficulty_level = DifficultyLevel(difficulty)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid difficulty. Must be one of: Beginner, Intermediate, Advanced"
        )

    # Validate question count
    if not 1 <= question_count <= 20:
        raise HTTPException(
            status_code=400,
            detail="Question count must be between 1 and 20"
        )

    try:
        agent = get_mcq_agent()
        result = await agent.generate_mcqs_with_learning_path(
            db=db,
            current_user=current_user,
            concept_name=concept_name,
            difficulty_level=difficulty_level,
            question_count=question_count,
            concept_description=concept_description,
            learning_path_thread_id=learning_path_thread_id,
            concept_id=concept_id,
        )

        return {
            "concept_name": concept_name,
            "difficulty": difficulty,
            "question_count": len(result.questions),
            "questions": [q.model_dump() for q in result.questions]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate MCQ questions: {str(e)}"
        )


@router.post("/mcq/generate-and-save", status_code=status.HTTP_201_CREATED)
async def generate_and_save_mcq_questions(
    concept_name: str,
    skill: str,
    difficulty: str = "Intermediate",
    question_count: int = 5,
    concept_description: str = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Generate MCQ questions and save them to the assessment item bank.

    Args:
        concept_name: The concept to generate questions for
        skill: Skill tag for the item bank
        difficulty: Beginner, Intermediate, or Advanced
        question_count: Number of questions (1-20)
        concept_description: Optional context about the concept
    """
    from app.features.assessment.mcq_generator import (
        get_mcq_agent,
        DifficultyLevel,
    )
    from app.features.assessment.mcq_generator.service import mcq_to_assessment_items

    # Validate difficulty
    try:
        difficulty_level = DifficultyLevel(difficulty)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid difficulty. Must be one of: Beginner, Intermediate, Advanced"
        )

    try:
        # Generate MCQs
        agent = get_mcq_agent()
        result = await agent.generate_mcqs(
            concept_name=concept_name,
            difficulty_level=difficulty_level,
            question_count=question_count,
            concept_description=concept_description,
        )

        # Convert to assessment items
        items_data = mcq_to_assessment_items(
            questions=result.questions,
            skill=skill,
            difficulty_level=difficulty_level,
            item_code_prefix=f"MCQ_{concept_name.replace(' ', '_')[:10]}"
        )

        # Save to database
        saved_items = []
        for item_data in items_data:
            db_item = AssessmentItem(
                item_code=item_data["item_code"],
                skill=item_data["skill"],
                discrimination=item_data["discrimination"],
                difficulty=item_data["difficulty"],
                text=item_data["text"],
                choices=item_data["choices"],
                correct_index=item_data["correct_index"],
                item_metadata=item_data["metadata"]
            )
            db.add(db_item)
            saved_items.append(item_data["item_code"])

        await db.commit()

        return {
            "message": f"Generated and saved {len(saved_items)} MCQ items",
            "concept_name": concept_name,
            "skill": skill,
            "difficulty": difficulty,
            "item_codes": saved_items
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate and save MCQ questions: {str(e)}"
        )
