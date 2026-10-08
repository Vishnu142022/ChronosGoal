import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  Flame, 
  Snowflake, 
  Plus, 
  Settings, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  CheckCircle2, 
  BarChart3, 
  ListTodo, 
  Sparkles, 
  Trash2, 
  Edit3, 
  ShieldAlert, 
  Award, 
  TrendingUp, 
  X,
  Filter,
  Layers,
  Zap,
  Info
} from 'lucide-react';
import { Habit, TaskItem, FreezeState, Goal, TimeLog, User, GoalPriority } from '../../types';
import { storageService } from '../../services/storageService';
import { timeTrackingService } from '../../services/timeTrackingService';
import { goalsService } from '../../services/goalsService';
import { habitsService } from '../../services/habitsService';
import { tasksService } from '../../services/tasksService';

import { HabitsMatrixView } from './HabitsMatrixView';
import { TasksPlannerView } from './TasksPlannerView';
import { GoalsLifePlannerView } from './GoalsLifePlannerView';
import { TimeTrackingView } from './TimeTrackingView';
import { InsightsAnalyticsView } from './InsightsAnalyticsView';

interface UserDashboardProps {
  currentUser: User;
}

type TabKey = 'today' | 'habits' | 'tasks' | 'goals' | 'time' | 'insights';

const saveFocusSession = async (
  currentUser: User,
  goals: Goal[],
  goalId: string,
  durationSeconds: number,
  notes: string
): Promise<{ durationMinutes: number; goalName: string }> => {
  const goal = goals.find(item => item.id === goalId);
  if (!goal) {
    throw new Error('Select a valid goal before saving the focus session.');
  }

  const now = new Date();
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
  await timeTrackingService.logSession({
    userId: currentUser.id,
    userName: currentUser.name,
    goalId,
    goalName: goal.name,
    startTime: new Date(now.getTime() - durationSeconds * 1000).toISOString(),
    endTime: now.toISOString(),
    durationMinutes,
    notes,
    productivityRating: 5
  });
  return { durationMinutes, goalName: goal.name };
};

export const UserDashboard: React.FC<UserDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('habits'); // Default to HABITS page as requested
  
  // Storage Data States
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [freezeState, setFreezeState] = useState<FreezeState>(() => storageService.getFreezeState());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);

  const refreshPersonalData = async () => {
    const [loadedHabits, loadedTasks] = await Promise.all([
      habitsService.getHabits(currentUser.id),
      tasksService.getTasks(currentUser.id)
    ]);
    setHabits(loadedHabits);
    setTasks(loadedTasks);
  };

  const refreshGoalData = async () => {
    const [loadedGoals, loadedTimeLogs] = await Promise.all([
      goalsService.getGoals(currentUser.id),
      timeTrackingService.getTimeLogs(currentUser.id)
    ]);
    setGoals(loadedGoals);
    setTimeLogs(loadedTimeLogs);
  };

  useEffect(() => {
    void refreshGoalData().catch((error: unknown) => {
      console.error('Failed to refresh goals and time logs:', error);
      showToast('Unable to load goals and time logs. Check your connection and try again.');
    });
  }, [currentUser.id]);

  useEffect(() => {
    void refreshPersonalData().catch((error: unknown) => {
      console.error('Failed to load habits and tasks:', error);
      showToast('Unable to load habits and tasks. Check your connection and try again.');
    });
  }, [currentUser.id]);

  // Date Navigation State - Real Live Current Date
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  
  // Progress Ring Animation
  const [animatedProgress, setAnimatedProgress] = useState<number>(0);

  // Subscribe to storage changes for real-time reactivity
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setFreezeState(storageService.getFreezeState());
    });
    return unsubscribe;
  }, []);

  // Modals
  const [isHabitModalOpen, setIsHabitModalOpen] = useState<boolean>(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState<boolean>(false);
  const [timerGoalId, setTimerGoalId] = useState<string>('');
  const [timerDurationMinutes, setTimerDurationMinutes] = useState<number>(25);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [selectedHabitForFreeze, setSelectedHabitForFreeze] = useState<string>('');

  // Live Timer ticker
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
      if (timerGoalId) {
        void saveFocusSession(
          currentUser,
          goals,
          timerGoalId,
          timerDurationMinutes * 60,
          'Completed live focus session'
        ).then(async ({ durationMinutes }) => {
          await refreshGoalData();
          showToast(`🎉 Focus session completed and ${durationMinutes} min saved.`);
        }).catch((error: unknown) => {
          console.error('Failed to save focus session:', error);
          showToast('Unable to save focus session. Please try again.');
        });
      } else {
        showToast('Focus session completed. Select a goal to save the time.');
      }
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerSecondsLeft, timerGoalId, timerDurationMinutes, currentUser.id]);

  const handleOpenTimer = (goalId?: string) => {
    if (goalId) {
      setTimerGoalId(goalId);
    } else if (goals.length > 0) {
      setTimerGoalId(goals[0].id);
    }
    setTimerSecondsLeft(timerDurationMinutes * 60);
    setIsTimerModalOpen(true);
  };

  const handleStopTimer = async () => {
    const elapsedSeconds = timerDurationMinutes * 60 - timerSecondsLeft;
    setIsTimerActive(false);
    if (elapsedSeconds < 10) {
      showToast('Work for at least 10 seconds before saving this session.');
      return;
    }

    try {
      const saved = await saveFocusSession(
        currentUser,
        goals,
        timerGoalId,
        elapsedSeconds,
        'Stopped live focus session'
      );
      await refreshGoalData();
      setTimerSecondsLeft(timerDurationMinutes * 60);
      setIsTimerModalOpen(false);
      showToast(`Focus session saved: ${saved.durationMinutes} min for "${saved.goalName}".`);
    } catch (error) {
      console.error('Failed to save focus session:', error);
      showToast('Unable to save focus session. Please try again.');
    }
  };

  // Form States
  const [habitForm, setHabitForm] = useState({
    name: '',
    description: '',
    category: 'Morning Routine',
    categoryColor: '#A855F7',
    frequency: 'DAILY' as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    weeklyTarget: 4,
    monthlyTarget: 20,
    monthlyUnit: 'times',
    startDate: new Date().toISOString().slice(0, 10),
    reminder: '',
    timeOfDay: 'MORNING' as 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME'
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    category: 'Engineering',
    dueDate: new Date().toISOString().slice(0, 10)
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Filter Daily Habits for Today view
  const dailyHabits = useMemo(() => {
    return habits.filter(h => 
      h.frequency === 'DAILY' || 
      h.frequency === 'WEEKDAYS' || 
      h.frequency === 'WEEKENDS' || 
      !h.frequency || 
      (h.frequency !== 'WEEKLY' && h.frequency !== 'MONTHLY')
    );
  }, [habits]);

  // Subscribe to storage changes
  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      setFreezeState(storageService.getFreezeState());
    });

    // Run Automatic Freeze Token Engine check on mount
    const autoFreezeResult = storageService.checkAndApplyAutoFreeze();
    if (autoFreezeResult.autoFrozenCount > 0 && autoFreezeResult.message) {
      showToast(autoFreezeResult.message);
    }

    return unsub;
  }, []);

  // Compute Completed & Total for Selected Day for Daily Habits
  const totalDailyHabitsCount = dailyHabits.length;
  const completedDailyHabitsCount = dailyHabits.filter(h => h.completedToday).length;
  const targetPercentage = totalDailyHabitsCount > 0 
    ? Math.round((completedDailyHabitsCount / totalDailyHabitsCount) * 100) 
    : 0;

  // Animate Progress Ring on Load & Updates
  useEffect(() => {
    let start = animatedProgress;
    const end = targetPercentage;
    const duration = 800; // ms
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progressRatio, 3);
      const current = Math.round(start + (end - start) * eased);
      setAnimatedProgress(current);

      if (progressRatio < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [targetPercentage]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Helper for consistent local YYYY-MM-DD
  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Format Date: e.g. "TUESDAY 15 SEPTEMBER"
  const formattedDateString = useMemo(() => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const dayName = days[selectedDate.getDay()];
    const dayNum = selectedDate.getDate();
    const monthName = months[selectedDate.getMonth()];
    return `${dayName} ${dayNum} ${monthName}`;
  }, [selectedDate]);

  // Handle Habit Toggle
  const handleToggleHabit = async (habitId: string) => {
    const dateStr = toLocalDateStr(selectedDate);
    try {
      const updated = await habitsService.toggleHabit(habitId, dateStr);
      if (!updated) return;
      setHabits(current => current.map(habit => habit.id === updated.id ? updated : habit));
      const val = updated.history ? updated.history[dateStr] : undefined;
      const isCompleted = val === true || val === 'COMPLETED';
      const isFrozen = val === 'FROZEN';

      if (isCompleted) {
        showToast(`✓ Completed "${updated.name}"! Streak: ${updated.streak} 🔥`);
      } else if (isFrozen) {
        showToast(`Habit frozen automatically — 1 Freeze Token used.`);
      } else {
        showToast(`Marked "${updated.name}" incomplete.`);
      }
    } catch (error) {
      console.error('Failed to update habit:', error);
      showToast('Unable to update habit. Please try again.');
    }
  };

  // Open New Habit with specific frequency
  const handleOpenNewHabit = (frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY') => {
    setEditingHabit(null);
    setHabitForm({
      name: '',
      description: '',
      category: frequency === 'WEEKLY' ? 'Productivity' : frequency === 'MONTHLY' ? 'Fitness' : 'Morning Routine',
      categoryColor: frequency === 'WEEKLY' ? '#A855F7' : frequency === 'MONTHLY' ? '#C084FC' : '#A855F7',
      frequency: frequency,
      weeklyTarget: 4,
      monthlyTarget: 20,
      monthlyUnit: 'times',
      startDate: new Date().toISOString().slice(0, 10),
      reminder: '',
      timeOfDay: 'MORNING'
    });
    setIsHabitModalOpen(true);
  };

  // Open Edit Habit
  const handleOpenEditHabit = (habit: Habit, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingHabit(habit);
    setHabitForm({
      name: habit.name,
      description: habit.description || '',
      category: habit.category,
      categoryColor: habit.categoryColor,
      frequency: (habit.frequency === 'WEEKLY' ? 'WEEKLY' : habit.frequency === 'MONTHLY' ? 'MONTHLY' : 'DAILY'),
      weeklyTarget: habit.weeklyTarget || 4,
      monthlyTarget: habit.monthlyTarget || 20,
      monthlyUnit: habit.monthlyUnit || 'times',
      startDate: habit.startDate || (habit.createdAt ? habit.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      reminder: habit.reminder || '',
      timeOfDay: habit.timeOfDay || 'ANYTIME'
    });
    setIsHabitModalOpen(true);
  };

  // Save Habit (Create or Edit)
  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitForm.name.trim()) return;

    try {
      const saved = editingHabit
        ? await habitsService.updateHabit({
        ...editingHabit,
        name: habitForm.name.trim().toUpperCase(),
        description: habitForm.description.trim() || undefined,
        category: habitForm.category,
        categoryColor: habitForm.categoryColor,
        frequency: habitForm.frequency,
        weeklyTarget: habitForm.frequency === 'WEEKLY' ? (Number(habitForm.weeklyTarget) || 4) : undefined,
        monthlyTarget: habitForm.frequency === 'MONTHLY' ? (Number(habitForm.monthlyTarget) || 20) : undefined,
        monthlyUnit: habitForm.frequency === 'MONTHLY' ? (habitForm.monthlyUnit || 'times') : undefined,
        startDate: habitForm.startDate,
        reminder: habitForm.reminder.trim() || undefined,
        timeOfDay: habitForm.timeOfDay
      })
        : await habitsService.createHabit({
        userId: currentUser.id,
        name: habitForm.name.trim().toUpperCase(),
        description: habitForm.description.trim() || undefined,
        category: habitForm.category,
        categoryColor: habitForm.categoryColor,
        frequency: habitForm.frequency,
        weeklyTarget: habitForm.frequency === 'WEEKLY' ? (Number(habitForm.weeklyTarget) || 4) : undefined,
        monthlyTarget: habitForm.frequency === 'MONTHLY' ? (Number(habitForm.monthlyTarget) || 20) : undefined,
        monthlyUnit: habitForm.frequency === 'MONTHLY' ? (habitForm.monthlyUnit || 'times') : undefined,
        startDate: habitForm.startDate,
        reminder: habitForm.reminder.trim() || undefined,
        timeOfDay: habitForm.timeOfDay
      });
      setHabits(current => editingHabit
        ? current.map(habit => habit.id === saved.id ? saved : habit)
        : [...current, saved]);
      showToast(editingHabit
        ? `Updated habit "${habitForm.name.toUpperCase()}"`
        : `Added new ${habitForm.frequency.toLowerCase()} habit "${habitForm.name.toUpperCase()}"`);
      setIsHabitModalOpen(false);
      setEditingHabit(null);
    } catch (error) {
      console.error('Failed to save habit:', error);
      showToast('Unable to save habit. Please try again.');
    }
  };

  // Delete Habit
  const handleDeleteHabit = async (habitId: string, habitName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete habit "${habitName}"?`)) {
      try {
        await habitsService.deleteHabit(habitId);
        setHabits(current => current.filter(habit => habit.id !== habitId));
        showToast(`Deleted "${habitName}"`);
      } catch (error) {
        console.error('Failed to delete habit:', error);
        showToast('Unable to delete habit. Please try again.');
      }
    }
  };

  const persistHabitUpdate = async (habit: Habit) => {
    const saved = await habitsService.updateHabit(habit);
    setHabits(current => current.map(item => item.id === saved.id ? saved : item));
  };

  const deleteHabitFromServer = async (habitId: string) => {
    await habitsService.deleteHabit(habitId);
    setHabits(current => current.filter(habit => habit.id !== habitId));
  };

  const handleDeleteEditingHabit = async () => {
    if (!editingHabit) return;
    const { id, name } = editingHabit;
    try {
      await deleteHabitFromServer(id);
      setIsHabitModalOpen(false);
      setEditingHabit(null);
      showToast(`✓ Deleted "${name}"`);
    } catch (error) {
      console.error('Failed to delete habit:', error);
      showToast('Unable to delete habit. Please try again.');
    }
  };

  // Use Freeze Token
  const handleApplyFreeze = async (habitId?: string) => {
    const targetHabit = habits.find(h => h.id === habitId);
    if (!habitId || !targetHabit || freezeState.availableTokens <= 0) {
      showToast('No Freeze Tokens available.');
      return;
    }
    try {
      const updated = await habitsService.freezeHabit(habitId);
      setHabits(current => current.map(habit => habit.id === updated.id ? updated : habit));
      showToast(`❄ Freeze Token activated for "${targetHabit.name}"!`);
      setIsFreezeModalOpen(false);
    } catch (error) {
      console.error('Failed to freeze habit:', error);
      showToast('Unable to freeze habit. Please try again.');
    }
  };

  // Save Task
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      const created = await tasksService.createTask({
      userId: currentUser.id,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority,
      category: taskForm.category,
      dueDate: taskForm.dueDate
      });
      setTasks(current => [...current, created]);
      showToast(`Task "${taskForm.title}" added`);
      setIsTaskModalOpen(false);
      setTaskForm({
      title: '',
      description: '',
      priority: 'MEDIUM',
      category: 'Engineering',
      dueDate: new Date().toISOString().slice(0, 10)
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      showToast('Unable to create task. Please try again.');
    }
  };

  // Toggle Task
  const handleToggleTask = async (taskId: string) => {
    try {
      const updated = await tasksService.toggleTask(taskId);
      if (!updated) return;
      setTasks(current => current.map(task => task.id === updated.id ? updated : task));
      showToast(updated.completed ? `✓ Task completed` : `Task marked incomplete`);
    } catch (error) {
      console.error('Failed to toggle task:', error);
      showToast('Unable to update task. Please try again.');
    }
  };

  // SVG Progress Ring Calculations
  const radius = 88;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  // Purple Category Color Options
  const purplePalette = [
    { name: 'Bright Violet', value: '#A855F7' },
    { name: 'Light Purple', value: '#C084FC' },
    { name: 'Deep Violet', value: '#7C3AED' },
    { name: 'Pink-Violet', value: '#D946EF' },
    { name: 'Lavender', value: '#DDD6FE' }
  ];

  return (
    <div className="relative min-h-[85vh] w-full text-[#F8F7FC] pb-16 select-none font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Background Ambient Violet Lighting */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12)_0%,rgba(168,85,247,0.05)_45%,transparent_75%)] blur-3xl opacity-80" />
        <div className="absolute top-3/4 left-1/3 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.08)_0%,transparent_70%)] blur-3xl opacity-50" />
      </div>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl bg-[#140F1C] border border-[#A855F7]/60 text-white shadow-[0_0_25px_rgba(168,85,247,0.4)] backdrop-blur-md animate-bounce-short">
          <Sparkles className="w-4 h-4 text-[#C084FC]" />
          <span className="text-xs font-semibold tracking-wide">{notification}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOP FLOATING PILL NAVIGATION BAR & HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-10 flex flex-col items-center justify-between gap-4 mb-8 pt-1">
        
        {/* Navigation Pill on top */}
        <div className="w-full flex justify-center overflow-hidden">
          <nav className="flex items-center p-1.5 rounded-full bg-[#0C0910] border border-[#21182B] shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-x-auto no-scrollbar max-w-full">
            {[
              { key: 'today' as TabKey, label: 'Today', symbol: '⌂' },
              { key: 'habits' as TabKey, label: 'Habits', symbol: '▦' },
              { key: 'tasks' as TabKey, label: 'Tasks', symbol: '☑' },
              { key: 'goals' as TabKey, label: 'Goals', symbol: '◎' },
              { key: 'time' as TabKey, label: 'Time', symbol: '⏱' },
              { key: 'insights' as TabKey, label: 'Insights', symbol: '⌁' }
            ].map(({ key, label, symbol }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`relative px-4 sm:px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center space-x-1.5 ${
                    isActive
                      ? 'text-[#DDD6FE] bg-[#130E19] border border-[#8B5CF6]/50 shadow-[0_0_16px_rgba(168,85,247,0.35)]'
                      : 'text-[#8F879A] hover:text-[#DDD6FE] hover:bg-[#100C15]/50'
                  }`}
                >
                  <span className={`text-sm leading-none ${isActive ? 'text-[#A855F7] drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-[#8F879A]'}`}>
                    {symbol}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sub-Header: Title on Left, Controls on Right */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-wider text-[#F5F3F7] text-glow-purple font-['Space_Grotesk'] uppercase">
              {activeTab === 'habits' ? 'HABITS' :
               activeTab === 'today' ? 'TODAY' :
               activeTab === 'tasks' ? 'TASKS' :
               activeTab === 'goals' ? 'GOALS' :
               activeTab === 'time' ? 'TIME TRACKING' : 'INSIGHTS'}
            </h1>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A855F7] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B5CF6]"></span>
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2.5 rounded-xl bg-[#0C0910] hover:bg-[#130E19] border border-[#21182B] hover:border-[#8B5CF6]/50 text-[#8F879A] hover:text-[#DDD6FE] transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.35)] active:scale-95"
              title="Dashboard Settings & Freeze Vault"
            >
              <Settings className="w-4 h-4 hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: TODAY VIEW (PRIMARY FUTURISTIC PURPLE DASHBOARD) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'today' && (
        <div className="relative z-10 flex flex-col items-center">
          
          {/* Upper-Middle: Large Circular Progress Ring */}
          <div className="relative my-4 flex flex-col items-center justify-center">
            
            {/* Ambient Violet Radial Glow behind the Ring */}
            <div className="pointer-events-none absolute inset-0 -m-8 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.22)_0%,rgba(168,85,247,0.08)_50%,transparent_75%)] blur-2xl animate-pulse-slow" />

            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg 
                className="w-full h-full transform -rotate-90 overflow-visible"
                viewBox="0 0 200 200"
              >
                <defs>
                  {/* Active Neon Violet-Purple Gradient */}
                  <linearGradient id="ringProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="60%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#C084FC" />
                  </linearGradient>

                  {/* Soft Neon Purple Glow Filter */}
                  <filter id="purpleRingGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Dark Purple Inactive Track */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#21182B"
                  strokeWidth={strokeWidth}
                  className="opacity-90"
                />

                {/* Bright Violet Active Progress Stroke */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="url(#ringProgressGrad)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  filter="url(#purpleRingGlow)"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Metrics (e.g. 78% / TODAY) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F8F7FC] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] font-['Space_Grotesk']">
                  {animatedProgress}%
                </span>
                <span className="text-[11px] font-bold tracking-widest text-[#DDD6FE] uppercase mt-0.5 opacity-90">
                  TODAY
                </span>
              </div>
            </div>

          </div>

          {/* Date & Status Section */}
          <div className="flex flex-col items-center text-center mt-2 mb-8 space-y-2">
            
            {/* Date Display: "TUESDAY 15 SEPTEMBER" */}
            <h2 className="text-sm sm:text-base font-bold tracking-wider text-[#F8F7FC] uppercase">
              {formattedDateString}
            </h2>

            {/* Muted Purple-Gray Subtext: "7 / 9 habits completed" */}
            <p className="text-xs sm:text-sm font-medium text-[#8F879A]">
              {completedDailyHabitsCount} / {totalDailyHabitsCount} habits completed
            </p>

          </div>

          {/* ------------------------------------------------------------- */}
          {/* TWO-COLUMN RESPONSIVE HABIT GRID (DAILY ONLY) */}
          {/* ------------------------------------------------------------- */}
          <div className="w-full max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {dailyHabits.map((habit) => {
                const dateStr = toLocalDateStr(selectedDate);
                const todayStr = toLocalDateStr(new Date());
                const isSelectedToday = dateStr === todayStr;

                const val = habit.history ? habit.history[dateStr] : undefined;
                const isCompleted = val === true || val === 'COMPLETED' || (isSelectedToday && habit.completedToday);
                const isFrozen = val === 'FROZEN';
                const isMissed = val === 'MISSED' || (val === false && dateStr < todayStr);

                return (
                  <div
                    key={habit.id}
                    onClick={() => handleToggleHabit(habit.id)}
                    className={`group relative flex items-center justify-between px-4 py-3.5 rounded-[18px] border transition-all duration-300 cursor-pointer ${
                      isCompleted
                        ? 'bg-[#0B0910] border-[#21182B] hover:border-[#8B5CF6]/70 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:-translate-y-0.5'
                        : isFrozen
                        ? 'bg-[#120D1A] border-[#C084FC]/50 hover:border-[#C084FC] hover:shadow-[0_0_22px_rgba(192,132,252,0.35)] hover:-translate-y-0.5'
                        : isMissed
                        ? 'bg-[#12080F] border-red-500/30 hover:border-red-500/60 hover:-translate-y-0.5'
                        : 'bg-[#100C16] border-[#2A2035] hover:border-[#A855F7] hover:shadow-[0_0_22px_rgba(168,85,247,0.35)] hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Left: Checkbox + Category Dot + Habit Name + Status Badge */}
                    <div className="flex items-center space-x-3.5 min-w-0 pr-2">
                      
                      {/* Checkbox Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleHabit(habit.id);
                        }}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          isCompleted
                            ? 'bg-[#8B5CF6] border border-[#A855F7] shadow-[0_0_12px_rgba(139,92,246,0.6)] scale-100'
                            : isFrozen
                            ? 'bg-[#181226] border border-[#C084FC]/80 text-[#DDD6FE] shadow-[0_0_10px_rgba(192,132,252,0.5)]'
                            : isMissed
                            ? 'bg-[#180B14] border border-red-500/50 text-red-400'
                            : 'bg-transparent border-2 border-[#2A2035] group-hover:border-[#8B5CF6] shadow-inner'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3] animate-scale-in" />
                        ) : isFrozen ? (
                          <Snowflake className="w-3.5 h-3.5 text-[#C084FC] animate-pulse-slow" />
                        ) : isMissed ? (
                          <X className="w-3 h-3 text-red-400 stroke-[2.5]" />
                        ) : null}
                      </button>

                      {/* Small Colored Category Dot */}
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                        style={{ backgroundColor: habit.categoryColor || '#A855F7', color: habit.categoryColor || '#A855F7' }}
                      />

                      {/* Habit Name + Status Badges */}
                      <div className="flex items-center space-x-2 min-w-0">
                        <span 
                          className={`text-xs sm:text-sm font-semibold tracking-wide truncate transition-colors ${
                            isCompleted
                              ? 'text-[#8F879A] line-through decoration-[#5F5868]/60'
                              : isFrozen
                              ? 'text-[#DDD6FE]'
                              : isMissed
                              ? 'text-red-300/80'
                              : 'text-[#F8F7FC] group-hover:text-white'
                          }`}
                        >
                          {habit.name}
                        </span>

                        {isFrozen && (
                          <span className="flex-shrink-0 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#181226] border border-[#C084FC]/40 text-[#DDD6FE] text-[10px] font-bold">
                            <Snowflake className="w-2.5 h-2.5 text-[#C084FC]" />
                            <span>FROZEN</span>
                          </span>
                        )}

                        {isMissed && (
                          <span className="flex-shrink-0 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#1A0A14] border border-red-500/40 text-red-400 text-[10px] font-bold">
                            <X className="w-2.5 h-2.5" />
                            <span>MISSED</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Streak Badge ONLY */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {/* Flame Icon + Streak Number */}
                      <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg ${
                        isCompleted 
                          ? 'bg-[#140F1C] border border-[#8B5CF6]/30 text-[#DDD6FE]' 
                          : isFrozen
                          ? 'bg-[#181226] border border-[#C084FC]/40 text-[#DDD6FE]'
                          : 'bg-[#0B0910] border border-[#21182B] text-[#8F879A]'
                      }`}>
                        <Flame className={`w-3.5 h-3.5 ${
                          habit.streak > 0 
                            ? 'text-[#A855F7] fill-[#A855F7]/30 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] animate-pulse-slow' 
                            : 'text-[#5F5868]'
                        }`} />
                        <span className="text-xs font-bold font-mono">{habit.streak}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: HABITS MATRIX & STREAK MANAGER (MATCHING REFERENCE) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'habits' && (
        <div className="relative z-10 max-w-6xl mx-auto">
          <HabitsMatrixView
            habits={habits}
            freezeState={freezeState}
            currentDate={selectedDate}
            onOpenNewHabit={(freq) => handleOpenNewHabit(freq)}
            onOpenEditHabit={(h) => handleOpenEditHabit(h)}
            onSaveHabit={persistHabitUpdate}
            onDeleteHabit={deleteHabitFromServer}
            onShowToast={showToast}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: TASKS PLANNER (WEEKLY OVERVIEW & 7-DAY COLUMNS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tasks' && (
        <div className="relative z-10 max-w-7xl mx-auto">
          <TasksPlannerView
            currentUser={currentUser}
            tasks={tasks}
            goals={goals}
            onShowToast={showToast}
            onDataChanged={refreshPersonalData}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: GOALS & 10 LIFE AREAS PLANNER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'goals' && (
        <div className="relative z-10 max-w-7xl mx-auto">
          <GoalsLifePlannerView
            currentUser={currentUser}
            goals={goals}
            onShowToast={showToast}
            onOpenTimer={handleOpenTimer}
            onDataChanged={refreshGoalData}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: TIME TRACKING PANEL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'time' && (
        <div className="relative z-10 max-w-7xl mx-auto">
          <TimeTrackingView
            currentUser={currentUser}
            goals={goals}
            timeLogs={timeLogs}
            onShowToast={showToast}
            onNavigateGoals={() => setActiveTab('goals')}
            onOpenTimer={handleOpenTimer}
            onDataChanged={refreshGoalData}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: INSIGHTS & ANALYTICS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'insights' && (
        <div className="relative z-10 max-w-7xl mx-auto">
          <InsightsAnalyticsView
            currentUser={currentUser}
            habits={habits}
            tasks={tasks}
            goals={goals}
            freezeState={freezeState}
            onNavigateTab={setActiveTab}
            onShowToast={showToast}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT HABIT (DAILY / WEEKLY / MONTHLY) */}
      {/* ------------------------------------------------------------- */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg p-6 rounded-2xl bg-[#0B0910] border border-[#8B5CF6]/50 shadow-[0_0_35px_rgba(139,92,246,0.35)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#A855F7] font-mono">
                  {habitForm.frequency} PROTOCOL
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {editingHabit 
                    ? `Edit ${habitForm.frequency === 'WEEKLY' ? 'Weekly' : habitForm.frequency === 'MONTHLY' ? 'Monthly' : 'Daily'} Habit` 
                    : `Create ${habitForm.frequency === 'WEEKLY' ? 'Weekly' : habitForm.frequency === 'MONTHLY' ? 'Monthly' : 'Daily'} Habit`}
                </h3>
              </div>
              <button onClick={() => setIsHabitModalOpen(false)} className="text-[#8F879A] hover:text-white p-1 rounded-lg hover:bg-[#140F1C]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-4">
              
              {/* Frequency Indicator Pill */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035]">
                <span className="text-xs font-semibold text-[#8F879A]">Habit Frequency</span>
                <span className="px-3 py-1 rounded-full bg-[#8B5CF6]/20 border border-[#A855F7]/50 text-[#DDD6FE] text-xs font-bold font-mono uppercase">
                  {habitForm.frequency}
                </span>
              </div>

              {/* Habit Name */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    habitForm.frequency === 'WEEKLY' 
                      ? 'e.g. PREPARE HEALTHY MEALS, CALL SOMEONE YOU CARE ABOUT' 
                      : habitForm.frequency === 'MONTHLY'
                      ? 'e.g. COMPLETE 20 WORKOUTS, READ 2 BOOKS'
                      : 'e.g. WAKE UP AT 5AM, GYM, MEDITATION, JOURNALING'
                  }
                  value={habitForm.name}
                  onChange={(e) => setHabitForm({ ...habitForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Category & Targets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fitness, Mindfulness, Productivity"
                    value={habitForm.category}
                    onChange={(e) => setHabitForm({ ...habitForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                {/* Target based on frequency */}
                {habitForm.frequency === 'WEEKLY' && (
                  <div>
                    <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Weekly Target</label>
                    <select
                      value={habitForm.weeklyTarget}
                      onChange={(e) => setHabitForm({ ...habitForm, weeklyTarget: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                    >
                      <option value={1}>1 time / week</option>
                      <option value={2}>2 times / week</option>
                      <option value={3}>3 times / week</option>
                      <option value={4}>4 times / week (Recommended)</option>
                      <option value={5}>5 times / week</option>
                      <option value={6}>6 times / week</option>
                      <option value={7}>7 times / week (Daily Goal)</option>
                    </select>
                  </div>
                )}

                {habitForm.frequency === 'MONTHLY' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Target Count</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={habitForm.monthlyTarget}
                        onChange={(e) => setHabitForm({ ...habitForm, monthlyTarget: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Unit</label>
                      <input
                        type="text"
                        placeholder="workouts, books"
                        value={habitForm.monthlyUnit}
                        onChange={(e) => setHabitForm({ ...habitForm, monthlyUnit: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>
                )}

                {habitForm.frequency === 'DAILY' && (
                  <div>
                    <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Time of Day</label>
                    <select
                      value={habitForm.timeOfDay}
                      onChange={(e) => setHabitForm({ ...habitForm, timeOfDay: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                    >
                      <option value="MORNING">Morning</option>
                      <option value="AFTERNOON">Afternoon</option>
                      <option value="EVENING">Evening</option>
                      <option value="ANYTIME">Anytime</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Start Date & Reminder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    value={habitForm.startDate}
                    onChange={(e) => setHabitForm({ ...habitForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Reminder (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 07:00 AM or Every Sunday"
                    value={habitForm.reminder}
                    onChange={(e) => setHabitForm({ ...habitForm, reminder: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Purple Accent Palette */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1.5">Category Accent Color</label>
                <div className="flex items-center space-x-2">
                  {purplePalette.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setHabitForm({ ...habitForm, categoryColor: p.value })}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${habitForm.categoryColor === p.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black shadow-[0_0_10px_currentColor]' : 'hover:scale-110'}`}
                      style={{ backgroundColor: p.value, color: p.value }}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[#21182B]">
                {editingHabit ? (
                  <button
                    type="button"
                    onClick={() => void handleDeleteEditingHabit()}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Habit</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsHabitModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#8F879A] hover:bg-[#140F1C] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
                  >
                    {editingHabit ? 'Save Changes' : `Create ${habitForm.frequency === 'WEEKLY' ? 'Weekly' : habitForm.frequency === 'MONTHLY' ? 'Monthly' : 'Daily'} Habit`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: FREEZE TOKEN VAULT */}
      {/* ------------------------------------------------------------- */}
      {isFreezeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0B0910] border border-[#8B5CF6]/50 shadow-[0_0_30px_rgba(139,92,246,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <div className="flex items-center space-x-2">
                <Snowflake className="w-5 h-5 text-[#C084FC]" />
                <h3 className="text-base font-bold text-white tracking-tight">Freeze Token Vault</h3>
              </div>
              <button onClick={() => setIsFreezeModalOpen(false)} className="text-[#8F879A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#140F1C]/80 border border-[#8B5CF6]/30 text-xs text-[#DDD6FE] leading-relaxed space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-[#C084FC]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Automated Streak Shield Active</span>
              </div>
              <p className="text-[#8F879A] text-[11px] leading-normal">
                Whenever a habit is not completed by the end of the day, <span className="text-[#DDD6FE] font-semibold">1 Freeze Token is automatically applied</span> to protect your streak and mark the day as <span className="text-[#C084FC] font-semibold">FROZEN</span>. No manual activation required.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#140F1C] border border-[#2A2035] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#8F879A] uppercase tracking-wider">Available Balance</span>
                <p className="text-2xl font-extrabold text-[#DDD6FE] font-mono">{freezeState.availableTokens} Tokens</p>
                <span className="text-[10px] text-[#8F879A]">Used: {freezeState.usedTokens}</span>
              </div>
              <Snowflake className="w-8 h-8 text-[#C084FC]/40 animate-pulse-slow" />
            </div>

            {/* Recent Freeze History */}
            {freezeState.history && freezeState.history.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#DDD6FE] uppercase tracking-wider">Recent Protections</span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {freezeState.history.slice(0, 4).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-[#100C16] border border-[#21182B] text-[11px]">
                      <div className="flex items-center space-x-1.5 truncate">
                        <Snowflake className="w-3 h-3 text-[#C084FC] flex-shrink-0" />
                        <span className="text-white font-medium truncate">{item.habitName || 'Automatic Protection'}</span>
                      </div>
                      <span className="text-[#8F879A] font-mono flex-shrink-0 ml-2">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-between space-x-2 border-t border-[#21182B]">
              <button
                type="button"
                onClick={() => {
                  const res = storageService.checkAndApplyAutoFreeze();
                  if (res.autoFrozenCount > 0 && res.message) {
                    showToast(res.message);
                  } else {
                    showToast('All active habits and streaks are fully up to date.');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-[#140F1C] hover:bg-[#1B1426] border border-[#8B5CF6]/30 hover:border-[#8B5CF6] text-[#DDD6FE] text-xs font-bold transition-all"
              >
                Scan & Auto-Freeze Missed Days
              </button>

              <button
                onClick={() => setIsFreezeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE TASK */}
      {/* ------------------------------------------------------------- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0B0910] border border-[#8B5CF6]/50 shadow-[0_0_30px_rgba(139,92,246,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <h3 className="text-base font-bold text-white tracking-tight">Create Mission Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-[#8F879A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit connection pool logs"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Task details..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#21182B]">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8F879A] hover:bg-[#140F1C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SETTINGS & DATA RESET */}
      {/* ------------------------------------------------------------- */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0B0910] border border-[#8B5CF6]/50 shadow-[0_0_30px_rgba(139,92,246,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <h3 className="text-base font-bold text-white tracking-tight">Dashboard Settings</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-[#8F879A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#140F1C] border border-[#2A2035] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Active User Identity</h4>
                  <p className="text-[11px] text-[#8F879A]">{currentUser.name} ({currentUser.email})</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950/60 border border-[#8B5CF6]/40 text-[#C084FC]">
                  {currentUser.role}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#140F1C] border border-red-950/40 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-300">Reset Local Storage</h4>
                  <p className="text-[11px] text-[#8F879A]">Restore default reference data & metrics</p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Reset all habits, goals, and tasks back to initial state?')) {
                      storageService.resetAllData();
                      showToast('Database reset to defaults.');
                      setIsSettingsModalOpen(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-bold"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-[#21182B]">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: LIVE FOCUS TIMER */}
      {/* ------------------------------------------------------------- */}
      {isTimerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0B0910] border border-[#8B5CF6]/50 shadow-[0_0_35px_rgba(139,92,246,0.35)] space-y-5 text-center">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <div className="flex items-center space-x-2 text-left">
                <Clock className="w-5 h-5 text-[#8B5CF6]" />
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Live Focus Timer</h3>
                  <p className="text-xs font-mono text-[#8F879A]">Pomodoro & Deep Work Session</p>
                </div>
              </div>
              <button onClick={() => setIsTimerModalOpen(false)} className="text-[#8F879A] hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Goal Selector */}
            {goals.length > 0 && (
              <div className="text-left space-y-1">
                <label className="text-xs font-bold text-[#DDD6FE] uppercase tracking-wider">Associate with Goal</label>
                <select
                  value={timerGoalId}
                  onChange={(e) => setTimerGoalId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                >
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.category})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Digital Clock display */}
            <div className="py-4">
              <div className="w-48 h-48 mx-auto rounded-full bg-[#120D1A] border-4 border-[#8B5CF6]/40 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                <span className="text-4xl font-mono font-black text-white tracking-wider">
                  {String(Math.floor(timerSecondsLeft / 60)).padStart(2, '0')}:
                  {String(timerSecondsLeft % 60).padStart(2, '0')}
                </span>
                <span className="text-[11px] font-mono text-[#DDD6FE] mt-1 font-bold">
                  {isTimerActive
                    ? 'SESSION IN PROGRESS'
                    : timerSecondsLeft < timerDurationMinutes * 60
                      ? 'SESSION PAUSED'
                      : 'READY TO FOCUS'}
                </span>
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsTimerActive(!isTimerActive);
                }}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                  isTimerActive 
                    ? 'bg-amber-600/80 hover:bg-amber-600 text-white' 
                    : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                }`}
              >
                {isTimerActive
                  ? 'Pause Session'
                  : timerSecondsLeft < timerDurationMinutes * 60
                    ? 'Resume Session'
                    : 'Start Focus'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsTimerActive(false);
                  setTimerSecondsLeft(timerDurationMinutes * 60);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#140F1C] border border-[#2A2035] hover:border-[#8B5CF6] text-[#8F879A] hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => void handleStopTimer()}
                disabled={timerDurationMinutes * 60 - timerSecondsLeft < 10 || !timerGoalId}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Stop &amp; Save
              </button>
            </div>

            {/* Duration presets */}
            <div className="flex items-center justify-center space-x-2 pt-2 border-t border-[#21182B]">
              {[15, 25, 45, 60].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setIsTimerActive(false);
                    setTimerDurationMinutes(mins);
                    setTimerSecondsLeft(mins * 60);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    timerDurationMinutes === mins
                      ? 'bg-[#8B5CF6]/30 border border-[#A855F7] text-white'
                      : 'bg-[#140F1C] border border-[#2A2035] text-[#8F879A] hover:text-[#DDD6FE]'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

