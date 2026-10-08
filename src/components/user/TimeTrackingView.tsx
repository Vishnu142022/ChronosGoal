import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Plus, 
  Calendar, 
  Target, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  TrendingUp, 
  Award,
  ChevronRight,
  Flame,
  Layers,
  Sparkles,
  BarChart2,
  CheckCircle2
} from 'lucide-react';
import { Goal, TimeLog, User } from '../../types';
import { timeTrackingService } from '../../services/timeTrackingService';

interface TimeTrackingViewProps {
  currentUser: User;
  goals: Goal[];
  timeLogs: TimeLog[];
  onShowToast: (msg: string) => void;
  onNavigateGoals?: () => void;
  onOpenTimer?: (goalId?: string) => void;
  onDataChanged?: () => Promise<void>;
}

// Helpers for time manipulation & formatting
const formatMinutesToHuman = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

// Convert HH:MM (24-hour) to 12-hour AM/PM string
const formatTo12Hour = (timeStr?: string): string => {
  if (!timeStr) return '--:--';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  
  // Parse HH:mm from standard ISO or time string
  const parts = timeStr.includes('T') ? timeStr.split('T')[1].split(':') : timeStr.split(':');
  if (parts.length < 2) return timeStr;

  let hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return timeStr;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // 0 becomes 12
  const minStr = String(minute).padStart(2, '0');
  return `${hour}:${minStr} ${ampm}`;
};

// Format YYYY-MM-DD to readable date like "28 Sep" or "28 Sep 2026"
const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return 'Today';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

// Calculate minutes between two HH:MM time strings
const calculateTimeDifferenceMinutes = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;

  const getMinutes = (t: string) => {
    const parts = t.includes('T') ? t.split('T')[1].split(':') : t.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
  };

  const startMin = getMinutes(startTime);
  const endMin = getMinutes(endTime);

  return endMin - startMin;
};

export const TimeTrackingView: React.FC<TimeTrackingViewProps> = ({
  currentUser,
  goals,
  timeLogs,
  onShowToast,
  onNavigateGoals,
  onOpenTimer,
  onDataChanged
}) => {
  // Filter user data
  const userGoals = useMemo(() => goals.filter(g => g.userId === currentUser.id), [goals, currentUser.id]);
  const userTimeLogs = useMemo(() => {
    return timeLogs
      .filter(l => l.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt || b.startTime).getTime() - new Date(a.createdAt || a.startTime).getTime());
  }, [timeLogs, currentUser.id]);

  // Current real local date string (YYYY-MM-DD)
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // -------------------------------------------------------------
  // LOG WORK SESSION FORM STATE
  // -------------------------------------------------------------
  const [selectedGoalId, setSelectedGoalId] = useState<string>(() => {
    return userGoals.length > 0 ? userGoals[0].id : '';
  });
  const [sessionDate, setSessionDate] = useState<string>(todayDateStr);
  const [startTime, setStartTime] = useState<string>('18:00');
  const [endTime, setEndTime] = useState<string>('20:30');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-calculated duration for the active form
  const calculatedDurationMinutes = useMemo(() => {
    return calculateTimeDifferenceMinutes(startTime, endTime);
  }, [startTime, endTime]);

  // -------------------------------------------------------------
  // EDIT TIME LOG MODAL STATE
  // -------------------------------------------------------------
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [editGoalId, setEditGoalId] = useState<string>('');
  const [editDate, setEditDate] = useState<string>(todayDateStr);
  const [editStartTime, setEditStartTime] = useState<string>('18:00');
  const [editEndTime, setEditEndTime] = useState<string>('20:30');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  const editDurationMinutes = useMemo(() => {
    return calculateTimeDifferenceMinutes(editStartTime, editEndTime);
  }, [editStartTime, editEndTime]);

  // -------------------------------------------------------------
  // TODAY'S METRICS CALCULATION
  // -------------------------------------------------------------
  const todayMetrics = useMemo(() => {
    const todayLogs = userTimeLogs.filter(l => {
      const logDate = l.startTime?.slice(0, 10) || l.createdAt?.slice(0, 10);
      return logDate === todayDateStr;
    });

    const totalMinutes = todayLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
    const sessionsCount = todayLogs.length;
    const distinctGoalIds = new Set(todayLogs.map(l => l.goalId));

    return {
      totalMinutes,
      sessionsCount,
      goalsWorkedOnCount: distinctGoalIds.size
    };
  }, [userTimeLogs, todayDateStr]);

  // -------------------------------------------------------------
  // WEEKLY SUMMARY (Mon to Sun) CALCULATION
  // -------------------------------------------------------------
  const weeklySummary = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon...
    const diffToMon = (dayOfWeek + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekData: { dayName: string; dateStr: string; minutes: number; isToday: boolean }[] = [];

    let weekTotalMinutes = 0;

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const dayLogs = userTimeLogs.filter(l => {
        const logDate = l.startTime?.slice(0, 10) || l.createdAt?.slice(0, 10);
        return logDate === dateStr;
      });

      const dayMin = dayLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
      weekTotalMinutes += dayMin;

      weekData.push({
        dayName: days[i],
        dateStr,
        minutes: dayMin,
        isToday: dateStr === todayDateStr
      });
    }

    const maxMinutes = Math.max(...weekData.map(d => d.minutes), 60); // minimum 1h scale

    return {
      weekData,
      weekTotalMinutes,
      maxMinutes
    };
  }, [userTimeLogs, todayDateStr]);

  // -------------------------------------------------------------
  // TIME BY GOAL SUMMARY
  // -------------------------------------------------------------
  const timeByGoalSummary = useMemo(() => {
    return userGoals.map(goal => {
      // Calculate total logged minutes directly from user's logs or goal
      const goalLogs = userTimeLogs.filter(l => l.goalId === goal.id);
      const totalLoggedMinutes = goalLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
      const totalHours = totalLoggedMinutes / 60;
      const targetHours = goal.targetHours || 25;
      const progressPercent = targetHours > 0 
        ? Math.min(100, Math.round((totalHours / targetHours) * 1000) / 10)
        : 0;

      return {
        goal,
        totalLoggedMinutes,
        totalHours: Math.round(totalHours * 10) / 10,
        targetHours,
        progressPercent,
        sessionsCount: goalLogs.length
      };
    }).sort((a, b) => b.totalLoggedMinutes - a.totalLoggedMinutes);
  }, [userGoals, userTimeLogs]);

  // -------------------------------------------------------------
  // HANDLER: LOG WORK SESSION
  // -------------------------------------------------------------
  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!selectedGoalId) {
      setFormError('Please select an existing goal for this work session.');
      return;
    }

    if (!sessionDate) {
      setFormError('Please choose a valid session date.');
      return;
    }

    if (!startTime || !endTime) {
      setFormError('Please enter both Start Time and End Time.');
      return;
    }

    if (calculatedDurationMinutes <= 0) {
      setFormError('End Time must be later than Start Time. (Duration must be greater than 0 minutes).');
      return;
    }

    const targetGoal = userGoals.find(g => g.id === selectedGoalId);
    if (!targetGoal) {
      setFormError('Selected goal was not found.');
      return;
    }

    try {
      await timeTrackingService.logSession({
        userId: currentUser.id,
        userName: currentUser.name,
        goalId: selectedGoalId,
        goalName: targetGoal.name,
        startTime: `${sessionDate}T${startTime}:00`,
        endTime: `${sessionDate}T${endTime}:00`,
        durationMinutes: calculatedDurationMinutes,
        notes: sessionNotes.trim() || `Deep work session for ${targetGoal.name}`,
        productivityRating: 5
      });
      await onDataChanged?.();
      onShowToast(`Logged ${formatMinutesToHuman(calculatedDurationMinutes)} for "${targetGoal.name}"!`);
      setSessionNotes('');
    } catch (error) {
      console.error('Failed to save time log:', error);
      setFormError('Unable to save this session. Please try again.');
    }
  };

  // -------------------------------------------------------------
  // HANDLER: OPEN EDIT MODAL
  // -------------------------------------------------------------
  const handleOpenEditModal = (log: TimeLog) => {
    setEditingLog(log);
    setEditGoalId(log.goalId);
    
    // Extract date
    const dStr = log.startTime?.includes('T') ? log.startTime.split('T')[0] : todayDateStr;
    setEditDate(dStr);

    // Extract start time HH:mm
    const sTime = log.startTime?.includes('T') ? log.startTime.split('T')[1].slice(0, 5) : '18:00';
    setEditStartTime(sTime);

    // Extract end time HH:mm
    const eTime = log.endTime?.includes('T') ? log.endTime.split('T')[1].slice(0, 5) : '20:30';
    setEditEndTime(eTime);

    setEditNotes(log.notes || '');
    setEditError(null);
  };

  // -------------------------------------------------------------
  // HANDLER: SAVE EDITED LOG
  // -------------------------------------------------------------
  const handleSaveEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setEditError(null);

    if (!editGoalId) {
      setEditError('Goal is required.');
      return;
    }

    if (editDurationMinutes <= 0) {
      setEditError('End Time must be later than Start Time.');
      return;
    }

    const targetGoal = userGoals.find(g => g.id === editGoalId);
    const updated: TimeLog = {
      ...editingLog,
      goalId: editGoalId,
      goalName: targetGoal ? targetGoal.name : editingLog.goalName,
      startTime: `${editDate}T${editStartTime}:00`,
      endTime: `${editDate}T${editEndTime}:00`,
      durationMinutes: editDurationMinutes,
      notes: editNotes.trim()
    };

    try {
      await timeTrackingService.updateSession(updated);
      await onDataChanged?.();
      onShowToast(`Time log updated (${formatMinutesToHuman(editDurationMinutes)})`);
      setEditingLog(null);
    } catch (error) {
      console.error('Failed to update time log:', error);
      setEditError('Unable to update this session. Please try again.');
    }
  };

  // -------------------------------------------------------------
  // HANDLER: DELETE LOG
  // -------------------------------------------------------------
  const handleDeleteLog = async (logId: string, durationMinutes: number) => {
    try {
      await timeTrackingService.deleteSession(logId);
      await onDataChanged?.();
      onShowToast(`Removed session log of ${formatMinutesToHuman(durationMinutes)}`);
    } catch (error) {
      console.error('Failed to delete time log:', error);
      onShowToast('Unable to delete this session. Please try again.');
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            TIME TRACKING
          </h1>
          <p className="text-xs sm:text-sm text-[#8F879A] mt-0.5 font-medium">
            Track the time you spend working toward your goals.
          </p>
        </div>
        {onOpenTimer && userGoals.length > 0 && (
          <button
            type="button"
            onClick={() => onOpenTimer(selectedGoalId || userGoals[0].id)}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>Start Focus Timer</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP ROW: LOG WORK SESSION & SUMMARY STATS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LOG WORK SESSION CARD (7 Cols) */}
        <div className="lg:col-span-7 rounded-[24px] bg-[#0D0914] border border-[#21182B] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl space-y-4 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 bg-[#8B5CF6]/10 rounded-full blur-3xl" />

          <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#A855F7]" />
              <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider font-mono">
                LOG WORK SESSION
              </h2>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#DDD6FE] px-2.5 py-0.5 rounded-full bg-[#1A1226] border border-[#8B5CF6]/30">
              Duration Auto-Calculated
            </span>
          </div>

          {/* Validation Error Banner */}
          {formError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center space-x-2.5 text-xs text-red-200 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleLogSession} className="space-y-4">
            
            {/* Goal Selector */}
            <div>
              <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1.5 font-mono">
                Goal *
              </label>
              {userGoals.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#140F1E] border border-amber-900/40 text-xs text-amber-300 flex items-center justify-between">
                  <span>No active goals found. Please create a goal first.</span>
                  {onNavigateGoals && (
                    <button
                      type="button"
                      onClick={onNavigateGoals}
                      className="px-2.5 py-1 rounded-lg bg-[#8B5CF6] text-white font-bold text-[11px]"
                    >
                      + Create Goal
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#140F1E] border border-[#2A2035] hover:border-[#8B5CF6]/80 text-white text-xs font-bold focus:outline-none focus:border-[#8B5CF6] transition-all cursor-pointer"
                  >
                    {userGoals.map(goal => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name} ({goal.category || goal.lifeArea || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Date, Start Time, End Time in Responsive 3-col Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1.5 font-mono">
                  Date *
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#140F1E] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1.5 font-mono">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#140F1E] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1.5 font-mono">
                  End Time *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#140F1E] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

            </div>

            {/* Calculated Duration Display & Notes */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              
              {/* Duration Live Capsule */}
              <div className="flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-[#140F1E] border border-[#2A2035]">
                <span className="text-xs font-mono text-[#8F879A] uppercase">Duration:</span>
                <span className={`text-base font-black font-mono ${
                  calculatedDurationMinutes > 0 ? 'text-[#C084FC]' : 'text-red-400'
                }`}>
                  {calculatedDurationMinutes > 0 
                    ? formatMinutesToHuman(calculatedDurationMinutes) 
                    : 'Invalid duration'}
                </span>
                {calculatedDurationMinutes > 0 && (
                  <span className="text-[10px] text-[#8F879A] font-mono">
                    ({formatTo12Hour(startTime)} → {formatTo12Hour(endTime)})
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={calculatedDurationMinutes <= 0 || userGoals.length === 0}
                className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#581c87] text-white text-xs font-extrabold uppercase tracking-wider shadow-[0_0_20px_rgba(139,92,246,0.45)] hover:shadow-[0_0_28px_rgba(168,85,247,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Log Session</span>
              </button>

            </div>

          </form>
        </div>

        {/* SUMMARY CARDS (5 Cols): TODAY & WEEKLY SUMMARY */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          
          {/* Card: TODAY */}
          <div className="rounded-[22px] bg-[#0D0914] border border-[#21182B] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
                TODAY
              </span>
              <span className="text-xs font-mono text-[#DDD6FE] font-bold">
                {formatDisplayDate(todayDateStr)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-3 rounded-xl bg-[#140F1E] border border-[#2A2035] text-center">
                <span className="text-[10px] text-[#8F879A] font-mono uppercase block">Total Time</span>
                <span className="text-lg font-black text-white font-mono">
                  {formatMinutesToHuman(todayMetrics.totalMinutes)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#140F1E] border border-[#2A2035] text-center">
                <span className="text-[10px] text-[#8F879A] font-mono uppercase block">Sessions</span>
                <span className="text-lg font-black text-[#DDD6FE] font-mono">
                  {todayMetrics.sessionsCount}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#140F1E] border border-[#2A2035] text-center">
                <span className="text-[10px] text-[#8F879A] font-mono uppercase block">Goals Worked</span>
                <span className="text-lg font-black text-[#C084FC] font-mono">
                  {todayMetrics.goalsWorkedOnCount}
                </span>
              </div>
            </div>
          </div>

          {/* Card: THIS WEEK BAR CHART */}
          <div className="rounded-[22px] bg-[#0D0914] border border-[#21182B] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] space-y-3 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
                THIS WEEK
              </span>
              <span className="text-xs font-mono text-white font-black">
                {formatMinutesToHuman(weeklySummary.weekTotalMinutes)} total
              </span>
            </div>

            {/* Mon-Sun Purple Bars */}
            <div className="grid grid-cols-7 gap-2 items-end h-24 pt-2 pb-1">
              {weeklySummary.weekData.map((d) => {
                const hours = Math.round((d.minutes / 60) * 10) / 10;
                const heightPct = Math.max(8, Math.round((d.minutes / weeklySummary.maxMinutes) * 100));

                return (
                  <div key={d.dayName} className="flex flex-col items-center justify-end h-full group">
                    {/* Tooltip / Hours Value */}
                    <span className="text-[9px] font-mono font-bold text-[#8F879A] group-hover:text-white transition-colors mb-1">
                      {hours > 0 ? `${hours}h` : '0h'}
                    </span>

                    {/* Bar */}
                    <div className="w-full max-w-[28px] bg-[#161022] rounded-t-lg overflow-hidden h-16 flex items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          d.isToday
                            ? 'bg-gradient-to-t from-[#8B5CF6] to-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.7)]'
                            : d.minutes > 0
                            ? 'bg-gradient-to-t from-[#7C3AED] to-[#A855F7]'
                            : 'bg-[#221833]'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    {/* Day label */}
                    <span className={`text-[10px] font-mono font-bold mt-1 ${
                      d.isToday ? 'text-[#DDD6FE]' : 'text-[#8F879A]'
                    }`}>
                      {d.dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TIME BY GOAL SUMMARY */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-[24px] bg-[#0D0914] border border-[#21182B] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-[#A855F7]" />
            <h3 className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
              TIME BY GOAL
            </h3>
          </div>
          {onNavigateGoals && (
            <button
              onClick={onNavigateGoals}
              className="text-xs font-bold text-[#DDD6FE] hover:text-white flex items-center space-x-1"
            >
              <span>Manage Goals</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {timeByGoalSummary.length === 0 ? (
          <p className="text-xs text-[#8F879A] italic py-4">No active goals available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {timeByGoalSummary.map((item) => (
              <div
                key={item.goal.id}
                className="p-4 rounded-2xl bg-[#140F1E] border border-[#2A2035] hover:border-[#8B5CF6]/50 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-[#DDD6FE] uppercase font-mono px-2 py-0.5 rounded-full bg-[#1C142B] border border-[#8B5CF6]/30">
                      {item.goal.category || item.goal.lifeArea || 'General'}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">
                      {item.goal.name}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white font-mono">
                      {formatMinutesToHuman(item.totalLoggedMinutes)}
                    </span>
                    <span className="text-[10px] text-[#8F879A] font-mono block">
                      Target: {item.targetHours}h
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Percentage */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                    <span className="text-[#8F879A]">
                      {item.sessionsCount} {item.sessionsCount === 1 ? 'session' : 'sessions'} logged
                    </span>
                    <span className="text-[#DDD6FE]">
                      {item.progressPercent}%
                    </span>
                  </div>

                  <div className="relative h-2 w-full rounded-full bg-[#161022] overflow-hidden border border-[#21182B]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.7)] transition-all duration-500"
                      style={{ width: `${Math.min(100, item.progressPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Quick Log Action */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGoalId(item.goal.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-[11px] font-bold text-[#C084FC] hover:text-white transition-colors"
                  >
                    + Log Time for this Goal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. TIME LOG HISTORY TABLE */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-[24px] bg-[#0D0914] border border-[#21182B] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] space-y-4">
        
        <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#A855F7]" />
            <h3 className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
              TIME LOGS ({userTimeLogs.length})
            </h3>
          </div>
          <span className="text-xs font-mono text-[#8F879A]">
            Newest entries first
          </span>
        </div>

        {userTimeLogs.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Clock className="w-8 h-8 text-[#8F879A] mx-auto opacity-50" />
            <p className="text-xs text-[#8F879A]">No time sessions logged yet.</p>
            <p className="text-[11px] text-[#5F5868]">Use the form above to log your first work session toward your goals.</p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#21182B] text-[11px] font-mono uppercase tracking-wider text-[#8F879A]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Goal</th>
                  <th className="py-3 px-3">Start</th>
                  <th className="py-3 px-3">End</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21182B]/60 text-xs">
                {userTimeLogs.map((log) => {
                  const logDate = log.startTime?.includes('T') 
                    ? log.startTime.split('T')[0] 
                    : log.createdAt?.slice(0, 10);
                  const startTime12 = formatTo12Hour(log.startTime);
                  const endTime12 = formatTo12Hour(log.endTime);

                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-[#140F1E]/80 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-3 font-mono text-white font-semibold whitespace-nowrap">
                        {formatDisplayDate(logDate)}
                      </td>

                      {/* Goal */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-[#DDD6FE] group-hover:text-white transition-colors">
                          {log.goalName || 'Goal Session'}
                        </span>
                        {log.notes && (
                          <span className="block text-[11px] text-[#8F879A] truncate max-w-xs">
                            {log.notes}
                          </span>
                        )}
                      </td>

                      {/* Start Time */}
                      <td className="py-3.5 px-3 font-mono text-[#8F879A] whitespace-nowrap">
                        {startTime12}
                      </td>

                      {/* End Time */}
                      <td className="py-3.5 px-3 font-mono text-[#8F879A] whitespace-nowrap">
                        {endTime12}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-3 font-mono font-bold text-[#C084FC] whitespace-nowrap">
                        {formatMinutesToHuman(log.durationMinutes)}
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(log)}
                            className="p-1.5 rounded-lg text-[#8F879A] hover:text-[#DDD6FE] hover:bg-[#181226] transition-colors cursor-pointer"
                            title="Edit Log"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id, log.durationMinutes)}
                            className="p-1.5 rounded-lg text-[#8F879A] hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Delete Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL: EDIT TIME LOG */}
      {/* ------------------------------------------------------------- */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0B0910] border border-[#8B5CF6]/50 shadow-[0_0_40px_rgba(139,92,246,0.35)] space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[#A855F7]" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Edit Work Session
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="text-[#8F879A] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditLog} className="space-y-4">
              
              {/* Goal */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1 font-mono">
                  Goal *
                </label>
                <select
                  value={editGoalId}
                  onChange={(e) => setEditGoalId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#140F1E] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                >
                  {userGoals.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1 font-mono">
                  Date *
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#140F1E] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Start and End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1 font-mono">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1E] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1 font-mono">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1E] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Duration display */}
              <div className="p-3 rounded-xl bg-[#140F1E] border border-[#2A2035] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8F879A]">Recalculated Duration:</span>
                <span className="font-bold text-[#C084FC] text-sm">
                  {editDurationMinutes > 0 ? formatMinutesToHuman(editDurationMinutes) : 'Invalid'}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1 font-mono">
                  Session Notes
                </label>
                <input
                  type="text"
                  placeholder="What did you achieve?"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#140F1E] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#21182B]">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 rounded-xl bg-[#140F1E] hover:bg-[#1A1426] text-[#8F879A] hover:text-white text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editDurationMinutes <= 0}
                  className="px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

