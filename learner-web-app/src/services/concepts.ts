/**
 * API service for concept management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

export interface Concept {
    id: string;
    label: string;
    description: string | null;
    category: string;
    difficulty: string;
    tags: string[];
    prerequisites: string[];
    created_at?: string;
}

export interface ConceptListResponse {
    items: Concept[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface ConceptCreate {
    concept_id: string;
    label: string;
    description?: string;
    category?: string;
    difficulty?: string;
    tags?: string[];
    prerequisites?: string[];
}

export interface ConceptUpdate {
    label?: string;
    description?: string;
    category?: string;
    difficulty?: string;
    tags?: string[];
    prerequisites?: string[];
}

export async function getConcepts(
    token: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    category?: string,
    difficulty?: string
): Promise<ConceptListResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
    });

    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty);

    const response = await fetch(`${API_BASE_URL}${API_V1_PREFIX}/concepts?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch concepts: ${response.statusText}`);
    }

    return response.json();
}

export async function getConcept(token: string, conceptId: string): Promise<Concept> {
    const response = await fetch(`${API_BASE_URL}${API_V1_PREFIX}/concepts/${conceptId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch concept: ${response.statusText}`);
    }

    return response.json();
}

export async function createConcept(token: string, concept: ConceptCreate): Promise<Concept> {
    const response = await fetch(`${API_BASE_URL}${API_V1_PREFIX}/concepts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(concept),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create concept');
    }

    return response.json();
}

export async function updateConcept(
    token: string,
    conceptId: string,
    updates: ConceptUpdate
): Promise<Concept> {
    const response = await fetch(`${API_BASE_URL}${API_V1_PREFIX}/concepts/${conceptId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update concept');
    }

    return response.json();
}

export async function deleteConcept(token: string, conceptId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${API_V1_PREFIX}/concepts/${conceptId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete concept');
    }
}
