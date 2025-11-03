# Priority 3: Learning Path Progress Tracking - Implementation Plan

**Date:** November 3, 2025  
**Priority Level:** Medium Impact  
**Status:** 🚀 IN PROGRESS  
**Alignment Gap:** Stage 9C - No automatic progress updates

---

## Executive Summary

**Objective**: Enable automatic learning path progress tracking that updates dynamically as users:
- Complete content from learning paths
- Master concepts through assessments  
- Interact with learning materials

**Current State**:
- ✅ Learning paths exist (LangGraph-generated)
- ✅ Knowledge graph tracks concept mastery
- ✅ Content interactions tracked
- ❌ **No connection between interactions and path progress**
- ❌ **No progress visualization in UI**
- ❌ **Static paths (don't adapt to user progress)**

**Desired State**:
- ✅ Automatic progress calculation from interactions
- ✅ Visual progress bars in learning path UI
- ✅ Dynamic unlocking of next concepts
- ✅ Progress persistence in database
- ✅ Real-time progress updates

---

## Gap Analysis

### Backend Gaps

| Component | Current State | Required State | Status |
|-----------|---------------|----------------|--------|
| Progress Data Model | ❌ Missing | LearningPathProgress table | **To Create** |
| Progress Service | ❌ Missing | Auto-calculate from KG | **To Create** |
| Progress API | ❌ Missing | GET/POST endpoints | **To Create** |
| KG → Progress Sync | ❌ Missing | Auto-update on mastery | **To Create** |

### Frontend Gaps

| Component | Current State | Required State | Status |
|-----------|---------------|----------------|--------|
| Progress Display | ❌ Missing | Progress bars per concept | **To Create** |
| Path Completion | ❌ Missing | Overall % complete | **To Create** |
| Next Concept UI | ❌ Missing | "Unlock Next" button | **To Create** |
| Progress Animation | ❌ Missing | Visual feedback | **To Create** |

---

## Implementation Architecture

### Data Flow

```
User Completes Content
    ↓
ContentInteraction Created (completion_percentage >= 50%)
    ↓
Knowledge Graph Updated (mastery increment)
    ↓
🆕 Learning Path Progress Service
    ↓
Calculate Concept Completion (based on mastery)
    ↓
Update LearningPathProgress Table
    ↓
🆕 Frontend Fetches Progress
    ↓
Display Progress Bars & Unlock Next
```

### Database Schema

```sql
CREATE TABLE learning_path_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user(id),
    thread_id VARCHAR(50) NOT NULL REFERENCES learning_path(conversation_thread_id),
    concept_name VARCHAR(255) NOT NULL,
    mastery_level FLOAT DEFAULT 0.0,  -- 0.0 to 1.0
    status VARCHAR(20) DEFAULT 'not_started',  -- not_started, in_progress, mastered
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    last_interaction_at TIMESTAMP NULL,
    total_time_spent INTEGER DEFAULT 0,  -- seconds
    content_count INTEGER DEFAULT 0,  -- # of related content items completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, thread_id, concept_name)
);

CREATE INDEX idx_learning_path_progress_user ON learning_path_progress(user_id);
CREATE INDEX idx_learning_path_progress_thread ON learning_path_progress(thread_id);
CREATE INDEX idx_learning_path_progress_status ON learning_path_progress(status);
```

---

## Backend Implementation

### Step 1: Create Progress Data Model

**File**: `core-service/app/features/learning_path/progress_models.py`

```python
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database.base import BaseModel
from enum import Enum


class ProgressStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    MASTERED = "mastered"


class LearningPathProgress(BaseModel):
    """Track user progress through learning path concepts"""
    __tablename__ = "learning_path_progress"

    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    thread_id = Column(String(50), ForeignKey("learning_path.conversation_thread_id"), nullable=False, index=True)
    concept_name = Column(String(255), nullable=False)
    
    # Progress metrics
    mastery_level = Column(Float, default=0.0, nullable=False)  # 0.0 to 1.0
    status = Column(String(20), default=ProgressStatus.NOT_STARTED.value, nullable=False, index=True)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_interaction_at = Column(DateTime(timezone=True), nullable=True)
    
    # Statistics
    total_time_spent = Column(Integer, default=0, nullable=False)  # seconds
    content_count = Column(Integer, default=0, nullable=False)  # completed content items
    
    # Unique constraint: one progress record per user/path/concept
    __table_args__ = (
        UniqueConstraint('user_id', 'thread_id', 'concept_name', name='uix_user_thread_concept'),
    )
    
    def __repr__(self):
        return f"<LearningPathProgress(user={self.user_id}, concept={self.concept_name}, mastery={self.mastery_level:.2f}, status={self.status})>"
```

### Step 2: Create Progress Service

**File**: `core-service/app/features/learning_path/progress_service.py`

```python
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import List, Dict, Optional
from app.features.learning_path.progress_models import LearningPathProgress, ProgressStatus
from app.features.users.knowledge.service import UserKnowledgeService


class LearningPathProgressService:
    """Service for tracking and calculating learning path progress"""
    
    def __init__(self, db: Session):
        self.db = db
        self.kg_service = UserKnowledgeService(db)
    
    def initialize_path_progress(self, user_id: int, thread_id: str, concept_names: List[str]) -> List[LearningPathProgress]:
        """
        Initialize progress tracking for all concepts in a learning path.
        Called when a learning path is created.
        """
        progress_records = []
        
        for concept_name in concept_names:
            # Check if progress already exists
            existing = self.db.query(LearningPathProgress).filter(
                and_(
                    LearningPathProgress.user_id == user_id,
                    LearningPathProgress.thread_id == thread_id,
                    LearningPathProgress.concept_name == concept_name
                )
            ).first()
            
            if not existing:
                progress = LearningPathProgress(
                    user_id=user_id,
                    thread_id=thread_id,
                    concept_name=concept_name,
                    mastery_level=0.0,
                    status=ProgressStatus.NOT_STARTED.value
                )
                self.db.add(progress)
                progress_records.append(progress)
        
        self.db.commit()
        return progress_records
    
    def update_concept_progress(
        self, 
        user_id: int, 
        thread_id: str, 
        concept_name: str,
        time_spent: int = 0,
        completed_content: bool = False
    ) -> LearningPathProgress:
        """
        Update progress for a specific concept based on user activity.
        
        Args:
            user_id: User ID
            thread_id: Learning path thread ID
            concept_name: Name of concept to update
            time_spent: Additional seconds spent (optional)
            completed_content: Whether user completed related content (optional)
        
        Returns:
            Updated progress record
        """
        # Get or create progress record
        progress = self.db.query(LearningPathProgress).filter(
            and_(
                LearningPathProgress.user_id == user_id,
                LearningPathProgress.thread_id == thread_id,
                LearningPathProgress.concept_name == concept_name
            )
        ).first()
        
        if not progress:
            progress = LearningPathProgress(
                user_id=user_id,
                thread_id=thread_id,
                concept_name=concept_name
            )
            self.db.add(progress)
        
        # Get mastery from knowledge graph
        kg_mastery = self._get_concept_mastery_from_kg(user_id, concept_name)
        progress.mastery_level = kg_mastery
        
        # Update statistics
        if time_spent > 0:
            progress.total_time_spent += time_spent
        
        if completed_content:
            progress.content_count += 1
        
        # Update status based on mastery
        if progress.mastery_level >= 0.7:
            progress.status = ProgressStatus.MASTERED.value
            if not progress.completed_at:
                progress.completed_at = datetime.utcnow()
        elif progress.mastery_level > 0.0:
            progress.status = ProgressStatus.IN_PROGRESS.value
            if not progress.started_at:
                progress.started_at = datetime.utcnow()
        
        progress.last_interaction_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(progress)
        
        return progress
    
    def _get_concept_mastery_from_kg(self, user_id: int, concept_name: str) -> float:
        """
        Get mastery level for a concept from the knowledge graph.
        
        Returns:
            Mastery level (0.0 to 1.0)
        """
        try:
            # Query knowledge graph for user's mastery of this concept
            knowledge_states = self.kg_service.get_knowledge_state(user_id)
            
            # Find matching concept (case-insensitive)
            for state in knowledge_states:
                if state.concept_name.lower() == concept_name.lower():
                    return state.mastery_level
            
            return 0.0  # Not in KG yet
        except Exception as e:
            print(f"Error getting mastery from KG: {e}")
            return 0.0
    
    def get_path_progress(self, user_id: int, thread_id: str) -> Dict:
        """
        Get overall progress for a learning path.
        
        Returns:
            Dict with overall stats and per-concept progress
        """
        progress_records = self.db.query(LearningPathProgress).filter(
            and_(
                LearningPathProgress.user_id == user_id,
                LearningPathProgress.thread_id == thread_id
            )
        ).all()
        
        if not progress_records:
            return {
                "total_concepts": 0,
                "completed_concepts": 0,
                "in_progress_concepts": 0,
                "overall_progress": 0.0,
                "average_mastery": 0.0,
                "total_time_spent": 0,
                "concepts": []
            }
        
        completed = sum(1 for p in progress_records if p.status == ProgressStatus.MASTERED.value)
        in_progress = sum(1 for p in progress_records if p.status == ProgressStatus.IN_PROGRESS.value)
        total_mastery = sum(p.mastery_level for p in progress_records)
        total_time = sum(p.total_time_spent for p in progress_records)
        
        return {
            "total_concepts": len(progress_records),
            "completed_concepts": completed,
            "in_progress_concepts": in_progress,
            "overall_progress": (completed / len(progress_records)) * 100 if progress_records else 0.0,
            "average_mastery": total_mastery / len(progress_records) if progress_records else 0.0,
            "total_time_spent": total_time,
            "concepts": [
                {
                    "name": p.concept_name,
                    "mastery_level": p.mastery_level,
                    "status": p.status,
                    "time_spent": p.total_time_spent,
                    "content_count": p.content_count,
                    "started_at": p.started_at.isoformat() if p.started_at else None,
                    "completed_at": p.completed_at.isoformat() if p.completed_at else None,
                }
                for p in progress_records
            ]
        }
    
    def get_next_concept(self, user_id: int, thread_id: str) -> Optional[str]:
        """
        Get the next concept to focus on in the learning path.
        
        Returns:
            Concept name or None if all mastered
        """
        progress_records = self.db.query(LearningPathProgress).filter(
            and_(
                LearningPathProgress.user_id == user_id,
                LearningPathProgress.thread_id == thread_id
            )
        ).order_by(LearningPathProgress.created_at).all()
        
        # Find first non-mastered concept
        for progress in progress_records:
            if progress.status != ProgressStatus.MASTERED.value:
                return progress.concept_name
        
        return None  # All concepts mastered!
```

### Step 3: Create Progress API Endpoints

**File**: `core-service/app/features/learning_path/progress_router.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
from app.database import get_db
from app.features.users.users import current_active_user as get_current_user, User
from app.features.learning_path.progress_service import LearningPathProgressService
from pydantic import BaseModel


router = APIRouter(prefix="/progress", tags=["learning-path-progress"])


class UpdateProgressRequest(BaseModel):
    concept_name: str
    time_spent: int = 0
    completed_content: bool = False


@router.get("/{thread_id}")
async def get_learning_path_progress(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get progress for a specific learning path.
    
    Returns overall progress stats and per-concept breakdown.
    """
    service = LearningPathProgressService(db)
    progress = service.get_path_progress(current_user.id, thread_id)
    
    if progress["total_concepts"] == 0:
        raise HTTPException(status_code=404, detail="No progress found for this learning path")
    
    return progress


@router.post("/{thread_id}/update")
async def update_concept_progress(
    thread_id: str,
    request: UpdateProgressRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Update progress for a specific concept in a learning path.
    
    Called automatically when:
    - User completes content related to concept
    - User spends time on concept materials
    - Knowledge graph mastery updates
    """
    service = LearningPathProgressService(db)
    
    progress = service.update_concept_progress(
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
        "content_count": progress.content_count
    }


@router.get("/{thread_id}/next-concept")
async def get_next_concept(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """Get the next recommended concept to study."""
    service = LearningPathProgressService(db)
    next_concept = service.get_next_concept(current_user.id, thread_id)
    
    if not next_concept:
        return {"next_concept": None, "message": "All concepts mastered! 🎉"}
    
    return {"next_concept": next_concept}
```

### Step 4: Register Routes

**File**: `core-service/app/main.py` (add to existing file)

```python
# Add import
from app.features.learning_path.progress_router import router as learning_path_progress_router

# Add to routers list
app.include_router(
    learning_path_progress_router, 
    prefix="/api/v1/learning-path", 
    tags=["learning-path-progress"]
)
```

---

## Frontend Implementation

### Step 1: Create Progress Service

**File**: `learner-web-app/src/services/learningPathProgress.ts`

```typescript
import { API_BASE_URL } from './config';

export interface ConceptProgress {
    name: string;
    mastery_level: number;
    status: 'not_started' | 'in_progress' | 'mastered';
    time_spent: number;
    content_count: number;
    started_at: string | null;
    completed_at: string | null;
}

export interface PathProgress {
    total_concepts: number;
    completed_concepts: number;
    in_progress_concepts: number;
    overall_progress: number;
    average_mastery: number;
    total_time_spent: number;
    concepts: ConceptProgress[];
}

export interface UpdateProgressRequest {
    concept_name: string;
    time_spent?: number;
    completed_content?: boolean;
}

export async function getPathProgress(
    threadId: string,
    accessToken: string
): Promise<PathProgress> {
    const response = await fetch(
        `${API_BASE_URL}/learning-path/progress/${threadId}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch path progress');
    }

    return response.json();
}

export async function updateConceptProgress(
    threadId: string,
    request: UpdateProgressRequest,
    accessToken: string
): Promise<ConceptProgress> {
    const response = await fetch(
        `${API_BASE_URL}/learning-path/progress/${threadId}/update`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(request),
        }
    );

    if (!response.ok) {
        throw new Error('Failed to update concept progress');
    }

    return response.json();
}

export async function getNextConcept(
    threadId: string,
    accessToken: string
): Promise<{ next_concept: string | null; message?: string }> {
    const response = await fetch(
        `${API_BASE_URL}/learning-path/progress/${threadId}/next-concept`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to get next concept');
    }

    return response.json();
}
```

### Step 2: Add Progress Display to Learning Path UI

**File**: `learner-web-app/src/features/learning-path/LearningPathProgress.tsx` (NEW)

```tsx
import { Box, Card, CardContent, Chip, LinearProgress, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon, RadioButtonUnchecked as NotStartedIcon, Schedule as InProgressIcon } from '@mui/icons-material';
import type { ConceptProgress } from '../../services/learningPathProgress';

interface Props {
    concepts: ConceptProgress[];
    overall_progress: number;
}

const STATUS_ICONS = {
    mastered: <CheckCircleIcon sx={{ color: 'success.main' }} />,
    in_progress: <InProgressIcon sx={{ color: 'warning.main' }} />,
    not_started: <NotStartedIcon sx={{ color: 'text.disabled' }} />,
};

const STATUS_COLORS = {
    mastered: { bgcolor: 'success.light', color: 'success.dark' },
    in_progress: { bgcolor: 'warning.light', color: 'warning.dark' },
    not_started: { bgcolor: 'grey.200', color: 'text.secondary' },
};

export default function LearningPathProgress({ concepts, overall_progress }: Props) {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    📊 Learning Path Progress
                </Typography>
                
                {/* Overall Progress */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Overall Completion
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                            {overall_progress.toFixed(1)}%
                        </Typography>
                    </Box>
                    <LinearProgress 
                        variant="determinate" 
                        value={overall_progress} 
                        sx={{ height: 8, borderRadius: 1 }}
                    />
                </Box>

                {/* Per-Concept Progress */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {concepts.map((concept) => (
                        <Box key={concept.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {STATUS_ICONS[concept.status]}
                                    <Typography variant="body2" fontWeight="medium">
                                        {concept.name}
                                    </Typography>
                                </Box>
                                <Chip 
                                    label={concept.status.replace('_', ' ')} 
                                    size="small"
                                    sx={STATUS_COLORS[concept.status]}
                                />
                            </Box>
                            <LinearProgress 
                                variant="determinate" 
                                value={concept.mastery_level * 100} 
                                sx={{ 
                                    height: 6, 
                                    borderRadius: 1,
                                    bgcolor: 'grey.200',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: concept.status === 'mastered' ? 'success.main' : 'primary.main'
                                    }
                                }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Mastery: {(concept.mastery_level * 100).toFixed(0)}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {Math.floor(concept.time_spent / 60)}min spent
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}
```

---

## Testing Checklist

### Backend Tests

- [ ] Create progress record for new learning path
- [ ] Update progress when content completed
- [ ] Mastery level syncs from knowledge graph
- [ ] Status changes (not_started → in_progress → mastered)
- [ ] Overall progress calculation correct
- [ ] Next concept recommendation works

### Frontend Tests

- [ ] Progress bars display correctly
- [ ] Status icons show appropriate colors
- [ ] Overall progress percentage accurate
- [ ] Progress updates in real-time
- [ ] Next concept highlights

### Integration Tests

- [ ] Complete content → Progress updates
- [ ] Assessment completion → Mastery updates
- [ ] Learning path creation → Progress initialized
- [ ] All concepts mastered → Completion celebration

---

## Success Metrics

**Backend:**
- ✅ LearningPathProgress table created
- ✅ 3 API endpoints operational
- ✅ Progress auto-updates from KG

**Frontend:**
- ✅ Progress visualization working
- ✅ Real-time updates
- ✅ Next concept highlighting

**User Experience:**
- ✅ Clear progress visibility
- ✅ Motivational feedback (completion %)
- ✅ Guided learning (next concept)

---

## Implementation Timeline

**Phase 1: Backend (2-3 hours)**
1. Create progress_models.py (30 min)
2. Create progress_service.py (60 min)
3. Create progress_router.py (30 min)
4. Register routes + test (30 min)

**Phase 2: Frontend (2-3 hours)**
1. Create learningPathProgress.ts service (30 min)
2. Create LearningPathProgress.tsx component (60 min)
3. Integrate into LearningPathViewer (30 min)
4. Test + polish UI (30 min)

**Total Estimated Time: 4-6 hours**

---

**Status**: 🚀 READY TO IMPLEMENT  
**Next Step**: Create backend progress models and service
