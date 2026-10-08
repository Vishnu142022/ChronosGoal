import { User, GoalParameter, Goal, GoalStep, TimeLog, Achievement, AuditLog, SystemMetrics, Habit, TaskItem, FreezeState, MindsetEntry } from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_GOAL_PARAMETERS, 
  INITIAL_GOALS, 
  INITIAL_TIME_LOGS, 
  INITIAL_ACHIEVEMENTS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_SYSTEM_METRICS,
  INITIAL_HABITS,
  INITIAL_TASKS,
  INITIAL_FREEZE_STATE
} from '../data/initialData';

const STORAGE_KEYS = {
  USERS: 'chronos_users_v1',
  CURRENT_USER: 'chronos_current_user_v1',
  PARAMETERS: 'chronos_parameters_v1',
  GOALS: 'chronos_goals_v1',
  TIME_LOGS: 'chronos_time_logs_v1',
  ACHIEVEMENTS: 'chronos_achievements_v1',
  AUDIT_LOGS: 'chronos_audit_logs_v1',
  SYSTEM_METRICS: 'chronos_metrics_v1',
  HABITS: 'chronos_habits_v2',
  TASKS: 'chronos_tasks_v1',
  FREEZE_STATE: 'chronos_freeze_state_v1',
  MINDSET: 'chronos_mindset_v1'
};

class StorageService {
  private listeners: (() => void)[] = [];

  constructor() {
    this.initDefaults();
  }

  private initDefaults() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Default to Sarah Chen (User)
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[1]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PARAMETERS)) {
      localStorage.setItem(STORAGE_KEYS.PARAMETERS, JSON.stringify(INITIAL_GOAL_PARAMETERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GOALS)) {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(INITIAL_GOALS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TIME_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify(INITIAL_TIME_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS)) {
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(INITIAL_ACHIEVEMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SYSTEM_METRICS)) {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_METRICS, JSON.stringify(INITIAL_SYSTEM_METRICS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HABITS)) {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(INITIAL_HABITS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FREEZE_STATE)) {
      localStorage.setItem(STORAGE_KEYS.FREEZE_STATE, JSON.stringify(INITIAL_FREEZE_STATE));
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- Current User & Auth ---
  public getCurrentUser(): User {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return INITIAL_USERS[1];
    return JSON.parse(raw);
  }

  public setCurrentUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.logAudit(user.id, user.name, 'USER_SESSION_SWITCH', `Switched active persona to ${user.name} (${user.role})`);
    this.notify();
  }

  public loginAs(userId: string): boolean {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      this.updateUser(user);
      this.setCurrentUser(user);
      return true;
    }
    return false;
  }

  // --- Users ---
  public getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : INITIAL_USERS;
  }

  public addUser(user: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.logAudit(this.getCurrentUser().id, this.getCurrentUser().name, 'CREATE_USER', `Created user account for ${newUser.name} (${newUser.email})`);
    this.updateMetrics();
    this.notify();
    return newUser;
  }

  public updateUser(user: User): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      
      const curr = this.getCurrentUser();
      if (curr.id === user.id) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      }
      this.notify();
    }
  }

  public deleteUser(userId: string): void {
    let users = this.getUsers();
    const userToDelete = users.find(u => u.id === userId);
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    if (userToDelete) {
      this.logAudit(this.getCurrentUser().id, this.getCurrentUser().name, 'DELETE_USER', `Deleted user account ${userToDelete.name}`);
    }
    this.updateMetrics();
    this.notify();
  }

  // --- Goal Parameters (Admin) ---
  public getParameters(): GoalParameter[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PARAMETERS);
    return raw ? JSON.parse(raw) : INITIAL_GOAL_PARAMETERS;
  }

  public saveParameter(param: GoalParameter): void {
    const params = this.getParameters();
    const index = params.findIndex(p => p.id === param.id);
    if (index !== -1) {
      params[index] = param;
    } else {
      params.push({ ...param, id: `param_${Date.now()}` });
    }
    localStorage.setItem(STORAGE_KEYS.PARAMETERS, JSON.stringify(params));
    this.logAudit(this.getCurrentUser().id, this.getCurrentUser().name, 'CONFIGURE_GOAL_PARAMETERS', `Configured parameters for category "${param.categoryName}"`);
    this.notify();
  }

  public deleteParameter(paramId: string): void {
    let params = this.getParameters();
    params = params.filter(p => p.id !== paramId);
    localStorage.setItem(STORAGE_KEYS.PARAMETERS, JSON.stringify(params));
    this.notify();
  }

  // --- Goals ---
  public getGoals(): Goal[] {
    const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
    const goals: Goal[] = raw ? JSON.parse(raw) : INITIAL_GOALS;
    
    // Dynamically recalculate totalLoggedMinutes from time logs
    const logs = this.getTimeLogs();
    return goals.map(g => {
      const gLogs = logs.filter(l => l.goalId === g.id);
      const totalMinutes = gLogs.reduce((acc, curr) => acc + curr.durationMinutes, 0);
      const loggedHours = totalMinutes / 60.0;
      let status = g.status;
      if (loggedHours >= g.targetHours && status !== 'COMPLETED') {
        status = 'COMPLETED';
      }
      return {
        ...g,
        totalLoggedMinutes: totalMinutes,
        status: status
      };
    });
  }

  public getGoalsForUser(userId: string): Goal[] {
    return this.getGoals().filter(g => g.userId === userId);
  }

  public createGoal(goal: Omit<Goal, 'id' | 'totalLoggedMinutes' | 'createdAt' | 'updatedAt'>): Goal {
    const goals = this.getGoals();
    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}`,
      totalLoggedMinutes: 0,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    goals.unshift(newGoal);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    this.logAudit(goal.userId, goal.userName || 'User', 'CREATE_GOAL', `Created goal "${goal.name}" (Target: ${goal.targetHours}h, Deadline: ${goal.deadline})`);
    this.updateMetrics();
    this.notify();
    return newGoal;
  }

  public toggleGoalPin(goalId: string): void {
    const goals = this.getGoals();
    const target = goals.find(g => g.id === goalId);
    if (target) {
      target.isPinned = !target.isPinned;
      target.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
      this.notify();
    }
  }

  public addGoalStep(goalId: string, title: string, deadline?: string): void {
    const goals = this.getGoals();
    const target = goals.find(g => g.id === goalId);
    if (target) {
      if (!target.steps) target.steps = [];
      const newStep: GoalStep = {
        id: `stp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        goalId,
        title,
        deadline,
        completed: false
      };
      target.steps.push(newStep);
      target.updatedAt = new Date().toISOString();

      // Recalculate status
      const total = target.steps.length;
      const done = target.steps.filter(s => s.completed).length;
      if (total > 0 && done === total) {
        target.status = 'COMPLETED';
      } else if (done > 0) {
        target.status = 'IN_PROGRESS';
      }

      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
      this.notify();
    }
  }

  public toggleGoalStep(goalId: string, stepId: string): void {
    const goals = this.getGoals();
    const target = goals.find(g => g.id === goalId);
    if (target && target.steps) {
      const step = target.steps.find(s => s.id === stepId);
      if (step) {
        step.completed = !step.completed;
        step.completedAt = step.completed ? new Date().toISOString() : undefined;
        target.updatedAt = new Date().toISOString();

        // Recalculate status from steps
        const total = target.steps.length;
        const done = target.steps.filter(s => s.completed).length;
        if (total > 0 && done === total) {
          target.status = 'COMPLETED';
        } else if (done > 0) {
          target.status = 'IN_PROGRESS';
        } else {
          target.status = 'NOT_STARTED';
        }

        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
        this.notify();
      }
    }
  }

  public deleteGoalStep(goalId: string, stepId: string): void {
    const goals = this.getGoals();
    const target = goals.find(g => g.id === goalId);
    if (target && target.steps) {
      target.steps = target.steps.filter(s => s.id !== stepId);
      target.updatedAt = new Date().toISOString();

      // Recalculate status
      const total = target.steps.length;
      const done = target.steps.filter(s => s.completed).length;
      if (total > 0 && done === total) {
        target.status = 'COMPLETED';
      } else if (done > 0) {
        target.status = 'IN_PROGRESS';
      }

      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
      this.notify();
    }
  }

  public updateGoal(goal: Goal): void {
    const goals = this.getGoals();
    const index = goals.findIndex(g => g.id === goal.id);
    if (index !== -1) {
      goals[index] = { ...goal, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
      this.logAudit(goal.userId, goal.userName || 'User', 'UPDATE_GOAL', `Updated goal "${goal.name}"`);
      this.updateMetrics();
      this.notify();
    }
  }

  public deleteGoal(goalId: string): void {
    let goals = this.getGoals();
    const targetGoal = goals.find(g => g.id === goalId);
    goals = goals.filter(g => g.id !== goalId);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));

    // Cascade delete time logs
    let logs = this.getTimeLogs();
    logs = logs.filter(l => l.goalId !== goalId);
    localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify(logs));

    if (targetGoal) {
      this.logAudit(this.getCurrentUser().id, this.getCurrentUser().name, 'DELETE_GOAL', `Deleted goal "${targetGoal.name}" and associated time logs (JDBC Cascade)`);
    }
    this.updateMetrics();
    this.notify();
  }

  // --- Time Logs ---
  public getTimeLogs(): TimeLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TIME_LOGS);
    return raw ? JSON.parse(raw) : INITIAL_TIME_LOGS;
  }

  public getTimeLogsForUser(userId: string): TimeLog[] {
    return this.getTimeLogs().filter(l => l.userId === userId);
  }

  public recalculateGoalMinutes(goalId: string): void {
    const allLogs = this.getTimeLogs();
    const goalLogs = allLogs.filter(l => l.goalId === goalId);
    const totalMin = goalLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);

    const goals = this.getGoals();
    const targetGoal = goals.find(g => g.id === goalId);
    if (targetGoal) {
      targetGoal.totalLoggedMinutes = totalMin;
      targetGoal.updatedAt = new Date().toISOString();
      if (targetGoal.targetHours && (totalMin / 60.0) >= targetGoal.targetHours) {
        targetGoal.status = 'COMPLETED';
      }
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    }
  }

  public createTimeLog(log: Omit<TimeLog, 'id' | 'createdAt'>): TimeLog {
    const logs = this.getTimeLogs();
    const newLog: TimeLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify(logs));
    
    // Sync goal logged minutes
    this.recalculateGoalMinutes(log.goalId);

    this.logAudit(log.userId, log.userName || 'User', 'RECORD_TIME_LOG', `Logged ${log.durationMinutes}m for goal "${log.goalName || 'Goal'}"`);
    this.updateMetrics();
    this.notify();
    return newLog;
  }

  public updateTimeLog(updatedLog: TimeLog): void {
    const logs = this.getTimeLogs();
    const idx = logs.findIndex(l => l.id === updatedLog.id);
    if (idx !== -1) {
      const oldGoalId = logs[idx].goalId;
      logs[idx] = updatedLog;
      localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify(logs));

      // Recalculate for both old and new goal if changed
      this.recalculateGoalMinutes(oldGoalId);
      if (oldGoalId !== updatedLog.goalId) {
        this.recalculateGoalMinutes(updatedLog.goalId);
      }

      this.logAudit(updatedLog.userId, updatedLog.userName || 'User', 'UPDATE_TIME_LOG', `Updated time log ${updatedLog.id} (${updatedLog.durationMinutes}m)`);
      this.updateMetrics();
      this.notify();
    }
  }

  public deleteTimeLog(logId: string): void {
    let logs = this.getTimeLogs();
    const targetLog = logs.find(l => l.id === logId);
    logs = logs.filter(l => l.id !== logId);
    localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify(logs));

    if (targetLog) {
      this.recalculateGoalMinutes(targetLog.goalId);
      this.logAudit(this.getCurrentUser().id, this.getCurrentUser().name, 'DELETE_TIME_LOG', `Removed time log of ${targetLog.durationMinutes}m`);
    }
    this.updateMetrics();
    this.notify();
  }

  // --- Achievements ---
  public getAchievements(): Achievement[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    return raw ? JSON.parse(raw) : INITIAL_ACHIEVEMENTS;
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : INITIAL_AUDIT_LOGS;
  }

  public logAudit(userId: string, userName: string, action: string, details: string, status: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS') {
    const logs = this.getAuditLogs();
    const newAudit: AuditLog = {
      id: `aud_${Date.now()}`,
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1 (Servlet Container)',
      status
    };
    logs.unshift(newAudit);
    if (logs.length > 50) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  }

  // --- System Metrics ---
  public getSystemMetrics(): SystemMetrics {
    const raw = localStorage.getItem(STORAGE_KEYS.SYSTEM_METRICS);
    return raw ? JSON.parse(raw) : INITIAL_SYSTEM_METRICS;
  }

  private updateMetrics(): void {
    const users = this.getUsers();
    const goals = this.getGoals();
    const logs = this.getTimeLogs();

    const totalMinutes = logs.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const completedGoals = goals.filter(g => g.status === 'COMPLETED' || (g.totalLoggedMinutes / 60.0 >= g.targetHours)).length;

    const metrics: SystemMetrics = {
      totalUsers: users.length,
      activeUsers24h: users.filter(u => u.status === 'ACTIVE').length,
      totalGoalsCreated: goals.length,
      completedGoals: completedGoals,
      totalHoursLogged: Math.round((totalMinutes / 60.0) * 10) / 10,
      activeThreads: Math.floor(Math.random() * 4) + 6,
      dbPoolActiveConnections: Math.floor(Math.random() * 3) + 3,
      dbPoolIdleConnections: 7,
      servletRequestThroughputPerMin: 120 + Math.floor(Math.random() * 50),
      averageResponseTimeMs: 12.4 + Math.random() * 5,
      memoryUsageMb: 190 + Math.floor(Math.random() * 30),
      maxMemoryMb: 512,
      uptimeSeconds: 864200 + Math.floor(performance.now() / 1000)
    };
    localStorage.setItem(STORAGE_KEYS.SYSTEM_METRICS, JSON.stringify(metrics));
  }

  // --- Habits Management ---
  public getHabits(userId?: string): Habit[] {
    const raw = localStorage.getItem(STORAGE_KEYS.HABITS);
    let allHabits: Habit[] = raw ? JSON.parse(raw) : INITIAL_HABITS;
    
    // Seed initial weekly and monthly habits if not present in storage
    const hasWeekly = allHabits.some(h => h.frequency === 'WEEKLY');
    const hasMonthly = allHabits.some(h => h.frequency === 'MONTHLY');
    if (!hasWeekly || !hasMonthly) {
      const missingInitial = INITIAL_HABITS.filter(h => 
        (h.frequency === 'WEEKLY' && !hasWeekly) || 
        (h.frequency === 'MONTHLY' && !hasMonthly)
      );
      if (missingInitial.length > 0) {
        allHabits = [...allHabits, ...missingInitial];
        localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(allHabits));
      }
    }

    if (userId) {
      return allHabits.filter(h => h.userId === userId);
    }
    return allHabits;
  }

  // Calculate habit streak respecting both completed days and frozen days (Daily, Weekly, Monthly independent)
  public calculateHabitStreak(habit: Habit, referenceDateStr?: string): { currentStreak: number; bestStreak: number } {
    const todayStr = referenceDateStr || new Date().toISOString().slice(0, 10);
    const history = habit.history || {};

    if (habit.frequency === 'WEEKLY') {
      const target = habit.weeklyTarget || 3;
      let weeklyStreak = 0;
      const refDate = new Date(todayStr + 'T12:00:00Z');
      
      // Calculate current week's Monday
      const dayOfWeek = refDate.getUTCDay(); // 0 is Sun, 1 is Mon...
      const diffToMon = (dayOfWeek + 6) % 7;
      const currentMon = new Date(refDate);
      currentMon.setUTCDate(refDate.getUTCDate() - diffToMon);

      // Check current week
      let currentWeekCount = 0;
      for (let d = 0; d < 7; d++) {
        const dObj = new Date(currentMon);
        dObj.setUTCDate(currentMon.getUTCDate() + d);
        const dStr = dObj.toISOString().slice(0, 10);
        if (history[dStr] === true || history[dStr] === 'COMPLETED' || history[dStr] === 'FROZEN') {
          currentWeekCount++;
        }
      }

      if (currentWeekCount >= target) {
        weeklyStreak = 1;
      }

      // Check past consecutive weeks backwards (up to 52 weeks)
      for (let w = 1; w <= 52; w++) {
        const pastMon = new Date(currentMon);
        pastMon.setUTCDate(currentMon.getUTCDate() - (w * 7));
        let pastWeekCount = 0;
        for (let d = 0; d < 7; d++) {
          const dObj = new Date(pastMon);
          dObj.setUTCDate(pastMon.getUTCDate() + d);
          const dStr = dObj.toISOString().slice(0, 10);
          if (history[dStr] === true || history[dStr] === 'COMPLETED' || history[dStr] === 'FROZEN') {
            pastWeekCount++;
          }
        }

        if (pastWeekCount >= target) {
          weeklyStreak += 1;
        } else {
          // If current week not yet met, don't break immediately if evaluating past weeks;
          // but if past completed week failed target, break streak
          if (w === 1 && currentWeekCount < target) {
            // current week is in progress, continue checking past week for baseline streak
            continue;
          }
          break;
        }
      }

      const bestStreak = Math.max(habit.bestStreak || 0, weeklyStreak);
      return { currentStreak: weeklyStreak, bestStreak };
    }

    if (habit.frequency === 'MONTHLY') {
      const target = habit.monthlyTarget || 1;
      let monthlyStreak = 0;
      const refDate = new Date(todayStr + 'T12:00:00Z');
      const curYear = refDate.getUTCFullYear();
      const curMonth = refDate.getUTCMonth(); // 0..11

      // Count completions for current month
      const curPrefix = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
      const curCount = Object.keys(history).filter(k => k.startsWith(curPrefix) && (history[k] === true || history[k] === 'COMPLETED' || history[k] === 'FROZEN')).length;

      if (curCount >= target) {
        monthlyStreak = 1;
      }

      // Check past months (up to 12 months)
      for (let m = 1; m <= 12; m++) {
        const pastDate = new Date(Date.UTC(curYear, curMonth - m, 15));
        const pPrefix = `${pastDate.getUTCFullYear()}-${String(pastDate.getUTCMonth() + 1).padStart(2, '0')}`;
        const pCount = Object.keys(history).filter(k => k.startsWith(pPrefix) && (history[k] === true || history[k] === 'COMPLETED' || history[k] === 'FROZEN')).length;

        if (pCount >= target) {
          monthlyStreak += 1;
        } else {
          if (m === 1 && curCount < target) {
            continue;
          }
          break;
        }
      }

      const bestStreak = Math.max(habit.bestStreak || 0, monthlyStreak);
      return { currentStreak: monthlyStreak, bestStreak };
    }
    
    // DAILY habit streak logic
    let currentStreak = 0;
    const todayVal = history[todayStr];
    const isTodayCompleted = todayVal === true || todayVal === 'COMPLETED';
    const isTodayFrozen = todayVal === 'FROZEN';

    // Start backwards check
    const checkDate = new Date(todayStr + 'T12:00:00Z');

    if (isTodayCompleted || isTodayFrozen) {
      currentStreak = 1;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      // Today is pending: evaluate streak from yesterday
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    // Check consecutive days backwards (up to 365 days)
    for (let i = 0; i < 365; i++) {
      const dStr = checkDate.toISOString().slice(0, 10);
      const val = history[dStr];

      if (val === true || val === 'COMPLETED' || val === 'FROZEN') {
        currentStreak += 1;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        // Day was missed - streak broken
        break;
      }
    }

    const bestStreak = Math.max(habit.bestStreak || 0, currentStreak);
    return { currentStreak, bestStreak };
  }

  // Automatic Freeze Token Engine:
  // Checks for missed days on all habits. If a habit was not completed:
  // - Automatically uses 1 available Freeze Token.
  // - Protects streak and marks that day as "FROZEN".
  // - If 0 Freeze Tokens available, marks as "MISSED" and breaks streak.
  // - Never consumes token if habit was completed.
  // - Max 1 token per habit per missed day.
  public checkAndApplyAutoFreeze(): { autoFrozenCount: number; affectedHabits: string[]; message?: string } {
    const todayStr = new Date().toISOString().slice(0, 10);
    const habits = this.getHabits();
    const freezeState = this.getFreezeState();
    
    let autoFrozenCount = 0;
    const affectedHabitNames: string[] = [];
    let stateChanged = false;

    habits.forEach(habit => {
      if (!habit.history) habit.history = {};
      
      const createdDateStr = habit.createdAt ? habit.createdAt.slice(0, 10) : '2026-09-01';
      
      // Look back through the past 30 days
      const checkDate = new Date(todayStr + 'T12:00:00Z');
      checkDate.setUTCDate(checkDate.getUTCDate() - 1); // Start from yesterday

      for (let i = 0; i < 30; i++) {
        const dStr = checkDate.toISOString().slice(0, 10);
        if (dStr < createdDateStr) break;

        const val = habit.history[dStr];

        if (val === true || val === 'COMPLETED' || val === 'FROZEN') {
          // Already completed or already frozen
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
          continue;
        }

        // Habit was missed/uncompleted on this past day
        if (val === undefined || val === false || val === 'MISSED') {
          if (freezeState.availableTokens > 0) {
            // Automatically use 1 Freeze Token
            freezeState.availableTokens -= 1;
            freezeState.usedTokens += 1;
            freezeState.history.unshift({
              id: `frz_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              date: dStr,
              habitId: habit.id,
              habitName: habit.name,
              note: 'Habit frozen automatically — 1 Freeze Token used.'
            });

            habit.history[dStr] = 'FROZEN';
            autoFrozenCount += 1;
            if (!affectedHabitNames.includes(habit.name)) {
              affectedHabitNames.push(habit.name);
            }
            stateChanged = true;
          } else {
            // 0 tokens available -> mark as missed
            if (habit.history[dStr] !== 'MISSED') {
              habit.history[dStr] = 'MISSED';
              stateChanged = true;
            }
          }
        }

        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      }

      // Sync streak
      const { currentStreak, bestStreak } = this.calculateHabitStreak(habit, todayStr);
      if (habit.streak !== currentStreak || habit.bestStreak !== bestStreak) {
        habit.streak = currentStreak;
        habit.bestStreak = bestStreak;
        stateChanged = true;
      }
    });

    if (stateChanged) {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
      localStorage.setItem(STORAGE_KEYS.FREEZE_STATE, JSON.stringify(freezeState));
      this.notify();
    }

    let message: string | undefined;
    if (autoFrozenCount === 1) {
      message = 'Habit frozen automatically — 1 Freeze Token used.';
    } else if (autoFrozenCount > 1) {
      message = `${autoFrozenCount} habits frozen automatically — ${autoFrozenCount} Freeze Tokens used.`;
    }

    return { autoFrozenCount, affectedHabits: affectedHabitNames, message };
  }

  public toggleHabit(habitId: string, dateStr?: string): Habit | null {
    const targetDate = dateStr || new Date().toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    const habits = this.getHabits();
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return null;

    const habit = habits[habitIndex];
    if (!habit.history) habit.history = {};

    const currentVal = habit.history[targetDate];
    const isCompleted = currentVal === true || currentVal === 'COMPLETED';
    const isFrozen = currentVal === 'FROZEN';
    const freezeState = this.getFreezeState();

    if (isCompleted) {
      // Toggle OFF
      if (targetDate === todayStr) {
        delete habit.history[targetDate];
        habit.completedToday = false;
      } else {
        // If uncompleting a past day, apply auto-freeze or mark missed
        if (freezeState.availableTokens > 0) {
          freezeState.availableTokens -= 1;
          freezeState.usedTokens += 1;
          freezeState.history.unshift({
            id: `frz_auto_${Date.now()}`,
            date: targetDate,
            habitId: habit.id,
            habitName: habit.name,
            note: 'Habit frozen automatically — 1 Freeze Token used.'
          });
          habit.history[targetDate] = 'FROZEN';
          localStorage.setItem(STORAGE_KEYS.FREEZE_STATE, JSON.stringify(freezeState));
        } else {
          habit.history[targetDate] = 'MISSED';
        }
      }
    } else if (isFrozen) {
      // Was frozen, user completed it -> refund 1 Freeze Token
      freezeState.availableTokens += 1;
      freezeState.usedTokens = Math.max(0, freezeState.usedTokens - 1);
      freezeState.history.unshift({
        id: `frz_refund_${Date.now()}`,
        date: targetDate,
        habitId: habit.id,
        habitName: habit.name,
        note: 'Freeze token refunded after manual habit completion'
      });
      localStorage.setItem(STORAGE_KEYS.FREEZE_STATE, JSON.stringify(freezeState));

      habit.history[targetDate] = 'COMPLETED';
      if (targetDate === todayStr) habit.completedToday = true;
    } else {
      // Was pending or missed -> mark COMPLETED
      habit.history[targetDate] = 'COMPLETED';
      if (targetDate === todayStr) habit.completedToday = true;
    }

    // Recalculate streak
    const { currentStreak, bestStreak } = this.calculateHabitStreak(habit, todayStr);
    habit.streak = currentStreak;
    habit.bestStreak = bestStreak;

    habits[habitIndex] = habit;
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    this.notify();

    // Async Server Sync
    fetch(`/api/habits/${habitId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ dateStr: targetDate })
    }).catch(() => {});

    return habit;
  }

  public addHabit(habitData: Omit<Habit, 'id' | 'createdAt' | 'completedToday' | 'streak' | 'bestStreak' | 'history'>): Habit {
    const habits = this.getHabits();
    const newHabit: Habit = {
      ...habitData,
      id: `hbt_${Date.now()}`,
      completedToday: false,
      streak: 0,
      bestStreak: 0,
      history: {},
      createdAt: new Date().toISOString()
    };
    habits.push(newHabit);
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    this.notify();

    // Async Server Sync
    fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(habitData)
    }).catch(() => {});

    return newHabit;
  }

  public updateHabit(updated: Habit): Habit {
    const habits = this.getHabits();
    const idx = habits.findIndex(h => h.id === updated.id);
    if (idx !== -1) {
      habits[idx] = updated;
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
      this.notify();

      fetch(`/api/habits/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated)
      }).catch(() => {});
    }
    return updated;
  }

  public deleteHabit(habitId: string): void {
    const habits = this.getHabits();
    const filtered = habits.filter(h => h.id !== habitId);
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(filtered));
    this.notify();

    fetch(`/api/habits/${habitId}`, {
      method: 'DELETE',
      credentials: 'include'
    }).catch(() => {});
  }

  // --- Freeze Tokens ---
  public getFreezeState(): FreezeState {
    const raw = localStorage.getItem(STORAGE_KEYS.FREEZE_STATE);
    return raw ? JSON.parse(raw) : INITIAL_FREEZE_STATE;
  }

  public useFreezeToken(habitId?: string, habitName?: string, note?: string): boolean {
    const freezeState = this.getFreezeState();
    if (freezeState.availableTokens <= 0) return false;

    freezeState.availableTokens -= 1;
    freezeState.usedTokens += 1;
    freezeState.history.unshift({
      id: `frz_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      habitId,
      habitName,
      note: note || 'Habit frozen automatically — 1 Freeze Token used.'
    });

    if (habitId) {
      const habits = this.getHabits();
      const h = habits.find(item => item.id === habitId);
      if (h) {
        h.isFrozenToday = true;
        localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
      }
    }

    localStorage.setItem(STORAGE_KEYS.FREEZE_STATE, JSON.stringify(freezeState));
    this.notify();

    fetch('/api/freeze-vault/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ habitId, habitName, note })
    }).catch(() => {});

    return true;
  }

  // --- Tasks Management ---
  public getTasks(userId?: string): TaskItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    let allTasks: TaskItem[] = raw ? JSON.parse(raw) : INITIAL_TASKS;
    if (allTasks.length < INITIAL_TASKS.length) {
      const existingIds = new Set(allTasks.map(t => t.id));
      const missing = INITIAL_TASKS.filter(t => !existingIds.has(t.id));
      if (missing.length > 0) {
        allTasks = [...allTasks, ...missing];
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
      }
    }
    if (userId) {
      return allTasks.filter(t => t.userId === userId);
    }
    return allTasks;
  }

  public addTask(taskData: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>): TaskItem {
    const tasks = this.getTasks();
    const newTask: TaskItem = {
      ...taskData,
      id: `tsk_${Date.now()}`,
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.unshift(newTask);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this.notify();
    return newTask;
  }

  public toggleTask(taskId: string): TaskItem | null {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx].completed = !tasks[idx].completed;
    tasks[idx].completedAt = tasks[idx].completed ? new Date().toISOString() : undefined;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this.notify();
    return tasks[idx];
  }

  public deleteTask(taskId: string): void {
    const tasks = this.getTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
    this.notify();
  }

  public addTasksBatch(newTasksData: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>[]): TaskItem[] {
    const tasks = this.getTasks();
    const created: TaskItem[] = newTasksData.map((t, idx) => ({
      ...t,
      id: `tsk_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      completed: false,
      createdAt: new Date().toISOString()
    }));
    tasks.unshift(...created);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this.notify();
    return created;
  }

  // --- Mindset Tracking ---
  public getMindsetData(): Record<string, MindsetEntry> {
    const raw = localStorage.getItem(STORAGE_KEYS.MINDSET);
    if (raw) return JSON.parse(raw);

    // Initial mindset data for demo
    const defaultData: Record<string, MindsetEntry> = {
      '2026-09-06': { energy: 7, focus: 8, motivation: 7 },
      '2026-09-07': { energy: 5, focus: 6, motivation: 5 },
      '2026-09-08': { energy: 8, focus: 8, motivation: 9 },
      '2026-09-09': { energy: 8, focus: 6, motivation: 7 },
      '2026-09-10': { energy: 9, focus: 7, motivation: 8 },
      '2026-09-11': { energy: 6, focus: 6, motivation: 6 },
      '2026-09-12': { energy: 6, focus: 6, motivation: 6 }
    };
    return defaultData;
  }

  public saveMindsetEntry(dateStr: string, entry: MindsetEntry): void {
    const data = this.getMindsetData();
    data[dateStr] = entry;
    localStorage.setItem(STORAGE_KEYS.MINDSET, JSON.stringify(data));
    this.notify();
  }

  public resetAllData(): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[1]));
    localStorage.setItem(STORAGE_KEYS.PARAMETERS, JSON.stringify(INITIAL_GOAL_PARAMETERS));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(INITIAL_GOALS));
    localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify(INITIAL_TIME_LOGS));
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(INITIAL_ACHIEVEMENTS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.SYSTEM_METRICS, JSON.stringify(INITIAL_SYSTEM_METRICS));
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(INITIAL_HABITS));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    localStorage.setItem(STORAGE_KEYS.FREEZE_STATE, JSON.stringify(INITIAL_FREEZE_STATE));
    this.notify();
  }
}

export const storageService = new StorageService();

