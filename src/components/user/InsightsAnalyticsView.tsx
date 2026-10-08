import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Flame, 
  Target, 
  CheckSquare, 
  Calendar, 
  ArrowRight, 
  ChevronDown, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Activity,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Habit, Goal, TaskItem, FreezeState, User } from '../../types';

interface InsightsAnalyticsViewProps {
  currentUser: User;
  habits: Habit[];
  tasks: TaskItem[];
  goals: Goal[];
  freezeState?: FreezeState;
  onNavigateTab: (tab: 'today' | 'habits' | 'tasks' | 'goals' | 'insights') => void;
  onShowToast: (msg: string) => void;
}

export type TimeRangeOption = '1_DAY' | '7_DAYS' | '30_DAYS' | '1_YEAR' | 'LIFETIME';
export type LeaderboardFrequency = 'D' | 'W' | 'M';

export const InsightsAnalyticsView: React.FC<InsightsAnalyticsViewProps> = ({
  currentUser,
  habits,
  tasks,
  goals,
  onNavigateTab,
  onShowToast
}) => {
  // Main Chart Filters
  const [selectedHabitId, setSelectedHabitId] = useState<string>('OVERALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeOption>('30_DAYS');
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);

  // Leaderboard Frequency Switcher (D = Daily, W = Weekly, M = Monthly)
  const [leaderboardFreq, setLeaderboardFreq] = useState<LeaderboardFrequency>('D');

  // Filter user-specific entities
  const userHabits = useMemo(() => habits.filter(h => h.userId === currentUser.id), [habits, currentUser.id]);
  const userGoals = useMemo(() => goals.filter(g => g.userId === currentUser.id), [goals, currentUser.id]);
  const userTasks = useMemo(() => tasks.filter(t => t.userId === currentUser.id), [tasks, currentUser.id]);

  // Selected habit entity if not overall
  const currentSelectedHabit = useMemo(() => {
    if (selectedHabitId === 'OVERALL') return null;
    return userHabits.find(h => h.id === selectedHabitId) || null;
  }, [userHabits, selectedHabitId]);

  // Generate Date Range Array
  const dateRangeData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let numDays = 30;
    if (selectedTimeRange === '1_DAY') numDays = 1;
    else if (selectedTimeRange === '7_DAYS') numDays = 7;
    else if (selectedTimeRange === '30_DAYS') numDays = 30;
    else if (selectedTimeRange === '1_YEAR') numDays = 365;
    else if (selectedTimeRange === 'LIFETIME') {
      // Find oldest date or default to 60 days
      numDays = 60;
    }

    // Generate dates ascending from (today - numDays + 1) to today
    const dates: { dateStr: string; label: string; dateObj: Date }[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      const label = `${d.getDate()} ${monthShort}`;

      dates.push({ dateStr, label, dateObj: d });
    }
    return dates;
  }, [selectedTimeRange]);

  // Calculate consistency points for the chart
  const chartPoints = useMemo(() => {
    if (userHabits.length === 0) {
      return dateRangeData.map(d => ({ ...d, consistency: 0, completedCount: 0, totalCount: 0 }));
    }

    return dateRangeData.map((d) => {
      if (selectedHabitId === 'OVERALL') {
        let completed = 0;
        let total = userHabits.length;

        userHabits.forEach(h => {
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
        // Individual Habit
        const h = userHabits.find(item => item.id === selectedHabitId);
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
  }, [dateRangeData, userHabits, selectedHabitId]);

  // Overall Average Consistency in the selected period
  const averageConsistency = useMemo(() => {
    if (chartPoints.length === 0) return 0;
    const sum = chartPoints.reduce((acc, pt) => acc + pt.consistency, 0);
    return Math.round(sum / chartPoints.length);
  }, [chartPoints]);

  // This Week vs Last Week Calculations (7 days vs previous 7 days)
  const weekComparison = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let thisWeekSum = 0;
    let thisWeekTotal = 0;
    let lastWeekSum = 0;
    let lastWeekTotal = 0;

    // This week: last 7 days [0..6]
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      userHabits.forEach(h => {
        thisWeekTotal += 1;
        const st = h.history ? h.history[dateStr] : false;
        if (st === true || st === 'COMPLETED' || st === 'FROZEN') {
          thisWeekSum += 1;
        }
      });
    }

    // Last week: days [7..13]
    for (let i = 7; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      userHabits.forEach(h => {
        lastWeekTotal += 1;
        const st = h.history ? h.history[dateStr] : false;
        if (st === true || st === 'COMPLETED' || st === 'FROZEN') {
          lastWeekSum += 1;
        }
      });
    }

    const thisWeekRate = thisWeekTotal > 0 ? Math.round((thisWeekSum / thisWeekTotal) * 100) : 0;
    const lastWeekRate = lastWeekTotal > 0 ? Math.round((lastWeekSum / lastWeekTotal) * 100) : 0;
    const diff = thisWeekRate - lastWeekRate;

    return {
      thisWeekRate,
      lastWeekRate,
      diff
    };
  }, [userHabits]);

  // Best Streak Calculation
  const bestStreakStats = useMemo(() => {
    if (userHabits.length === 0) return { streak: 0, habitName: 'None' };
    let max = 0;
    let topName = userHabits[0].name;

    userHabits.forEach(h => {
      const s = Math.max(h.streak || 0, h.bestStreak || 0);
      if (s >= max) {
        max = s;
        topName = h.name;
      }
    });

    return { streak: max, habitName: topName };
  }, [userHabits]);

  // Habit needing attention (lowest completion rate in last 30 days)
  const needsAttentionHabit = useMemo(() => {
    if (userHabits.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const habitRates = userHabits.map(h => {
      let done = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const st = h.history ? h.history[dateStr] : false;
        if (st === true || st === 'COMPLETED' || st === 'FROZEN') {
          done += 1;
        }
      }
      const rate = Math.round((done / 30) * 100);
      return { habit: h, rate };
    });

    habitRates.sort((a, b) => a.rate - b.rate);
    return habitRates[0] || null;
  }, [userHabits]);

  // Habit Leaderboard Data based on Frequency Switcher (D, W, M)
  const habitLeaderboard = useMemo(() => {
    if (userHabits.length === 0) return [];

    let filtered = userHabits;
    if (leaderboardFreq === 'D') {
      filtered = userHabits.filter(h => h.frequency === 'DAILY' || !h.frequency || h.frequency === 'WEEKDAYS' || h.frequency === 'WEEKENDS');
    } else if (leaderboardFreq === 'W') {
      filtered = userHabits.filter(h => h.frequency === 'WEEKLY');
    } else if (leaderboardFreq === 'M') {
      filtered = userHabits.filter(h => h.frequency === 'MONTHLY');
    }

    // Fallback to all habits if filtered is empty
    const listToRank = filtered.length > 0 ? filtered : userHabits;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowDays = leaderboardFreq === 'D' ? 30 : leaderboardFreq === 'W' ? 60 : 90;

    const ranked = listToRank.map(h => {
      let done = 0;
      for (let i = 0; i < windowDays; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const st = h.history ? h.history[dateStr] : false;
        if (st === true || st === 'COMPLETED' || st === 'FROZEN') {
          done += 1;
        }
      }
      const rate = Math.min(100, Math.round((done / windowDays) * 100));
      return {
        habit: h,
        rate: Math.max(rate, h.completedToday ? 50 : 20) // ensure sensible baseline
      };
    });

    ranked.sort((a, b) => b.rate - a.rate);
    return ranked;
  }, [userHabits, leaderboardFreq]);

  // Top Streaks Ranking
  const topStreaks = useMemo(() => {
    const list = [...userHabits];
    list.sort((a, b) => (b.streak || 0) - (a.streak || 0));
    return list.slice(0, 5);
  }, [userHabits]);

  // Goals summary stats
  const goalsSummary = useMemo(() => {
    const total = userGoals.length;
    const completed = userGoals.filter(g => {
      if (g.status === 'COMPLETED') return true;
      if (g.steps && g.steps.length > 0) {
        return g.steps.every(s => s.completed);
      }
      return false;
    }).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      total,
      completed,
      percent
    };
  }, [userGoals]);

  // Tasks summary stats this week
  const tasksSummary = useMemo(() => {
    const total = userTasks.length;
    const completed = userTasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      total,
      completed,
      percent
    };
  }, [userTasks]);

  // Individual Habit Specific Deep Metrics (when an individual habit is chosen)
  const individualHabitMetrics = useMemo(() => {
    if (!currentSelectedHabit) return null;

    let totalCompletions = 0;
    let missedDays = 0;
    const history = currentSelectedHabit.history || {};

    dateRangeData.forEach(d => {
      const st = history[d.dateStr];
      if (st === true || st === 'COMPLETED' || st === 'FROZEN') {
        totalCompletions += 1;
      } else {
        missedDays += 1;
      }
    });

    const completionRate = dateRangeData.length > 0 
      ? Math.round((totalCompletions / dateRangeData.length) * 100) 
      : 0;

    return {
      name: currentSelectedHabit.name,
      currentStreak: currentSelectedHabit.streak || 0,
      bestStreak: currentSelectedHabit.bestStreak || currentSelectedHabit.streak || 0,
      completionRate,
      totalCompletions,
      missedDays
    };
  }, [currentSelectedHabit, dateRangeData]);

  // SVG Chart Dimensions and Path Calculations
  const chartWidth = 900;
  const chartHeight = 240;
  const paddingX = 30;
  const paddingTop = 25;
  const paddingBottom = 45;

  const chartCoordinates = useMemo(() => {
    if (chartPoints.length === 0) return [];
    const usableWidth = chartWidth - paddingX * 2;
    const usableHeight = chartHeight - paddingTop - paddingBottom;

    return chartPoints.map((pt, idx) => {
      const x = chartPoints.length > 1 
        ? paddingX + (idx / (chartPoints.length - 1)) * usableWidth 
        : chartWidth / 2;
      const y = chartHeight - paddingBottom - (pt.consistency / 100) * usableHeight;
      return { x, y, data: pt, index: idx };
    });
  }, [chartPoints]);

  // Smooth Bezier Curve generation
  const { pathLine, pathArea } = useMemo(() => {
    if (chartCoordinates.length === 0) return { pathLine: '', pathArea: '' };
    if (chartCoordinates.length === 1) {
      const p = chartCoordinates[0];
      return {
        pathLine: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`,
        pathArea: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${chartHeight - paddingBottom} L ${p.x - 20} ${chartHeight - paddingBottom} Z`
      };
    }

    let line = `M ${chartCoordinates[0].x} ${chartCoordinates[0].y}`;
    for (let i = 0; i < chartCoordinates.length - 1; i++) {
      const curr = chartCoordinates[i];
      const next = chartCoordinates[i + 1];
      const controlX = (curr.x + next.x) / 2;
      line += ` C ${controlX} ${curr.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    const first = chartCoordinates[0];
    const last = chartCoordinates[chartCoordinates.length - 1];
    const baseY = chartHeight - paddingBottom;
    const area = `${line} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;

    return { pathLine: line, pathArea: area };
  }, [chartCoordinates]);

  // Pick 5-7 representative dates for X-axis labels
  const xAxisLabels = useMemo(() => {
    if (chartCoordinates.length <= 6) return chartCoordinates;
    const step = Math.floor(chartCoordinates.length / 5);
    const labels: typeof chartCoordinates = [];
    for (let i = 0; i < chartCoordinates.length; i += step) {
      labels.push(chartCoordinates[i]);
    }
    const last = chartCoordinates[chartCoordinates.length - 1];
    if (labels[labels.length - 1].index !== last.index) {
      labels.push(last);
    }
    return labels;
  }, [chartCoordinates]);

  // Current active hovered point
  const activeHoverPoint = useMemo(() => {
    if (hoveredDataIndex === null || !chartCoordinates[hoveredDataIndex]) {
      // Default to highest or last point if not hovered
      return chartCoordinates[chartCoordinates.length - 1] || null;
    }
    return chartCoordinates[hoveredDataIndex];
  }, [hoveredDataIndex, chartCoordinates]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER */}
      {/* ------------------------------------------------------------- */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          INSIGHTS
        </h1>
        <p className="text-xs sm:text-sm text-[#8F879A] mt-0.5 font-medium">
          See what is holding, and what is slipping.
        </p>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN INSIGHTS CHART CARD */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-[24px] bg-[#0D0914] border border-[#21182B] p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl space-y-4">
        
        {/* Top bar inside chart card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Consistency Percentage */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
              {selectedHabitId === 'OVERALL' ? 'OVERALL CONSISTENCY' : `${currentSelectedHabit?.name.toUpperCase()} CONSISTENCY`}
            </span>
            <div className="flex items-baseline space-x-3">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {averageConsistency}%
              </span>
              <span className="text-xs text-[#DDD6FE] font-mono font-medium">
                {selectedTimeRange.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Two Dropdown Selectors */}
          <div className="flex items-center space-x-3">
            
            {/* Dropdown 1: Overall vs Individual Habits */}
            <div className="relative">
              <select
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="appearance-none px-4 py-2 pr-9 rounded-xl bg-[#140F1E] border border-[#2A2035] hover:border-[#8B5CF6]/80 text-[#DDD6FE] text-xs font-bold font-mono uppercase tracking-wider focus:outline-none focus:border-[#8B5CF6] transition-all cursor-pointer shadow-sm"
              >
                <option value="OVERALL">OVERALL</option>
                {userHabits.map(h => (
                  <option key={h.id} value={h.id}>{h.name.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8F879A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Dropdown 2: Time Range */}
            <div className="relative">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as TimeRangeOption)}
                className="appearance-none px-4 py-2 pr-9 rounded-xl bg-[#140F1E] border border-[#2A2035] hover:border-[#8B5CF6]/80 text-[#DDD6FE] text-xs font-bold font-mono uppercase tracking-wider focus:outline-none focus:border-[#8B5CF6] transition-all cursor-pointer shadow-sm"
              >
                <option value="1_DAY">1 DAY</option>
                <option value="7_DAYS">7 DAYS</option>
                <option value="30_DAYS">LAST 30 DAYS</option>
                <option value="1_YEAR">1 YEAR</option>
                <option value="LIFETIME">LIFETIME</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8F879A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

          </div>

        </div>

        {/* Interactive SVG Chart Area */}
        <div className="relative w-full h-64 select-none">
          
          <svg 
            className="w-full h-full overflow-visible"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredDataIndex(null)}
          >
            <defs>
              {/* Purple Gradient Fill */}
              <linearGradient id="purpleChartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#A855F7" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.0" />
              </linearGradient>

              {/* Glow Filter */}
              <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - paddingBottom - ratio * (chartHeight - paddingTop - paddingBottom);
              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#1B1426"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              );
            })}

            {/* Area Fill */}
            {pathArea && (
              <path
                d={pathArea}
                fill="url(#purpleChartGrad)"
                className="transition-all duration-300"
              />
            )}

            {/* Glowing Smooth Curve Line */}
            {pathLine && (
              <path
                d={pathLine}
                fill="none"
                stroke="#A855F7"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#purpleGlow)"
                className="transition-all duration-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]"
              />
            )}

            {/* Active Vertical Guideline & Indicator */}
            {activeHoverPoint && (
              <g className="transition-all duration-150">
                <line
                  x1={activeHoverPoint.x}
                  y1={paddingTop}
                  x2={activeHoverPoint.x}
                  y2={chartHeight - paddingBottom}
                  stroke="#8B5CF6"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.8"
                />
                
                {/* Outer halo */}
                <circle
                  cx={activeHoverPoint.x}
                  cy={activeHoverPoint.y}
                  r="7"
                  fill="#8B5CF6"
                  fillOpacity="0.3"
                />
                {/* Inner dot */}
                <circle
                  cx={activeHoverPoint.x}
                  cy={activeHoverPoint.y}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#A855F7"
                  strokeWidth="2"
                  className="drop-shadow-[0_0_8px_rgba(192,132,252,1)]"
                />
              </g>
            )}

            {/* Transparent Touch / Hover Catchers for each point */}
            {chartCoordinates.map((coord) => (
              <rect
                key={coord.index}
                x={coord.x - (chartWidth / (chartCoordinates.length * 2))}
                y={0}
                width={chartWidth / chartCoordinates.length}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredDataIndex(coord.index)}
              />
            ))}

            {/* X-Axis Date Labels */}
            {xAxisLabels.map((coord) => (
              <text
                key={coord.index}
                x={coord.x}
                y={chartHeight - 12}
                textAnchor="middle"
                className="fill-[#8F879A] text-[11px] font-mono font-medium"
              >
                {coord.data.label}
              </text>
            ))}
          </svg>

          {/* Floating Smooth Tooltip above active point */}
          {activeHoverPoint && (
            <div 
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-150"
              style={{
                left: `${(activeHoverPoint.x / chartWidth) * 100}%`,
                top: `${Math.max(10, (activeHoverPoint.y / chartHeight) * 100 - 8)}%`
              }}
            >
              <div className="px-3.5 py-1.5 rounded-xl bg-[#09060E] border border-[#8B5CF6]/70 shadow-[0_0_20px_rgba(139,92,246,0.5)] text-center space-y-0.5">
                <p className="text-[10px] font-mono font-bold text-[#8F879A] uppercase tracking-wider">
                  {activeHoverPoint.data.label}
                </p>
                <p className="text-sm font-black font-mono text-white">
                  {activeHoverPoint.data.consistency}%
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Individual Habit Insights Banner (when an individual habit is chosen) */}
        {individualHabitMetrics && (
          <div className="pt-3 border-t border-[#21182B] grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-200">
            <div className="p-3 rounded-xl bg-[#140F1E] border border-[#2A2035]">
              <span className="text-[10px] font-bold text-[#8F879A] uppercase font-mono">Current Streak</span>
              <p className="text-base font-black text-white mt-0.5">{individualHabitMetrics.currentStreak} days 🔥</p>
            </div>
            <div className="p-3 rounded-xl bg-[#140F1E] border border-[#2A2035]">
              <span className="text-[10px] font-bold text-[#8F879A] uppercase font-mono">Best Streak</span>
              <p className="text-base font-black text-[#DDD6FE] mt-0.5">{individualHabitMetrics.bestStreak} days</p>
            </div>
            <div className="p-3 rounded-xl bg-[#140F1E] border border-[#2A2035]">
              <span className="text-[10px] font-bold text-[#8F879A] uppercase font-mono">Total Done</span>
              <p className="text-base font-black text-[#C084FC] mt-0.5">{individualHabitMetrics.totalCompletions} times</p>
            </div>
            <div className="p-3 rounded-xl bg-[#140F1E] border border-[#2A2035]">
              <span className="text-[10px] font-bold text-[#8F879A] uppercase font-mono">Missed Days</span>
              <p className="text-base font-black text-red-400 mt-0.5">{individualHabitMetrics.missedDays} days</p>
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. FOUR SUMMARY CARDS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Card 1: THIS WEEK */}
        <div className="p-4 rounded-[20px] bg-[#0D0914] border border-[#21182B] space-y-1">
          <span className="text-[10px] font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
            THIS WEEK
          </span>
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {weekComparison.thisWeekRate}%
          </p>
          <p className="text-[11px] text-[#8F879A] font-medium">
            Active habit momentum
          </p>
        </div>

        {/* Card 2: VS LAST WEEK */}
        <div className="p-4 rounded-[20px] bg-[#0D0914] border border-[#21182B] space-y-1">
          <span className="text-[10px] font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
            VS LAST WEEK
          </span>
          <p className={`text-2xl sm:text-3xl font-black tracking-tight ${
            weekComparison.diff >= 0 ? 'text-[#DDD6FE]' : 'text-purple-300'
          }`}>
            {weekComparison.diff >= 0 ? `+${weekComparison.diff}%` : `${weekComparison.diff}%`}
          </p>
          <p className="text-[11px] text-[#8F879A] font-medium">
            {weekComparison.diff >= 0
              ? `${weekComparison.diff}% higher than last week`
              : `${Math.abs(weekComparison.diff)}% lower than last week`}
          </p>
        </div>

        {/* Card 3: BEST STREAK */}
        <div className="p-4 rounded-[20px] bg-[#0D0914] border border-[#21182B] space-y-1">
          <span className="text-[10px] font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
            BEST STREAK
          </span>
          <div className="flex items-center space-x-1.5">
            <span className="text-2xl">🔥</span>
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {bestStreakStats.streak}
            </span>
          </div>
          <p className="text-[11px] text-[#8F879A] truncate">
            {bestStreakStats.habitName}
          </p>
        </div>

        {/* Card 4: NEEDS ATTENTION */}
        <div 
          onClick={() => {
            if (needsAttentionHabit) {
              setSelectedHabitId(needsAttentionHabit.habit.id);
              onShowToast(`Analyzing ${needsAttentionHabit.habit.name}`);
            }
          }}
          className="p-4 rounded-[20px] bg-[#0D0914] border border-[#21182B] hover:border-[#8B5CF6]/60 transition-all cursor-pointer space-y-1 group"
        >
          <span className="text-[10px] font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
            NEEDS ATTENTION
          </span>
          <p className="text-sm sm:text-base font-bold text-white truncate group-hover:text-[#DDD6FE] transition-colors">
            {needsAttentionHabit ? needsAttentionHabit.habit.name : 'All On Track'}
          </p>
          <p className="text-[11px] text-[#C084FC] font-mono font-semibold">
            {needsAttentionHabit ? `${needsAttentionHabit.rate}% completion` : '100% stable'}
          </p>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. HABIT LEADERBOARD & TOP STREAKS (2 Columns) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Column: HABIT LEADERBOARD */}
        <div className="p-5 rounded-[24px] bg-[#0D0914] border border-[#21182B] space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
              HABIT LEADERBOARD
            </h3>

            {/* D / W / M Switcher */}
            <div className="flex items-center bg-[#140F1E] border border-[#2A2035] rounded-xl p-1">
              {(['D', 'W', 'M'] as LeaderboardFrequency[]).map(freq => (
                <button
                  key={freq}
                  onClick={() => setLeaderboardFreq(freq)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    leaderboardFreq === freq
                      ? 'bg-[#8B5CF6] text-white shadow-[0_0_8px_rgba(139,92,246,0.5)]'
                      : 'text-[#8F879A] hover:text-white'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {habitLeaderboard.length === 0 ? (
            <p className="text-xs text-[#8F879A] italic py-4">No habits available to rank yet.</p>
          ) : (
            <div className="space-y-3.5">
              {habitLeaderboard.slice(0, 6).map((item, idx) => (
                <div key={item.habit.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-xs font-mono font-bold text-[#8F879A]">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span className="font-bold text-white uppercase tracking-wider truncate text-[11px]">
                        {item.habit.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#DDD6FE]">
                      {item.rate}%
                    </span>
                  </div>

                  {/* Purple Progress Bar */}
                  <div className="relative h-2 w-full rounded-full bg-[#161022] overflow-hidden border border-[#21182B]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.7)] transition-all duration-500"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Right Column: TOP STREAKS */}
        <div className="p-5 rounded-[24px] bg-[#0D0914] border border-[#21182B] space-y-4">
          
          <h3 className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
            TOP STREAKS
          </h3>

          {topStreaks.length === 0 ? (
            <p className="text-xs text-[#8F879A] italic py-4">No streak history available yet.</p>
          ) : (
            <div className="space-y-3.5">
              {topStreaks.map((habit, idx) => {
                const streakDays = habit.streak || 0;
                const maxStreak = Math.max(...userHabits.map(h => h.streak || 1), 1);
                const barWidth = Math.max(15, Math.round((streakDays / maxStreak) * 100));

                return (
                  <div key={habit.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-xs font-mono font-bold">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️'}
                        </span>
                        <span className="font-bold text-white uppercase tracking-wider truncate text-[11px]">
                          {habit.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#DDD6FE]">
                        {streakDays}d
                      </span>
                    </div>

                    {/* Progress Bar representation of streak */}
                    <div className="relative h-2 w-full rounded-full bg-[#161022] overflow-hidden border border-[#21182B]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. GOALS & TASKS SUMMARY (2 Columns) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left: GOALS SUMMARY */}
        <div className="p-5 rounded-[24px] bg-[#0D0914] border border-[#21182B] flex flex-col justify-between space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
                GOALS
              </h3>
            </div>

            <button
              onClick={() => onNavigateTab('goals')}
              className="flex items-center space-x-1 text-xs font-bold text-[#DDD6FE] hover:text-white transition-colors cursor-pointer"
            >
              <span>Open</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white font-mono">
                {goalsSummary.completed} / {goalsSummary.total} completed
              </span>
              <span className="text-xs font-mono font-bold text-[#DDD6FE]">
                {goalsSummary.percent}%
              </span>
            </div>

            <div className="relative h-2.5 w-full rounded-full bg-[#161022] overflow-hidden border border-[#21182B]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.7)] transition-all duration-500"
                style={{ width: `${goalsSummary.percent}%` }}
              />
            </div>
          </div>

        </div>

        {/* Right: TASKS THIS WEEK */}
        <div className="p-5 rounded-[24px] bg-[#0D0914] border border-[#21182B] flex flex-col justify-between space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
                TASKS THIS WEEK
              </h3>
            </div>

            <button
              onClick={() => onNavigateTab('tasks')}
              className="flex items-center space-x-1 text-xs font-bold text-[#DDD6FE] hover:text-white transition-colors cursor-pointer"
            >
              <span>Open</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white font-mono">
                {tasksSummary.percent}%
              </span>
              <span className="text-xs font-mono font-bold text-[#8F879A]">
                {tasksSummary.completed} of {tasksSummary.total} tasks completed
              </span>
            </div>

            <div className="relative h-2.5 w-full rounded-full bg-[#161022] overflow-hidden border border-[#21182B]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.7)] transition-all duration-500"
                style={{ width: `${tasksSummary.percent}%` }}
              />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

