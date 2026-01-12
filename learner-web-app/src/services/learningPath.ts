// Learning Path API Service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

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
}/**
 * Fetch all learning paths
 */
export async function getAllLearningPaths(
    token: string,
    skip = 0,
    limit = 100
): Promise<LearningPathResponse[]> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths?skip=${skip}&limit=${limit}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }
    ); if (!response.ok) {
        throw new Error(`Failed to fetch learning paths: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get learning path by thread ID
 */
export async function getLearningPath(threadId: string, token: string): Promise<LearningPathResponse> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths/${threadId}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }
    ); if (!response.ok) {
        throw new Error(`Failed to fetch learning path: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get knowledge graph for a learning path
 */
export async function getLearningPathKG(threadId: string, token: string): Promise<LearningPathKGResponse> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths/${threadId}/knowledge-graph`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }
    ); if (!response.ok) {
        throw new Error(`Failed to fetch learning path knowledge graph: ${response.statusText}`);
    }

    return response.json();
}

export interface DuplicateTopicError {
    error: 'duplicate_topic';
    message: string;
    existing_thread_id: string;
}

export interface ApiError {
    status: number;
    detail: DuplicateTopicError | string;
}

/**
 * Start a new learning path
 */
export async function startLearningPath(topic: string, token: string): Promise<GraphResponse> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths/start`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ learning_topic: topic }),
        }
    );

    if (!response.ok) {
        // Handle 409 Conflict (duplicate topic)
        if (response.status === 409) {
            const errorData = await response.json();
            const error = new Error(errorData.detail?.message || 'Duplicate topic') as Error & { apiError: ApiError };
            error.apiError = {
                status: 409,
                detail: errorData.detail,
            };
            throw error;
        }
        throw new Error(`Failed to start learning path: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a learning path
 */
export async function deleteLearningPath(threadId: string, token: string): Promise<void> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths/${threadId}`,
        {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }
    );
    if (!response.ok) {
        throw new Error(`Failed to delete learning path: ${response.statusText}`);
    }
}
