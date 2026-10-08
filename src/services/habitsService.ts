import { Habit, FreezeState } from '../types';
import { API_ENDPOINTS, apiRequest } from './apiConfig';
import { storageService } from './storageService';

/**
 * Habits Service
 * Encapsulates all Habits business operations and REST API calls.
 * Communicates with the session-authenticated Habits Servlet.
 */
class HabitsService {
  /**
   * Fetch all habits for a specific user
   */
  public async getHabits(userId: string): Promise<Habit[]> {
    void userId;
    const res = await apiRequest<Habit[]>(API_ENDPOINTS.HABITS.BASE);
    if (!res.data) throw new Error(res.error || 'Unable to load habits');
    return res.data;
  }

  /**
   * Create a new habit
   */
  public async createHabit(habit: Omit<Habit, 'id' | 'createdAt' | 'completedToday' | 'streak' | 'bestStreak' | 'history'>): Promise<Habit> {
    const res = await apiRequest<Habit>(API_ENDPOINTS.HABITS.BASE, {
      method: 'POST',
      body: JSON.stringify(habit)
    });
    if (!res.data) throw new Error(res.error || 'Unable to create habit');
    return res.data;
  }

  /**
   * Update an existing habit
   */
  public async updateHabit(habit: Habit): Promise<Habit> {
    const res = await apiRequest<Habit>(API_ENDPOINTS.HABITS.BY_ID(habit.id), {
      method: 'PUT',
      body: JSON.stringify(habit)
    });
    if (!res.data) throw new Error(res.error || 'Unable to update habit');
    return res.data;
  }

  /**
   * Toggle habit completion status for a date
   */
  public async toggleHabit(habitId: string, dateStr: string): Promise<Habit | null> {
    const res = await apiRequest<Habit>(API_ENDPOINTS.HABITS.TOGGLE(habitId), {
      method: 'POST',
      body: JSON.stringify({ date: dateStr })
    });
    if (!res.data) throw new Error(res.error || 'Unable to toggle habit');
    return res.data;
  }

  /** Mark a habit date as frozen using the authenticated API. */
  public async freezeHabit(habitId: string): Promise<Habit> {
    const res = await apiRequest<Habit>(API_ENDPOINTS.HABITS.FREEZE(habitId), {
      method: 'POST'
    });
    if (!res.data) throw new Error(res.error || 'Unable to freeze habit');
    return res.data;
  }

  /**
   * Delete a habit
   */
  public async deleteHabit(habitId: string): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(API_ENDPOINTS.HABITS.BY_ID(habitId), {
      method: 'DELETE'
    });
    if (!res.data?.success) throw new Error(res.error || 'Unable to delete habit');
    return true;
  }

  /**
   * Freeze Token State
   */
  public getFreezeState(): FreezeState {
    return storageService.getFreezeState();
  }
}

export const habitsService = new HabitsService();

