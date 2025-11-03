/**
 * Dashboard API service
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

export interface RecentActivity {
    type: string;
    title: string;
    description: string;
    timestamp: string;
    icon: string;
}

export interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: string;
    route: string;
    priority: number;
}

export interface DashboardStats {
    active_paths: number;
    concepts_learned: number;
    assessments_completed: number;
    average_progress: number;
    recent_activity: RecentActivity[];
    quick_actions: QuickAction[];
    updated_at: string;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(token: string): Promise<DashboardStats> {
    const response = await fetch(
        `${API_BASE_URL}${API_V1_PREFIX}/dashboard/stats`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to fetch dashboard stats' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}
