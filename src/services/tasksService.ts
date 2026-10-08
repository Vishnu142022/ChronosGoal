import { TaskItem } from '../types';
import { API_ENDPOINTS, apiRequest } from './apiConfig';

/**
 * Tasks Service
 * Encapsulates all Tasks business operations and REST API calls.
 * Communicates with the session-authenticated Tasks Servlet.
 */
class TasksService {
  /**
   * Fetch all tasks for a specific user
   */
  public async getTasks(userId: string): Promise<TaskItem[]> {
    void userId;
    const res = await apiRequest<TaskItem[]>(API_ENDPOINTS.TASKS.BASE);
    if (!res.data) throw new Error(res.error || 'Unable to load tasks');
    return res.data;
  }

  /**
   * Create a new task
   */
  public async createTask(task: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>): Promise<TaskItem> {
    const res = await apiRequest<TaskItem>(API_ENDPOINTS.TASKS.BASE, {
      method: 'POST',
      body: JSON.stringify(task)
    });
    if (!res.data) throw new Error(res.error || 'Unable to create task');
    return res.data;
  }

  /**
   * Toggle task completion
   */
  public async toggleTask(taskId: string): Promise<TaskItem | null> {
    const res = await apiRequest<TaskItem>(API_ENDPOINTS.TASKS.TOGGLE(taskId), {
      method: 'POST'
    });
    if (!res.data) throw new Error(res.error || 'Unable to update task');
    return res.data;
  }

  /**
   * Delete a task
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(API_ENDPOINTS.TASKS.BY_ID(taskId), {
      method: 'DELETE'
    });
    if (!res.data?.success) throw new Error(res.error || 'Unable to delete task');
    return true;
  }
}

export const tasksService = new TasksService();

