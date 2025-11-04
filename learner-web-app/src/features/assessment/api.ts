/**
 * API service for assessment features
 * Aligned with backend /api/v1/assessment endpoints
 */
import type {
  AssessmentCreate,
  AssessmentDashboard,
  AssessmentResponse,
  ItemCreate,
  ItemResponse,
  ItemResponseSubmit,
  KnowledgeStateResponse,
  LearningGapResponse,
  NextItemResponse,
} from './types';

const API_BASE_URL = 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

/**
 * Base fetch wrapper with auth and error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Assessment Session Management
// ============================================================================

/**
 * Create a new assessment session
 * POST /api/v1/assessment/sessions
 */
export async function createAssessmentSession(
  skillDomain: string,
  skills: string[]
): Promise<AssessmentResponse> {
  const payload: AssessmentCreate = {
    skill_domain: skillDomain,
    skills: skills,
  };

  return fetchAPI<AssessmentResponse>(`${API_V1_PREFIX}/assessment/sessions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Get a specific assessment session
 * GET /api/v1/assessment/sessions/{id}
 */
export async function getAssessmentSession(
  assessmentId: number
): Promise<AssessmentResponse> {
  return fetchAPI<AssessmentResponse>(
    `${API_V1_PREFIX}/assessment/sessions/${assessmentId}`
  );
}

/**
 * List all assessment sessions for the current user
 * GET /api/v1/assessment/sessions
 */
export async function listAssessmentSessions(): Promise<AssessmentResponse[]> {
  return fetchAPI<AssessmentResponse[]>(`${API_V1_PREFIX}/assessment/sessions`);
}

// ============================================================================
// Adaptive Testing (CAT - Computerized Adaptive Testing)
// ============================================================================

/**
 * Get the next adaptive item for an assessment session
 * GET /api/v1/assessment/sessions/{id}/next-item
 */
export async function getNextAdaptiveItem(
  assessmentId: number
): Promise<NextItemResponse> {
  return fetchAPI<NextItemResponse>(
    `${API_V1_PREFIX}/assessment/sessions/${assessmentId}/next-item`
  );
}

/**
 * Submit a response to an assessment item
 * POST /api/v1/assessment/sessions/{id}/respond
 */
export async function submitItemResponse(
  assessmentId: number,
  itemCode: string,
  userResponse: number, // 1 for correct, 0 for incorrect
  timeTakenSeconds?: number
): Promise<void> {
  const payload: ItemResponseSubmit = {
    assessment_id: assessmentId,
    item_code: itemCode,
    user_response: userResponse,
    time_taken_seconds: timeTakenSeconds,
  };

  return fetchAPI<void>(
    `${API_V1_PREFIX}/assessment/sessions/${assessmentId}/respond`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// ============================================================================
// Knowledge State & Learning Gaps
// ============================================================================

/**
 * Get knowledge state for all skills (current user)
 * GET /api/v1/assessment/knowledge-state
 */
export async function getKnowledgeState(): Promise<KnowledgeStateResponse[]> {
  return fetchAPI<KnowledgeStateResponse[]>(
    `${API_V1_PREFIX}/assessment/knowledge-state`
  );
}

/**
 * Get learning gaps for the current user
 * GET /api/v1/assessment/learning-gaps
 */
export async function getLearningGaps(): Promise<LearningGapResponse[]> {
  return fetchAPI<LearningGapResponse[]>(
    `${API_V1_PREFIX}/assessment/learning-gaps`
  );
}

// ============================================================================
// Assessment Dashboard & Analytics
// ============================================================================

/**
 * Get comprehensive dashboard for an assessment session
 * GET /api/v1/assessment/sessions/{id}/dashboard
 */
export async function getAssessmentDashboard(
  assessmentId: number
): Promise<AssessmentDashboard> {
  return fetchAPI<AssessmentDashboard>(
    `${API_V1_PREFIX}/assessment/sessions/${assessmentId}/dashboard`
  );
}

// ============================================================================
// Item Management (Admin/Content Creation)
// ============================================================================

/**
 * Create a new assessment item
 * POST /api/v1/assessment/items
 */
export async function createAssessmentItem(
  item: ItemCreate
): Promise<ItemResponse> {
  return fetchAPI<ItemResponse>(`${API_V1_PREFIX}/assessment/items`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

/**
 * List assessment items (optionally filter by skill)
 * GET /api/v1/assessment/items?skill={skill}
 */
export async function listAssessmentItems(
  skill?: string
): Promise<ItemResponse[]> {
  const url = skill
    ? `${API_V1_PREFIX}/assessment/items?skill=${encodeURIComponent(skill)}`
    : `${API_V1_PREFIX}/assessment/items`;

  return fetchAPI<ItemResponse[]>(url);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Session management
  createAssessmentSession,
  getAssessmentSession,
  listAssessmentSessions,

  // Adaptive testing
  getNextAdaptiveItem,
  submitItemResponse,

  // Knowledge tracking
  getKnowledgeState,
  getLearningGaps,

  // Analytics
  getAssessmentDashboard,

  // Item management
  createAssessmentItem,
  listAssessmentItems,
};
