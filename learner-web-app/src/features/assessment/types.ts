/**
 * Type definitions for assessment features
 * Aligned with backend Pydantic schemas
 */

// ============================================================================
// Assessment Session Types
// ============================================================================

export interface AssessmentCreate {
  skill_domain: string;
  skills: string[];
}

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

// ============================================================================
// Assessment Item Types
// ============================================================================

export interface ItemCreate {
  item_code: string;
  skill: string;
  a: number; // discrimination parameter
  b: number; // difficulty parameter
  text: string;
  choices?: string[] | null;
  correct_index?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ItemResponse {
  id: number;
  item_code: string;
  skill: string;
  a: number; // discrimination parameter
  b: number; // difficulty parameter
  text: string;
  choices: string[] | null;
  correct_index: number | null;
  is_active: boolean;
  created_at: string;
}

export interface NextItemResponse {
  item_code: string;
  text: string;
  choices: string[] | null;
  skill: string;
  is_last: boolean;
  current_theta: number | null;
}

export interface ItemResponseSubmit {
  assessment_id: number;
  item_code: string;
  user_response: number; // 1 for correct, 0 for incorrect
  time_taken_seconds?: number;
}

// ============================================================================
// Knowledge State & Learning Gaps
// ============================================================================

export interface KnowledgeStateResponse {
  id: number;
  skill: string;
  mastery_probability: number;
  confidence_level: number | null;
  last_updated: string;
}

export interface LearningGapResponse {
  id: number;
  skill: string;
  mastery_level: number;
  priority: 'low' | 'medium' | 'high';
  recommended_difficulty: string;
  estimated_study_time: number;
  rationale: string | null;
  is_addressed: boolean;
  created_at: string;
}

// ============================================================================
// Quiz Types (Adaptive Quiz System with IRT 2PL + BKT)
// ============================================================================

export interface QuizCreate {
  title: string;
  skill: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  total_items: number;
  is_adaptive?: boolean; // If true, uses CAT for item selection
}

export interface QuizResponse {
  id: number;
  user_id: number;
  title: string;
  skill: string;
  difficulty: string;
  items: number[]; // List of item IDs
  total_items: number;
  is_adaptive: boolean;
  status: 'active' | 'completed' | 'expired';
  created_at: string;
  expires_at: string | null;
}

export interface QuizSubmit {
  responses: Array<{
    item_id: number;
    selected_index: number;
  }>;
}

export interface QuizResultResponse {
  id: number;
  quiz_id: number;
  score: number; // 0.0 to 1.0
  correct_count: number;
  total_count: number;
  time_taken_minutes: number | null;
  created_at: string;
  // IRT ability estimates
  theta_estimate: number | null; // Updated ability after quiz
  theta_se: number | null; // Standard error
  theta_before: number | null; // Ability before quiz
  mastery_updated: boolean; // Whether BKT was updated
}

export interface AdaptiveItemResponse {
  is_correct: boolean;
  correct_index: number;
  explanation: string | null;
  new_theta: number; // Updated ability estimate
  new_se: number; // Standard error
  items_answered: number;
  items_remaining: number;
  quiz_complete: boolean;
}

// ============================================================================
// MCQ Generation Types
// ============================================================================

export interface MCQGenerationRequest {
  concept_name: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  question_count: number;
  concept_description?: string;
  learning_path_thread_id?: string;
  concept_id?: string;
}

export interface MCQQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface MCQGenerationResponse {
  concept_name: string;
  difficulty: string;
  question_count: number;
  questions: MCQQuestion[];
}

export interface MCQSaveResponse {
  message: string;
  concept_name: string;
  skill: string;
  difficulty: string;
  item_codes: string[];
}

// ============================================================================
// Legacy Types (for backward compatibility - to be removed)
// ============================================================================

/**
 * @deprecated Use AssessmentResponse instead
 */
export interface AssessmentResult extends AssessmentResponse {
  dashboard_data?: DashboardData | null;
  mastery_scores?: Record<string, number>;
  learning_gaps?: LearningGap[];
}

export interface DashboardData {
  theta: number;
  se: number;
  items_answered: number;
  assessment_id: number;
  skill_domain: string;
  [key: string]: unknown;
}

/**
 * @deprecated Use LearningGapResponse instead
 */
export interface LearningGap {
  skill: string;
  mastery_level: number;
  priority: 'low' | 'medium' | 'high';
  recommended_difficulty: string;
}

/**
 * @deprecated No longer used - Assessment and Learning Path are separate features
 */
export interface KnowledgeGraphConcept {
  '@id': string;
  '@type': string;
  name: string;
  difficulty: string;
  prerequisites?: string[];
  [key: string]: unknown;
}

/**
 * @deprecated No longer used - Assessment and Learning Path are separate features
 */
export interface KnowledgeGraph {
  '@context': string;
  '@graph': KnowledgeGraphConcept[];
}

/**
 * @deprecated No longer used - Assessment and Learning Path are separate features
 */
export interface LearningPathResponse {
  learning_path_id: number;
  knowledge_graph: KnowledgeGraph;
  message?: string;
  thread_id?: string;
  assessment_complete?: boolean;
}

/**
 * @deprecated No longer used - AI features moved to separate module
 */
export interface AIStatusResponse {
  ai_enabled: boolean;
  configured?: boolean;
  placeholder_key?: boolean;
}

/**
 * @deprecated Use NextItemResponse instead
 */
export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

/**
 * @deprecated No longer used
 */
export interface MasteryDelta {
  [skill: string]: number;
}

/**
 * @deprecated No longer used
 */
export interface ReassessmentData {
  theta?: number;
  ability_delta?: number;
}

/**
 * @deprecated No longer used
 */
export interface ReassessmentSummaryData {
  mastery_delta?: MasteryDelta;
  reassessment?: ReassessmentData;
  error?: string;
}

/**
 * @deprecated Use ItemResponseSubmit instead
 */
export interface AssessmentItemResponse {
  item_id: number;
  response: string | number;
  is_correct?: boolean;
  time_spent?: number;
}

/**
 * @deprecated No longer used - CAT flow uses NextItemResponse
 */
export interface AdaptiveSessionResponse {
  next_item: AssessmentItem | null;
  current_theta: number;
  se: number;
  is_complete: boolean;
  items_answered: number;
}

/**
 * @deprecated Use ItemResponse instead
 */
export interface AssessmentItem {
  id: number;
  skill_domain: string;
  difficulty: number;
  discrimination: number;
  question_text: string;
  question_type: 'mcq' | 'short_answer' | 'essay' | 'true_false';
  options: string[] | null;
  correct_index: number | null;
  is_active: boolean;
  item_metadata: Record<string, unknown> | null;
}
