// Learning Path API Service
import { fetchAPI, ApiError, API_V1_PREFIX } from './apiClient';

export interface ConceptInfo {
    id: string;
    label: string;
    prerequisites: string[];
}

export interface LearningPathKGResponse {
    thread_id: string;
    topic: string;
    concepts: ConceptInfo[];
    concept_count: number;
}

export interface LearningPathResponse {
    id: number;
    topic: string;
    conversation_thread_id: string;
    created_at: string;
    updated_at?: string;
}

export interface StartRequest {
    learning_topic: string;
}

export interface GraphResponse {
    thread_id: string;
    messages?: unknown;
}

export interface DuplicateTopicError {
    error: 'duplicate_topic';
    message: string;
    existing_thread_id: string;
}

export interface LearningPathApiError {
    status: number;
    detail: DuplicateTopicError | string;
}

/**
 * Fetch all learning paths
 */
export async function getAllLearningPaths(
    token: string,
    skip = 0,
    limit = 100
): Promise<LearningPathResponse[]> {
    return fetchAPI<LearningPathResponse[]>(
        `${API_V1_PREFIX}/learning-paths?skip=${skip}&limit=${limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
}

/**
 * Get learning path by thread ID
 */
export async function getLearningPath(threadId: string, token: string): Promise<LearningPathResponse> {
    return fetchAPI<LearningPathResponse>(
        `${API_V1_PREFIX}/learning-paths/${threadId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
}

/**
 * Get knowledge graph for a learning path
 */
export async function getLearningPathKG(threadId: string, token: string): Promise<LearningPathKGResponse> {
    return fetchAPI<LearningPathKGResponse>(
        `${API_V1_PREFIX}/learning-paths/${threadId}/knowledge-graph`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
}

/**
 * Start a new learning path
 */
export async function startLearningPath(topic: string, token: string): Promise<GraphResponse> {
    try {
        return await fetchAPI<GraphResponse>(
            `${API_V1_PREFIX}/learning-paths/start`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ learning_topic: topic }),
            }
        );
    } catch (err) {
        // Re-throw with structured duplicate info for 409
        if (err instanceof ApiError && err.status === 409) {
            const error = new Error(
                typeof err.detail === 'object' && err.detail !== null && 'message' in err.detail
                    ? (err.detail as { message: string }).message
                    : 'Duplicate topic'
            ) as Error & { apiError: LearningPathApiError };
            error.apiError = { status: 409, detail: err.detail as DuplicateTopicError | string };
            throw error;
        }
        throw err;
    }
}

/**
 * Delete a learning path
 */
export async function deleteLearningPath(threadId: string, token: string): Promise<void> {
    return fetchAPI<void>(
        `${API_V1_PREFIX}/learning-paths/${threadId}`,
        {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        }
    );
}
