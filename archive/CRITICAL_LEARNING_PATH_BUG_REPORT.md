# Critical Bug Report: Learning Path Progress Service

**Date**: November 4, 2025  
**Status**: 🔴 CRITICAL - Service Broken  
**Impact**: Learning Path Progress endpoint returns 500 errors

---

## Problem Summary

The `LearningPathProgressService` is completely broken due to sync/async mismatch:

```python
# PROBLEM: Using old sync SQLAlchemy syntax
progress_records = self.db.query(LearningPathProgress).filter(...)  # ❌ Won't work

# BUT receiving AsyncSession from router
service = LearningPathProgressService(db)  # db is AsyncSession
```

**Error Message**:
```
AttributeError: 'AsyncSession' object has no attribute 'query'
```

---

## Root Causes

### 1. **Wrong Import** (Line 8)
```python
from sqlalchemy.orm import Session  # ❌ WRONG - this is sync
```

Should be:
```python
from sqlalchemy.ext.asyncio import AsyncSession  # ✅ CORRECT
```

### 2. **All Methods Are Synchronous**
The service has 5 methods that all use `.query()`:
- `initialize_path_progress()` - Line 45
- `update_concept_progress()` - Line 89
- `get_path_progress()` - Line 169
- `get_next_concept()` - Line 224
- `sync_all_progress_from_kg()` - Line 250

### 3. **Router Expects Sync But Passes Async Session**
```python
# Router (lines 82)
async def get_learning_path_progress(...):  # async endpoint
    service = LearningPathProgressService(db)  # passes AsyncSession
    progress = service.get_path_progress(...)  # ❌ calls sync method with async session
```

---

## Why Knowledge Dashboard Shows Empty

**Good News**: The dashboard endpoint works correctly! ✅

It returns empty data because:
1. **No assessment data synced yet** - You need to click "Sync with Latest Assessment" after completing assessments
2. **Only 2 concepts with low scores** - Check `data/user_knowledge_metadata.json`:
   ```json
   {
     "4": {
       "Dancing": { "mastery": "not_started", "score": 0.2 },
       "Skating": { "mastery": "not_started", "score": 0.2 }
     }
   }
   ```
3. **Dashboard may filter out "not_started" concepts** - Check frontend display logic

---

## Solution Options

### Option 1: Convert Service to Async (RECOMMENDED)

**Changes needed**: Convert all 5 methods to async, replace `.query()` with `select()`:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

class LearningPathProgressService:
    def __init__(self, db: AsyncSession):  # AsyncSession
        self.db = db
        self.kg_service = UserKnowledgeService()
    
    async def get_path_progress(self, user_id: int, thread_id: str) -> Dict:  # async
        # Old way (sync)
        # progress_records = self.db.query(LearningPathProgress).filter(...).all()
        
        # New way (async)
        result = await self.db.execute(
            select(LearningPathProgress).where(
                and_(
                    LearningPathProgress.user_id == user_id,
                    LearningPathProgress.thread_id == thread_id
                )
            )
        )
        progress_records = result.scalars().all()
        # ... rest of method
```

**Pros**:
- Consistent with rest of codebase
- Better performance
- Future-proof

**Cons**:
- Requires changing all 5 methods + router calls
- More work (~50-100 lines of changes)

### Option 2: Quick Fix - Make Service Accept Sync Session

Create separate sync session just for this service (NOT RECOMMENDED - technical debt):

```python
from app.database.connection import engine
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)  # Sync session

class LearningPathProgressService:
    def __init__(self, user_id: int = None):
        self.sync_db = Session()  # Create own session
        self.kg_service = UserKnowledgeService()
```

**Pros**:
- Quick fix
- Minimal changes

**Cons**:
- Creates technical debt
- Mixes sync/async in codebase
- Performance issues
- Connection pool problems

---

## Immediate Actions Required

### Step 1: Populate Knowledge Dashboard

To see data in the dashboard:

1. **Complete an assessment**:
   - Navigate to Assessments page
   - Complete at least one assessment
   - This creates `KnowledgeState` records in DB

2. **Sync Knowledge Dashboard**:
   - Go to Knowledge Dashboard
   - Click "Sync with Latest Assessment" button
   - Should update the JSON storage

3. **OR Mark content as complete**:
   - Search for content
   - Click the "Mark as Complete" button
   - This also updates knowledge state

### Step 2: Fix Learning Path Progress Service

**Required Files to Change**:
1. `progress_service.py` - Convert all methods to async
2. `progress_router.py` - Add `await` to service calls

**Estimated Time**: 30-60 minutes

---

## Testing Commands

After fixing, test with:

```bash
# Test Learning Path Progress
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8000/api/v1/learning-paths/progress/THREAD_ID

# Test Knowledge Dashboard
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8000/api/v1/user-knowledge/dashboard?sort_by=last_updated

# Test Sync
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8000/api/v1/user-knowledge/dashboard/sync
```

---

## Files Affected

**Core Files**:
- ❌ `core-service/app/features/learning_path/progress_service.py` (283 lines - BROKEN)
- ✅ `core-service/app/features/users/knowledge/service.py` (304 lines - FIXED)
- ✅ `core-service/app/features/users/knowledge/router.py` (Working)

**Data Files**:
- ✅ `core-service/data/user_knowledge_metadata.json` (Has minimal data)
- ✅ `core-service/learnora.db` (SQLite - has tables)

---

## Current Status

| Feature | Status | Issue |
|---------|--------|-------|
| Knowledge Dashboard GET | ✅ Working | Shows empty (no data populated yet) |
| Knowledge Dashboard Sync | ✅ Fixed | Was 500, now works |
| Learning Path List | ✅ Working | Returns paths correctly |
| Learning Path KG | ✅ Working | Returns knowledge graph |
| **Learning Path Progress** | ❌ **BROKEN** | **Sync/async mismatch** |

---

## Recommendations

1. **Immediate**: Convert `LearningPathProgressService` to async (Option 1)
2. **Short-term**: Populate knowledge dashboard with real data by completing assessments
3. **Long-term**: Audit entire codebase for sync/async consistency

---

## Contact Points

If you need help:
1. Check `FRONTEND_BACKEND_SYNC_AUDIT.md` for complete system overview
2. Run `python simple_test.py` to test all endpoints
3. Check backend logs for specific errors
