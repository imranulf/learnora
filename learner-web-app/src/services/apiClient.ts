/**
 * Centralized API client for all fetch-based services.
 *
 * Provides:
 * - Automatic token injection from localStorage
 * - Unified error handling (FastAPI detail, validation arrays, generic)
 * - 401 detection → clears token and redirects to sign-in
 * - AbortSignal passthrough for request cancellation
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API_V1_PREFIX = '/api/v1';

export class ApiError extends Error {
  status: number;
  detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Extract a human-readable error message from various FastAPI error formats.
 */
function extractErrorMessage(error: Record<string, unknown>, status: number): string {
  if (error.error && typeof error.error === 'string') {
    return error.error;
  }
  if (error.detail) {
    if (Array.isArray(error.detail)) {
      return error.detail
        .map((e: { msg?: string }) => e.msg || JSON.stringify(e))
        .join(', ');
    }
    if (typeof error.detail === 'string') {
      return error.detail;
    }
    if (typeof error.detail === 'object' && error.detail !== null && 'message' in (error.detail as Record<string, unknown>)) {
      return (error.detail as { message: string }).message;
    }
  }
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }
  return `HTTP ${status}`;
}

/**
 * Handle 401 responses — clear stored token and redirect to sign-in.
 */
function handleUnauthorized() {
  localStorage.removeItem('access_token');
  // Only redirect if not already on sign-in page
  if (!window.location.pathname.startsWith('/sign-in')) {
    window.location.href = `/sign-in?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
  }
}

/**
 * Generic typed fetch wrapper with auth, error handling, and abort support.
 */
export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const token = localStorage.getItem('access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    // Handle 401 globally
    if (response.status === 401) {
      handleUnauthorized();
      throw new ApiError('Session expired. Please sign in again.', 401);
    }

    const errorBody = await response.json().catch(() => ({ error: 'Request failed' }));
    const message = extractErrorMessage(errorBody, response.status);
    throw new ApiError(message, response.status, errorBody.detail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
