import { TimeLog } from '../types';
import { API_ENDPOINTS, apiRequest } from './apiConfig';

/**
 * Time Tracking Service
 *
 * Aligned with the existing Java Servlet backend:
 *   GET    /api/time-logs
 *   GET    /api/time-logs?goalId=...
 *   POST   /api/time-logs
 *   PUT    /api/time-logs?id=...
 *   DELETE /api/time-logs?id=...
 *
 * The Java servlet accepts form parameters for creation and JSON for updates.
 */
class TimeTrackingService {

  private dateAndTime(value: string): { date: string; time: string } {
    if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid time log timestamp: ${value}`);
      }
      const pad = (part: number) => String(part).padStart(2, '0');
      return {
        date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
      };
    }

    const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
    if (!match) {
      throw new Error(`Invalid time log timestamp: ${value}`);
    }
    return {
      date: match[1],
      time: `${match[2]}:${match[3] || '00'}`
    };
  }

  private normalizeTimeLog(log: TimeLog & { logDate?: string }): TimeLog {
    const logDate = log.logDate || log.startTime.slice(0, 10);
    const startTime = log.startTime.includes('T')
      ? log.startTime
      : `${logDate}T${log.startTime}`;
    const endTime = log.endTime.includes('T')
      ? log.endTime
      : `${logDate}T${log.endTime}`;
    return { ...log, startTime, endTime };
  }

  /**
   * Convert frontend TimeLog data into the parameter format
   * expected by the Java TimeLogServlet.
   */
  private buildFormData(
    log: Partial<TimeLog> & { logDate?: string }
  ): URLSearchParams {

    const formData = new URLSearchParams();

    if (log.goalId !== undefined) {
      formData.set('goalId', String(log.goalId));
    }

    if (log.startTime !== undefined) {
      const start = this.dateAndTime(String(log.startTime));
      formData.set('logDate', String(log.logDate || start.date));
      formData.set('startTime', start.time);
    }

    if (log.endTime !== undefined) {
      formData.set('endTime', this.dateAndTime(String(log.endTime)).time);
    }

    if (log.logDate !== undefined && log.startTime === undefined) {
      formData.set('logDate', String(log.logDate));
    }

    if (log.durationMinutes !== undefined) {
      formData.set(
        'durationMinutes',
        String(log.durationMinutes)
      );
    }

    if (log.notes !== undefined && log.notes !== null) {
      formData.set('notes', String(log.notes));
    }

    if (
      log.productivityRating !== undefined &&
      log.productivityRating !== null
    ) {
      formData.set(
        'productivityRating',
        String(log.productivityRating)
      );
    }

    return formData;
  }

  /**
   * Fetch all time logs for the logged-in user.
   */
  public async getTimeLogs(
    userId: string
  ): Promise<TimeLog[]> {
    void userId;
    const res = await apiRequest<{
      success: boolean;
      data: TimeLog[];
    }>(
      API_ENDPOINTS.TIME_TRACKING.BASE
    );

    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data.map(log => this.normalizeTimeLog(log));
    }
    throw new Error(res.error || 'Unable to load time logs');
  }

  /**
   * Fetch time logs for a specific goal.
   */
  public async getTimeLogsForGoal(
    goalId: string
  ): Promise<TimeLog[]> {

    const res = await apiRequest<{
      success: boolean;
      data: TimeLog[];
    }>(
      API_ENDPOINTS.TIME_TRACKING.BY_GOAL(goalId)
    );

    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data.map(log => this.normalizeTimeLog(log));
    }
    throw new Error(res.error || 'Unable to load goal time logs');
  }

  /**
   * Create a new time log.
   *
   * Java backend expects request parameters,
   * not a JSON request body.
   */
  public async logSession(
    log: Omit<TimeLog, 'id' | 'createdAt'>
  ): Promise<TimeLog> {

    const formData = this.buildFormData(log);

    const res = await apiRequest<{
      success: boolean;
      data: TimeLog;
    }>(
      API_ENDPOINTS.TIME_TRACKING.BASE,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded;charset=UTF-8',
          'Accept': 'application/json'
        }
      }
    );

    if (res.data?.success && res.data.data) {
      return this.normalizeTimeLog(res.data.data);
    }
    throw new Error(res.error || 'Unable to save time log');
  }

  /**
   * Update an existing time log using the JSON body read by the Servlet.
   */
  public async updateSession(
    log: TimeLog
  ): Promise<void> {

    const url =
      `${API_ENDPOINTS.TIME_TRACKING.BASE}?id=${encodeURIComponent(log.id)}`;

    const { date: logDate, time: startTime } = this.dateAndTime(log.startTime);
    const { time: endTime } = this.dateAndTime(log.endTime);

    const res = await apiRequest<{
      success: boolean;
      data: TimeLog;
    }>(
      url,
      {
        method: 'PUT',
        body: JSON.stringify({
            id: log.id,
            goalId: log.goalId,
          logDate,
          startTime,
          endTime,
          durationMinutes: log.durationMinutes,
          notes: log.notes,
          productivityRating: log.productivityRating
        }),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (res.data?.success && res.data.data) {
      return;
    }
    throw new Error(res.error || 'Unable to update time log');
  }

  /**
   * Delete an existing time log.
   *
   * Java backend expects:
   * DELETE /api/time-logs?id=<logId>
   */
  public async deleteSession(
    logId: string
  ): Promise<void> {

    const url =
      `${API_ENDPOINTS.TIME_TRACKING.BASE}?id=${encodeURIComponent(logId)}`;

    const res = await apiRequest<{
      success: boolean;
      message?: string;
    }>(
      url,
      {
        method: 'DELETE'
      }
    );

    if (res.data?.success) {
      return;
    }
    throw new Error(res.error || 'Unable to delete time log');
  }
}

export const timeTrackingService =
  new TimeTrackingService();
