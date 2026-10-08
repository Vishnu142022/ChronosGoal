export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdAt: string;
  lastLoginAt: string;
  avatarUrl?: string;
  department?: string;
}

export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'PAUSED';
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type LifeAreaName = 
  | 'Health & Fitness'
  | 'Career Growth'
  | 'Finances & Wealth'
  | 'Relationships'
  | 'Romance & Love'
  | 'Spirituality'
  | 'Home'
  | 'Adventure & Travel'
  | 'Fun & Hobbies'
  | 'Community';

export interface GoalStep {
  id: string;
  goalId: string;
  title: string;
  deadline?: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  targetHours: number;
  completed: boolean;
  dueDate?: string;
}

export interface Goal {
  id: string;
  userId: string;
  userName?: string;
  name: string;
  category: string; // Life area
  lifeArea?: LifeAreaName | string;
  targetStatement?: string;
  targetHours: number; // Target in hours
  deadline: string; // YYYY-MM-DD
  startDate: string;
  priority: GoalPriority;
  status: GoalStatus;
  description: string;
  totalLoggedMinutes: number; // Sum of time logs
  milestones?: Milestone[];
  steps?: GoalStep[];
  isPinned?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TimeLog {
  id: string;
  goalId: string;
  goalName?: string;
  userId: string;
  userName?: string;
  startTime: string; // ISO or YYYY-MM-DDTHH:mm
  endTime: string;   // ISO or YYYY-MM-DDTHH:mm
  durationMinutes: number;
  notes: string;
  productivityRating: number; // 1-5
  createdAt: string;
}

export interface GoalParameter {
  id: string;
  categoryName: string;
  metricType: 'HOURS' | 'SESSIONS' | 'MILESTONES' | 'PAGES_OR_UNITS';
  defaultTargetHours: number;
  minTargetHours: number;
  maxTargetHours: number;
  suggestedDeadlineDays: number;
  difficultyMultiplier: number;
  isActive: boolean;
  description: string;
  color: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  criteria: string;
  unlockedAt?: string;
  category: 'TIME' | 'COMPLETION' | 'STREAK' | 'DIVERSITY';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface SystemMetrics {
  totalUsers: number;
  activeUsers24h: number;
  totalGoalsCreated: number;
  completedGoals: number;
  totalHoursLogged: number;
  activeThreads: number;
  dbPoolActiveConnections: number;
  dbPoolIdleConnections: number;
  servletRequestThroughputPerMin: number;
  averageResponseTimeMs: number;
  memoryUsageMb: number;
  maxMemoryMb: number;
  uptimeSeconds: number;
}

export interface JavaSourceFile {
  path: string;
  package: string;
  fileName: string;
  category: 'MODEL' | 'DAO' | 'SERVICE' | 'SERVLET' | 'FILTER' | 'EXCEPTION' | 'THREAD' | 'CONFIG' | 'TEST' | 'SQL';
  rubricCategory: string; // e.g. "OOP Concepts", "JDBC & Transactions", "Threads & Concurrency", "Servlets & Web"
  description: string;
  code: string;
}

export interface UnitTestResult {
  id: string;
  className: string;
  methodName: string;
  description: string;
  category: string;
  durationMs: number;
  passed: boolean;
  outputMessage?: string;
  assertionDetail?: string;
}

export type HabitDayStatus = boolean | 'COMPLETED' | 'FROZEN' | 'MISSED';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: string;
  categoryColor: string; // e.g., '#A855F7', '#C084FC', '#7C3AED', '#D946EF', '#DDD6FE'
  completedToday: boolean;
  streak: number;
  bestStreak: number;
  isFrozenToday?: boolean;
  history: Record<string, HabitDayStatus>; // 'YYYY-MM-DD': boolean | 'COMPLETED' | 'FROZEN' | 'MISSED'
  weeklyTarget?: number; // e.g. 4 times/week for WEEKLY
  monthlyTarget?: number; // e.g. 20 workouts or 2 books for MONTHLY
  monthlyUnit?: string; // e.g. "times", "workouts", "books"
  frequency: 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'CUSTOM' | 'WEEKLY' | 'MONTHLY';
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME';
  reminder?: string;
  startDate?: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  dueDate?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface MindsetEntry {
  energy: number; // 1-10
  focus: number; // 1-10
  motivation: number; // 1-10
}

export interface FreezeState {
  availableTokens: number;
  usedTokens: number;
  history: Array<{ id: string; date: string; habitId?: string; habitName?: string; note?: string }>;
}

export interface JDBCTransactionStep {
  stepNumber: number;
  sql: string;
  action: 'AUTOCOMMIT_OFF' | 'EXECUTE_QUERY' | 'EXECUTE_UPDATE' | 'CHECK_CONSTRAINTS' | 'COMMIT' | 'ROLLBACK' | 'CLOSE_CONN';
  description: string;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'ROLLED_BACK';
  executionTimeMs?: number;
  rowsAffected?: number;
}

