import { Goal, GoalStep } from '../types';
import { API_ENDPOINTS, apiRequest } from './apiConfig';

/**
 * Goals Service
 * Encapsulates all Goals and Life Areas operations and REST API calls.
 * Communicates with the Goals Servlet in the future Java backend.
 */
class GoalsService {
  /**
   * Fetch goals for a specific user
   */
  public async getGoals(userId: string): Promise<Goal[]> {
    const res = await apiRequest<Goal[] | { success?: boolean; goals?: Goal[] }>(
      `${API_ENDPOINTS.GOALS.BASE}?userId=${encodeURIComponent(userId)}`
    );
    const goals = Array.isArray(res.data)
      ? res.data
      : res.data?.success && Array.isArray(res.data.goals)
        ? res.data.goals
        : null;
    if (goals) {
      return Promise.all(goals.map(async goal => ({
        ...goal,
        steps: await this.getSteps(goal.id)
      })));
    }
    throw new Error(res.error || 'Unable to load goals');
  }

  /**
   * Create a new goal
   */
  public async createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'totalLoggedMinutes'>): Promise<Goal> {
    const res = await apiRequest<Goal | { success?: boolean; goal?: Goal }>(API_ENDPOINTS.GOALS.BASE, {
      method: 'POST',
      body: JSON.stringify(goal)
    });
    if (res.data && 'id' in res.data) {
      return res.data;
    }
    if (res.data?.success && res.data.goal) {
      return res.data.goal;
    }
    throw new Error(res.error || 'Unable to create goal');
  }

  /**
   * Update an existing goal
   */
  public async updateGoal(goal: Goal): Promise<Goal> {
    const res = await apiRequest<Goal>(API_ENDPOINTS.GOALS.BY_ID(goal.id), {
      method: 'PUT',
      body: JSON.stringify(goal)
    });
    if (res.data && 'id' in res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Unable to update goal');
  }

  /**
   * Delete a goal
   */
  public async deleteGoal(goalId: string): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(API_ENDPOINTS.GOALS.BY_ID(goalId), {
      method: 'DELETE'
    });
    if (res.data?.success) {
      return true;
    }
    throw new Error(res.error || 'Unable to delete goal');
  }

  public async createGoalStep(
    goalId: string,
    title: string,
    deadline: string | undefined,
    stepOrder: number
  ): Promise<void> {
    const body = new URLSearchParams({
      goalId,
      title,
      stepOrder: String(stepOrder)
    });
    if (deadline) body.set('deadline', deadline);
    const res = await apiRequest<{ success: boolean }>(
      API_ENDPOINTS.GOAL_STEPS.BASE,
      {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }
      }
    );
    if (!res.data?.success) {
      throw new Error(res.error || 'Unable to create goal step');
    }
  }

  public async deleteGoalStep(goalId: string, stepId: string): Promise<void> {
    const res = await apiRequest<{ success: boolean }>(
      API_ENDPOINTS.GOAL_STEPS.BY_ID(goalId, stepId),
      { method: 'DELETE' }
    );
    if (!res.data?.success) {
      throw new Error(res.error || 'Unable to delete goal step');
    }
  }

  /**
   * Toggle a step within a goal
   */
  public async toggleStep(goalId: string, stepId: string): Promise<Goal | null> {
    const res = await apiRequest<Goal>(API_ENDPOINTS.GOALS.STEP_TOGGLE(goalId, stepId), {
      method: 'POST'
    });
    if (res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Unable to update goal step');
  }

  private async getSteps(goalId: string): Promise<GoalStep[]> {
    const res = await apiRequest<{ success: boolean; steps: GoalStep[] }>(
      API_ENDPOINTS.GOAL_STEPS.BY_GOAL(goalId)
    );
    if (res.data?.success && Array.isArray(res.data.steps)) {
      return res.data.steps;
    }
    throw new Error(res.error || 'Unable to load goal steps');
  }
}

export const goalsService = new GoalsService();

