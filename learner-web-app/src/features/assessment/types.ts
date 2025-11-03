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
