import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Flame, 
  Check, 
  Sparkles, 
  Edit3, 
  Trash2,
  Calendar as CalendarIcon,
  Target,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Habit, FreezeState } from '../../types';
import { storageService } from '../../services/storageService';

interface HabitsMatrixViewProps {
  habits: Habit[];
  freezeState: FreezeState;
  currentDate: Date;
  onOpenNewHabit: (frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY') => void;
  onOpenEditHabit: (habit: Habit) => void;
  onSaveHabit: (habit: Habit) => Promise<void>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export type ViewMode = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const HabitsMatrixView: React.FC<HabitsMatrixViewProps> = ({
  habits,
  freezeState,
  currentDate,
  onOpenNewHabit,
  onOpenEditHabit,
  onSaveHabit,
  onDeleteHabit,
  onShowToast
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('DAILY');
  
  // Real local today reference
  const now = useMemo(() => new Date(), []);
  const realTodayYear = now.getFullYear();
  const realTodayMonth = now.getMonth(); // 0-indexed (0=Jan, 8=Sep...)
  const realTodayDay = now.getDate();
  const realTodayDateStr = `${realTodayYear}-${String(realTodayMonth + 1).padStart(2, '0')}-${String(realTodayDay).padStart(2, '0')}`;

  // Month navigation: starts on real current local month
  const [activeMonthDate, setActiveMonthDate] = useState<Date>(() => new Date(now.getFullYear(), now.getMonth(), 1));
  
  // Week navigation: starts on real current week
  const [activeWeekDate, setActiveWeekDate] = useState<Date>(() => new Date());

  // Month calculations
  const year = activeMonthDate.getFullYear();
  const month = activeMonthDate.getMonth();
  
  // Exact calendar days in currently active month (e.g. 28, 29, 30, 31)
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const monthTitle = `${monthNames[month]} ${year}`;

  const isCurrentMonthViewed = year === realTodayYear && month === realTodayMonth;
  const todayDayNum = isCurrentMonthViewed ? realTodayDay : -1;
  const todayDateStr = realTodayDateStr;

  // Month navigation handlers
  const handlePrevMonth = () => {
    setActiveMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setActiveMonthDate(new Date(year, month + 1, 1));
  };

  // Week navigation calculation (Monday to Sunday)
  const currentWeekDays = useMemo(() => {
    const d = new Date(activeWeekDate);
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon...
    const diffToMon = (dayOfWeek + 6) % 7;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMon);

    const weekArr: { date: Date; dateStr: string; dayNum: number; dayName: string; isToday: boolean }[] = [];
    const shortDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const curYear = cur.getFullYear();
      const curMonth = String(cur.getMonth() + 1).padStart(2, '0');
      const curDay = String(cur.getDate()).padStart(2, '0');
      const curDateStr = `${curYear}-${curMonth}-${curDay}`;

      weekArr.push({
        date: cur,
        dateStr: curDateStr,
        dayNum: cur.getDate(),
        dayName: shortDays[i],
        isToday: curDateStr === realTodayDateStr
      });
    }
    return weekArr;
  }, [activeWeekDate, realTodayDateStr]);

  const weekRangeTitle = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const start = currentWeekDays[0].date;
    const end = currentWeekDays[6].date;
    const startM = monthNames[start.getMonth()].slice(0, 3);
    const endM = monthNames[end.getMonth()].slice(0, 3);
    return `${startM} ${start.getDate()} - ${endM} ${end.getDate()}, ${end.getFullYear()}`;
  }, [currentWeekDays, monthNames]);

  const handlePrevWeek = () => {
    const prev = new Date(activeWeekDate);
    prev.setDate(prev.getDate() - 7);
    setActiveWeekDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(activeWeekDate);
    next.setDate(next.getDate() + 7);
    setActiveWeekDate(next);
  };

  // ---------------------------------------------------------------------------
  // FILTER HABITS BY CURRENT VIEW MODE (COMPLETELY INDEPENDENT)
  // ---------------------------------------------------------------------------
  const dailyHabits = useMemo(() => {
    return habits.filter(h => 
      h.frequency === 'DAILY' || 
      h.frequency === 'WEEKDAYS' || 
      h.frequency === 'WEEKENDS' || 
      !h.frequency || 
      (h.frequency !== 'WEEKLY' && h.frequency !== 'MONTHLY')
    );
  }, [habits]);

  const weeklyHabits = useMemo(() => {
    return habits.filter(h => h.frequency === 'WEEKLY');
  }, [habits]);

  const monthlyHabits = useMemo(() => {
    return habits.filter(h => h.frequency === 'MONTHLY');
  }, [habits]);

  // Compute daily completion rates across the month for DAILY Trend Line
  const dayStats = useMemo(() => {
    const stats: { day: number; dateStr: string; completedCount: number; totalCount: number; rate: number }[] = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let completed = 0;
      dailyHabits.forEach(h => {
        if (h.history && h.history[dateStr]) {
          completed += 1;
        }
      });
      const total = dailyHabits.length;
      const rate = total > 0 ? (completed / total) : 0;
      stats.push({ day: d, dateStr, completedCount: completed, totalCount: total, rate });
    }
    return stats;
  }, [dailyHabits, year, month, daysInMonth]);

  // Overall Average Completion for Daily
  const averageRate = useMemo(() => {
    if (dayStats.length === 0) return 0;
    const passedDays = dayStats.filter(s => s.day <= todayDayNum);
    if (passedDays.length === 0) return 0;
    const sum = passedDays.reduce((acc, curr) => acc + curr.rate, 0);
    return Math.round((sum / passedDays.length) * 100);
  }, [dayStats, todayDayNum]);

  // Daily today completed
  const todayCompletedCount = useMemo(() => {
    return dailyHabits.filter(h => h.history && h.history[todayDateStr]).length;
  }, [dailyHabits, todayDateStr]);

  // Daily monthly progress percentage
  const dailyProgressPercent = useMemo(() => {
    if (dailyHabits.length === 0) return 0;
    return Math.round((todayCompletedCount / dailyHabits.length) * 100);
  }, [todayCompletedCount, dailyHabits]);

  // Toggle specific day for a habit (DAILY or WEEKLY or MONTHLY)
  const handleToggleCell = async (habit: Habit, dateStr: string, label?: string) => {
    const newHistory = { ...(habit.history || {}) };
    const currentVal = !!newHistory[dateStr];
    newHistory[dateStr] = !currentVal;

    // Recalculate streak via storageService engine
    const streakResult = storageService.calculateHabitStreak({
      ...habit,
      history: newHistory
    }, todayDateStr);

    const updated: Habit = {
      ...habit,
      history: newHistory,
      completedToday: dateStr === todayDateStr ? !currentVal : habit.completedToday,
      streak: streakResult.currentStreak,
      bestStreak: streakResult.bestStreak
    };

    try {
      await onSaveHabit(updated);
      onShowToast(`${!currentVal ? '✓ Marked' : 'Removed'} ${habit.name}${label ? ` for ${label}` : ''}`);
    } catch (error) {
      console.error('Failed to update habit history:', error);
      onShowToast('Unable to update habit. Please try again.');
    }
  };

  // Toggle or increment monthly count
  const handleToggleMonthlyTarget = async (habit: Habit, delta: number) => {
    // Pick today or increment date
    const targetKey = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const newHistory = { ...(habit.history || {}) };
    
    // Find how many days completed in current month
    const curMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const curMonthDates = Object.keys(newHistory).filter(k => k.startsWith(curMonthPrefix) && newHistory[k]);
    
    if (delta > 0) {
      // Add next available day
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${curMonthPrefix}-${String(d).padStart(2, '0')}`;
        if (!newHistory[dStr]) {
          newHistory[dStr] = true;
          break;
        }
      }
    } else if (delta < 0 && curMonthDates.length > 0) {
      // Remove last completed day
      const lastDate = curMonthDates[curMonthDates.length - 1];
      delete newHistory[lastDate];
    }

    const streakResult = storageService.calculateHabitStreak({
      ...habit,
      history: newHistory
    }, todayDateStr);

    const updated: Habit = {
      ...habit,
      history: newHistory,
      completedToday: !!newHistory[todayDateStr],
      streak: streakResult.currentStreak,
      bestStreak: streakResult.bestStreak
    };

    try {
      await onSaveHabit(updated);
      onShowToast(`Updated ${habit.name}`);
    } catch (error) {
      console.error('Failed to update monthly habit progress:', error);
      onShowToast('Unable to update habit. Please try again.');
    }
  };

  // Delete confirmation state
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string } | null>(null);

  // Delete Habit Trigger
  const handleDeleteHabit = (habitId: string, habitName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHabitToDelete({ id: habitId, name: habitName });
  };

  const handleConfirmDelete = async () => {
    if (!habitToDelete) return;
    try {
      await onDeleteHabit(habitToDelete.id);
      onShowToast(`✓ Deleted "${habitToDelete.name}"`);
      setHabitToDelete(null);
    } catch (error) {
      console.error('Failed to delete habit:', error);
      onShowToast('Unable to delete habit. Please try again.');
    }
  };

  // Generate SVG Points for Daily Trend Graph
  const trendPoints = useMemo(() => {
    const width = 800;
    const height = 44;
    const paddingTop = 12; // Safe headroom ensuring curve never crosses above the top line
    const paddingBottom = 8;
    const usableHeight = height - paddingTop - paddingBottom;

    const points = dayStats.map((stat, i) => {
      const x = ((i + 0.5) / Math.max(1, daysInMonth)) * width;
      const rawY = height - paddingBottom - stat.rate * usableHeight;
      const y = Math.max(paddingTop, Math.min(height - paddingBottom, rawY));
      return { x, y, rate: stat.rate, day: stat.day };
    });

    const pathData = points.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = points[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');

    const areaData = points.length > 0 
      ? `${pathData} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
      : '';

    return { points, pathData, areaData, width, height };
  }, [dayStats, daysInMonth]);

  // Days array to display (1 to 30) for Daily
  const displayDays = useMemo(() => {
    const arr: number[] = [];
    for (let i = 1; i <= daysInMonth; i++) arr.push(i);
    return arr;
  }, [daysInMonth]);

  // Weekly Stats summary
  const weeklySummary = useMemo(() => {
    if (weeklyHabits.length === 0) return { onTrack: 0, total: 0, avgPct: 0 };
    let onTrack = 0;
    let totalPct = 0;

    weeklyHabits.forEach(h => {
      const target = h.weeklyTarget || 3;
      let completedInWeek = 0;
      currentWeekDays.forEach(d => {
        if (h.history && h.history[d.dateStr]) {
          completedInWeek++;
        }
      });
      if (completedInWeek >= target) {
        onTrack++;
      }
      totalPct += Math.min(100, Math.round((completedInWeek / target) * 100));
    });

    const avgPct = Math.round(totalPct / weeklyHabits.length);
    return { onTrack, total: weeklyHabits.length, avgPct };
  }, [weeklyHabits, currentWeekDays]);

  // Monthly Stats summary
  const monthlySummary = useMemo(() => {
    if (monthlyHabits.length === 0) return { onTrack: 0, total: 0, avgPct: 0 };
    let onTrack = 0;
    let totalPct = 0;
    const curMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    monthlyHabits.forEach(h => {
      const target = h.monthlyTarget || 1;
      const completedInMonth = Object.keys(h.history || {}).filter(k => k.startsWith(curMonthPrefix) && h.history[k]).length;
      if (completedInMonth >= target) {
        onTrack++;
      }
      totalPct += Math.min(100, Math.round((completedInMonth / target) * 100));
    });

    const avgPct = Math.round(totalPct / monthlyHabits.length);
    return { onTrack, total: monthlyHabits.length, avgPct };
  }, [monthlyHabits, year, month]);

  return (
    <div className="w-full space-y-6 text-[#F5F3F7]">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. SUMMARY CARD BASED ON ACTIVE TAB */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-[20px] bg-[#0C0910] border border-[#21182B] p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.6)] backdrop-blur-md">
        
        {/* Ambient Violet Glow */}
        <div className="pointer-events-none absolute -top-12 right-1/4 w-72 h-40 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.12)_0%,transparent_70%)] blur-2xl" />

        {viewMode === 'DAILY' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#DDD6FE] opacity-85 font-mono">
                  {monthTitle}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#F5F3F7] tracking-tight mt-0.5 font-['Space_Grotesk']">
                  {todayCompletedCount}/{dailyHabits.length} daily habits done today
                </h2>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center space-x-2 self-start sm:self-center">
                <button
                  onClick={handlePrevMonth}
                  className="w-9 h-9 rounded-full bg-[#100C15] hover:bg-[#130E19] border border-[#21182B] hover:border-[#8B5CF6]/50 flex items-center justify-center text-[#DDD6FE] transition-all hover:scale-105 active:scale-95 shadow-sm"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="w-9 h-9 rounded-full bg-[#100C15] hover:bg-[#130E19] border border-[#21182B] hover:border-[#8B5CF6]/50 flex items-center justify-center text-[#DDD6FE] transition-all hover:scale-105 active:scale-95 shadow-sm"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#21182B]/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#8F879A] mb-1.5">
                <span>Daily Velocity</span>
                <span className="text-[#C084FC]">{dailyProgressPercent}% Completed</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#21182B] overflow-hidden relative">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#C084FC] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                  style={{ width: `${dailyProgressPercent}%` }}
                />
              </div>
            </div>
          </>
        )}

        {viewMode === 'WEEKLY' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#DDD6FE] opacity-85 font-mono">
                  WEEKLY TARGET MATRIX • {weekRangeTitle}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#F5F3F7] tracking-tight mt-0.5 font-['Space_Grotesk']">
                  {weeklySummary.onTrack}/{weeklyHabits.length} weekly goals on track
                </h2>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center space-x-2 self-start sm:self-center">
                <button
                  onClick={handlePrevWeek}
                  className="w-9 h-9 rounded-full bg-[#100C15] hover:bg-[#130E19] border border-[#21182B] hover:border-[#8B5CF6]/50 flex items-center justify-center text-[#DDD6FE] transition-all hover:scale-105 active:scale-95 shadow-sm"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextWeek}
                  className="w-9 h-9 rounded-full bg-[#100C15] hover:bg-[#130E19] border border-[#21182B] hover:border-[#8B5CF6]/50 flex items-center justify-center text-[#DDD6FE] transition-all hover:scale-105 active:scale-95 shadow-sm"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#21182B]/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#8F879A] mb-1.5">
                <span>Weekly Target Velocity</span>
                <span className="text-[#C084FC]">{weeklySummary.avgPct}% Target Met</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#21182B] overflow-hidden relative">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#C084FC] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                  style={{ width: `${weeklySummary.avgPct}%` }}
                />
              </div>
            </div>
          </>
        )}

        {viewMode === 'MONTHLY' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#DDD6FE] opacity-85 font-mono">
                  MONTHLY TARGET RADAR • {monthTitle}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#F5F3F7] tracking-tight mt-0.5 font-['Space_Grotesk']">
                  {monthlySummary.onTrack}/{monthlyHabits.length} monthly milestones achieved
                </h2>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center space-x-2 self-start sm:self-center">
                <button
                  onClick={handlePrevMonth}
                  className="w-9 h-9 rounded-full bg-[#100C15] hover:bg-[#130E19] border border-[#21182B] hover:border-[#8B5CF6]/50 flex items-center justify-center text-[#DDD6FE] transition-all hover:scale-105 active:scale-95 shadow-sm"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="w-9 h-9 rounded-full bg-[#100C15] hover:bg-[#130E19] border border-[#21182B] hover:border-[#8B5CF6]/50 flex items-center justify-center text-[#DDD6FE] transition-all hover:scale-105 active:scale-95 shadow-sm"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#21182B]/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#8F879A] mb-1.5">
                <span>Monthly Milestone Progress</span>
                <span className="text-[#C084FC]">{monthlySummary.avgPct}% Target Met</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#21182B] overflow-hidden relative">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#C084FC] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                  style={{ width: `${monthlySummary.avgPct}%` }}
                />
              </div>
            </div>
          </>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. VIEW SELECTOR & NEW HABIT BUTTON */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Wide Segmented Control: DAILY | WEEKLY | MONTHLY */}
        <div className="flex items-center p-1 rounded-full bg-[#0C0910] border border-[#21182B] shadow-inner">
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as ViewMode[]).map((mode) => {
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all duration-300 uppercase ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white shadow-[0_0_18px_rgba(139,92,246,0.45)]'
                    : 'text-[#8F879A] hover:text-[#DDD6FE] hover:bg-[#100C15]/60'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>

        {/* Set Habit Button */}
        <button
          onClick={() => onOpenNewHabit(viewMode)}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#581c87] text-white text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_28px_rgba(168,85,247,0.6)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Set Habit</span>
        </button>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. DAILY TRACKING MATRIX & TREND GRAPH */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'DAILY' && (
        <div className="relative overflow-hidden rounded-[20px] bg-[#0C0910] border border-[#21182B] shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          
          <div className="pointer-events-none absolute top-0 left-1/3 w-96 h-40 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-10 w-80 h-32 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.06)_0%,transparent_70%)] blur-3xl" />

          {dailyHabits.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#140F1C] border border-[#2A2035] flex items-center justify-center text-[#8F879A]">
                <Layers className="w-7 h-7 text-[#8B5CF6]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No daily habits yet.</h3>
                <p className="text-xs text-[#8F879A]">Start building consistent daily routines by creating your first daily habit.</p>
              </div>
              <button
                onClick={() => onOpenNewHabit('DAILY')}
                className="mt-2 flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Daily Habit</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
              <div className="min-w-[860px] w-full">

                {/* Header Row: TREND + DATES 1..30 + STATS */}
                <div className="grid grid-cols-[180px_1fr_110px] items-center border-b border-[#21182B] bg-[#08050B]/60 px-4 py-3">
                  <div className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
                    TREND
                  </div>

                  <div 
                    className="grid gap-1 px-1 items-center justify-items-center text-center"
                    style={{ gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))` }}
                  >
                    {displayDays.map((d) => {
                      const isToday = d === todayDayNum;
                      return (
                        <div
                          key={d}
                          className={`w-full text-center text-[10px] sm:text-[11px] font-bold transition-colors py-0.5 rounded-md ${
                            isToday
                              ? 'text-white bg-[#8B5CF6]/30 border border-[#A855F7]/60 shadow-[0_0_10px_rgba(168,85,247,0.4)] font-mono animate-pulse-slow'
                              : 'text-[#8F879A] hover:text-[#DDD6FE]'
                          }`}
                        >
                          {d}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-right text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono pr-2">
                    STATS
                  </div>
                </div>

                {/* Trend Graph Row */}
                <div className="grid grid-cols-[180px_1fr_110px] items-center border-b border-[#21182B] bg-[#0B0710]/40 px-4 py-2.5">
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#8F879A]">
                    <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
                    <span>HABIT</span>
                  </div>

                  <div className="px-1 h-11 relative flex items-center overflow-hidden">
                    <svg
                      viewBox={`0 0 ${trendPoints.width} ${trendPoints.height}`}
                      className="w-full h-full overflow-hidden"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="dailyTrendAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                        </linearGradient>

                        <linearGradient id="dailyTrendLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8B5CF6" />
                          <stop offset="50%" stopColor="#C084FC" />
                          <stop offset="100%" stopColor="#A855F7" />
                        </linearGradient>
                      </defs>

                      {trendPoints.areaData && (
                        <path d={trendPoints.areaData} fill="url(#dailyTrendAreaGrad)" />
                      )}

                      {trendPoints.pathData && (
                        <path
                          d={trendPoints.pathData}
                          fill="none"
                          stroke="url(#dailyTrendLineGrad)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]"
                        />
                      )}

                      {trendPoints.points.map((pt) => {
                        const isToday = pt.day === todayDayNum;
                        return (
                          <circle
                            key={pt.day}
                            cx={pt.x}
                            cy={pt.y}
                            r={isToday ? 4 : 2.5}
                            fill={isToday ? '#FFFFFF' : '#C084FC'}
                            stroke={isToday ? '#8B5CF6' : '#21182B'}
                            strokeWidth="1.5"
                            className={isToday ? 'drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]' : ''}
                          />
                        );
                      })}
                    </svg>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pr-2">
                    <span className="text-[10px] font-bold uppercase text-[#8F879A] tracking-wider font-mono">AVG</span>
                    <span className="px-2.5 py-1 rounded-full bg-[#130E19] border border-[#8B5CF6]/40 text-[#DDD6FE] text-xs font-bold font-mono shadow-[0_0_10px_rgba(139,92,246,0.25)]">
                      {averageRate}%
                    </span>
                  </div>
                </div>

                {/* Daily Habit Rows */}
                <div className="divide-y divide-[#21182B]/60">
                  {dailyHabits.map((habit) => {
                    const completedInMonth = Object.keys(habit.history || {}).filter(k => {
                      return k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && habit.history[k];
                    }).length;
                    
                    const habitRate = todayDayNum > 0 
                      ? Math.round((completedInMonth / todayDayNum) * 100) 
                      : 80;

                    return (
                      <div
                        key={habit.id}
                        className="grid grid-cols-[180px_1fr_110px] items-center px-4 py-3 hover:bg-[#100C15]/50 transition-colors group"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: habit.categoryColor || '#A855F7', color: habit.categoryColor || '#A855F7' }}
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold uppercase tracking-tight text-[#F5F3F7] group-hover:text-white line-clamp-2 leading-tight">
                              {habit.name}
                            </span>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 ml-auto">
                            <button
                              type="button"
                              onClick={() => onOpenEditHabit(habit)}
                              className="p-1 rounded text-[#8F879A] hover:text-[#DDD6FE]"
                              title="Edit Habit"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHabit(habit.id, habit.name, e)}
                              className="p-1 rounded text-[#8F879A] hover:text-red-400"
                              title="Delete Habit"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* 1..30 Cells */}
                        <div 
                          className="grid gap-1 px-1 items-center justify-items-center"
                          style={{ gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))` }}
                        >
                          {displayDays.map((d) => {
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const isDone = !!(habit.history && habit.history[dateStr]);
                            const isToday = d === todayDayNum;

                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleToggleCell(habit, dateStr, `Day ${d}`)}
                                className={`w-5 h-5 sm:w-[21px] sm:h-[21px] rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer flex-shrink-0 ${
                                  isDone
                                    ? 'bg-[#8B5CF6] border border-[#A855F7] text-white shadow-[0_0_10px_rgba(139,92,246,0.65)] hover:scale-115 active:scale-95'
                                    : 'bg-transparent border border-[#29202F] hover:border-[#8B5CF6] hover:bg-[#140F1C] hover:shadow-[0_0_8px_rgba(139,92,246,0.3)]'
                                } ${isToday ? 'ring-2 ring-[#A855F7]/70 ring-offset-1 ring-offset-[#0C0910]' : ''}`}
                                title={`Day ${d}: ${isDone ? 'Completed' : 'Incomplete'}`}
                              >
                                {isDone && (
                                  <Check className="w-3.5 h-3.5 stroke-[3] text-white animate-scale-in" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Daily Habit Stats */}
                        <div className="flex items-center justify-end space-x-3 text-xs font-bold pr-2">
                          <span className="text-[#DDD6FE] font-mono min-w-[30px] text-right">
                            {habitRate}%
                          </span>

                          <div className="flex items-center space-x-1 text-[#C084FC] min-w-[36px] justify-end">
                            <Flame className={`w-3.5 h-3.5 ${
                              habit.streak > 0 
                                ? 'text-[#A855F7] fill-[#A855F7]/40 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse-slow' 
                                : 'text-[#5E5668]'
                            }`} />
                            <span className="font-mono text-white">{habit.streak}</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. WEEKLY TRACKING MATRIX (INDEPENDENT WEEKLY HABITS) */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'WEEKLY' && (
        <div className="relative overflow-hidden rounded-[20px] bg-[#0C0910] border border-[#21182B] shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          
          <div className="pointer-events-none absolute top-0 left-1/3 w-96 h-40 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)] blur-3xl" />

          {weeklyHabits.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#140F1C] border border-[#2A2035] flex items-center justify-center text-[#8F879A]">
                <Target className="w-7 h-7 text-[#A855F7]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No weekly habits yet.</h3>
                <p className="text-xs text-[#8F879A]">Create recurring weekly goals like meal prep, weekly planning, or fitness targets.</p>
              </div>
              <button
                onClick={() => onOpenNewHabit('WEEKLY')}
                className="mt-2 flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Weekly Habit</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
              <div className="min-w-[850px] w-full">

                {/* Header Row: HABIT + MON..SUN + STATS */}
                <div className="grid grid-cols-[260px_1fr_180px] items-center border-b border-[#21182B] bg-[#08050B]/60 px-5 py-3.5">
                  <div className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
                    HABIT
                  </div>

                  {/* 7 Columns for Days of the Week */}
                  <div className="grid grid-cols-7 gap-2 px-4 items-center text-center">
                    {currentWeekDays.map((d) => {
                      return (
                        <div
                          key={d.dateStr}
                          className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
                            d.isToday
                              ? 'text-white bg-[#8B5CF6]/30 border border-[#A855F7]/60 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                              : 'text-[#8F879A] hover:text-[#DDD6FE]'
                          }`}
                        >
                          <span className="text-[10px] font-extrabold tracking-wider">{d.dayName}</span>
                          <span className={`text-xs font-bold font-mono ${d.isToday ? 'text-white' : 'text-[#DDD6FE]'}`}>
                            {d.dayNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-right text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono pr-2">
                    WEEKLY GOAL / STATS
                  </div>
                </div>

                {/* Weekly Habit Rows */}
                <div className="divide-y divide-[#21182B]/60">
                  {weeklyHabits.map((habit) => {
                    const target = habit.weeklyTarget || 4;
                    
                    // Count completed in current week
                    let completedInWeek = 0;
                    currentWeekDays.forEach(d => {
                      if (habit.history && habit.history[d.dateStr]) {
                        completedInWeek++;
                      }
                    });

                    const isTargetAchieved = completedInWeek >= target;
                    const weekPct = Math.min(100, Math.round((completedInWeek / target) * 100));

                    return (
                      <div
                        key={habit.id}
                        className="grid grid-cols-[260px_1fr_180px] items-center px-5 py-4 hover:bg-[#100C15]/50 transition-colors group"
                      >
                        {/* Left: Habit Info */}
                        <div className="flex items-center space-x-3 min-w-0 pr-3">
                          <span 
                            className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: habit.categoryColor || '#A855F7', color: habit.categoryColor || '#A855F7' }}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold uppercase tracking-tight text-[#F5F3F7] group-hover:text-white line-clamp-1">
                              {habit.name}
                            </h4>
                            <div className="flex items-center space-x-2 text-[11px] text-[#8F879A] mt-0.5">
                              <span>{habit.category}</span>
                              <span>•</span>
                              <span className="text-[#C084FC] font-medium font-mono">Target: {target}x / wk</span>
                            </div>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 ml-auto">
                            <button
                              type="button"
                              onClick={() => onOpenEditHabit(habit)}
                              className="p-1 rounded text-[#8F879A] hover:text-[#DDD6FE]"
                              title="Edit Habit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHabit(habit.id, habit.name, e)}
                              className="p-1 rounded text-[#8F879A] hover:text-red-400"
                              title="Delete Habit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Center: 7 Checkbox Days (MON..SUN) */}
                        <div className="grid grid-cols-7 gap-2 px-4 items-center justify-items-center">
                          {currentWeekDays.map((d) => {
                            const isDone = !!(habit.history && habit.history[d.dateStr]);

                            return (
                              <button
                                key={d.dateStr}
                                type="button"
                                onClick={() => handleToggleCell(habit, d.dateStr, `${d.dayName} ${d.dayNum}`)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                  isDone
                                    ? 'bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] border border-[#A855F7] text-white shadow-[0_0_12px_rgba(139,92,246,0.65)] hover:scale-110 active:scale-95'
                                    : 'bg-[#120D1A] border border-[#29202F] text-transparent hover:border-[#8B5CF6] hover:bg-[#181226]'
                                } ${d.isToday ? 'ring-2 ring-[#A855F7]/70 ring-offset-1 ring-offset-[#0C0910]' : ''}`}
                                title={`${d.dayName} ${d.dayNum}: ${isDone ? 'Completed' : 'Click to complete'}`}
                              >
                                {isDone ? (
                                  <Check className="w-4 h-4 stroke-[3] text-white animate-scale-in" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#342840]" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Right: Weekly Goal Progress & Weekly Streak */}
                        <div className="flex items-center justify-end space-x-3 text-xs pr-2">
                          
                          {/* Completed vs Target Badge */}
                          <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${
                            isTargetAchieved 
                              ? 'bg-[#181226] border-[#A855F7]/60 text-[#DDD6FE] shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                              : 'bg-[#100C16] border-[#21182B] text-[#8F879A]'
                          }`}>
                            <span className={isTargetAchieved ? 'text-white' : 'text-[#DDD6FE]'}>{completedInWeek}</span>
                            <span className="text-[#8F879A]"> / {target}</span>
                            <span className="text-[10px] text-[#A855F7] ml-1.5">({weekPct}%)</span>
                          </div>

                          {/* Weekly Streak Badge */}
                          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#120D1A] border border-[#2A2035] text-[#C084FC]">
                            <Flame className={`w-3.5 h-3.5 ${
                              habit.streak > 0 
                                ? 'text-[#A855F7] fill-[#A855F7]/40 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse-slow' 
                                : 'text-[#5E5668]'
                            }`} />
                            <span className="font-mono text-white text-xs font-bold">
                              {habit.streak} {habit.streak === 1 ? 'wk' : 'wks'}
                            </span>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MONTHLY TRACKING RADAR (INDEPENDENT MONTHLY HABITS) */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'MONTHLY' && (
        <div className="relative overflow-hidden rounded-[20px] bg-[#0C0910] border border-[#21182B] shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          
          <div className="pointer-events-none absolute top-0 left-1/3 w-96 h-40 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)] blur-3xl" />

          {monthlyHabits.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#140F1C] border border-[#2A2035] flex items-center justify-center text-[#8F879A]">
                <CheckCircle2 className="w-7 h-7 text-[#DDD6FE]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No monthly habits yet.</h3>
                <p className="text-xs text-[#8F879A]">Track big milestones like "Complete 20 workouts", "Read 2 books", or monthly project deliverables.</p>
              </div>
              <button
                onClick={() => onOpenNewHabit('MONTHLY')}
                className="mt-2 flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Monthly Habit</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
              <div className="min-w-[850px] w-full">

                {/* Header Row: HABIT + MONTHLY LOG + STATS */}
                <div className="grid grid-cols-[280px_1fr_180px] items-center border-b border-[#21182B] bg-[#08050B]/60 px-5 py-3.5">
                  <div className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
                    HABIT
                  </div>

                  <div className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono px-4 text-center">
                    MONTH PROGRESS & LOG
                  </div>

                  <div className="text-right text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono pr-2">
                    TARGET / STATS
                  </div>
                </div>

                {/* Monthly Habit Rows */}
                <div className="divide-y divide-[#21182B]/60">
                  {monthlyHabits.map((habit) => {
                    const target = habit.monthlyTarget || 20;
                    const unit = habit.monthlyUnit || 'times';
                    const curMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
                    
                    const completedInMonth = Object.keys(habit.history || {}).filter(k => {
                      return k.startsWith(curMonthPrefix) && habit.history[k];
                    }).length;

                    const isTargetAchieved = completedInMonth >= target;
                    const monthPct = Math.min(100, Math.round((completedInMonth / target) * 100));

                    return (
                      <div
                        key={habit.id}
                        className="grid grid-cols-[280px_1fr_180px] items-center px-5 py-4 hover:bg-[#100C15]/50 transition-colors group"
                      >
                        {/* Left: Habit Info */}
                        <div className="flex items-center space-x-3 min-w-0 pr-3">
                          <span 
                            className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: habit.categoryColor || '#A855F7', color: habit.categoryColor || '#A855F7' }}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold uppercase tracking-tight text-[#F5F3F7] group-hover:text-white line-clamp-1">
                              {habit.name}
                            </h4>
                            <div className="flex items-center space-x-2 text-[11px] text-[#8F879A] mt-0.5">
                              <span>{habit.category}</span>
                              <span>•</span>
                              <span className="text-[#DDD6FE] font-medium font-mono">Target: {target} {unit}</span>
                            </div>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 ml-auto">
                            <button
                              type="button"
                              onClick={() => onOpenEditHabit(habit)}
                              className="p-1 rounded text-[#8F879A] hover:text-[#DDD6FE]"
                              title="Edit Habit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHabit(habit.id, habit.name, e)}
                              className="p-1 rounded text-[#8F879A] hover:text-red-400"
                              title="Delete Habit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Center: Progress Bar + Interactive [ - ] [ + ] incrementers */}
                        <div className="px-4 flex flex-col justify-center space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] text-[#8F879A]">Month Velocity:</span>
                              <span className="text-xs font-extrabold font-mono text-[#DDD6FE]">
                                {completedInMonth} / {target} {unit}
                              </span>
                            </div>

                            {/* Quick Increment Controls */}
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleMonthlyTarget(habit, -1)}
                                disabled={completedInMonth <= 0}
                                className="w-6 h-6 rounded-md bg-[#140F1C] hover:bg-[#1C1426] border border-[#2A2035] hover:border-[#8B5CF6] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-xs font-bold text-white transition-all"
                                title="Remove 1 completion"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleMonthlyTarget(habit, 1)}
                                className="w-6 h-6 rounded-md bg-[#8B5CF6] hover:bg-[#7C3AED] flex items-center justify-center text-xs font-bold text-white transition-all shadow-[0_0_8px_rgba(139,92,246,0.5)] active:scale-95"
                                title="Add 1 completion"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="w-full h-2.5 rounded-full bg-[#140F1C] border border-[#21182B] overflow-hidden relative">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] ${
                                isTargetAchieved
                                  ? 'bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#10B981]'
                                  : 'bg-gradient-to-r from-[#8B5CF6] to-[#C084FC]'
                              }`}
                              style={{ width: `${monthPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Right: Monthly Milestone Status & Monthly Streak */}
                        <div className="flex items-center justify-end space-x-3 text-xs pr-2">
                          
                          {/* Percentage Badge */}
                          <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${
                            isTargetAchieved 
                              ? 'bg-[#181226] border-[#A855F7]/60 text-[#DDD6FE] shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                              : 'bg-[#100C16] border-[#21182B] text-[#8F879A]'
                          }`}>
                            <span className={isTargetAchieved ? 'text-white' : 'text-[#DDD6FE]'}>{monthPct}%</span>
                          </div>

                          {/* Monthly Streak Badge */}
                          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#120D1A] border border-[#2A2035] text-[#C084FC]">
                            <Flame className={`w-3.5 h-3.5 ${
                              habit.streak > 0 
                                ? 'text-[#A855F7] fill-[#A855F7]/40 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse-slow' 
                                : 'text-[#5E5668]'
                            }`} />
                            <span className="font-mono text-white text-xs font-bold">
                              {habit.streak} {habit.streak === 1 ? 'mo' : 'mos'}
                            </span>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {habitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm p-6 rounded-2xl bg-[#0B0910] border border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.3)] space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Delete Habit</h3>
                <p className="text-xs text-[#8F879A]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#DDD6FE] leading-relaxed">
              Are you sure you want to permanently delete <span className="text-white font-bold">"{habitToDelete.name}"</span> and all its recorded streaks and history?
            </p>

            <div className="pt-2 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setHabitToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#8F879A] hover:text-white hover:bg-[#140F1C] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer"
              >
                Delete Habit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

