# Frontend-Backend Alignment Report
**Generated:** November 2, 2025  
**Status:** ⚠️ ISSUES FOUND

## Executive Summary

The frontend and backend have **3 critical misalignments** that need immediate attention:

1. ❌ **Environment Variable Mismatch** - Frontend services use inconsistent env var names
2. ❌ **Authentication Required** - Content Discovery endpoints require auth but frontend doesn't handle 401s properly
3. ⚠️ **Search Response Schema Mismatch** - Minor type differences

---

## 🔴 Critical Issues

### Issue 1: Environment Variable Inconsistency

**Location:** Frontend Services (`src/services/`)

**Problem:**
- `auth.ts` uses `VITE_API_BASE_URL` ✅
- `contentDiscovery.ts` uses `VITE_API_URL` ❌
- `learningPath.ts` uses `VITE_API_URL` ❌
- `.env` file defines `VITE_API_BASE_URL` ✅

**Impact:** 
- Services may fail to connect if environment variable is not set
- Inconsistent behavior across different features

**Fix Required:**
```typescript
// In contentDiscovery.ts and learningPath.ts, change:
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// To:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

---

### Issue 2: Authentication Requirement Not Handled

**Location:** Content Discovery API

**Backend Reality:**
```python
@router.get("/stats")
async def get_stats(
    user: User = Depends(current_active_user),  # ⚠️ REQUIRES AUTH
    db: AsyncSession = Depends(get_db),
) -> Dict:
```

**Frontend Code:**
```typescript
export async function getContentStats(token?: string): Promise<ContentStats> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/content-discovery/stats`,
        {
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),  // Optional token
            },
        }
    );
```

**Test Result:**
```
GET /api/v1/content-discovery/stats
Response: 401 Unauthorized {"detail":"Unauthorized"}
```

**Impact:**
- All Content Discovery endpoints will fail without authentication
- Frontend needs to pass token for ALL requests
- Error handling needs improvement

**Affected Endpoints:**
- ❌ `/content-discovery/search` - Requires auth
- ❌ `/content-discovery/stats` - Requires auth
- ❌ `/content-discovery/contents` - Requires auth
- ❌ `/content-discovery/crawl` - Requires auth
- ❌ `/content-discovery/index` - Requires auth

---

### Issue 3: Search Response Schema Mismatch

**Backend Schema:**
```python
class SearchResponse(BaseModel):
    query: str
    processed_query: str
    user_id: str
    strategy: str
    results: List[Dict[str, Any]]  # Generic dict
    stats: Dict[str, int]
    nlp_analysis: Optional[Dict[str, Any]] = None
```

**Frontend Interface:**
```typescript
export interface SearchResponse {
    query: string;
    processed_query: string;
    user_id: string;
    strategy: string;
    results: SearchResultItem[];  // Typed array
    stats: {
        total_results: number;
        search_time_ms: number;  // Specific keys expected
    };
    nlp_analysis?: {
        entities: string[];
        key_phrases: string[];
        topics: string[];
    };
}
```

**Impact:** Medium - Frontend expects specific structure but backend returns generic dicts

---

## ✅ Correct Alignments

### API Routes
| Feature | Backend Route | Frontend Service | Status |
|---------|--------------|------------------|--------|
| Auth | `/api/v1/auth/jwt/login` | `auth.ts` | ✅ Aligned |
| Auth | `/api/v1/users/me` | `auth.ts` | ✅ Aligned |
| Learning Path | `/api/v1/learning-paths` | `learningPath.ts` | ✅ Aligned |
| Learning Path | `/api/v1/learning-paths/{id}/knowledge-graph` | `learningPath.ts` | ✅ Aligned |
| Content Discovery | `/api/v1/content-discovery/search` | `contentDiscovery.ts` | ✅ Aligned |
| Content Discovery | `/api/v1/content-discovery/stats` | `contentDiscovery.ts` | ✅ Aligned |
| Content Discovery | `/api/v1/content-discovery/contents` | `contentDiscovery.ts` | ✅ Aligned |

### CORS Configuration
✅ **Backend:** `["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]`  
✅ **Frontend Dev Server:** `http://localhost:5173`  
✅ **Status:** Properly configured

### API Prefix
✅ **Backend:** `/api/v1` (defined in `config.py`)  
✅ **Frontend:** `/api/v1` (used in all services)  
✅ **Status:** Consistent

### Data Models - Content Discovery

#### LearningContent Schema
| Field | Backend Type | Frontend Type | Status |
|-------|-------------|---------------|--------|
| id | str | string | ✅ |
| title | str | string | ✅ |
| content_type | str | string | ✅ |
| source | str | string | ✅ |
| url | str | string | ✅ |
| description | str | string | ✅ |
| difficulty | str | string | ✅ |
| duration_minutes | int | number | ✅ |
| tags | List[str] | string[] | ✅ |
| prerequisites | List[str] | string[] | ✅ |
| metadata | Dict[str, Any] | Record<string, unknown> | ✅ |
| created_at | datetime | string | ✅ |
| checksum | Optional[str] | string? | ✅ |

#### SearchRequest Schema
| Field | Backend Type | Frontend Type | Status |
|-------|-------------|---------------|--------|
| query | str | string | ✅ |
| strategy | str (default: "hybrid") | 'bm25' \| 'dense' \| 'hybrid' | ✅ |
| top_k | int (default: 5) | number | ✅ |
| refresh_content | bool (default: False) | boolean | ✅ |
| auto_discover | Optional[bool] | boolean? | ✅ |
| discovery_sources | Optional[List[str]] | string[]? | ✅ |
| use_nlp | bool (default: True) | boolean | ✅ |

---

## 🔧 Required Fixes

### Fix 1: Standardize Environment Variables

**Files to Update:**
- `learner-web-app/src/services/contentDiscovery.ts`
- `learner-web-app/src/services/learningPath.ts`

**Change:**
```typescript
// Change this line in both files:
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// To:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

---

### Fix 2: Make Token Required for Content Discovery

**Files to Update:**
- `learner-web-app/src/services/contentDiscovery.ts`
- `learner-web-app/src/features/content-discovery/ContentDiscovery.tsx`

**Update Service Functions:**
```typescript
// Change from optional to required
export async function searchContent(
    request: SearchRequest,
    token: string  // Remove the ? to make it required
): Promise<SearchResponse> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/content-discovery/search`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,  // Always include
            },
            body: JSON.stringify(request),
        }
    );
    // ... rest of code
}

// Apply same pattern to:
// - getContentStats(token: string)
// - getAllContent(skip, limit, token: string)
// - getRecommendations(token: string)
```

**Update Component:**
```typescript
// In ContentDiscovery.tsx
const handleSearch = useCallback(async (e?: React.FormEvent) => {
    // ... existing code ...
    
    // Check if user is authenticated
    if (!session?.access_token) {
        setError('Please sign in to search for content');
        return;
    }
    
    try {
        const response = await searchContent(
            { /* ... */ },
            session.access_token  // Pass non-optional token
        );
        // ... rest of code
    }
}, [query, searchStrategy, session]);

// Similar pattern for loadRecommendations
```

---

### Fix 3: Add Better Error Handling

**File:** `learner-web-app/src/features/content-discovery/ContentDiscovery.tsx`

**Add Authentication Error Handling:**
```typescript
const handleSearch = useCallback(async (e?: React.FormEvent) => {
    // ... existing code ...
    
    try {
        const response = await searchContent(/* ... */);
        setResults(response.results);
    } catch (err) {
        if (err instanceof Error) {
            if (err.message.includes('Unauthorized') || err.message.includes('401')) {
                setError('Your session has expired. Please sign in again.');
                // Optionally redirect to sign-in
            } else {
                setError(err.message);
            }
        } else {
            setError('Search failed');
        }
    } finally {
        setLoading(false);
    }
}, [query, searchStrategy, session]);
```

---

## 📊 Backend Service Status

### Running Services
✅ Backend Server: Running on `http://localhost:8000`  
✅ Frontend Server: Running on `http://localhost:5173`  
✅ Python Processes: 8 conda processes detected  
✅ Database: SQLite initialized

### Backend Configuration
```python
API_V1_PREFIX: "/api/v1"
CORS_ORIGINS: ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
DATABASE_URL: "sqlite:///./learnora.db"
DEBUG: True
```

### Registered Routers
✅ Learning Paths: `/api/v1/learning-paths`  
✅ Concepts: `/api/v1/concepts`  
✅ User Knowledge: `/api/v1/user-knowledge`  
✅ Users/Auth: `/api/v1/auth/*`, `/api/v1/users/*`  
✅ Assessment: `/api/v1/assessment`  
✅ Content Discovery: `/api/v1/content-discovery`  

---

## 🧪 Testing Checklist

After applying fixes, verify:

- [ ] Content Discovery search works with authentication
- [ ] Stats endpoint returns data
- [ ] Recommendations load properly
- [ ] Error messages display correctly for 401 errors
- [ ] All filters work as expected
- [ ] Search strategies (bm25, dense, hybrid) function correctly
- [ ] Learning Path viewer still works
- [ ] Authentication flow remains intact

---

## 📝 Summary

**Total Issues Found:** 3  
**Critical:** 2  
**Medium:** 1  
**Low:** 0

**Recommendation:** Apply fixes 1 and 2 immediately to ensure Content Discovery works properly. Fix 3 can be applied for better user experience.

**Estimated Fix Time:** 15-20 minutes
