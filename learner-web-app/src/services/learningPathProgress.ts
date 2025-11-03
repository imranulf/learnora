/**
 * Learning Path Progress Service
 * 
 * API client for tracking and fetching learning path progress.
 * Syncs with backend progress tracking system.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

export interface ConceptProgress {
    name: string;
    mastery_level: number;
    status: 'not_started' | 'in_progress' | 'mastered';
    time_spent: number;
    content_count: number;
    started_at: string | null;
    completed_at: string | null;
}

export interface PathProgress {
    total_concepts: number;
    completed_concepts: number;
    in_progress_concepts: number;
    overall_progress: number;
    average_mastery: number;
    total_time_spent: number;
    concepts: ConceptProgress[];
}

export interface UpdateProgressRequest {
    concept_name: string;
    time_spent?: number;
    completed_content?: boolean;
}

/**
 * Fetch progress for a learning path
 */
export async function getPathProgress(
    threadId: string,
    accessToken: string
): Promise<PathProgress> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths/progress/${threadId}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        if (response.status === 404) {
            // Return empty progress if not found
            return {
                total_concepts: 0,
                completed_concepts: 0,
                in_progress_concepts: 0,
                overall_progress: 0,
                average_mastery: 0,
                total_time_spent: 0,
                concepts: []
            };
        }
        throw new Error('Failed to fetch path progress');
    }

    return response.json();
}

/**
 * Update progress for a specific concept
 */
export async function updateConceptProgress(
    threadId: string,
    request: UpdateProgressRequest,
    accessToken: string
): Promise<ConceptProgress> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths/progress/${threadId}/update`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(request),
        }
    );

    if (!response.ok) {
        throw new Error('Failed to update concept progress');
    }

    return response.json();
}

/**
 * Get the next recommended concept to study
 */
export async function getNextConcept(
    threadId: string,
    accessToken: string
): Promise<{ next_concept: string | null; message?: string }> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths/progress/${threadId}/next-concept`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to get next concept');
    }

    return response.json();
}

/**
 * Sync all concept progress with Knowledge Graph
 */
export async function syncProgressWithKG(
    threadId: string,
    accessToken: string
): Promise<{ updated_concepts: number; message: string; progress: PathProgress }> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths/progress/${threadId}/sync`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to sync progress');
    }

    return response.json();
}

/**
 * Initialize progress tracking for a new learning path
 */
export async function initializePathProgress(
    threadId: string,
    conceptNames: string[],
    accessToken: string
): Promise<{ initialized_concepts: number; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/learning-paths/progress/${threadId}/initialize`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(conceptNames),
        }
    );

    if (!response.ok) {
        throw new Error('Failed to initialize progress');
    }

    return response.json();
}
