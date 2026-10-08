/**
 * API Configuration & Endpoints Registry
 * Centralizes the base URL and API routes for REST communication.
 * Ready to seamlessly point to a Java Servlet backend (e.g. Tomcat/Jetty)
 * simply by updating VITE_API_BASE_URL in your environment.
 */

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export const API_ENDPOINTS = {
  // Authentication & Session Servlets
  AUTH: {
    ME: `${API_BASE_URL}/auth/me`,
    LOGIN: `${API_BASE_URL}/login`,
    ADMIN_LOGIN: `${API_BASE_URL}/admin-login`,
    REGISTER: `${API_BASE_URL}/register`,
    LOGOUT: `${API_BASE_URL}/logout`
  },

  // Habits Management Servlets
  HABITS: {
    BASE: `${API_BASE_URL}/habits`,
    BY_ID: (id: string) => `${API_BASE_URL}/habits/${id}`,
    TOGGLE: (id: string) => `${API_BASE_URL}/habits/${id}/toggle`,
    FREEZE: (id: string) => `${API_BASE_URL}/habits/${id}/freeze`
  },

  // Tasks Management Servlets
  TASKS: {
    BASE: `${API_BASE_URL}/tasks`,
    BY_ID: (id: string) => `${API_BASE_URL}/tasks/${id}`,
    TOGGLE: (id: string) => `${API_BASE_URL}/tasks/${id}/toggle`
  },

  // Goals Management Servlets
  GOALS: {
    BASE: `${API_BASE_URL}/goals`,
    BY_ID: (id: string) => `${API_BASE_URL}/goals/${id}`,
    STEP_TOGGLE: (
      goalId: string,
      stepId: string
    ) => `${API_BASE_URL}/goal-steps/${encodeURIComponent(goalId)}/steps/${encodeURIComponent(stepId)}/toggle`
  },

  GOAL_STEPS: {
    BASE: `${API_BASE_URL}/goal-steps/steps`,
    BY_GOAL: (goalId: string) =>
      `${API_BASE_URL}/goal-steps/steps?goalId=${encodeURIComponent(goalId)}`,
    BY_ID: (goalId: string, stepId: string) =>
      `${API_BASE_URL}/goal-steps/${encodeURIComponent(goalId)}/steps/${encodeURIComponent(stepId)}`
  },

  // Time Logs & Sessions Servlets
  TIME_TRACKING: {
    BASE: `${API_BASE_URL}/time-logs`,
    BY_ID: (id: string) => `${API_BASE_URL}/time-logs?id=${encodeURIComponent(id)}`,
    BY_GOAL: (goalId: string) =>
      `${API_BASE_URL}/time-logs?goalId=${encodeURIComponent(goalId)}`
  },

  // Insights & Analytics Servlets
  INSIGHTS: {
    SUMMARY: `${API_BASE_URL}/insights/summary`,
    CONSISTENCY: `${API_BASE_URL}/insights/consistency`,
    LEADERBOARD: `${API_BASE_URL}/insights/leaderboard`,
    STREAKS: `${API_BASE_URL}/insights/streaks`
  }
} as const;

/**
 * Standard HTTP Request Helper
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status?: number }> {
  try {
    const res = await fetch(url, {
      ...options,

      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      },

      // Required for session-cookie authentication
      credentials: 'include'
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        error:
          body?.error ||
          body?.message ||
          `HTTP ${res.status}: ${res.statusText}`,
        status: res.status
      };
    }

    return {
      data: body as T
    };

  } catch (err: any) {
    return {
      error:
        err?.message ||
        'Network error connecting to API'
    };
  }
}
