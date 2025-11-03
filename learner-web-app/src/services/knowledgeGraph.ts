// Knowledge Graph API Service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

export type MasteryLevel = 'unknown' | 'learning' | 'known';

export interface NodeData {
    id: string;
    label: string;
    category: string;
    mastery: MasteryLevel;
    description?: string;
    prerequisites: string[];
}

export interface EdgeData {
    id: string;
    from_node: string;
    to_node: string;
    label?: string;
}

export interface KnowledgeGraphStats {
    total_nodes: number;
    total_edges: number;
    known: number;
    learning: number;
    unknown: number;
    completion_percentage: number;
}

export interface KnowledgeGraphResponse {
    nodes: NodeData[];
    edges: EdgeData[];
    stats: KnowledgeGraphStats;
}

export interface UpdateMasteryRequest {
    mastery: MasteryLevel;
}

/**
 * Get the complete knowledge graph
 */
export async function getKnowledgeGraph(
    token: string,
    category?: string,
    mastery?: MasteryLevel
): Promise<KnowledgeGraphResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (mastery) params.append('mastery', mastery);

    const queryString = params.toString();
    const url = `${API_BASE_URL}${API_V1_PREFIX}/knowledge-graph${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch knowledge graph: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update mastery level for a node
 */
export async function updateNodeMastery(
    nodeId: string,
    mastery: MasteryLevel,
    token: string
): Promise<{ message: string; node: NodeData }> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/knowledge-graph/${nodeId}/mastery`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ mastery }),
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to update mastery: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get all available categories
 */
export async function getCategories(token: string): Promise<string[]> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/knowledge-graph/categories`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const data = await response.json();
    return data.categories;
}

/**
 * Get knowledge graph statistics
 */
export async function getGraphStats(token: string): Promise<KnowledgeGraphStats> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/knowledge-graph/stats`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    return response.json();
}
