# Assessment Feature Alignment Analysis

**Date:** November 2, 2025  
**Status:** ⚠️ **60% ALIGNED - API Endpoint Mismatch**  
**Priority:** ⚠️ **HIGH - Requires Frontend Update**

---

## 📊 Current Alignment Status

| Component | Backend | Frontend | Status |
|-----------|---------|----------|--------|
| **API Endpoints** | `/api/v1/assessment/*` | `/api/assessment/*` | ❌ Mismatch |
| **Authentication** | ✅ JWT Required | ✅ Token Passed | ✅ Good |
| **Data Models** | Advanced (CAT/BKT/IRT) | Basic | ⚠️ Partial |
| **Functionality** | ✅ Full CAT System | ⚠️ Basic Calls | ⚠️ Underutilized |

---

## 🔍 Detailed Analysis

### **Backend Implementation** ✅

**Router Prefix:** `/assessment` (registered at `{API_V1_PREFIX}/assessment`)  
**Full Path:** `/api/v1/assessment/*`

**Available Endpoints:**

#### 1. **Item Management**
```python
POST   /api/v1/assessment/items              # Create assessment item
GET    /api/v1/assessment/items              # List items (filter by skill)
```

#### 2. **Assessment Sessions** (CAT-based)
```python
POST   /api/v1/assessment/sessions           # Create new session
GET    /api/v1/assessment/sessions/{id}      # Get session details
GET    /api/v1/assessment/sessions           # List user's sessions
```

#### 3. **Adaptive Testing** (Core CAT Functionality)
```python
GET    /api/v1/assessment/sessions/{id}/next-item    # Get next adaptive item
POST   /api/v1/assessment/sessions/{id}/respond      # Submit response
```

#### 4. **Knowledge State & Analytics**
```python
GET    /api/v1/assessment/knowledge-state            # Get knowledge states
GET    /api/v1/assessment/learning-gaps              # Get learning gaps
GET    /api/v1/assessment/sessions/{id}/dashboard    # Get assessment dashboard
```

**Backend Features:**
- ✅ **CAT (Computerized Adaptive Testing)** - Adaptive item selection
- ✅ **BKT (Bayesian Knowledge Tracing)** - Mastery probability tracking
- ✅ **IRT (Item Response Theory)** - Difficulty/discrimination parameters
- ✅ **Knowledge State Tracking** - Per-skill mastery levels
- ✅ **Learning Gap Analysis** - Identifies weak areas
- ✅ **Dashboard Analytics** - Comprehensive performance metrics
- ✅ **JWT Authentication** - All endpoints require `current_active_user`

**Request/Response Models:**
```python
# AssessmentCreate
{
    "skill_domain": str,
    "skills": List[str]
}

# AssessmentResponse
{
    "id": int,
    "user_id": int,
    "skill_domain": str,
    "theta_estimate": float | None,    # IRT ability estimate
    "theta_se": float | None,           # Standard error
    "llm_overall_score": float | None,
    "concept_map_score": float | None,
    "status": "in_progress" | "completed",
    "created_at": datetime,
    "completed_at": datetime | None
}

# NextItemResponse (for adaptive testing)
{
    "item_code": str,
    "text": str,
    "choices": List[str] | None,
    "skill": str,
    "is_last": bool,
    "current_theta": float | None
}
```

---

### **Frontend Implementation** ⚠️

**API Base URL:** `http://localhost:8000`  
**Endpoints Used:** `/api/assessment/*` ❌ **WRONG PREFIX**

**Current API Calls:**

#### 1. **Incorrect Endpoints**
```typescript
// ❌ WRONG - Missing /v1/ prefix
POST   /api/assessment/start                  // Should be: /api/v1/assessment/sessions
GET    /api/assessment/history                // Should be: /api/v1/assessment/sessions

// ❌ WRONG - Mixing AI features with assessment
POST   /api/ai/learning-path/start            // Different feature entirely
POST   /api/ai/learning-path/respond          // Different feature entirely
GET    /api/ai/status                         // Different feature entirely

// ⚠️ PARTIALLY CORRECT - Has /v1/ but different structure
POST   /api/assessment/adaptive/start         // Should be: /api/v1/assessment/sessions
POST   /api/assessment/adaptive/{id}/respond  // Should be: /api/v1/assessment/sessions/{id}/respond
```

#### 2. **Frontend Type Definitions**
```typescript
// Frontend types (from types.ts)
interface AssessmentResult {
  id: number;
  user_id: number;
  skill_domain: string;
  theta_estimate: number | null;    // ✅ Matches backend
  theta_se: number | null;           // ✅ Matches backend
  llm_overall_score: number | null;  // ✅ Matches backend
  concept_map_score: number | null;  // ✅ Matches backend
  status: 'in_progress' | 'completed'; // ✅ Matches backend
  created_at: string;
  completed_at: string | null;
  // Extra fields not in backend response:
  dashboard_data: DashboardData | null;      // ⚠️ Different structure
  mastery_scores?: Record<string, number>;   // ⚠️ Extra field
  learning_gaps?: LearningGap[];             // ⚠️ Extra field
}

interface AdaptiveSessionResponse {
  next_item: AssessmentItem | null;
  current_theta: number;
  se: number;
  is_complete: boolean;
  items_answered: number;
}
// ❌ Backend doesn't return this structure
// Backend returns NextItemResponse instead
```

---

## ❌ Key Misalignments

### 1. **API Path Mismatch** 🚨 CRITICAL

| Frontend Call | Expected Backend | Actual Backend | Status |
|--------------|------------------|----------------|--------|
| `POST /api/assessment/start` | N/A | `POST /api/v1/assessment/sessions` | ❌ 404 |
| `GET /api/assessment/history` | N/A | `GET /api/v1/assessment/sessions` | ❌ 404 |
| `POST /api/assessment/adaptive/start` | N/A | `POST /api/v1/assessment/sessions` | ❌ 404 |
| `POST /api/assessment/adaptive/{id}/respond` | N/A | `POST /api/v1/assessment/sessions/{id}/respond` | ❌ 404 |

**Impact:** All assessment API calls will fail with 404 Not Found

### 2. **Endpoint Structure Mismatch**

**Frontend expects:**
```typescript
startAssessment() → POST /api/assessment/start
getAssessmentHistory() → GET /api/assessment/history
startAdaptiveSession() → POST /api/assessment/adaptive/start
submitAdaptiveResponse() → POST /api/assessment/adaptive/{id}/respond
```

**Backend provides:**
```python
create_assessment_session() → POST /api/v1/assessment/sessions
list_assessment_sessions() → GET /api/v1/assessment/sessions
get_next_adaptive_item() → GET /api/v1/assessment/sessions/{id}/next-item
[respond endpoint] → POST /api/v1/assessment/sessions/{id}/respond
```

### 3. **Response Schema Differences**

**Frontend expects `AdaptiveSessionResponse`:**
```typescript
{
  next_item: AssessmentItem,
  current_theta: number,
  se: number,
  is_complete: boolean,
  items_answered: number
}
```

**Backend returns `NextItemResponse`:**
```python
{
  item_code: str,
  text: str,
  choices: List[str] | None,
  skill: str,
  is_last: bool,
  current_theta: float | None
}
```

### 4. **Feature Mixing**

Frontend mixes:
- ❌ Assessment endpoints (`/api/assessment/*`)
- ❌ AI/Learning Path endpoints (`/api/ai/learning-path/*`)
- ❌ AI status checks (`/api/ai/status`)

These should be separate features with distinct API services.

---

## 🎯 Alignment Requirements

### **Required Changes**

#### ✅ **What's Working (Keep)**
1. Authentication mechanism (JWT token passing)
2. Basic type definitions (mostly compatible)
3. Component structure (AssessmentPanel, AssessmentWizard)

#### 🔧 **What Needs Fixing**

### **1. Frontend API Service (`api.ts`)** - COMPLETE REWRITE

**Current:**
```typescript
// ❌ WRONG ENDPOINTS
export async function startAssessment(skillDomain?: string): Promise<AssessmentResult> {
  return fetchAPI<AssessmentResult>('/api/assessment/start', {
    method: 'POST',
    body: JSON.stringify({ skill_domain: skillDomain }),
  });
}
```

**Required:**
```typescript
// ✅ CORRECT ENDPOINTS
const API_V1_PREFIX = '/api/v1';

export async function createAssessmentSession(
  skillDomain: string,
  skills: string[]
): Promise<AssessmentResponse> {
  return fetchAPI<AssessmentResponse>(`${API_V1_PREFIX}/assessment/sessions`, {
    method: 'POST',
    body: JSON.stringify({ 
      skill_domain: skillDomain,
      skills: skills
    }),
  });
}

export async function listAssessmentSessions(): Promise<AssessmentResponse[]> {
  return fetchAPI<AssessmentResponse[]>(`${API_V1_PREFIX}/assessment/sessions`);
}

export async function getAssessmentSession(
  assessmentId: number
): Promise<AssessmentResponse> {
  return fetchAPI<AssessmentResponse>(
    `${API_V1_PREFIX}/assessment/sessions/${assessmentId}`
  );
}

export async function getNextAdaptiveItem(
  assessmentId: number
): Promise<NextItemResponse> {
  return fetchAPI<NextItemResponse>(
    `${API_V1_PREFIX}/assessment/sessions/${assessmentId}/next-item`
  );
}

export async function submitItemResponse(
  assessmentId: number,
  itemCode: string,
  userResponse: number, // 1 for correct, 0 for incorrect
  timeTakenSeconds?: number
): Promise<void> {
  return fetchAPI<void>(
    `${API_V1_PREFIX}/assessment/sessions/${assessmentId}/respond`,
    {
      method: 'POST',
      body: JSON.stringify({
        assessment_id: assessmentId,
        item_code: itemCode,
        user_response: userResponse,
        time_taken_seconds: timeTakenSeconds
      }),
    }
  );
}

export async function getKnowledgeState(): Promise<KnowledgeStateResponse[]> {
  return fetchAPI<KnowledgeStateResponse[]>(
    `${API_V1_PREFIX}/assessment/knowledge-state`
  );
}

export async function getLearningGaps(): Promise<LearningGapResponse[]> {
  return fetchAPI<LearningGapResponse[]>(
    `${API_V1_PREFIX}/assessment/learning-gaps`
  );
}

export async function getAssessmentDashboard(
  assessmentId: number
): Promise<AssessmentDashboard> {
  return fetchAPI<AssessmentDashboard>(
    `${API_V1_PREFIX}/assessment/sessions/${assessmentId}/dashboard`
  );
}
```

### **2. Frontend Types (`types.ts`)** - UPDATE

**Add missing types:**
```typescript
// Backend response types
export interface AssessmentResponse {
  id: number;
  user_id: number;
  skill_domain: string;
  theta_estimate: number | null;
  theta_se: number | null;
  llm_overall_score: number | null;
  concept_map_score: number | null;
  status: 'in_progress' | 'completed';
  created_at: string;
  completed_at: string | null;
}

export interface NextItemResponse {
  item_code: string;
  text: string;
  choices: string[] | null;
  skill: string;
  is_last: boolean;
  current_theta: number | null;
}

export interface KnowledgeStateResponse {
  id: number;
  skill: string;
  mastery_probability: number;
  confidence_level: number;
  last_practiced: string | null;
  items_attempted: number;
  items_correct: number;
}

export interface LearningGapResponse {
  skill: string;
  current_mastery: number;
  target_mastery: number;
  gap_size: number;
  priority: 'low' | 'medium' | 'high';
  recommended_resources: string[];
}

export interface AssessmentDashboard {
  assessment_id: number;
  ability_estimate: number;
  ability_se: number;
  mastery: Record<string, number>;
  llm_scores: Record<string, number>;
  llm_overall: number;
  self_assessment: Record<string, number>;
  concept_map_score: number;
  recommendations: string[];
}

export interface ItemResponseSubmit {
  assessment_id: number;
  item_code: string;
  user_response: number; // 1 for correct, 0 for incorrect
  time_taken_seconds?: number;
}
```

### **3. Remove AI/Learning Path Code from Assessment Feature**

**Delete or move to separate feature:**
- ❌ `checkAIStatus()`
- ❌ `startLearningPath()`
- ❌ `respondToLearningPath()`
- ❌ `getKnowledgeGraph()`

These belong in a separate AI or Learning Path feature.

### **4. Update Components**

**AssessmentPanel.tsx:**
```typescript
// Change from:
const result = await startAssessment();

// To:
const result = await createAssessmentSession(
  skillDomain,
  [skillDomain] // or list of skills
);
```

**AssessmentWizard.tsx:**
```typescript
// Implement CAT flow:
const nextItem = await getNextAdaptiveItem(assessmentId);

// Display item to user
// Collect response
// Submit:
await submitItemResponse(
  assessmentId,
  nextItem.item_code,
  isCorrect ? 1 : 0,
  timeSpentSeconds
);

// Get next item
// Repeat until nextItem.is_last === true
```

---

## 📋 Implementation Checklist

### Phase 1: API Service Rewrite (2 hours)
- [ ] Update `API_BASE_URL` to use environment variable
- [ ] Add `API_V1_PREFIX` constant
- [ ] Rewrite all assessment API functions
- [ ] Remove AI/Learning Path functions
- [ ] Update TypeScript types to match backend schemas
- [ ] Add proper error handling

### Phase 2: Component Updates (1 hour)
- [ ] Update `AssessmentPanel.tsx` to use new API
- [ ] Update `AssessmentWizard.tsx` to implement CAT flow
- [ ] Update `ReassessmentSummary.tsx` to use new dashboard API
- [ ] Add loading states and error handling

### Phase 3: Testing (1 hour)
- [ ] Test session creation
- [ ] Test adaptive item retrieval
- [ ] Test response submission
- [ ] Test knowledge state retrieval
- [ ] Test dashboard display
- [ ] Verify authentication works

### Phase 4: Integration (30 minutes)
- [ ] Connect to User Knowledge Dashboard sync
- [ ] Add analytics tracking
- [ ] Update documentation

---

## 🚀 Quick Fix Summary

**Minimum Required Changes:**

1. **Update `api.ts` endpoints:**
   - Change `/api/assessment/*` → `/api/v1/assessment/*`
   - Change `/api/assessment/start` → `/api/v1/assessment/sessions`
   - Change `/api/assessment/history` → `/api/v1/assessment/sessions`
   - Change `/api/assessment/adaptive/start` → `/api/v1/assessment/sessions`
   - Change `/api/assessment/adaptive/{id}/respond` → `/api/v1/assessment/sessions/{id}/respond`

2. **Update request/response types:**
   - Match backend schemas exactly
   - Remove extra fields not returned by backend

3. **Implement CAT flow:**
   - Create session → Get next item → Submit response → Repeat

4. **Remove AI feature mixing:**
   - Move AI-related code to separate service

---

## 📊 Estimated Impact

**Current State:**
- ❌ All assessment API calls fail (404)
- ❌ Frontend can't create assessment sessions
- ❌ CAT system not utilized
- ❌ No knowledge state tracking
- ❌ No learning gap analysis

**After Fix:**
- ✅ All API calls work correctly
- ✅ Full CAT system operational
- ✅ Adaptive testing functional
- ✅ Knowledge state tracking enabled
- ✅ Learning gap analysis available
- ✅ Dashboard analytics working

**Alignment Improvement:** 60% → 95% (+35%)

---

## 🎯 Recommendation

**Priority:** **HIGH** - Fix ASAP

**Approach:** 
1. Rewrite `api.ts` completely (cleanest solution)
2. Update types to match backend exactly
3. Implement proper CAT flow in wizard component
4. Test thoroughly with real backend

**Estimated Time:** 4-5 hours total

**Benefits:**
- Unlock powerful CAT assessment system
- Enable adaptive testing
- Get knowledge state tracking
- Enable learning gap analysis
- Complete assessment dashboard functionality

---

**Next Steps:**
1. Review this analysis with team
2. Create implementation plan
3. Rewrite frontend API service
4. Update components
5. Test end-to-end CAT flow
6. Update documentation

