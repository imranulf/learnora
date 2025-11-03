# Home Dashboard Alignment - Complete Implementation Plan

**Date:** November 2, 2025  
**Status:** 🚨 **Ready for Implementation**  
**Priority:** CRITICAL - Only remaining feature at 0%

---

## 📊 Current State Analysis

### Frontend (`pages/home.tsx`)

**Current Hardcoded Stats:**
```typescript
Active Paths:      0  ❌ Hardcoded
Concepts Learned:  0  ❌ Hardcoded  
Assessments:       0  ❌ Hardcoded
Average Progress:  0% ❌ Hardcoded
```

**Missing Features:**
- ❌ No API calls
- ❌ No data fetching
- ❌ No authentication checks
- ❌ No loading states
- ❌ No error handling
- ❌ No recent activity display
- ❌ Quick Actions are placeholder buttons

---

## 🎯 Available Data Sources (Backend)

### 1. **Learning Paths** ✅ Available
- **Table:** `learning_path`
- **Fields:** 
  - `user_id` (Foreign Key to user)
  - `topic` (Learning path topic)
  - `conversation_thread_id` (Unique identifier)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)
- **CRUD Functions:**
  ```python
  # core-service/app/features/learning_path/crud.py
  async def get_user_learning_paths(db, user_id, skip=0, limit=100)
  ```
- **API Endpoint:** `GET /api/v1/learning-paths` (authenticated, user-scoped)
- **Statistics Available:**
  - Total active paths (count)
  - Recent paths (last 5)
  - Paths created this week/month

### 2. **Assessment** ✅ Available
- **Table:** `assessments`
- **Fields:**
  - `user_id` (Foreign Key to user)
  - `skill_domain` (Assessment topic)
  - `theta_estimate` (IRT ability)
  - `status` (in_progress, completed)
  - `created_at`, `completed_at`
- **API Endpoint:** `GET /api/v1/assessment/sessions` (authenticated)
- **Statistics Available:**
  - Total assessments completed (count where status='completed')
  - Assessments in progress (count where status='in_progress')
  - Recent assessments (last 5)
  - Average theta (ability estimate)
  - Latest assessment result

### 3. **Knowledge State (BKT)** ✅ Available
- **Table:** `knowledge_states`
- **Fields:**
  - `user_id` (Foreign Key)
  - `skill` (Skill name)
  - `mastery_probability` (BKT P(known))
  - `confidence_level` (Self-assessment)
  - `last_updated` (Timestamp)
- **API Endpoint:** `GET /api/v1/assessment/knowledge-state` (authenticated)
- **Statistics Available:**
  - Total skills tracked (count)
  - Mastered skills (count where mastery_probability >= 0.8)
  - Skills in progress (count where 0.3 < mastery_probability < 0.8)
  - Average mastery (mean mastery_probability)

### 4. **User Knowledge Dashboard** ✅ Available
- **Storage:** Hybrid RDF graph + JSON metadata
- **API Endpoint:** `GET /api/v1/user-knowledge/dashboard` (authenticated)
- **Statistics Available:**
  - Total concepts (count)
  - Known concepts (count where mastery='known')
  - Learning concepts (count where mastery='learning')
  - Average score (mean score 0-1)
  - Mastery distribution

### 5. **Learning Gaps** ✅ Available
- **Table:** `learning_gaps`
- **Fields:**
  - `user_id`
  - `skill`
  - `priority` (high, medium, low)
  - `is_addressed` (boolean)
- **API Endpoint:** `GET /api/v1/assessment/learning-gaps` (authenticated)
- **Statistics Available:**
  - Total gaps (count)
  - High priority gaps (count where priority='high')
  - Unaddressed gaps (count where is_addressed=False)

---

## 🏗️ Implementation Plan

### Phase 1: Backend Dashboard Endpoint (2 hours)

#### Step 1.1: Create Dashboard Router (30 mins)

**File:** `core-service/app/features/dashboard/__init__.py`
```python
"""Dashboard feature module."""
```

**File:** `core-service/app/features/dashboard/router.py`
```python
"""Dashboard API router for aggregated user statistics."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
from datetime import datetime, timedelta

from app.database.session import get_db as get_async_session
from app.features.users.users import get_current_user, User
from app.features.learning_path.models import LearningPath
from app.features.assessment.models import Assessment, KnowledgeState
from app.features.users.knowledge.service import UserKnowledgeService

from .schemas import DashboardStatsResponse, RecentActivity, QuickAction

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
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
    uk_dashboard = await uk_service.get_user_knowledge_dashboard(
        user_id=str(user_id),
        mastery_filter="known"
    )
    concepts_learned = uk_dashboard["summary"]["known"]
    
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
            title=f"Started learning path: {path.topic}",
            description=f"New learning path on {path.topic}",
            timestamp=path.created_at,
            icon="school"
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
            title=f"Completed assessment: {assessment.skill_domain}",
            description=f"θ = {assessment.theta_estimate:.2f}" if assessment.theta_estimate else "Assessment completed",
            timestamp=assessment.completed_at,
            icon="assessment"
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
        title="New Learning Path",
        description="Start a new AI-powered learning journey",
        icon="school",
        route="/learning-path",
        priority=1 if active_paths == 0 else 3
    ))
    
    # Show assessment if user has paths but few assessments
    if active_paths > 0 and assessments_completed < 3:
        actions.append(QuickAction(
            id="take_assessment",
            title="Take Assessment",
            description="Evaluate your knowledge with adaptive testing",
            icon="assessment",
            route="/assessment",
            priority=2
        ))
    
    # Show browse concepts if user has started learning
    if concepts_learned > 0 or active_paths > 0:
        actions.append(QuickAction(
            id="browse_concepts",
            title="Browse Concepts",
            description="Explore your knowledge dashboard",
            icon="auto_stories",
            route="/user-knowledge",
            priority=3
        ))
    
    # Show content discovery
    actions.append(QuickAction(
        id="discover_content",
        title="Discover Content",
        description="Find learning resources with AI search",
        icon="search",
        route="/content-discovery",
        priority=4
    ))
    
    # Sort by priority
    actions.sort(key=lambda x: x.priority)
    return actions[:4]
```

#### Step 1.2: Create Dashboard Schemas (15 mins)

**File:** `core-service/app/features/dashboard/schemas.py`
```python
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
```

#### Step 1.3: Register Router (15 mins)

**File:** `core-service/app/main.py`
```python
# Add import
from app.features.dashboard.router import router as dashboard_router

# Add router registration (after other routers)
app.include_router(
    dashboard_router,
    prefix=settings.API_V1_PREFIX,
    tags=["dashboard"]
)
```

#### Step 1.4: Create Count Helper Functions (45 mins)

**File:** `core-service/app/features/dashboard/service.py`
```python
"""Dashboard service with helper functions for statistics."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import Dict, Any

from app.features.learning_path.models import LearningPath
from app.features.assessment.models import Assessment, KnowledgeState, LearningGap


async def get_learning_path_stats(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """Get learning path statistics."""
    # Total count
    result = await db.execute(
        select(func.count(LearningPath.id))
        .where(LearningPath.user_id == user_id)
    )
    total = result.scalar() or 0
    
    # Recent (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    result = await db.execute(
        select(func.count(LearningPath.id))
        .where(
            LearningPath.user_id == user_id,
            LearningPath.created_at >= thirty_days_ago
        )
    )
    recent = result.scalar() or 0
    
    return {
        "total": total,
        "recent_30_days": recent
    }


async def get_assessment_stats(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """Get assessment statistics."""
    # Completed count
    result = await db.execute(
        select(func.count(Assessment.id))
        .where(
            Assessment.user_id == user_id,
            Assessment.status == "completed"
        )
    )
    completed = result.scalar() or 0
    
    # In progress count
    result = await db.execute(
        select(func.count(Assessment.id))
        .where(
            Assessment.user_id == user_id,
            Assessment.status == "in_progress"
        )
    )
    in_progress = result.scalar() or 0
    
    # Average theta (ability estimate)
    result = await db.execute(
        select(func.avg(Assessment.theta_estimate))
        .where(
            Assessment.user_id == user_id,
            Assessment.status == "completed",
            Assessment.theta_estimate.isnot(None)
        )
    )
    avg_theta = result.scalar()
    
    return {
        "completed": completed,
        "in_progress": in_progress,
        "average_ability": round(float(avg_theta), 2) if avg_theta else None
    }


async def get_knowledge_stats(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """Get knowledge state statistics."""
    # Total skills tracked
    result = await db.execute(
        select(func.count(KnowledgeState.id))
        .where(KnowledgeState.user_id == user_id)
    )
    total_skills = result.scalar() or 0
    
    # Mastered skills (mastery >= 0.8)
    result = await db.execute(
        select(func.count(KnowledgeState.id))
        .where(
            KnowledgeState.user_id == user_id,
            KnowledgeState.mastery_probability >= 0.8
        )
    )
    mastered = result.scalar() or 0
    
    # Average mastery
    result = await db.execute(
        select(func.avg(KnowledgeState.mastery_probability))
        .where(KnowledgeState.user_id == user_id)
    )
    avg_mastery = result.scalar()
    
    return {
        "total_skills": total_skills,
        "mastered_skills": mastered,
        "average_mastery": round(float(avg_mastery), 3) if avg_mastery else 0.0
    }


async def get_learning_gap_stats(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """Get learning gap statistics."""
    # Total gaps
    result = await db.execute(
        select(func.count(LearningGap.id))
        .where(
            LearningGap.user_id == user_id,
            LearningGap.is_addressed == False
        )
    )
    total = result.scalar() or 0
    
    # High priority gaps
    result = await db.execute(
        select(func.count(LearningGap.id))
        .where(
            LearningGap.user_id == user_id,
            LearningGap.priority == "high",
            LearningGap.is_addressed == False
        )
    )
    high_priority = result.scalar() or 0
    
    return {
        "total_gaps": total,
        "high_priority_gaps": high_priority
    }
```

---

### Phase 2: Frontend Dashboard Service (1 hour)

#### Step 2.1: Create Dashboard Service (30 mins)

**File:** `learner-web-app/src/services/dashboard.ts`
```typescript
/**
 * Dashboard API service
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

export interface RecentActivity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  priority: number;
}

export interface DashboardStats {
  active_paths: number;
  concepts_learned: number;
  assessments_completed: number;
  average_progress: number;
  recent_activity: RecentActivity[];
  quick_actions: QuickAction[];
  updated_at: string;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(token: string): Promise<DashboardStats> {
  const response = await fetch(
    `${API_BASE_URL}${API_V1_PREFIX}/dashboard/stats`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Please sign in to view dashboard');
    }
    throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
  }

  return response.json();
}
```

#### Step 2.2: Update Home Page Component (30 mins)

**File:** `learner-web-app/src/pages/home.tsx`
```typescript
import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Stack, CircularProgress,
  Alert, List, ListItem, ListItemText, ListItemIcon 
} from '@mui/material';
import { 
  School, AutoStories, Assessment, TrendingUp,
  CheckCircle, ErrorOutline
} from '@mui/icons-material';
import { useSession } from '../hooks/useSession';
import { getDashboardStats, type DashboardStats } from '../services/dashboard';
import { useNavigate } from 'react-router-dom';

// Icon mapping for Material-UI
const iconMap: Record<string, React.ReactNode> = {
  school: <School />,
  assessment: <Assessment />,
  auto_stories: <AutoStories />,
  search: <AutoStories />,
};

export default function DashboardPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const userName = session?.user?.first_name || session?.user?.name || 'Learner';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch dashboard stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.access_token) {
        setError('Please sign in to view your dashboard');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await getDashboardStats(session.access_token);
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session?.access_token]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" icon={<ErrorOutline />}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#667eea' }}>
          Welcome back, {userName}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Continue your learning journey with personalized AI-powered paths
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 4, flexWrap: 'wrap' }}>
        <Paper
          sx={{
            p: 3,
            flex: 1,
            minWidth: 200,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <School sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats?.active_paths || 0}
          </Typography>
          <Typography variant="body2">Active Paths</Typography>
        </Paper>

        <Paper
          sx={{
            p: 3,
            flex: 1,
            minWidth: 200,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <AutoStories sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats?.concepts_learned || 0}
          </Typography>
          <Typography variant="body2">Concepts Learned</Typography>
        </Paper>

        <Paper
          sx={{
            p: 3,
            flex: 1,
            minWidth: 200,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <Assessment sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats?.assessments_completed || 0}
          </Typography>
          <Typography variant="body2">Assessments</Typography>
        </Paper>

        <Paper
          sx={{
            p: 3,
            flex: 1,
            minWidth: 200,
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats?.average_progress?.toFixed(1) || 0}%
          </Typography>
          <Typography variant="body2">Average Progress</Typography>
        </Paper>
      </Stack>

      {/* Main Content */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Recent Activity */}
        <Box sx={{ flex: 2 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Recent Activity
            </Typography>
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              <List>
                {stats.recent_activity.map((activity, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {iconMap[activity.icon] || <CheckCircle />}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.title}
                      secondary={activity.description}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent activity yet. Start learning to see your progress here!
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Sidebar - Quick Actions */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Quick Actions
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {stats?.quick_actions?.map((action) => (
                <Button
                  key={action.id}
                  variant="outlined"
                  fullWidth
                  startIcon={iconMap[action.icon]}
                  onClick={() => navigate(action.route)}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}
                >
                  <Box sx={{ flex: 1, textAlign: 'left' }}>
                    <Typography variant="body1">{action.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
```

---

## ✅ Data Mapping Summary

| Dashboard Stat | Data Source | Backend Table/Service | API Endpoint |
|----------------|-------------|----------------------|--------------|
| **Active Paths** | Learning Path | `learning_path` table | `GET /api/v1/learning-paths` |
| **Concepts Learned** | User Knowledge | User Knowledge Service | `GET /api/v1/user-knowledge/dashboard` |
| **Assessments** | Assessment | `assessments` table | `GET /api/v1/assessment/sessions` |
| **Average Progress** | Knowledge State | `knowledge_states` table | `GET /api/v1/assessment/knowledge-state` |
| **Recent Activity** | Multiple | learning_path, assessments | Aggregated in dashboard endpoint |
| **Quick Actions** | Logic-based | Generated based on user stats | Computed in dashboard endpoint |

---

## 🎯 Implementation Checklist

### Backend ✅
- [ ] Create `app/features/dashboard/__init__.py`
- [ ] Create `app/features/dashboard/router.py` with `/stats` endpoint
- [ ] Create `app/features/dashboard/schemas.py` with Pydantic models
- [ ] Create `app/features/dashboard/service.py` with helper functions
- [ ] Register dashboard router in `app/main.py`
- [ ] Test endpoint with authenticated request

### Frontend ✅
- [ ] Create `src/services/dashboard.ts` with `getDashboardStats()` function
- [ ] Update `src/pages/home.tsx` with real data fetching
- [ ] Add loading states (CircularProgress)
- [ ] Add error handling (Alert component)
- [ ] Add authentication checks (useSession hook)
- [ ] Update Quick Actions to navigate to correct routes
- [ ] Display recent activity with proper icons
- [ ] Test with real backend data

---

## 🚀 Expected Results

### Before Implementation
```
Active Paths:      0 ❌ (hardcoded)
Concepts Learned:  0 ❌ (hardcoded)
Assessments:       0 ❌ (hardcoded)
Average Progress:  0% ❌ (hardcoded)
Recent Activity:   Empty placeholder
Quick Actions:     Non-functional buttons
```

### After Implementation
```
Active Paths:      3 ✅ (from learning_path table)
Concepts Learned:  15 ✅ (from user_knowledge service)
Assessments:       2 ✅ (from assessments table)
Average Progress:  67.3% ✅ (from knowledge_states avg)
Recent Activity:   Last 10 activities with timestamps
Quick Actions:     Functional buttons with smart routing
```

---

## 📊 Alignment Impact

**Current:** 0% (Completely static)  
**After Implementation:** 100% (Fully functional with real data)

**Overall Platform Alignment:**
- Before: 97% (5 of 6 features)
- After: **100%** ✅ (All 6 features complete)

---

## ⏱️ Estimated Implementation Time

| Phase | Task | Time |
|-------|------|------|
| **Backend** | Create dashboard router | 30 mins |
| **Backend** | Create schemas | 15 mins |
| **Backend** | Register router | 15 mins |
| **Backend** | Create service helpers | 45 mins |
| **Backend** | Testing | 15 mins |
| **Frontend** | Create dashboard service | 30 mins |
| **Frontend** | Update home page | 30 mins |
| **Frontend** | Testing | 15 mins |
| **TOTAL** | | **3 hours** |

---

## 🎓 Next Steps

1. **Implement Backend** (2 hours)
   - Create dashboard feature module
   - Implement stats aggregation
   - Test with Postman/curl

2. **Implement Frontend** (1 hour)
   - Create dashboard service
   - Update home page component
   - Test with real data

3. **Integration Testing** (30 mins)
   - Create test user
   - Create learning path
   - Complete assessment
   - Verify dashboard shows real data

4. **Polish** (30 mins)
   - Add animations
   - Improve error messages
   - Add refresh button
   - Add timestamp display

---

## 🏆 Success Criteria

- ✅ All 4 stat cards show real data from database
- ✅ Recent activity displays actual user actions
- ✅ Quick actions navigate to correct pages
- ✅ Loading states work correctly
- ✅ Error handling prevents crashes
- ✅ Authentication required and enforced
- ✅ Data updates on page reload
- ✅ No hardcoded values remain

---

**Ready to implement!** This plan provides complete, production-ready code for achieving 100% platform alignment.
