import { Habit } from '../types';
import { API_ENDPOINTS, apiRequest } from './apiConfig';

export interface ConsistencyPoint {
  dateStr: string;
  label: string;
  consistency: number;
  completedCount: number;
  totalCount: number;
}

export interface InsightsSummary {
  overallConsistency: number;
  thisWeekRate: number;
  lastWeekRate: number;
  diff: number;
  bestStreak: number;
  bestStreakHabit: string;
}

/**
 * Insights Service
 * Encapsulates analytical computations and future analytics API calls.
 * Communicates with the Insights Analytics Servlet in the future Java backend.
 */
class InsightsService {
  /**
   * Fetch backend-calculated insights summary
   */
  public async getSummary(userId: string, timeRange: string = '30_DAYS'): Promise<InsightsSummary | null> {
    const res = await apiRequest<InsightsSummary>(
      `${API_ENDPOINTS.INSIGHTS.SUMMARY}?range=${encodeURIComponent(timeRange)}`
    );
    void userId;
    if (!res.data) throw new Error(res.error || 'Unable to load insights');
    return res.data;
  }

  /**
   * Calculate consistency curve for habits in date range
   */
  public calculateConsistencyPoints(
    habits: Habit[],
    dateRangeData: { dateStr: string; label: string }[],
    selectedHabitId: string = 'OVERALL'
  ): ConsistencyPoint[] {
    if (habits.length === 0) {
      return dateRangeData.map(d => ({ ...d, consistency: 0, completedCount: 0, totalCount: 0 }));
    }

    return dateRangeData.map((d) => {
      if (selectedHabitId === 'OVERALL') {
        let completed = 0;
        let total = habits.length;

        habits.forEach(h => {
          const status = h.history ? h.history[d.dateStr] : false;
          if (status === true || status === 'COMPLETED' || status === 'FROZEN') {
            completed += 1;
          }
        });

        const consistency = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          ...d,
          consistency,
          completedCount: completed,
          totalCount: total
        };
      } else {
        const h = habits.find(item => item.id === selectedHabitId);
        if (!h) return { ...d, consistency: 0, completedCount: 0, totalCount: 1 };

        const status = h.history ? h.history[d.dateStr] : false;
        const isDone = status === true || status === 'COMPLETED' || status === 'FROZEN';
        return {
          ...d,
          consistency: isDone ? 100 : 0,
          completedCount: isDone ? 1 : 0,
          totalCount: 1
        };
      }
    });
  }
}

export const insightsService = new InsightsService();

