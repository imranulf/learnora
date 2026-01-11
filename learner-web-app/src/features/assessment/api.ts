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
  // Quiz types
  QuizCreate,
  QuizResponse,
  QuizSubmit,
  QuizResultResponse,
  AdaptiveItemResponse,
  // MCQ types
  MCQGenerationResponse,
  MCQSaveResponse,
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
// Quiz Management (Adaptive Quiz System with IRT 2PL + BKT)
// ============================================================================

/**
 * Create a new quiz
 * POST /api/v1/assessment/quizzes
 *
 * For adaptive quizzes (is_adaptive=true):
 * - Items are selected based on user's current ability (theta)
 * - Uses CAT with Fisher information maximization
 */
export async function createQuiz(quiz: QuizCreate): Promise<QuizResponse> {
  return fetchAPI<QuizResponse>(`${API_V1_PREFIX}/assessment/quizzes`, {
    method: 'POST',
    body: JSON.stringify(quiz),
  });
}

/**
 * List all quizzes for the current user
 * GET /api/v1/assessment/quizzes?status={status}
 */
export async function listQuizzes(
  status?: 'active' | 'completed' | 'expired'
): Promise<QuizResponse[]> {
  const url = status
    ? `${API_V1_PREFIX}/assessment/quizzes?status_filter=${status}`
    : `${API_V1_PREFIX}/assessment/quizzes`;

  return fetchAPI<QuizResponse[]>(url);
}

/**
 * Get a specific quiz
 * GET /api/v1/assessment/quizzes/{id}
 */
export async function getQuiz(quizId: number): Promise<QuizResponse> {
  return fetchAPI<QuizResponse>(`${API_V1_PREFIX}/assessment/quizzes/${quizId}`);
}

/**
 * Get all items for a quiz
 * GET /api/v1/assessment/quizzes/{id}/items
 */
export async function getQuizItems(quizId: number): Promise<ItemResponse[]> {
  return fetchAPI<ItemResponse[]>(
    `${API_V1_PREFIX}/assessment/quizzes/${quizId}/items`
  );
}

/**
 * Submit quiz responses and get results
 * POST /api/v1/assessment/quizzes/{id}/submit
 *
 * This endpoint:
 * - Grades all responses
 * - Updates theta using IRT 2PL MLE
 * - Updates BKT mastery probability
 * - Returns detailed results with ability estimates
 */
export async function submitQuiz(
  quizId: number,
  responses: QuizSubmit
): Promise<QuizResultResponse> {
  return fetchAPI<QuizResultResponse>(
    `${API_V1_PREFIX}/assessment/quizzes/${quizId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify(responses),
    }
  );
}

/**
 * Get results history for a quiz
 * GET /api/v1/assessment/quizzes/{id}/results
 */
export async function getQuizResults(
  quizId: number
): Promise<QuizResultResponse[]> {
  return fetchAPI<QuizResultResponse[]>(
    `${API_V1_PREFIX}/assessment/quizzes/${quizId}/results`
  );
}

// ============================================================================
// Item-by-Item Adaptive Quiz (Real-time theta updates)
// ============================================================================

/**
 * Get the next adaptive item for a quiz
 * GET /api/v1/assessment/quizzes/{id}/next-item
 *
 * For adaptive quizzes, items are selected using CAT:
 * - Fisher information maximization at current theta
 * - Returns most informative item for ability estimation
 */
export async function getNextQuizItem(
  quizId: number
): Promise<NextItemResponse> {
  return fetchAPI<NextItemResponse>(
    `${API_V1_PREFIX}/assessment/quizzes/${quizId}/next-item`
  );
}

/**
 * Submit a single item response for an adaptive quiz
 * POST /api/v1/assessment/quizzes/{id}/respond-item
 *
 * Updates theta after each response using IRT 2PL MLE.
 * Next item will be selected based on updated theta.
 */
export async function submitQuizItemResponse(
  quizId: number,
  itemId: number,
  selectedIndex: number
): Promise<AdaptiveItemResponse> {
  const params = new URLSearchParams({
    item_id: itemId.toString(),
    selected_index: selectedIndex.toString(),
  });

  return fetchAPI<AdaptiveItemResponse>(
    `${API_V1_PREFIX}/assessment/quizzes/${quizId}/respond-item?${params}`,
    { method: 'POST' }
  );
}

// ============================================================================
// MCQ Generation (AI-powered question generation)
// ============================================================================

/**
 * Generate MCQ questions using AI
 * POST /api/v1/assessment/mcq/generate
 *
 * Uses LangChain with Gemini for structured MCQ generation.
 * Optionally uses learning path context for prerequisite-aware questions.
 */
export async function generateMCQs(
  conceptName: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate',
  questionCount: number = 5,
  options?: {
    conceptDescription?: string;
    learningPathThreadId?: string;
    conceptId?: string;
  }
): Promise<MCQGenerationResponse> {
  const params = new URLSearchParams({
    concept_name: conceptName,
    difficulty: difficulty,
    question_count: questionCount.toString(),
  });

  if (options?.conceptDescription) {
    params.append('concept_description', options.conceptDescription);
  }
  if (options?.learningPathThreadId) {
    params.append('learning_path_thread_id', options.learningPathThreadId);
  }
  if (options?.conceptId) {
    params.append('concept_id', options.conceptId);
  }

  return fetchAPI<MCQGenerationResponse>(
    `${API_V1_PREFIX}/assessment/mcq/generate?${params}`,
    { method: 'POST' }
  );
}

/**
 * Generate MCQ questions and save to item bank
 * POST /api/v1/assessment/mcq/generate-and-save
 *
 * Generates MCQs and saves them with IRT parameters:
 * - Beginner: a=0.8, b=-1.5
 * - Intermediate: a=1.0, b=0.0
 * - Advanced: a=1.2, b=1.5
 */
export async function generateAndSaveMCQs(
  conceptName: string,
  skill: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate',
  questionCount: number = 5,
  conceptDescription?: string
): Promise<MCQSaveResponse> {
  const params = new URLSearchParams({
    concept_name: conceptName,
    skill: skill,
    difficulty: difficulty,
    question_count: questionCount.toString(),
  });

  if (conceptDescription) {
    params.append('concept_description', conceptDescription);
  }

  return fetchAPI<MCQSaveResponse>(
    `${API_V1_PREFIX}/assessment/mcq/generate-and-save?${params}`,
    { method: 'POST' }
  );
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Session management
  createAssessmentSession,
  getAssessmentSession,
  listAssessmentSessions,

  // Adaptive testing (sessions)
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

  // Quiz management
  createQuiz,
  listQuizzes,
  getQuiz,
  getQuizItems,
  submitQuiz,
  getQuizResults,

  // Item-by-item adaptive quiz
  getNextQuizItem,
  submitQuizItemResponse,

  // MCQ generation
  generateMCQs,
  generateAndSaveMCQs,
};
