import { User, GoalParameter, Goal, TimeLog, Achievement, AuditLog, SystemMetrics, Habit, TaskItem, FreezeState } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin_1',
    name: 'Administrator (System)',
    email: 'admin@timetracker.org',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
    lastLoginAt: '2026-09-26T18:30:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    department: 'Engineering Management'
  },
  {
    id: 'usr_sarah_2',
    name: 'Sarah Chen (Senior Dev)',
    email: 'sarah.dev@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-02-15T09:30:00Z',
    lastLoginAt: '2026-09-26T17:45:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    department: 'Frontend Engineering'
  },
  {
    id: 'usr_alex_3',
    name: 'Alex Rivera (Data Analyst)',
    email: 'alex.rivera@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-03-01T11:00:00Z',
    lastLoginAt: '2026-09-25T14:20:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    department: 'Business Intelligence'
  },
  {
    id: 'usr_maya_4',
    name: 'Maya Patel (UI/UX Designer)',
    email: 'maya.design@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-04-12T14:15:00Z',
    lastLoginAt: '2026-09-24T16:10:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    department: 'Product Design'
  },
  {
    id: 'usr_marcus_5',
    name: 'Marcus Vance (DevOps)',
    email: 'marcus.v@example.com',
    role: 'USER',
    status: 'SUSPENDED',
    createdAt: '2026-05-20T10:00:00Z',
    lastLoginAt: '2026-08-15T09:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    department: 'Infrastructure'
  }
];

export const INITIAL_GOAL_PARAMETERS: GoalParameter[] = [
  {
    id: 'param_1',
    categoryName: 'Software Engineering & Learning',
    metricType: 'HOURS',
    defaultTargetHours: 40,
    minTargetHours: 5,
    maxTargetHours: 200,
    suggestedDeadlineDays: 30,
    difficultyMultiplier: 1.25,
    isActive: true,
    description: 'Coding projects, architecture design, refactoring, and technical certifications.',
    color: '#ffffff'
  },
  {
    id: 'param_2',
    categoryName: 'Fitness, Health & Endurance',
    metricType: 'HOURS',
    defaultTargetHours: 25,
    minTargetHours: 3,
    maxTargetHours: 100,
    suggestedDeadlineDays: 45,
    difficultyMultiplier: 1.1,
    isActive: true,
    description: 'Running, strength training, mobility sessions, and sports conditioning.',
    color: '#d4d4d8'
  },
  {
    id: 'param_3',
    categoryName: 'Academic Research & Reading',
    metricType: 'HOURS',
    defaultTargetHours: 30,
    minTargetHours: 4,
    maxTargetHours: 150,
    suggestedDeadlineDays: 60,
    difficultyMultiplier: 1.0,
    isActive: true,
    description: 'Reading technical whitepapers, book analysis, and research thesis drafting.',
    color: '#a1a1aa'
  },
  {
    id: 'param_4',
    categoryName: 'Language Acquisition & Fluency',
    metricType: 'HOURS',
    defaultTargetHours: 50,
    minTargetHours: 10,
    maxTargetHours: 300,
    suggestedDeadlineDays: 90,
    difficultyMultiplier: 1.3,
    isActive: true,
    description: 'Grammar practice, conversation exchange, listening comprehension.',
    color: '#71717a'
  },
  {
    id: 'param_5',
    categoryName: 'Career & Professional Growth',
    metricType: 'HOURS',
    defaultTargetHours: 20,
    minTargetHours: 2,
    maxTargetHours: 80,
    suggestedDeadlineDays: 30,
    difficultyMultiplier: 1.0,
    isActive: true,
    description: 'Resume updates, networking, interview preparation, presentation skills.',
    color: '#52525b'
  }
];

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal_101',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    name: 'Get Consistently Fit',
    category: 'Health & Fitness',
    lifeArea: 'Health & Fitness',
    targetStatement: 'Workout consistently for 90 days and build metabolic endurance',
    targetHours: 35,
    deadline: '2026-11-30',
    startDate: '2026-09-01',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    isPinned: true,
    description: 'Establish consistent gym, recovery, and clean nutrition habits across the autumn training cycle.',
    totalLoggedMinutes: 1320,
    steps: [
      { id: 'stp_101_1', goalId: 'goal_101', title: 'Complete full body baseline assessment & body scan', deadline: '2026-09-10', completed: true, completedAt: '2026-09-09T10:00:00Z' },
      { id: 'stp_101_2', goalId: 'goal_101', title: 'Establish 4x weekly resistance training cadence', deadline: '2026-09-25', completed: true, completedAt: '2026-09-24T18:00:00Z' },
      { id: 'stp_101_3', goalId: 'goal_101', title: 'Dial in 140g daily protein target & meal prep', deadline: '2026-10-15', completed: false },
      { id: 'stp_101_4', goalId: 'goal_101', title: 'Hit 10,000 steps daily average for 30 straight days', deadline: '2026-11-15', completed: false },
      { id: 'stp_101_5', goalId: 'goal_101', title: 'Complete final 90-day benchmark fitness test', deadline: '2026-11-30', completed: false }
    ],
    tags: ['Fitness', 'Health', 'Strength'],
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-26T15:30:00Z'
  },
  {
    id: 'goal_102',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    name: 'Run a 5K',
    category: 'Health & Fitness',
    lifeArea: 'Health & Fitness',
    targetStatement: 'Complete a sub-26 minute 5K road run',
    targetHours: 20,
    deadline: '2026-10-30',
    startDate: '2026-09-05',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    isPinned: true,
    description: '3 weekly aerobic runs plus interval sprint work to achieve sub-26min 5k race pace.',
    totalLoggedMinutes: 720,
    steps: [
      { id: 'stp_102_1', goalId: 'goal_102', title: 'Base building 3km easy aerobic jog', deadline: '2026-09-15', completed: true, completedAt: '2026-09-14T07:00:00Z' },
      { id: 'stp_102_2', goalId: 'goal_102', title: 'Threshold 400m intervals on track (6 sets)', deadline: '2026-10-10', completed: false },
      { id: 'stp_102_3', goalId: 'goal_102', title: 'Continuous 5km race pace trial simulation', deadline: '2026-10-30', completed: false }
    ],
    tags: ['Running', 'Cardio', '5K'],
    createdAt: '2026-09-05T08:30:00Z',
    updatedAt: '2026-09-25T19:00:00Z'
  },
  {
    id: 'goal_103',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    name: 'Save ₹50,000 Emergency Reserve',
    category: 'Finances & Wealth',
    lifeArea: 'Finances & Wealth',
    targetStatement: 'Accumulate ₹50,000 in high-yield liquid savings reserve',
    targetHours: 15,
    deadline: '2026-09-25',
    startDate: '2026-08-01',
    priority: 'HIGH',
    status: 'COMPLETED',
    isPinned: false,
    description: 'Automate weekly deposit splits into high-yield liquid fund to cover 3 months of emergency expenses.',
    totalLoggedMinutes: 930,
    steps: [
      { id: 'stp_103_1', goalId: 'goal_103', title: 'Open dedicated high-yield liquid savings vault', deadline: '2026-08-05', completed: true, completedAt: '2026-08-04T12:00:00Z' },
      { id: 'stp_103_2', goalId: 'goal_103', title: 'Transfer initial seed fund of ₹15,000', deadline: '2026-08-20', completed: true, completedAt: '2026-08-19T14:00:00Z' },
      { id: 'stp_103_3', goalId: 'goal_103', title: 'Deposit remaining ₹35,000 from freelance project', deadline: '2026-09-20', completed: true, completedAt: '2026-09-20T10:00:00Z' }
    ],
    tags: ['Savings', 'Wealth', 'Security'],
    createdAt: '2026-08-01T14:00:00Z',
    updatedAt: '2026-09-24T18:00:00Z'
  },
  {
    id: 'goal_104',
    userId: 'usr_alex_3',
    userName: 'Alex Rivera',
    name: 'Learn Java DSA',
    category: 'Career Growth',
    lifeArea: 'Career Growth',
    targetStatement: 'Complete 150 DSA problems in Java',
    targetHours: 25,
    deadline: '2026-12-31',
    startDate: '2026-10-01',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    isPinned: true,
    description: 'Master Core Java collections, algorithms, dynamic programming, and graphs.',
    totalLoggedMinutes: 660,
    steps: [
      { id: 'stp_104_1', goalId: 'goal_104', title: 'Learn Java basics & OOP fundamentals', deadline: '2026-10-10', completed: true, completedAt: '2026-10-08T10:00:00Z' },
      { id: 'stp_104_2', goalId: 'goal_104', title: 'Arrays & Strings (30 problems)', deadline: '2026-10-20', completed: true, completedAt: '2026-10-18T16:00:00Z' },
      { id: 'stp_104_3', goalId: 'goal_104', title: 'Linked Lists & Two Pointers', deadline: '2026-10-30', completed: false },
      { id: 'stp_104_4', goalId: 'goal_104', title: 'Stacks & Queues', deadline: '2026-11-10', completed: false },
      { id: 'stp_104_5', goalId: 'goal_104', title: 'Trees & BSTs', deadline: '2026-11-20', completed: false },
      { id: 'stp_104_6', goalId: 'goal_104', title: 'Graphs & BFS/DFS', deadline: '2026-11-30', completed: false }
    ],
    tags: ['Java', 'DSA', 'LeetCode'],
    createdAt: '2026-09-10T12:00:00Z',
    updatedAt: '2026-09-25T11:30:00Z'
  }
];

export const INITIAL_TIME_LOGS: TimeLog[] = [
  {
    id: 'log_201',
    goalId: 'goal_101',
    goalName: 'Master Jakarta EE & Java Servlet Architecture',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    startTime: '2026-09-26T09:00',
    endTime: '2026-09-26T12:00',
    durationMinutes: 180,
    notes: 'Implemented DBConnectionPool with synchronized connection checkout and PreparedStatement reuse.',
    productivityRating: 5,
    createdAt: '2026-09-26T12:05:00Z'
  },
  {
    id: 'log_202',
    goalId: 'goal_101',
    goalName: 'Master Jakarta EE & Java Servlet Architecture',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    startTime: '2026-09-25T14:00',
    endTime: '2026-09-25T16:30',
    durationMinutes: 150,
    notes: 'Configured AuthFilter for role-based URL protection and session validation.',
    productivityRating: 4,
    createdAt: '2026-09-25T16:35:00Z'
  },
  {
    id: 'log_203',
    goalId: 'goal_101',
    goalName: 'Master Jakarta EE & Java Servlet Architecture',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    startTime: '2026-09-24T10:00',
    endTime: '2026-09-24T13:00',
    durationMinutes: 180,
    notes: 'Designed GoalServlet and TimeLogServlet handling JSON serialization and HTTP error codes.',
    productivityRating: 5,
    createdAt: '2026-09-24T13:05:00Z'
  },
  {
    id: 'log_204',
    goalId: 'goal_102',
    goalName: 'Marathon 10K Endurance Conditioning',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    startTime: '2026-09-25T06:30',
    endTime: '2026-09-25T07:30',
    durationMinutes: 60,
    notes: 'Morning outdoor tempo run - 7.5 km at target 5:15 pace. Felt strong.',
    productivityRating: 4,
    createdAt: '2026-09-25T07:35:00Z'
  },
  {
    id: 'log_205',
    goalId: 'goal_102',
    goalName: 'Marathon 10K Endurance Conditioning',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    startTime: '2026-09-23T06:45',
    endTime: '2026-09-23T07:45',
    durationMinutes: 60,
    notes: 'Hill repeats x 6 intervals. High cadence workout.',
    productivityRating: 5,
    createdAt: '2026-09-23T07:50:00Z'
  },
  {
    id: 'log_206',
    goalId: 'goal_103',
    goalName: 'Distributed Systems & Consistency Models Book',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    startTime: '2026-09-24T16:00',
    endTime: '2026-09-24T18:00',
    durationMinutes: 120,
    notes: 'Finished final chapter on Byzantine Fault Tolerance & consensus proofs. Goal completed!',
    productivityRating: 5,
    createdAt: '2026-09-24T18:05:00Z'
  },
  {
    id: 'log_207',
    goalId: 'goal_104',
    goalName: 'Advanced PostgreSQL Query Optimization & Indexing',
    userId: 'usr_alex_3',
    userName: 'Alex Rivera',
    startTime: '2026-09-25T09:30',
    endTime: '2026-09-25T11:30',
    durationMinutes: 120,
    notes: 'Analyzed slow join queries on large dataset using pg_stat_statements.',
    productivityRating: 4,
    createdAt: '2026-09-25T11:35:00Z'
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_1',
    code: 'FIRST_HOUR_LOGGED',
    title: 'Genesis of Focus',
    description: 'Logged your very first work session toward a personal goal.',
    icon: 'Sparkles',
    criteria: 'Log at least 60 minutes of time',
    unlockedAt: '2026-09-01T11:00:00Z',
    category: 'TIME'
  },
  {
    id: 'ach_2',
    code: 'GOAL_CRUSHER',
    title: 'Goal Finisher',
    description: 'Successfully reached 100% target time on an active goal.',
    icon: 'Trophy',
    criteria: 'Complete 1 or more goals',
    unlockedAt: '2026-09-24T18:05:00Z',
    category: 'COMPLETION'
  },
  {
    id: 'ach_3',
    code: 'DEEP_DIVE_20H',
    title: 'Deep Work Master',
    description: 'Logged over 20 cumulative hours on high-priority goals.',
    icon: 'Flame',
    criteria: 'Log 20+ hours on HIGH/URGENT goals',
    unlockedAt: '2026-09-26T12:00:00Z',
    category: 'TIME'
  },
  {
    id: 'ach_4',
    code: 'CONSISTENCY_STREAK',
    title: 'Habit Architect',
    description: 'Maintained active time logs for 4 consecutive days.',
    icon: 'Zap',
    criteria: 'Log time on 4 consecutive calendar days',
    unlockedAt: '2026-09-26T12:05:00Z',
    category: 'STREAK'
  },
  {
    id: 'ach_5',
    code: 'MULTIDISCIPLINARY',
    title: 'Polymath in Training',
    description: 'Created goals across at least 3 distinct domain categories.',
    icon: 'Compass',
    criteria: 'Active goals in 3+ categories',
    unlockedAt: '2026-09-05T08:30:00Z',
    category: 'DIVERSITY'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_1',
    userId: 'usr_admin_1',
    userName: 'Administrator',
    action: 'UPDATE_GOAL_PARAMETERS',
    details: 'Configured difficulty multiplier to 1.25 for Software Engineering category.',
    timestamp: '2026-09-26T18:15:00Z',
    ipAddress: '192.168.1.100',
    status: 'SUCCESS'
  },
  {
    id: 'aud_2',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    action: 'CREATE_TIME_LOG',
    details: 'Logged 180 minutes for "Master Jakarta EE & Java Servlet Architecture".',
    timestamp: '2026-09-26T12:05:00Z',
    ipAddress: '10.0.4.12',
    status: 'SUCCESS'
  },
  {
    id: 'aud_3',
    userId: 'usr_admin_1',
    userName: 'Administrator',
    action: 'USER_PERMISSION_CHANGE',
    details: 'Updated account status for Marcus Vance to SUSPENDED.',
    timestamp: '2026-09-25T16:00:00Z',
    ipAddress: '192.168.1.100',
    status: 'WARNING'
  },
  {
    id: 'aud_4',
    userId: 'usr_sarah_2',
    userName: 'Sarah Chen',
    action: 'USER_LOGIN',
    details: 'Session started via AuthServlet [JSESSIONID=E48F19B8C...].',
    timestamp: '2026-09-26T08:55:00Z',
    ipAddress: '10.0.4.12',
    status: 'SUCCESS'
  }
];

export const INITIAL_SYSTEM_METRICS: SystemMetrics = {
  totalUsers: 5,
  activeUsers24h: 3,
  totalGoalsCreated: 5,
  completedGoals: 2,
  totalHoursLogged: 79.5,
  activeThreads: 8,
  dbPoolActiveConnections: 4,
  dbPoolIdleConnections: 6,
  servletRequestThroughputPerMin: 142,
  averageResponseTimeMs: 14.8,
  memoryUsageMb: 184,
  maxMemoryMb: 512,
  uptimeSeconds: 864200
};

// Initial Habits matching the reference specification exactly
export const INITIAL_HABITS: Habit[] = [
  {
    id: 'hbt_1',
    userId: 'usr_sarah_2',
    name: 'WAKE UP AT 5AM',
    category: 'Morning Routine',
    categoryColor: '#A855F7', // Bright Violet
    completedToday: true,
    streak: 3,
    bestStreak: 14,
    history: {
      '2026-09-01': true, '2026-09-02': true, '2026-09-03': true, '2026-09-04': false,
      '2026-09-05': true, '2026-09-06': true, '2026-09-07': true, '2026-09-08': true,
      '2026-09-09': false, '2026-09-10': true, '2026-09-11': true, '2026-09-12': true,
      '2026-09-13': true, '2026-09-14': true, '2026-09-15': true
    },
    frequency: 'DAILY',
    timeOfDay: 'MORNING',
    createdAt: '2026-08-01T05:00:00Z'
  },
  {
    id: 'hbt_2',
    userId: 'usr_sarah_2',
    name: 'MEDITATION',
    category: 'Mindfulness',
    categoryColor: '#DDD6FE', // Lavender
    completedToday: true,
    streak: 1,
    bestStreak: 18,
    history: {
      '2026-09-01': true, '2026-09-02': false, '2026-09-03': true, '2026-09-04': true,
      '2026-09-05': true, '2026-09-06': false, '2026-09-07': true, '2026-09-08': false,
      '2026-09-09': true, '2026-09-10': true, '2026-09-11': false, '2026-09-12': true,
      '2026-09-13': false, '2026-09-14': false, '2026-09-15': true
    },
    frequency: 'DAILY',
    timeOfDay: 'MORNING',
    createdAt: '2026-08-12T07:00:00Z'
  },
  {
    id: 'hbt_3',
    userId: 'usr_sarah_2',
    name: 'GYM',
    category: 'Fitness',
    categoryColor: '#C084FC', // Light Purple
    completedToday: true,
    streak: 3,
    bestStreak: 21,
    history: {
      '2026-09-01': true, '2026-09-02': true, '2026-09-03': true, '2026-09-04': true,
      '2026-09-05': false, '2026-09-06': true, '2026-09-07': true, '2026-09-08': true,
      '2026-09-09': true, '2026-09-10': false, '2026-09-11': true, '2026-09-12': true,
      '2026-09-13': true, '2026-09-14': true, '2026-09-15': true
    },
    frequency: 'DAILY',
    timeOfDay: 'MORNING',
    createdAt: '2026-08-01T06:30:00Z'
  },
  {
    id: 'hbt_4',
    userId: 'usr_sarah_2',
    name: 'READ 10 PAGES',
    category: 'Knowledge',
    categoryColor: '#A855F7', // Bright Violet
    completedToday: true,
    streak: 2,
    bestStreak: 25,
    history: {
      '2026-09-01': true, '2026-09-02': true, '2026-09-03': false, '2026-09-04': true,
      '2026-09-05': true, '2026-09-06': true, '2026-09-07': false, '2026-09-08': true,
      '2026-09-09': true, '2026-09-10': true, '2026-09-11': false, '2026-09-12': true,
      '2026-09-13': false, '2026-09-14': true, '2026-09-15': true
    },
    frequency: 'DAILY',
    timeOfDay: 'EVENING',
    createdAt: '2026-08-05T20:30:00Z'
  },
  {
    id: 'hbt_5',
    userId: 'usr_sarah_2',
    name: 'EAT HEALTHY',
    category: 'Nutrition',
    categoryColor: '#7C3AED', // Deep Violet
    completedToday: true,
    streak: 3,
    bestStreak: 30,
    history: {
      '2026-09-01': true, '2026-09-02': false, '2026-09-03': true, '2026-09-04': true,
      '2026-09-05': false, '2026-09-06': true, '2026-09-07': true, '2026-09-08': false,
      '2026-09-09': true, '2026-09-10': true, '2026-09-11': false, '2026-09-12': true,
      '2026-09-13': true, '2026-09-14': true, '2026-09-15': true
    },
    frequency: 'DAILY',
    timeOfDay: 'ANYTIME',
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'hbt_6',
    userId: 'usr_sarah_2',
    name: 'PLAN NEXT DAY',
    category: 'Organization',
    categoryColor: '#7C3AED', // Deep Violet
    completedToday: false,
    streak: 0,
    bestStreak: 9,
    history: {
      '2026-09-01': true, '2026-09-02': true, '2026-09-03': true, '2026-09-04': false,
      '2026-09-05': true, '2026-09-06': true, '2026-09-07': true, '2026-09-08': false,
      '2026-09-09': true, '2026-09-10': true, '2026-09-11': true, '2026-09-12': false,
      '2026-09-13': true, '2026-09-14': true, '2026-09-15': false
    },
    frequency: 'DAILY',
    timeOfDay: 'EVENING',
    createdAt: '2026-08-20T22:00:00Z'
  },
  {
    id: 'hbt_7',
    userId: 'usr_sarah_2',
    name: 'JOURNALING',
    category: 'Mindfulness',
    categoryColor: '#D946EF', // Pink-Violet
    completedToday: true,
    streak: 1,
    bestStreak: 12,
    history: {
      '2026-09-01': true, '2026-09-02': true, '2026-09-03': true, '2026-09-04': true,
      '2026-09-05': false, '2026-09-06': true, '2026-09-07': true, '2026-09-08': true,
      '2026-09-09': true, '2026-09-10': false, '2026-09-11': true, '2026-09-12': true,
      '2026-09-13': false, '2026-09-14': false, '2026-09-15': true
    },
    frequency: 'DAILY',
    timeOfDay: 'EVENING',
    createdAt: '2026-08-10T21:00:00Z'
  },
  {
    id: 'hbt_8',
    userId: 'usr_sarah_2',
    name: 'COLD SHOWER',
    category: 'Discipline',
    categoryColor: '#D946EF', // Pink-Violet
    completedToday: false,
    streak: 0,
    bestStreak: 7,
    history: {
      '2026-09-01': true, '2026-09-02': false, '2026-09-03': true, '2026-09-04': true,
      '2026-09-05': true, '2026-09-06': true, '2026-09-07': false, '2026-09-08': true,
      '2026-09-09': true, '2026-09-10': false, '2026-09-11': true, '2026-09-12': true,
      '2026-09-13': true, '2026-09-14': false, '2026-09-15': false
    },
    frequency: 'DAILY',
    timeOfDay: 'MORNING',
    createdAt: '2026-08-22T06:00:00Z'
  },
  {
    id: 'hbt_9',
    userId: 'usr_sarah_2',
    name: 'NO SOCIAL MEDIA',
    category: 'Focus',
    categoryColor: '#C084FC', // Light Purple
    completedToday: true,
    streak: 4,
    bestStreak: 19,
    history: {
      '2026-09-01': true, '2026-09-02': true, '2026-09-03': false, '2026-09-04': true,
      '2026-09-05': true, '2026-09-06': false, '2026-09-07': true, '2026-09-08': true,
      '2026-09-09': true, '2026-09-10': true, '2026-09-11': false, '2026-09-12': true,
      '2026-09-13': true, '2026-09-14': true, '2026-09-15': true
    },
    frequency: 'WEEKDAYS',
    timeOfDay: 'AFTERNOON',
    createdAt: '2026-08-15T14:00:00Z'
  },
  // --- WEEKLY HABITS (Completely Independent) ---
  {
    id: 'hbt_wk_1',
    userId: 'usr_sarah_2',
    name: 'PREPARE HEALTHY MEALS',
    description: 'Cook balanced meal prep for the upcoming focus days',
    category: 'Nutrition',
    categoryColor: '#7C3AED',
    completedToday: true,
    streak: 3, // 3 consecutive weeks
    bestStreak: 6,
    weeklyTarget: 4, // 4 times per week
    history: {
      '2026-09-14': true, '2026-09-15': true, '2026-09-16': false, '2026-09-17': true,
      '2026-09-18': true, '2026-09-19': false, '2026-09-20': false,
      // Previous week
      '2026-09-07': true, '2026-09-08': true, '2026-09-09': true, '2026-09-10': true,
      // Two weeks ago
      '2026-08-31': true, '2026-09-01': true, '2026-09-02': true, '2026-09-03': true
    },
    frequency: 'WEEKLY',
    createdAt: '2026-08-15T10:00:00Z'
  },
  {
    id: 'hbt_wk_2',
    userId: 'usr_sarah_2',
    name: 'CALL SOMEONE YOU CARE ABOUT',
    description: 'Stay connected with close family and mentors',
    category: 'Connection',
    categoryColor: '#D946EF',
    completedToday: true,
    streak: 4, // 4 consecutive weeks
    bestStreak: 5,
    weeklyTarget: 5, // 5 times per week
    history: {
      '2026-09-14': true, '2026-09-15': true, '2026-09-16': true, '2026-09-17': true,
      '2026-09-18': false, '2026-09-19': false, '2026-09-20': false,
      // Previous week
      '2026-09-07': true, '2026-09-08': true, '2026-09-09': true, '2026-09-10': true, '2026-09-11': true,
      // Two weeks ago
      '2026-08-31': true, '2026-09-01': true, '2026-09-02': true, '2026-09-03': true, '2026-09-04': true
    },
    frequency: 'WEEKLY',
    createdAt: '2026-08-10T11:00:00Z'
  },
  {
    id: 'hbt_wk_3',
    userId: 'usr_sarah_2',
    name: 'PLAN THE WEEK AHEAD',
    description: 'Review calendars, set weekly targets and schedule deep work blocks',
    category: 'Productivity',
    categoryColor: '#A855F7',
    completedToday: false,
    streak: 2,
    bestStreak: 8,
    weeklyTarget: 3, // 3 times per week
    history: {
      '2026-09-14': true, '2026-09-15': false, '2026-09-16': true, '2026-09-17': true,
      '2026-09-18': false, '2026-09-19': false, '2026-09-20': false,
      // Previous week
      '2026-09-07': true, '2026-09-08': true, '2026-09-09': true
    },
    frequency: 'WEEKLY',
    createdAt: '2026-08-01T09:00:00Z'
  },
  // --- MONTHLY HABITS (Completely Independent) ---
  {
    id: 'hbt_mo_1',
    userId: 'usr_sarah_2',
    name: 'COMPLETE 20 WORKOUTS THIS MONTH',
    description: 'Maintain cardiovascular health and metabolic conditioning',
    category: 'Fitness',
    categoryColor: '#C084FC',
    completedToday: true,
    streak: 2, // 2 consecutive months
    bestStreak: 4,
    monthlyTarget: 20,
    monthlyUnit: 'workouts',
    history: {
      '2026-09-01': true, '2026-09-02': true, '2026-09-03': true, '2026-09-05': true,
      '2026-09-06': true, '2026-09-07': true, '2026-09-08': true, '2026-09-09': true,
      '2026-09-10': true, '2026-09-12': true, '2026-09-13': true, '2026-09-14': true,
      '2026-09-15': true,
      // August full month completed (20+)
      '2026-08-01': true, '2026-08-02': true, '2026-08-03': true, '2026-08-04': true,
      '2026-08-05': true, '2026-08-06': true, '2026-08-07': true, '2026-08-08': true,
      '2026-08-09': true, '2026-08-10': true, '2026-08-11': true, '2026-08-12': true,
      '2026-08-13': true, '2026-08-14': true, '2026-08-15': true, '2026-08-16': true,
      '2026-08-17': true, '2026-08-18': true, '2026-08-19': true, '2026-08-20': true
    },
    frequency: 'MONTHLY',
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'hbt_mo_2',
    userId: 'usr_sarah_2',
    name: 'READ 2 BOOKS THIS MONTH',
    description: 'Read 2 comprehensive technical or non-fiction books',
    category: 'Knowledge',
    categoryColor: '#A855F7',
    completedToday: false,
    streak: 3, // 3 consecutive months
    bestStreak: 5,
    monthlyTarget: 2,
    monthlyUnit: 'books',
    history: {
      '2026-09-10': true, // Finished book 1
      '2026-08-15': true, '2026-08-28': true, // August 2 books
      '2026-07-12': true, '2026-07-25': true // July 2 books
    },
    frequency: 'MONTHLY',
    createdAt: '2026-07-01T10:00:00Z'
  },
  {
    id: 'hbt_mo_3',
    userId: 'usr_sarah_2',
    name: 'COMPLETE MONTHLY PROJECT',
    description: 'Deliver on major system milestone and documentation',
    category: 'Engineering',
    categoryColor: '#DDD6FE',
    completedToday: true,
    streak: 2,
    bestStreak: 3,
    monthlyTarget: 1,
    monthlyUnit: 'projects',
    history: {
      '2026-09-15': true,
      '2026-08-25': true
    },
    frequency: 'MONTHLY',
    createdAt: '2026-08-01T09:00:00Z'
  }
];

export const INITIAL_TASKS: TaskItem[] = [
  // Sunday (2026-09-27 & 2026-09-06)
  {
    id: 'tsk_1',
    userId: 'usr_sarah_2',
    title: 'Complete Assignment',
    description: 'Verify connection pooling thread safety and transaction boundaries.',
    priority: 'HIGH',
    category: 'Engineering',
    dueDate: '2026-09-27',
    completed: true,
    createdAt: '2026-09-25T10:00:00Z'
  },
  {
    id: 'tsk_2',
    userId: 'usr_sarah_2',
    title: 'Call friend about the business idea',
    priority: 'MEDIUM',
    category: 'Networking',
    dueDate: '2026-09-27',
    completed: true,
    createdAt: '2026-09-25T11:00:00Z'
  },
  {
    id: 'tsk_3',
    userId: 'usr_sarah_2',
    title: 'Clean room',
    priority: 'LOW',
    category: 'Personal',
    dueDate: '2026-09-27',
    completed: false,
    createdAt: '2026-09-25T12:00:00Z'
  },

  // Monday (2026-09-28)
  {
    id: 'tsk_4',
    userId: 'usr_sarah_2',
    title: 'Wash clothes',
    priority: 'LOW',
    category: 'Personal',
    dueDate: '2026-09-28',
    completed: true,
    createdAt: '2026-09-26T08:00:00Z'
  },
  {
    id: 'tsk_5',
    userId: 'usr_sarah_2',
    title: 'Fiverr project deliverable',
    priority: 'HIGH',
    category: 'Engineering',
    dueDate: '2026-09-28',
    completed: true,
    createdAt: '2026-09-26T09:00:00Z'
  },
  {
    id: 'tsk_6',
    userId: 'usr_sarah_2',
    title: 'Play football with team',
    priority: 'MEDIUM',
    category: 'Fitness',
    dueDate: '2026-09-28',
    completed: true,
    createdAt: '2026-09-26T10:00:00Z'
  },

  // Tuesday (2026-09-29)
  {
    id: 'tsk_7',
    userId: 'usr_sarah_2',
    title: 'Check out new place',
    priority: 'LOW',
    category: 'Personal',
    dueDate: '2026-09-29',
    completed: false,
    createdAt: '2026-09-26T11:00:00Z'
  },
  {
    id: 'tsk_8',
    userId: 'usr_sarah_2',
    title: 'Complete designing the project',
    priority: 'HIGH',
    category: 'Design',
    dueDate: '2026-09-29',
    completed: true,
    createdAt: '2026-09-26T12:00:00Z'
  },

  // Wednesday (2026-09-30)
  {
    id: 'tsk_9',
    userId: 'usr_sarah_2',
    title: 'Start working on the Idea',
    priority: 'HIGH',
    category: 'Productivity',
    dueDate: '2026-09-30',
    completed: false,
    createdAt: '2026-09-27T09:00:00Z'
  },
  {
    id: 'tsk_10',
    userId: 'usr_sarah_2',
    title: 'Buy the new shoes',
    priority: 'LOW',
    category: 'Shopping',
    dueDate: '2026-09-30',
    completed: true,
    createdAt: '2026-09-27T10:00:00Z'
  },
  {
    id: 'tsk_11',
    userId: 'usr_sarah_2',
    title: 'Buy groceries item',
    priority: 'MEDIUM',
    category: 'Shopping',
    dueDate: '2026-09-30',
    completed: true,
    createdAt: '2026-09-27T11:00:00Z'
  },

  // Thursday (2026-10-01)
  {
    id: 'tsk_12',
    userId: 'usr_sarah_2',
    title: 'Start working on the Idea sprint',
    priority: 'HIGH',
    category: 'Engineering',
    dueDate: '2026-10-01',
    completed: true,
    createdAt: '2026-09-27T13:00:00Z'
  },
  {
    id: 'tsk_13',
    userId: 'usr_sarah_2',
    title: 'Start reading new book chapter 2',
    priority: 'LOW',
    category: 'Learning',
    dueDate: '2026-10-01',
    completed: true,
    createdAt: '2026-09-27T14:00:00Z'
  }
];

export const INITIAL_FREEZE_STATE: FreezeState = {
  availableTokens: 9,
  usedTokens: 1,
  history: [
    {
      id: 'frz_1',
      date: '2026-09-18',
      habitId: 'hbt_2',
      habitName: 'GYM',
      note: 'Protected 14-day streak during travel day'
    }
  ]
};

