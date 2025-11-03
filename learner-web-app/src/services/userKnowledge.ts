/**
 * API service for user knowledge dashboard
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

export interface UserKnowledgeItem {
    id: string;
    concept: string;
    mastery: 'known' | 'learning' | 'not_started';
    score: number;
    last_updated: string;
}

export interface UserKnowledgeSummary {
    total_concepts: number;
    known: number;
    learning: number;
    not_started: number;
    average_score: number;
    mastery_distribution: {
        known: number;
        learning: number;
        not_started: number;
    };
}

export interface UserKnowledgeDashboardResponse {
    items: UserKnowledgeItem[];
    total: number;
    summary: UserKnowledgeSummary;
}

export interface UpdateUserKnowledgeRequest {
    mastery?: 'known' | 'learning' | 'not_started';
    score?: number;
}

export async function getUserKnowledgeDashboard(
    token: string,
    mastery?: string,
    sortBy?: string
): Promise<UserKnowledgeDashboardResponse> {
    const params = new URLSearchParams();
    if (mastery) params.append('mastery', mastery);
    if (sortBy) params.append('sort_by', sortBy);

    const url = `${API_BASE_URL}${API_V1_PREFIX}/user-knowledge/dashboard${params.toString() ? '?' + params.toString() : ''
        }`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch user knowledge dashboard: ${response.statusText}`);
    }

    return response.json();
}

export async function updateUserKnowledgeItem(
    token: string,
    conceptId: string,
    updates: UpdateUserKnowledgeRequest
): Promise<UserKnowledgeItem> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/user-knowledge/dashboard/${conceptId}`,
        {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update user knowledge');
    }

    return response.json();
}

export async function syncWithAssessment(token: string): Promise<{
    message: string;
    updated_concepts: number;
    timestamp: string;
}> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/user-knowledge/dashboard/sync`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to sync with assessment');
    }

    return response.json();
}
