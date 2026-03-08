/**
 * React Query hooks for data fetching.
 *
 * Leverages the QueryClient configured in AppProviderWrapper.
 * Provides automatic caching, deduplication, and stale-while-revalidate.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDashboardStats } from '../services/dashboard';
import { getAllLearningPaths, deleteLearningPath } from '../services/learningPath';
import { getPathProgress } from '../services/learningPathProgress';
import type { DashboardStats } from '../services/dashboard';
import type { LearningPathResponse } from '../services/learningPath';
import type { PathProgress } from '../services/learningPathProgress';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  dashboard: (token: string) => ['dashboard', token] as const,
  learningPaths: (token: string) => ['learning-paths', token] as const,
  pathProgress: (threadId: string, token: string) => ['path-progress', threadId, token] as const,
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useDashboardStats(token: string | undefined) {
  return useQuery<DashboardStats | null>({
    queryKey: queryKeys.dashboard(token || ''),
    queryFn: () => (token ? getDashboardStats(token) : Promise.resolve(null)),
    enabled: !!token,
    staleTime: 60_000,
  });
}

// ─── Learning Paths ──────────────────────────────────────────────────────────

export function useLearningPaths(token: string | undefined) {
  return useQuery<LearningPathResponse[]>({
    queryKey: queryKeys.learningPaths(token || ''),
    queryFn: () => (token ? getAllLearningPaths(token) : Promise.resolve([])),
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function usePathProgress(threadId: string, token: string | undefined) {
  return useQuery<PathProgress>({
    queryKey: queryKeys.pathProgress(threadId, token || ''),
    queryFn: () => {
      if (!token) throw new Error('Not authenticated');
      return getPathProgress(threadId, token);
    },
    enabled: !!token && !!threadId,
    staleTime: 30_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useDeleteLearningPath(token: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => {
      if (!token) throw new Error('Not authenticated');
      return deleteLearningPath(threadId, token);
    },
    onSuccess: () => {
      // Invalidate learning paths list so it refetches
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
