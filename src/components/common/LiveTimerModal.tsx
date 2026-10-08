import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Check, X, Clock } from 'lucide-react';
import { Goal, User } from '../../types';
import { timeTrackingService } from '../../services/timeTrackingService';

interface LiveTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  timerActive: boolean;
  timerSeconds: number;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  goals: Goal[];
  currentUser: User;
  onDataChanged?: () => Promise<void>;
}

export const LiveTimerModal: React.FC<LiveTimerModalProps> = ({
  isOpen,
  onClose,
  timerActive,
  timerSeconds,
  onToggleTimer,
  onResetTimer,
  goals,
  currentUser,
  onDataChanged
}) => {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [productivityRating, setProductivityRating] = useState<number>(5);
  const [sessionSavedMessage, setSessionSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (goals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  if (!isOpen) return null;

  const formatHoursMinutesSeconds = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return {
      hours: hrs.toString().padStart(2, '0'),
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0')
    };
  };

  const timeParts = formatHoursMinutesSeconds(timerSeconds);

  const handleLogCurrentSession = async () => {
    if (timerSeconds < 10) {
      alert('Please log at least 10 seconds of active work.');
      return;
    }
    if (!selectedGoalId) {
      alert('Please select a goal to associate this time log with.');
      return;
    }

    const durationMinutes = Math.max(1, Math.round(timerSeconds / 60));
    const now = new Date();
    const goal = goals.find(g => g.id === selectedGoalId);

    try {
      await timeTrackingService.logSession({
        goalId: selectedGoalId,
        goalName: goal ? goal.name : 'Unknown Goal',
        userId: currentUser.id,
        userName: currentUser.name,
        startTime: new Date(now.getTime() - timerSeconds * 1000).toISOString(),
        endTime: now.toISOString(),
        durationMinutes,
        notes: notes.trim() || 'Recorded via Live Focus Stopwatch',
        productivityRating
      });
      await onDataChanged?.();
    } catch (error) {
      console.error('Failed to save focus session:', error);
      alert('Unable to save this focus session. Please try again.');
      return;
    }

    setSessionSavedMessage(`Successfully recorded ${durationMinutes} min to "${goal?.name}"!`);
    if (timerActive) onToggleTimer();
    onResetTimer();
    setNotes('');

    setTimeout(() => {
      setSessionSavedMessage(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center border border-zinc-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Live Stopwatch &amp; Focus Tracker</h3>
              <p className="text-[11px] text-zinc-400">Track time in real-time and log directly to goals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stopwatch Display */}
        <div className="p-6 text-center bg-zinc-950">
          <div className="inline-flex items-center justify-center font-mono text-5xl font-bold tracking-wider text-white px-6 py-4 rounded-2xl bg-black border border-zinc-800 shadow-inner mb-6">
            <span className="text-white">{timeParts.hours}</span>
            <span className="text-zinc-600 mx-1">:</span>
            <span className="text-white">{timeParts.minutes}</span>
            <span className="text-zinc-600 mx-1">:</span>
            <span className="text-zinc-300">{timeParts.seconds}</span>
          </div>

          {/* Action controls */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <button
              onClick={onToggleTimer}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
                timerActive
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
                  : 'bg-white hover:bg-zinc-200 text-black shadow-white/10 ring-2 ring-white/20'
              }`}
            >
              {timerActive ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black" />
                  <span>{timerSeconds > 0 ? 'Resume Timer' : 'Start Focus Session'}</span>
                </>
              )}
            </button>

            <button
              onClick={onResetTimer}
              disabled={timerSeconds === 0}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl font-medium text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {sessionSavedMessage && (
            <div className="mb-4 p-3 bg-zinc-900 border border-white/40 rounded-xl text-white text-xs font-semibold flex items-center justify-center space-x-2 animate-in fade-in">
              <Check className="w-4 h-4 text-white" />
              <span>{sessionSavedMessage}</span>
            </div>
          )}

          {/* Associate with Goal Form */}
          <div className="text-left space-y-3.5 bg-black p-4 rounded-xl border border-zinc-800">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Target Goal to Credit Time:
              </label>
              {goals.length === 0 ? (
                <p className="text-xs text-zinc-400">No active goals found. Please create a goal first.</p>
              ) : (
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-white"
                >
                  {goals.map(g => (
                    <option key={g.id} value={g.id} className="bg-black text-white">
                      {g.name} ({g.category} - {g.targetHours}h target)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Work Session Notes:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g. Completed milestone tasks, reviewed progress"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Productivity &amp; Focus Rating:
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setProductivityRating(rating)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      productivityRating === rating
                        ? 'bg-white border-white text-black font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {rating} ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            Recorded duration: <span className="font-mono text-white font-semibold">{Math.max(1, Math.round(timerSeconds / 60))} min</span>
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              Close
            </button>
            <button
              onClick={handleLogCurrentSession}
              disabled={timerSeconds < 5 || goals.length === 0}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-bold rounded-lg shadow-md transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Log Time to Goal</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

