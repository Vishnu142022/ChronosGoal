import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Zap, 
  Target, 
  Flame, 
  Copy, 
  Trash2, 
  X, 
  Smile, 
  Sparkles,
  Layers,
  Clock,
  Activity
} from 'lucide-react';
import { TaskItem, MindsetEntry, Goal, User } from '../../types';
import { storageService } from '../../services/storageService';
import { tasksService } from '../../services/tasksService';

interface TasksPlannerViewProps {
  currentUser: User;
  tasks: TaskItem[];
  goals: Goal[];
  onShowToast: (msg: string) => void;
  onDataChanged: () => Promise<void>;
}

// Helper to format date as YYYY-MM-DD
const formatDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper to format date as DD/MM/YYYY
const formatDisplayDate = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

// Helper to get Sunday of the week for any given date
const getSundayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Month short names
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TasksPlannerView: React.FC<TasksPlannerViewProps> = ({
  currentUser,
  tasks,
  goals,
  onShowToast,
  onDataChanged
}) => {
  // Current reference week (anchored by its Sunday)
  const [currentSunday, setCurrentSunday] = useState<Date>(() => getSundayOfWeek(new Date()));
  
  // Mindset data storage state
  const [mindsetData, setMindsetData] = useState<Record<string, MindsetEntry>>(() => storageService.getMindsetData());

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedDayForTask, setSelectedDayForTask] = useState<string>('');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    category: 'General',
    goalId: ''
  });

  const [isMindsetModalOpen, setIsMindsetModalOpen] = useState(false);
  const [selectedDayForMindset, setSelectedDayForMindset] = useState<string>('');
  const [mindsetForm, setMindsetForm] = useState<MindsetEntry>({
    energy: 8,
    focus: 8,
    motivation: 8
  });

  // Today string for real-time highlighting
  const todayStr = useMemo(() => formatDateStr(new Date()), []);

  // Listen to storage changes
  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      setMindsetData(storageService.getMindsetData());
    });
    return () => unsub();
  }, []);

  // 7 days array for the current week starting from Sunday
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentSunday);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateStr(d);
      return {
        date: d,
        dateStr,
        dayName: DAY_NAMES[i],
        shortName: DAY_SHORT_NAMES[i],
        dayNum: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        isToday: dateStr === todayStr
      };
    });
  }, [currentSunday, todayStr]);

  // Week Starting label (e.g. "06 Sept – 12 Sept 2026")
  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    const startD = String(start.getDate()).padStart(2, '0');
    const endD = String(end.getDate()).padStart(2, '0');
    const startM = MONTH_NAMES[start.getMonth()];
    const endM = MONTH_NAMES[end.getMonth()];
    const y = end.getFullYear();

    if (startM === endM) {
      return `${startD} ${startM} – ${endD} ${endM} ${y}`;
    }
    return `${startD} ${startM} – ${endD} ${endM} ${y}`;
  }, [weekDays]);

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentSunday(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentSunday(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleThisWeek = () => {
    setCurrentSunday(getSundayOfWeek(new Date()));
  };

  // Organize tasks by day
  const tasksByDay = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    weekDays.forEach(wd => {
      map[wd.dateStr] = [];
    });

    tasks.forEach(task => {
      if (task.dueDate && map[task.dueDate]) {
        map[task.dueDate].push(task);
      }
    });

    return map;
  }, [tasks, weekDays]);

  // Weekly stats calculation
  const weeklyStats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;

    const dailyCounts = weekDays.map(wd => {
      const dayTasks = tasksByDay[wd.dateStr] || [];
      const done = dayTasks.filter(t => t.completed).length;
      const total = dayTasks.length;
      totalTasks += total;
      completedTasks += done;
      return {
        dateStr: wd.dateStr,
        shortName: wd.shortName,
        completed: done,
        total,
        rate: total > 0 ? done / total : 0
      };
    });

    const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const maxDayCompleted = Math.max(1, ...dailyCounts.map(d => d.completed));

    return {
      totalTasks,
      completedTasks,
      percent,
      dailyCounts,
      maxDayCompleted
    };
  }, [weekDays, tasksByDay]);

  // Toggle task
  const handleToggleTask = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await tasksService.toggleTask(taskId);
      await onDataChanged();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      onShowToast('Unable to update task. Please try again.');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await tasksService.deleteTask(taskId);
      await onDataChanged();
      onShowToast('Task removed');
    } catch (error) {
      console.error('Failed to delete task:', error);
      onShowToast('Unable to remove task. Please try again.');
    }
  };

  // Open modal to add task for a specific day
  const handleOpenAddTask = (dateStr: string) => {
    setSelectedDayForTask(dateStr);
    setTaskForm({
      title: '',
      description: '',
      priority: 'MEDIUM',
      category: 'General',
      goalId: goals.length > 0 ? goals[0].id : ''
    });
    setIsTaskModalOpen(true);
  };

  // Save new task
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      await tasksService.createTask({
        userId: currentUser.id,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        priority: taskForm.priority,
        category: taskForm.category,
        dueDate: selectedDayForTask || todayStr
      });
      await onDataChanged();
      onShowToast(`Task added for ${selectedDayForTask}`);
      setIsTaskModalOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
      onShowToast('Unable to create task. Please try again.');
    }
  };

  // Copy yesterday's tasks to today
  const handleCopyPreviousDay = async (targetDayIndex: number) => {
    if (targetDayIndex <= 0) {
      // If Sunday, look up Saturday of previous week
      const prevDate = new Date(weekDays[0].date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = formatDateStr(prevDate);
      const prevTasks = tasks.filter(t => t.dueDate === prevDateStr);
      
      if (prevTasks.length === 0) {
        onShowToast('No tasks found on previous day to copy.');
        return;
      }

      const clones = prevTasks.map(t => ({
        userId: currentUser.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        category: t.category,
        dueDate: weekDays[0].dateStr
      }));

      try {
        await Promise.all(clones.map(task => tasksService.createTask(task)));
        await onDataChanged();
        onShowToast(`Copied ${clones.length} tasks from previous day!`);
      } catch (error) {
        console.error('Failed to copy tasks:', error);
        onShowToast('Unable to copy tasks. Please try again.');
      }
      return;
    }

    const prevDateStr = weekDays[targetDayIndex - 1].dateStr;
    const targetDateStr = weekDays[targetDayIndex].dateStr;
    const prevTasks = tasksByDay[prevDateStr] || [];

    if (prevTasks.length === 0) {
      onShowToast('No tasks found on previous day to copy.');
      return;
    }

    const clones = prevTasks.map(t => ({
      userId: currentUser.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      category: t.category,
      dueDate: targetDateStr
    }));

    try {
      await Promise.all(clones.map(task => tasksService.createTask(task)));
      await onDataChanged();
      onShowToast(`Copied ${clones.length} tasks to ${weekDays[targetDayIndex].dayName}!`);
    } catch (error) {
      console.error('Failed to copy tasks:', error);
      onShowToast('Unable to copy tasks. Please try again.');
    }
  };

  // Open Mindset Modal
  const handleOpenMindset = (dateStr: string) => {
    setSelectedDayForMindset(dateStr);
    const existing = mindsetData[dateStr] || { energy: 8, focus: 8, motivation: 8 };
    setMindsetForm(existing);
    setIsMindsetModalOpen(true);
  };

  // Save Mindset
  const handleSaveMindset = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveMindsetEntry(selectedDayForMindset, mindsetForm);
    onShowToast('Mindset logged successfully!');
    setIsMindsetModalOpen(false);
  };

  // Mindset Chart Points Calculation
  const mindsetChartData = useMemo(() => {
    const width = 500;
    const height = 160;
    const paddingX = 35;
    const paddingY = 25;
    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;

    const points = weekDays.map((wd, i) => {
      const entry = mindsetData[wd.dateStr] || { energy: 7, focus: 7, motivation: 7 };
      const x = paddingX + (i / 6) * innerW;
      
      // Values 1 to 10 mapped to height
      const clampVal = (v: number) => Math.max(1, Math.min(10, v));
      const yEnergy = height - paddingY - ((clampVal(entry.energy) - 1) / 9) * innerH;
      const yFocus = height - paddingY - ((clampVal(entry.focus) - 1) / 9) * innerH;
      const yMotiv = height - paddingY - ((clampVal(entry.motivation) - 1) / 9) * innerH;

      return {
        x,
        shortName: wd.shortName,
        dateStr: wd.dateStr,
        energy: entry.energy,
        focus: entry.focus,
        motivation: entry.motivation,
        yEnergy,
        yFocus,
        yMotiv
      };
    });

    // Generate smooth SVG paths
    const makePath = (key: 'yEnergy' | 'yFocus' | 'yMotiv') => {
      return points.reduce((acc, curr, i, arr) => {
        if (i === 0) return `M ${curr.x},${curr[key]}`;
        const prev = arr[i - 1];
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prev[key];
        const cp2x = prev.x + (curr.x - prev.x) / 2;
        const cp2y = curr[key];
        return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr[key]}`;
      }, '');
    };

    return {
      width,
      height,
      points,
      pathEnergy: makePath('yEnergy'),
      pathFocus: makePath('yFocus'),
      pathMotivation: makePath('yMotiv')
    };
  }, [weekDays, mindsetData]);

  return (
    <div className="space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP DASHBOARD SECTION: WEEKLY OVERVIEW & MINDSET TRACKER */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ========================================================= */}
        {/* LEFT PANEL: WEEKLY TASK OVERVIEW & PROGRESS */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 relative overflow-hidden rounded-[24px] bg-[#0D0914] border border-[#21182B] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl flex flex-col justify-between">
          <div className="pointer-events-none absolute -top-12 -left-12 w-64 h-64 bg-[#8B5CF6]/10 rounded-full blur-3xl" />

          {/* Top Bar: Week Starting Tag & Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-[#21182B]/60">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
                WEEK STARTING
              </span>
              <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#181226] border border-[#A855F7]/40 text-[#DDD6FE] text-xs font-bold font-mono shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                {weekRangeLabel}
              </div>
            </div>

            {/* Navigation: < This week > */}
            <div className="flex items-center space-x-1.5 p-1 rounded-full bg-[#120D1A] border border-[#2A2035]">
              <button
                onClick={handlePrevWeek}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8F879A] hover:text-white hover:bg-[#1D152A] transition-colors cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleThisWeek}
                className="px-3 py-1 rounded-full text-xs font-bold text-[#DDD6FE] hover:text-white hover:bg-[#8B5CF6]/20 transition-all cursor-pointer"
              >
                This week
              </button>
              <button
                onClick={handleNextWeek}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8F879A] hover:text-white hover:bg-[#1D152A] transition-colors cursor-pointer"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section Title */}
          <div className="pt-4 pb-2">
            <h3 className="text-xs font-extrabold tracking-wider text-[#DDD6FE] uppercase font-mono">
              OVERALL PROGRESS
            </h3>
          </div>

          {/* Inner Content: Bar Chart + Large Circular Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-2">
            
            {/* Left 7 Columns Bar Chart (SUN .. SAT) - Perfect 7-column equal distribution */}
            <div className="sm:col-span-7 grid grid-cols-7 gap-1.5 sm:gap-2.5 items-end h-32 px-3 pt-4 pb-2 rounded-2xl bg-[#09060E]/80 border border-[#1A1325]">
              {weeklyStats.dailyCounts.map((stat) => {
                const maxVal = Math.max(4, weeklyStats.maxDayCompleted);
                const heightPct = Math.min(100, Math.round((stat.completed / maxVal) * 100));
                const isSelectedToday = stat.dateStr === todayStr;

                return (
                  <div key={stat.dateStr} className="flex flex-col items-center justify-end h-full space-y-2 group w-full">
                    
                    {/* Bar track and fill - centered and perfectly sized */}
                    <div className="relative w-full max-w-[26px] h-20 rounded-full bg-[#161022] overflow-hidden flex items-end p-0.5 border border-[#21182B] mx-auto">
                      <div
                        className={`w-full rounded-full transition-all duration-500 ${
                          stat.completed > 0
                            ? 'bg-gradient-to-t from-[#8B5CF6] via-[#A855F7] to-[#C084FC] shadow-[0_0_12px_rgba(168,85,247,0.8)]'
                            : 'bg-transparent'
                        }`}
                        style={{ height: `${stat.completed > 0 ? Math.max(12, heightPct) : 0}%` }}
                      />
                      
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#1C142B] border border-[#8B5CF6]/50 text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap shadow-lg">
                        {stat.completed} {stat.completed === 1 ? 'task' : 'tasks'}
                      </div>
                    </div>

                    {/* Day label */}
                    <span className={`text-[10px] sm:text-[11px] font-mono font-bold tracking-tight text-center ${
                      isSelectedToday ? 'text-[#C084FC] font-extrabold' : 'text-[#8F879A]'
                    }`}>
                      {stat.shortName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right Large Circular Progress */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center space-y-2 p-2">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#1C142B"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  {/* Progress Glow & Stroke */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#purpleGrad)"
                    strokeWidth="9"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * weeklyStats.percent) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]"
                  />
                  <defs>
                    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#C084FC" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Percentage Center */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-white tracking-tight font-mono">
                    {weeklyStats.percent}%
                  </span>
                </div>
              </div>

              {/* Subtitle */}
              <span className="text-xs font-mono text-[#DDD6FE] font-bold">
                {weeklyStats.completedTasks} / {weeklyStats.totalTasks} completed
              </span>
            </div>

          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: MINDSET TRACKER */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 relative overflow-hidden rounded-[24px] bg-[#0D0914] border border-[#21182B] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl flex flex-col justify-between">
          <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 bg-[#A855F7]/10 rounded-full blur-3xl" />

          {/* Top Title & Metric Legend */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#21182B]/60">
            <h3 className="text-xs font-extrabold tracking-wider text-white uppercase font-mono">
              MINDSET TRACKER
            </h3>

            {/* Legend */}
            <div className="flex items-center space-x-3.5 text-xs font-semibold">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />
                <span className="text-[#DDD6FE] text-[11px]">Energy</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C084FC] shadow-[0_0_8px_#C084FC]" />
                <span className="text-[#DDD6FE] text-[11px]">Focus</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E9D5FF] shadow-[0_0_8px_#E9D5FF]" />
                <span className="text-[#DDD6FE] text-[11px]">Motivation</span>
              </div>
            </div>
          </div>

          {/* SVG Line Graph */}
          <div className="relative w-full h-44 pt-2">
            <svg
              viewBox={`0 0 ${mindsetChartData.width} ${mindsetChartData.height}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Subtle Horizontal Grid lines (1, 5, 10) */}
              <line x1="20" y1="25" x2="480" y2="25" stroke="#21182B" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="20" y1="80" x2="480" y2="80" stroke="#21182B" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="20" y1="135" x2="480" y2="135" stroke="#21182B" strokeDasharray="3 3" strokeWidth="1" />

              {/* Motivation Line */}
              <path
                d={mindsetChartData.pathMotivation}
                fill="none"
                stroke="#E9D5FF"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(233,213,255,0.8)]"
              />

              {/* Energy Line */}
              <path
                d={mindsetChartData.pathEnergy}
                fill="none"
                stroke="#A855F7"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
              />

              {/* Focus Line */}
              <path
                d={mindsetChartData.pathFocus}
                fill="none"
                stroke="#C084FC"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]"
              />

              {/* Data points */}
              {mindsetChartData.points.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.yEnergy} r="3.5" fill="#A855F7" className="stroke-[#0D0914] stroke-2" />
                  <circle cx={pt.x} cy={pt.yFocus} r="3.5" fill="#C084FC" className="stroke-[#0D0914] stroke-2" />
                  <circle cx={pt.x} cy={pt.yMotiv} r="3.5" fill="#E9D5FF" className="stroke-[#0D0914] stroke-2" />
                </g>
              ))}
            </svg>

            {/* X-axis Labels */}
            <div className="flex items-center justify-between px-6 pt-1">
              {weekDays.map(wd => (
                <span
                  key={wd.dateStr}
                  className={`text-[11px] font-mono font-bold ${
                    wd.isToday ? 'text-[#C084FC]' : 'text-[#8F879A]'
                  }`}
                >
                  {wd.shortName}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 text-right">
            <span className="text-[10px] text-[#8F879A]">
              Click <span className="text-[#DDD6FE] font-bold">MINDSET +</span> on any day card below to record your scores.
            </span>
          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* SEVEN DAILY TASK COLUMNS (SUN .. SAT) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5 items-start">
        {weekDays.map((wd, dayIdx) => {
          const dayTasks = tasksByDay[wd.dateStr] || [];
          const completedCount = dayTasks.filter(t => t.completed).length;
          const notCompletedCount = dayTasks.length - completedCount;
          const completionPct = dayTasks.length > 0 ? Math.round((completedCount / dayTasks.length) * 100) : 0;
          const mindset = mindsetData[wd.dateStr];

          return (
            <div
              key={wd.dateStr}
              className={`relative rounded-[22px] p-4 flex flex-col justify-between transition-all duration-300 min-h-[520px] ${
                wd.isToday
                  ? 'bg-[#100B18] border-2 border-[#8B5CF6] shadow-[0_0_30px_rgba(139,92,246,0.35)] ring-1 ring-[#A855F7]/40'
                  : 'bg-[#0D0914] border border-[#21182B] hover:border-[#8B5CF6]/50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
              }`}
            >
              {/* Active Today Ribbon Badge */}
              {wd.isToday && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white text-[9px] font-black tracking-widest uppercase shadow-[0_0_12px_rgba(139,92,246,0.7)] font-mono">
                  TODAY
                </div>
              )}

              {/* Column Top: Day Header & Date */}
              <div className="space-y-3 text-center pt-1">
                <div>
                  <h4 className="text-sm font-extrabold text-white tracking-tight">
                    {wd.dayName}
                  </h4>
                  <p className="text-[10px] font-mono text-[#8F879A] mt-0.5">
                    {formatDisplayDate(wd.date)}
                  </p>
                </div>

                {/* Circular Progress Ring with Percentage + "TASKS" */}
                <div className="flex flex-col items-center justify-center pt-1">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
                      <circle
                        cx="30"
                        cy="30"
                        r="24"
                        stroke="#1C142B"
                        strokeWidth="5.5"
                        fill="transparent"
                      />
                      <circle
                        cx="30"
                        cy="30"
                        r="24"
                        stroke={wd.isToday ? '#A855F7' : '#8B5CF6'}
                        strokeWidth="5.5"
                        strokeDasharray={150.8}
                        strokeDashoffset={150.8 - (150.8 * completionPct) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-500 drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]"
                      />
                    </svg>
                    <span className="absolute text-xs font-black text-white font-mono">
                      {completionPct}%
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold tracking-widest text-[#8F879A] uppercase font-mono mt-1">
                    TASKS
                  </span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex-1 my-3 space-y-2">
                {dayTasks.length === 0 ? (
                  <div className="py-4 text-center flex flex-col items-center justify-center space-y-2">
                    <span className="text-[11px] text-[#5F5868] italic">No tasks scheduled</span>
                    <button
                      type="button"
                      onClick={() => handleCopyPreviousDay(dayIdx)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[#8F879A] hover:text-[#DDD6FE] hover:bg-[#181226] border border-dashed border-[#2A2035] transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy yesterday's list</span>
                    </button>
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`group/task relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        task.completed
                          ? 'bg-[#120D1A]/80 border-[#21182B] opacity-80'
                          : 'bg-[#140F1E] border-[#2A2035] hover:border-[#8B5CF6]/70 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-1">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleTask(task.id, e)}
                          className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                            task.completed
                              ? 'bg-[#8B5CF6] text-white shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                              : 'bg-transparent border border-[#3A2D4A] hover:border-[#8B5CF6]'
                          }`}
                        >
                          {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        {/* Task Title */}
                        <span
                          className={`text-xs font-medium truncate leading-tight transition-colors ${
                            task.completed
                              ? 'text-[#8F879A] line-through decoration-[#5F5868]'
                              : 'text-[#F5F3F7] group-hover/task:text-white'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      {/* Delete button on hover */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        className="opacity-0 group-hover/task:opacity-100 p-1 text-[#8F879A] hover:text-red-400 transition-opacity flex-shrink-0"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}

                {/* + Add Task Button in Column */}
                <button
                  type="button"
                  onClick={() => handleOpenAddTask(wd.dateStr)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-[#140F1E]/60 border border-dashed border-[#2A2035] hover:border-[#8B5CF6] text-[#8F879A] hover:text-[#DDD6FE] text-xs font-bold transition-all cursor-pointer hover:bg-[#181226]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add task</span>
                </button>
              </div>

              {/* Bottom Section: Mindset and Completed Summary */}
              <div className="pt-2 border-t border-[#21182B]/60 space-y-2.5">
                
                {/* Mindset Header & Action */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-extrabold tracking-wider text-[#8F879A] uppercase font-mono">
                      MINDSET
                    </span>
                    {mindset && (
                      <span className="text-[10px] font-mono text-[#DDD6FE]">
                        ({mindset.energy}/{mindset.focus}/{mindset.motivation})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenMindset(wd.dateStr)}
                    className="p-1 rounded-md text-[#8F879A] hover:text-[#C084FC] hover:bg-[#1C142B] transition-colors cursor-pointer"
                    title="Log Mindset"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Completed / Not completed summary */}
                <div className="space-y-1 text-[11px] font-medium font-mono pt-1">
                  <div className="flex items-center justify-between text-[#8F879A]">
                    <span>Completed</span>
                    <span className="font-bold text-white">{completedCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8F879A]">
                    <span>Not completed</span>
                    <span className="font-bold text-[#DDD6FE]">{notCompletedCount}</span>
                  </div>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD TASK FOR SELECTED DAY */}
      {/* ------------------------------------------------------------- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0B0910] border border-[#8B5CF6]/50 shadow-[0_0_35px_rgba(139,92,246,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Add New Task</h3>
                <p className="text-xs font-mono text-[#8F879A]">Scheduled for {selectedDayForTask}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="text-[#8F879A] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete System Review, Call client, Clean workspace"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Details, execution steps or links..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                    Priority
                  </label>
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
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering, Personal"
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#21182B]">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8F879A] hover:bg-[#140F1C] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: LOG MINDSET FOR SELECTED DAY */}
      {/* ------------------------------------------------------------- */}
      {isMindsetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0B0910] border border-[#C084FC]/50 shadow-[0_0_35px_rgba(192,132,252,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <div className="flex items-center space-x-2">
                <Smile className="w-5 h-5 text-[#C084FC]" />
                <h3 className="text-base font-bold text-white tracking-tight">Daily Mindset Check-in</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMindsetModalOpen(false)}
                className="text-[#8F879A] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMindset} className="space-y-4">
              <p className="text-xs text-[#8F879A]">
                Rate your focus, energy, and motivation on a scale of 1 to 10 for <span className="text-white font-mono font-bold">{selectedDayForMindset}</span>.
              </p>

              {/* Energy */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#A855F7]">Energy</span>
                  <span className="text-white font-mono">{mindsetForm.energy} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={mindsetForm.energy}
                  onChange={(e) => setMindsetForm({ ...mindsetForm, energy: Number(e.target.value) })}
                  className="w-full accent-[#A855F7] cursor-pointer"
                />
              </div>

              {/* Focus */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#C084FC]">Focus</span>
                  <span className="text-white font-mono">{mindsetForm.focus} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={mindsetForm.focus}
                  onChange={(e) => setMindsetForm({ ...mindsetForm, focus: Number(e.target.value) })}
                  className="w-full accent-[#C084FC] cursor-pointer"
                />
              </div>

              {/* Motivation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#E9D5FF]">Motivation</span>
                  <span className="text-white font-mono">{mindsetForm.motivation} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={mindsetForm.motivation}
                  onChange={(e) => setMindsetForm({ ...mindsetForm, motivation: Number(e.target.value) })}
                  className="w-full accent-[#E9D5FF] cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#21182B]">
                <button
                  type="button"
                  onClick={() => setIsMindsetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8F879A] hover:bg-[#140F1C] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] hover:from-[#7C3AED] hover:to-[#A855F7] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
                >
                  Save Mindset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

