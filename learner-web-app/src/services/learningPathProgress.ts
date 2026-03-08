/**
 * Learning Path Progress Service
 *
 * API client for tracking and fetching learning path progress.
 * Syncs with backend progress tracking system.
 */
import { fetchAPI, API_V1_PREFIX } from './apiClient';

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
    try {
        return await fetchAPI<PathProgress>(
            `${API_V1_PREFIX}/learning-paths/progress/${threadId}`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
    } catch (err) {
        // Return empty progress on 404 (not initialized yet)
        if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) {
            return {
                total_concepts: 0,
                completed_concepts: 0,
                in_progress_concepts: 0,
                overall_progress: 0,
                average_mastery: 0,
                total_time_spent: 0,
                concepts: [],
            };
        }
        throw err;
    }
}

/**
 * Update progress for a specific concept
 */
export async function updateConceptProgress(
    threadId: string,
    request: UpdateProgressRequest,
    accessToken: string
): Promise<ConceptProgress> {
    return fetchAPI<ConceptProgress>(
        `${API_V1_PREFIX}/learning-paths/progress/${threadId}/update`,
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify(request),
        }
    );
}

/**
 * Get the next recommended concept to study
 */
export async function getNextConcept(
    threadId: string,
    accessToken: string
): Promise<{ next_concept: string | null; message?: string }> {
    return fetchAPI<{ next_concept: string | null; message?: string }>(
        `${API_V1_PREFIX}/learning-paths/progress/${threadId}/next-concept`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
}

/**
 * Sync all concept progress with Knowledge Graph
 */
export async function syncProgressWithKG(
    threadId: string,
    accessToken: string
): Promise<{ updated_concepts: number; message: string; progress: PathProgress }> {
    return fetchAPI<{ updated_concepts: number; message: string; progress: PathProgress }>(
        `${API_V1_PREFIX}/learning-paths/progress/${threadId}/sync`,
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
        }
    );
}

/**
 * Initialize progress tracking for a new learning path
 */
export async function initializePathProgress(
    threadId: string,
    conceptNames: string[],
    accessToken: string
): Promise<{ initialized_concepts: number; message: string }> {
    return fetchAPI<{ initialized_concepts: number; message: string }>(
        `${API_V1_PREFIX}/learning-paths/progress/${threadId}/initialize`,
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify(conceptNames),
        }
    );
}
