import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Check, 
  Trash2, 
  Edit3, 
  Pin, 
  Search, 
  Calendar, 
  Clock, 
  Target, 
  Sparkles, 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  X, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Layers,
  Heart,
  Briefcase,
  DollarSign,
  Users,
  Compass,
  Home,
  Palette,
  Globe
} from 'lucide-react';
import { Goal, GoalStep, LifeAreaName, GoalPriority, GoalStatus, User } from '../../types';
import { storageService } from '../../services/storageService';
import { goalsService } from '../../services/goalsService';

interface GoalsLifePlannerViewProps {
  currentUser: User;
  goals: Goal[];
  onShowToast: (msg: string) => void;
  onOpenTimer?: (goalId?: string) => void;
  onDataChanged?: () => Promise<void>;
}

// 10 Life Areas Definition
export interface LifeAreaConfig {
  name: LifeAreaName;
  icon: string;
  color: string;
  bgGlow: string;
}

export const LIFE_AREAS: LifeAreaConfig[] = [
  { name: 'Health & Fitness', icon: '💪', color: '#8B5CF6', bgGlow: 'rgba(139,92,246,0.15)' },
  { name: 'Career Growth', icon: '📈', color: '#A855F7', bgGlow: 'rgba(168,85,247,0.15)' },
  { name: 'Finances & Wealth', icon: '💰', color: '#C084FC', bgGlow: 'rgba(192,132,252,0.15)' },
  { name: 'Relationships', icon: '🧡', color: '#F472B6', bgGlow: 'rgba(244,114,182,0.15)' },
  { name: 'Romance & Love', icon: '❤️', color: '#FB7185', bgGlow: 'rgba(251,113,133,0.15)' },
  { name: 'Spirituality', icon: '✨', color: '#DDD6FE', bgGlow: 'rgba(221,214,254,0.15)' },
  { name: 'Home', icon: '🏡', color: '#818CF8', bgGlow: 'rgba(129,140,248,0.15)' },
  { name: 'Adventure & Travel', icon: '✈️', color: '#38BDF8', bgGlow: 'rgba(56,189,248,0.15)' },
  { name: 'Fun & Hobbies', icon: '🎨', color: '#FBBF24', bgGlow: 'rgba(251,191,36,0.15)' },
  { name: 'Community', icon: '🌍', color: '#34D399', bgGlow: 'rgba(52,211,153,0.15)' }
];

// Helper to format date nicely
const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return 'No deadline';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

// Calculate days remaining
const getDaysRemaining = (deadlineStr?: string): { text: string; isOverdue: boolean } => {
  if (!deadlineStr) return { text: 'No deadline', isOverdue: false };
  try {
    const target = new Date(deadlineStr);
    target.setHours(23, 59, 59, 999);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
    }
    if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false };
    }
    return { text: `${diffDays} days left`, isOverdue: false };
  } catch {
    return { text: deadlineStr, isOverdue: false };
  }
};

// Calculate progress percentage strictly from steps or default to logged hours
const calculateGoalProgress = (goal: Goal): number => {
  if (goal.steps && goal.steps.length > 0) {
    const completed = goal.steps.filter(s => s.completed).length;
    return Math.round((completed / goal.steps.length) * 100);
  }
  if (goal.milestones && goal.milestones.length > 0) {
    const completed = goal.milestones.filter(m => m.completed).length;
    return Math.round((completed / goal.milestones.length) * 100);
  }
  if (goal.targetHours && goal.targetHours > 0) {
    const hours = (goal.totalLoggedMinutes || 0) / 60;
    return Math.min(100, Math.round((hours / goal.targetHours) * 100));
  }
  return goal.status === 'COMPLETED' ? 100 : 0;
};

export const GoalsLifePlannerView: React.FC<GoalsLifePlannerViewProps> = ({
  currentUser,
  goals,
  onShowToast,
  onOpenTimer,
  onDataChanged
}) => {
  // Filter and Search States
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<LifeAreaName | 'ALL'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expanded goal IDs for step inspection
  const [expandedGoalIds, setExpandedGoalIds] = useState<Record<string, boolean>>({});

  // Inline new step draft for goals: { [goalId]: { title: '', deadline: '' } }
  const [stepDrafts, setStepDrafts] = useState<Record<string, { title: string; deadline: string }>>({});

  // Goal Creation / Edit Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState<{
    name: string;
    lifeArea: LifeAreaName;
    description: string;
    targetStatement: string;
    targetHours: number;
    startDate: string;
    deadline: string;
    priority: GoalPriority;
    isPinned: boolean;
    steps: GoalStep[];
  }>({
    name: '',
    lifeArea: 'Health & Fitness',
    description: '',
    targetStatement: '',
    targetHours: 25,
    startDate: new Date().toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    priority: 'HIGH',
    isPinned: true,
    steps: [
      { id: '1', goalId: '', title: 'Define milestones and baseline requirement', deadline: '', completed: false }
    ]
  });

  // Filter goals specifically for current user
  const userGoals = useMemo(() => {
    return goals.filter(g => g.userId === currentUser.id);
  }, [goals, currentUser.id]);

  // Overall Goals Achievement Summary
  const achievementStats = useMemo(() => {
    const total = userGoals.length;
    const achieved = userGoals.filter(g => calculateGoalProgress(g) === 100 || g.status === 'COMPLETED').length;
    const percent = total > 0 ? Math.round((achieved / total) * 100) : 0;
    return {
      total,
      achieved,
      percent
    };
  }, [userGoals]);

  // Count goals per life area
  const areaCounts = useMemo(() => {
    const map: Record<string, { total: number; achieved: number }> = {};
    LIFE_AREAS.forEach(a => {
      map[a.name] = { total: 0, achieved: 0 };
    });

    userGoals.forEach(g => {
      const area = (g.lifeArea || g.category) as LifeAreaName;
      if (map[area]) {
        map[area].total += 1;
        if (calculateGoalProgress(g) === 100 || g.status === 'COMPLETED') {
          map[area].achieved += 1;
        }
      }
    });

    return map;
  }, [userGoals]);

  // Top priorities (pinned or high priority and not yet 100% completed)
  const topPriorities = useMemo(() => {
    return userGoals.filter(g => g.isPinned || g.priority === 'URGENT' || (g.priority === 'HIGH' && calculateGoalProgress(g) < 100));
  }, [userGoals]);

  // Filtered Goals for All Goals Section
  const filteredGoals = useMemo(() => {
    return userGoals.filter(g => {
      // Area filter
      if (selectedAreaFilter !== 'ALL') {
        const area = g.lifeArea || g.category;
        if (area !== selectedAreaFilter) return false;
      }

      // Status filter
      const progress = calculateGoalProgress(g);
      if (selectedStatusFilter === 'COMPLETED' && progress < 100 && g.status !== 'COMPLETED') return false;
      if (selectedStatusFilter === 'IN_PROGRESS' && (progress === 0 || progress === 100)) return false;
      if (selectedStatusFilter === 'NOT_STARTED' && progress > 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesDesc = (g.description || '').toLowerCase().includes(q);
        const matchesTarget = (g.targetStatement || '').toLowerCase().includes(q);
        const matchesArea = (g.lifeArea || g.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesTarget && !matchesArea) return false;
      }

      return true;
    });
  }, [userGoals, selectedAreaFilter, selectedStatusFilter, searchQuery]);

  // Toggle Step Completion
  const handleToggleStep = async (goalId: string, stepId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await goalsService.toggleStep(goalId, stepId);
      await onDataChanged?.();
    } catch (error) {
      console.error('Failed to toggle goal step:', error);
      onShowToast('Unable to update goal step. Please try again.');
    }
  };

  // Delete Step
  const handleDeleteStep = async (goalId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await goalsService.deleteGoalStep(goalId, stepId);
      await onDataChanged?.();
      onShowToast('Step removed');
    } catch (error) {
      console.error('Failed to delete goal step:', error);
      onShowToast('Unable to remove goal step. Please try again.');
    }
  };

  // Add Step to Goal
  const handleAddStepToGoal = async (goalId: string) => {
    const draft = stepDrafts[goalId];
    if (!draft || !draft.title.trim()) return;

    try {
      const stepOrder = userGoals.find(goal => goal.id === goalId)?.steps?.length || 0;
      await goalsService.createGoalStep(
        goalId,
        draft.title.trim(),
        draft.deadline || undefined,
        stepOrder
      );
      await onDataChanged?.();
      setStepDrafts(prev => ({ ...prev, [goalId]: { title: '', deadline: '' } }));
      onShowToast('Step added');
    } catch (error) {
      console.error('Failed to add goal step:', error);
      onShowToast('Unable to add goal step. Please try again.');
    }
  };

  // Toggle Pin on Goal
  const handleTogglePin = (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storageService.toggleGoalPin(goalId);
  };

  // Toggle Goal Expansion
  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoalIds(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  // Open Create Goal Modal
  const handleOpenCreateGoal = (prefilledArea?: LifeAreaName) => {
    setEditingGoal(null);
    setGoalForm({
      name: '',
      lifeArea: prefilledArea || (selectedAreaFilter !== 'ALL' ? selectedAreaFilter : 'Health & Fitness'),
      description: '',
      targetStatement: '',
      targetHours: 25,
      startDate: new Date().toISOString().slice(0, 10),
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      priority: 'HIGH',
      isPinned: true,
      steps: [
        { id: `stp_init_1`, goalId: '', title: 'Define execution blueprint & initial milestone', deadline: '', completed: false }
      ]
    });
    setIsGoalModalOpen(true);
  };

  // Open Edit Goal Modal
  const handleOpenEditGoal = (goal: Goal, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      lifeArea: (goal.lifeArea || goal.category) as LifeAreaName,
      description: goal.description || '',
      targetStatement: goal.targetStatement || '',
      targetHours: goal.targetHours || 25,
      startDate: goal.startDate || new Date().toISOString().slice(0, 10),
      deadline: goal.deadline || '',
      priority: goal.priority || 'HIGH',
      isPinned: !!goal.isPinned,
      steps: goal.steps || []
    });
    setIsGoalModalOpen(true);
  };

  // Save Goal
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.name.trim()) return;

    try {
      if (editingGoal) {
        await goalsService.updateGoal({
          ...editingGoal,
          name: goalForm.name.trim(),
          category: goalForm.lifeArea,
          lifeArea: goalForm.lifeArea,
          description: goalForm.description.trim(),
          targetStatement: goalForm.targetStatement.trim(),
          targetHours: goalForm.targetHours,
          startDate: goalForm.startDate,
          deadline: goalForm.deadline,
          priority: goalForm.priority,
          isPinned: goalForm.isPinned,
          steps: goalForm.steps
        });
        onShowToast(`Goal "${goalForm.name}" updated`);
      } else {
        const createdGoal = await goalsService.createGoal({
          userId: currentUser.id,
          userName: currentUser.name,
          name: goalForm.name.trim(),
          category: goalForm.lifeArea,
          lifeArea: goalForm.lifeArea,
          description: goalForm.description.trim(),
          targetStatement: goalForm.targetStatement.trim(),
          targetHours: goalForm.targetHours,
          startDate: goalForm.startDate,
          deadline: goalForm.deadline,
          priority: goalForm.priority,
          status: 'IN_PROGRESS',
          isPinned: goalForm.isPinned,
          tags: [goalForm.lifeArea]
        });
        for (const [stepOrder, step] of goalForm.steps.entries()) {
          if (step.title.trim()) {
            await goalsService.createGoalStep(
              createdGoal.id,
              step.title.trim(),
              step.deadline || undefined,
              stepOrder
            );
          }
        }
        onShowToast(`Created new goal: "${goalForm.name}"`);
      }
      await onDataChanged?.();
      setIsGoalModalOpen(false);
    } catch (error) {
      console.error('Failed to save goal:', error);
      onShowToast('Unable to save goal. Please try again.');
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (goalId: string, goalName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await goalsService.deleteGoal(goalId);
      await onDataChanged?.();
      onShowToast(`Goal "${goalName}" deleted`);
    } catch (error) {
      console.error('Failed to delete goal:', error);
      onShowToast('Unable to delete goal. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & ACHIEVEMENT SUMMARY */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        
        {/* Title and Subtitle */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            GOALS
          </h1>
          <p className="text-xs sm:text-sm text-[#8F879A] mt-0.5 font-medium">
            Ten areas of life, broken into small steps.
          </p>
        </div>

        {/* Top Summary Card */}
        <div className="relative overflow-hidden rounded-[24px] bg-[#0D0914] border border-[#21182B] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -top-16 left-1/4 w-72 h-72 bg-[#8B5CF6]/15 rounded-full blur-3xl" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Left: Circular Progress & Goals Achieved Labels */}
            <div className="flex items-center space-x-5">
              
              {/* Circular Indicator */}
              <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#1C142B"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#goalsGrad)"
                    strokeWidth="10"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * achievementStats.percent) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]"
                  />
                  <defs>
                    <linearGradient id="goalsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#C084FC" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* X / Y Center Ratio */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-white font-mono">
                    {achievementStats.achieved} / {achievementStats.total}
                  </span>
                </div>
              </div>

              {/* Text Information */}
              <div className="space-y-1">
                <span className="text-xs font-black tracking-widest text-[#DDD6FE] uppercase font-mono">
                  GOALS ACHIEVED
                </span>
                <p className="text-sm sm:text-base font-bold text-white">
                  Mastering 10 areas
                </p>
                <p className="text-xs text-[#8F879A]">
                  {achievementStats.percent}% of active life milestones accomplished
                </p>
              </div>

            </div>

            {/* Right: + Create Goal Button */}
            <button
              onClick={() => handleOpenCreateGoal()}
              className="flex items-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#581c87] text-white text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.45)] hover:shadow-[0_0_28px_rgba(168,85,247,0.6)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Create Goal</span>
            </button>

          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TEN AREAS OF LIFE (5 cards per row on desktop) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
            AREAS OF LIFE
          </h3>
          {selectedAreaFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedAreaFilter('ALL')}
              className="text-xs text-[#C084FC] hover:underline font-semibold"
            >
              Show all areas
            </button>
          )}
        </div>

        {/* 5x2 Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {LIFE_AREAS.map((area) => {
            const counts = areaCounts[area.name] || { total: 0, achieved: 0 };
            const isSelected = selectedAreaFilter === area.name;

            return (
              <button
                key={area.name}
                onClick={() => setSelectedAreaFilter(isSelected ? 'ALL' : area.name)}
                className={`relative p-3.5 rounded-2xl text-left transition-all duration-300 border flex flex-col justify-between h-24 group cursor-pointer ${
                  isSelected
                    ? 'bg-[#181126] border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.35)] ring-1 ring-[#A855F7]'
                    : 'bg-[#0D0914] border-[#21182B] hover:border-[#8B5CF6]/60 hover:bg-[#120D1C]'
                }`}
              >
                {/* Icon & Title */}
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-base flex-shrink-0">{area.icon}</span>
                  <span className="text-xs font-bold text-white truncate leading-tight group-hover:text-[#DDD6FE]">
                    {area.name}
                  </span>
                </div>

                {/* Subtitle: X goals · Y achieved */}
                <div className="text-[11px] font-mono text-[#8F879A]">
                  <span className="text-[#DDD6FE] font-semibold">{counts.total}</span> {counts.total === 1 ? 'goal' : 'goals'} · <span className="text-white font-semibold">{counts.achieved}</span> achieved
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TOP PRIORITIES */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
          TOP PRIORITIES
        </h3>

        {topPriorities.length === 0 ? (
          <div className="p-8 rounded-[20px] bg-[#0D0914] border border-[#21182B] text-center space-y-2">
            <p className="text-xs text-[#8F879A]">No high priority goals pinned yet.</p>
            <p className="text-[11px] text-[#5F5868]">Pin goals or mark them as High Priority to feature them here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topPriorities.map((goal) => {
              const progress = calculateGoalProgress(goal);
              const daysInfo = getDaysRemaining(goal.deadline);
              const isExpanded = !!expandedGoalIds[goal.id];
              const areaName = goal.lifeArea || goal.category;
              const areaObj = LIFE_AREAS.find(a => a.name === areaName);

              return (
                <div
                  key={goal.id}
                  className="relative overflow-hidden rounded-[22px] bg-[#0D0914] border border-[#21182B] hover:border-[#8B5CF6]/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all duration-300 space-y-4"
                >
                  {/* Top Row: Name, Status, Area, Days, Pin */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5 flex-wrap">
                        <h4 className="text-base font-bold text-white tracking-tight">
                          {goal.name}
                        </h4>
                        
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${
                          progress === 100 || goal.status === 'COMPLETED'
                            ? 'bg-purple-900/40 text-[#DDD6FE] border border-[#A855F7]'
                            : 'bg-[#181126] text-[#C084FC] border border-[#8B5CF6]/50 shadow-[0_0_8px_rgba(139,92,246,0.25)]'
                        }`}>
                          {progress === 100 || goal.status === 'COMPLETED' ? 'COMPLETED' : goal.status}
                        </span>

                        {/* Priority Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase font-mono bg-[#140F1C] border border-[#2A2035] text-[#8F879A]">
                          {goal.priority}
                        </span>
                      </div>

                      {/* Area & Days Left */}
                      <div className="flex items-center space-x-3 text-xs font-mono">
                        <span className="text-[#DDD6FE] font-bold uppercase tracking-wider flex items-center space-x-1">
                          <span>{areaObj?.icon || '🎯'}</span>
                          <span>{areaName}</span>
                        </span>
                        <span className="text-[#8F879A]">•</span>
                        <span className={`${daysInfo.isOverdue ? 'text-red-400 font-bold' : 'text-[#8F879A]'}`}>
                          {daysInfo.text}
                        </span>
                      </div>
                    </div>

                    {/* Right Action Icons: Pin & Expand */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleTogglePin(goal.id, e)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          goal.isPinned 
                            ? 'text-[#C084FC] bg-[#8B5CF6]/20 border border-[#A855F7]/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                            : 'text-[#8F879A] hover:text-white hover:bg-[#140F1C]'
                        }`}
                        title={goal.isPinned ? 'Unpin from Top Priorities' : 'Pin to Top Priorities'}
                      >
                        <Pin className="w-4 h-4 fill-current" />
                      </button>

                      <button
                        onClick={() => toggleGoalExpansion(goal.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#140F1C] border border-[#2A2035] hover:border-[#8B5CF6] text-xs font-semibold text-[#DDD6FE] transition-colors cursor-pointer"
                      >
                        <span>{goal.steps?.length || 0} Steps</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                  </div>

                  {/* Large Purple Glowing Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-[#8F879A]">
                        {goal.steps ? `${goal.steps.filter(s => s.completed).length} of ${goal.steps.length} steps complete` : 'Progress'}
                      </span>
                      <span className="text-white text-sm">
                        {progress}%
                      </span>
                    </div>

                    <div className="relative h-2.5 w-full rounded-full bg-[#161022] overflow-hidden border border-[#21182B]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#C084FC] shadow-[0_0_14px_rgba(168,85,247,0.8)] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Expanded Step-by-Step Checklist */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-[#21182B] space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#DDD6FE] uppercase tracking-wider font-mono">
                          Dated Steps & Milestones
                        </span>
                      </div>

                      {/* Steps List */}
                      <div className="space-y-2">
                        {(!goal.steps || goal.steps.length === 0) ? (
                          <p className="text-xs text-[#8F879A] italic">No steps added yet. Add steps below to track incremental progress.</p>
                        ) : (
                          goal.steps.map((step) => {
                            const stepDays = getDaysRemaining(step.deadline);
                            return (
                              <div
                                key={step.id}
                                onClick={() => handleToggleStep(goal.id, step.id)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  step.completed
                                    ? 'bg-[#120D1A]/70 border-[#21182B] opacity-80'
                                    : 'bg-[#140F1E] border-[#2A2035] hover:border-[#8B5CF6]/70'
                                }`}
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleStep(goal.id, step.id, e)}
                                    className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                                      step.completed
                                        ? 'bg-[#8B5CF6] text-white shadow-[0_0_8px_rgba(139,92,246,0.7)]'
                                        : 'bg-transparent border border-[#3A2D4A] hover:border-[#8B5CF6]'
                                    }`}
                                  >
                                    {step.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                  </button>

                                  <div>
                                    <p className={`text-xs font-medium transition-colors ${
                                      step.completed ? 'text-[#8F879A] line-through' : 'text-white'
                                    }`}>
                                      {step.title}
                                    </p>
                                    {step.deadline && (
                                      <p className="text-[10px] font-mono text-[#8F879A]">
                                        Due: {formatDisplayDate(step.deadline)} • <span className={stepDays.isOverdue && !step.completed ? 'text-red-400 font-bold' : 'text-[#DDD6FE]'}>{stepDays.text}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteStep(goal.id, step.id, e)}
                                  className="p-1 text-[#8F879A] hover:text-red-400 transition-colors"
                                  title="Remove Step"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Quick Add Step Input */}
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="text"
                          placeholder="+ Add new dated step / milestone..."
                          value={stepDrafts[goal.id]?.title || ''}
                          onChange={(e) => setStepDrafts(prev => ({
                            ...prev,
                            [goal.id]: { ...(prev[goal.id] || { deadline: '' }), title: e.target.value }
                          }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddStepToGoal(goal.id);
                            }
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                        />
                        <input
                          type="date"
                          value={stepDrafts[goal.id]?.deadline || ''}
                          onChange={(e) => setStepDrafts(prev => ({
                            ...prev,
                            [goal.id]: { ...(prev[goal.id] || { title: '' }), deadline: e.target.value }
                          }))}
                          className="px-2.5 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                          title="Step Deadline"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddStepToGoal(goal.id)}
                          className="px-3 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(139,92,246,0.3)] cursor-pointer"
                        >
                          Add
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. ALL GOALS SECTION (SEARCH, FILTERS, LIST) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4 pt-4 border-t border-[#21182B]/80">
        
        {/* Section Header & Search / Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-extrabold tracking-widest text-[#8F879A] uppercase font-mono">
              ALL GOALS ({filteredGoals.length})
            </h3>
            <p className="text-xs text-[#8F879A]">
              Filter, track and manage your journey across all 10 life dimensions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#8F879A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search goals, milestones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0D0914] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-[#0D0914] border border-[#2A2035] text-[#DDD6FE] text-xs font-bold focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="NOT_STARTED">Not Started</option>
            </select>
          </div>
        </div>

        {/* Goals Grid / List */}
        {filteredGoals.length === 0 ? (
          <div className="p-12 rounded-[24px] bg-[#0D0914] border border-[#21182B] text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#161022] border border-[#2A2035] flex items-center justify-center text-[#8F879A]">
              <Target className="w-7 h-7 text-[#8B5CF6]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">No goals matching criteria.</h4>
              <p className="text-xs text-[#8F879A]">Create a new goal or select another life area filter.</p>
            </div>
            <button
              onClick={() => handleOpenCreateGoal()}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Goal</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGoals.map((goal) => {
              const progress = calculateGoalProgress(goal);
              const daysInfo = getDaysRemaining(goal.deadline);
              const isExpanded = !!expandedGoalIds[goal.id];
              const areaName = goal.lifeArea || goal.category;
              const areaObj = LIFE_AREAS.find(a => a.name === areaName);

              return (
                <div
                  key={goal.id}
                  className={`relative rounded-[22px] p-5 flex flex-col justify-between border transition-all duration-300 space-y-4 ${
                    progress === 100 || goal.status === 'COMPLETED'
                      ? 'bg-[#120B1E] border-[#A855F7]/60 shadow-[0_0_24px_rgba(168,85,247,0.2)]'
                      : 'bg-[#0D0914] border-[#21182B] hover:border-[#8B5CF6]/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                  }`}
                >
                  {/* Top info */}
                  <div className="space-y-2">
                    
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {/* Area capsule */}
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#181226] border border-[#8B5CF6]/30 text-[#DDD6FE] text-[10px] font-bold font-mono uppercase tracking-wider mb-1.5">
                          <span>{areaObj?.icon || '🎯'}</span>
                          <span>{areaName}</span>
                        </span>

                        <h4 className="text-base font-bold text-white tracking-tight leading-snug">
                          {goal.name}
                        </h4>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleTogglePin(goal.id, e)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            goal.isPinned ? 'text-[#C084FC] bg-[#8B5CF6]/20' : 'text-[#8F879A] hover:text-white'
                          }`}
                          title="Pin as Priority"
                        >
                          <Pin className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={(e) => handleOpenEditGoal(goal, e)}
                          className="p-1.5 rounded-lg text-[#8F879A] hover:text-[#DDD6FE] hover:bg-[#181226] transition-colors"
                          title="Edit Goal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteGoal(goal.id, goal.name, e)}
                          className="p-1.5 rounded-lg text-[#8F879A] hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Target Statement */}
                    {goal.targetStatement && (
                      <div className="p-2 rounded-xl bg-[#140F1E] border border-[#2A2035] text-xs text-[#DDD6FE]">
                        <span className="font-bold text-[#A855F7] font-mono uppercase text-[10px] block">Target:</span>
                        {goal.targetStatement}
                      </div>
                    )}

                    {/* Description */}
                    {goal.description && (
                      <p className="text-xs text-[#8F879A] line-clamp-2">
                        {goal.description}
                      </p>
                    )}

                  </div>

                  {/* Progress & Milestone summary */}
                  <div className="space-y-2 pt-2 border-t border-[#21182B]/60">
                    
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#8F879A]">
                        {goal.steps ? `${goal.steps.filter(s => s.completed).length}/${goal.steps.length} steps` : 'Progress'}
                      </span>
                      
                      {progress === 100 ? (
                        <span className="inline-flex items-center space-x-1 text-[#C084FC] font-bold">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>100% ACHIEVED</span>
                        </span>
                      ) : (
                        <span className="text-white font-bold">{progress}%</span>
                      )}
                    </div>

                    <div className="relative h-2 w-full rounded-full bg-[#161022] overflow-hidden border border-[#21182B]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.7)] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-[#8F879A] pt-1">
                      <span>Due: {formatDisplayDate(goal.deadline)}</span>
                      <span className={daysInfo.isOverdue && progress < 100 ? 'text-red-400 font-bold' : 'text-[#DDD6FE]'}>
                        {daysInfo.text}
                      </span>
                    </div>

                  </div>

                  {/* Expand / Collapse Steps */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => toggleGoalExpansion(goal.id)}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-[#140F1E] border border-[#2A2035] hover:border-[#8B5CF6] text-xs font-bold text-[#DDD6FE] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        <span>Steps & Milestones ({goal.steps?.length || 0})</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-2 animate-in fade-in duration-150">
                        {goal.steps?.map((step) => (
                          <div
                            key={step.id}
                            onClick={() => handleToggleStep(goal.id, step.id)}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer ${
                              step.completed
                                ? 'bg-[#120D1A] border-[#21182B] text-[#8F879A] line-through'
                                : 'bg-[#161022] border-[#2A2035] text-white hover:border-[#8B5CF6]'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <button
                                type="button"
                                onClick={(e) => handleToggleStep(goal.id, step.id, e)}
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                                  step.completed ? 'bg-[#8B5CF6] text-white' : 'border border-[#3A2D4A]'
                                }`}
                              >
                                {step.completed && <Check className="w-2.5 h-2.5" />}
                              </button>
                              <span className="truncate">{step.title}</span>
                            </div>
                            {step.deadline && (
                              <span className="text-[10px] font-mono text-[#8F879A] flex-shrink-0 ml-2">
                                {formatDisplayDate(step.deadline)}
                              </span>
                            )}
                          </div>
                        ))}

                        {/* Inline Add Step */}
                        <div className="flex items-center space-x-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="+ Add dated step..."
                            value={stepDrafts[goal.id]?.title || ''}
                            onChange={(e) => setStepDrafts(prev => ({
                              ...prev,
                              [goal.id]: { ...(prev[goal.id] || { deadline: '' }), title: e.target.value }
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddStepToGoal(goal.id);
                              }
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddStepToGoal(goal.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED]"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT GOAL */}
      {/* ------------------------------------------------------------- */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg p-6 rounded-2xl bg-[#0B0910] border border-[#8B5CF6]/50 shadow-[0_0_40px_rgba(139,92,246,0.35)] space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-900">
            
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {editingGoal ? 'Edit Goal' : 'CREATE GOAL'}
                </h3>
                <p className="text-xs font-mono text-[#8F879A]">
                  Define milestone targets and break them into dated steps
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="text-[#8F879A] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              
              {/* Goal Name */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Learn Java DSA, Get Consistently Fit, Save ₹50,000"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  autoFocus
                />
              </div>

              {/* Life Area Selector (10 Areas) */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                  Life Area (1 of 10) *
                </label>
                <select
                  value={goalForm.lifeArea}
                  onChange={(e) => setGoalForm({ ...goalForm, lifeArea: e.target.value as LifeAreaName })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                >
                  {LIFE_AREAS.map(a => (
                    <option key={a.name} value={a.name}>
                      {a.icon} {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Statement */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                  Target Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complete 150 DSA problems, Run 5km sub-26min"
                  value={goalForm.targetStatement}
                  onChange={(e) => setGoalForm({ ...goalForm, targetStatement: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                  Description / Strategy (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Context, execution routine, resources..."
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] resize-none"
                />
              </div>

              {/* Dates & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={goalForm.startDate}
                    onChange={(e) => setGoalForm({ ...goalForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                    Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={goalForm.deadline}
                    onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={goalForm.priority}
                    onChange={(e) => setGoalForm({ ...goalForm, priority: e.target.value as GoalPriority })}
                    className="w-full px-3 py-2 rounded-xl bg-[#140F1C] border border-[#2A2035] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Pinned as Top Priority Checkbox */}
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-[#140F1C] border border-[#21182B]">
                <input
                  type="checkbox"
                  id="pinGoal"
                  checked={goalForm.isPinned}
                  onChange={(e) => setGoalForm({ ...goalForm, isPinned: e.target.checked })}
                  className="w-4 h-4 rounded text-[#8B5CF6] focus:ring-[#8B5CF6] accent-[#8B5CF6] cursor-pointer"
                />
                <label htmlFor="pinGoal" className="text-xs font-bold text-white cursor-pointer select-none">
                  Pin to TOP PRIORITIES header section
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#21182B]">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8F879A] hover:bg-[#140F1C] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] hover:from-[#7C3AED] hover:to-[#9333ea] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
                >
                  {editingGoal ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

