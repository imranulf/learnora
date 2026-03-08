/**
 * Dashboard API service
 */
import { fetchAPI, API_V1_PREFIX } from './apiClient';

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
    return fetchAPI<DashboardStats>(`${API_V1_PREFIX}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
}
