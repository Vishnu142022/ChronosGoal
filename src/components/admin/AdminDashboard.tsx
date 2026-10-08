import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Sliders, 
  Activity, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  KeyRound, 
  X, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  Flame, 
  Check, 
  Eye, 
  Server
} from 'lucide-react';
import { User, GoalParameter, AuditLog } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface AdminDashboardProps {
  currentUser: User;
}

type AdminTab = 'overview' | 'goals' | 'users' | 'usage' | 'audit' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Admin Data States
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [goalParams, setGoalParams] = useState<any[]>([]);
  const [toolUsage, setToolUsage] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Search
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [editingGoalParam, setEditingGoalParam] = useState<any | null>(null);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState<boolean>(false);
  const [resetTargetUser, setResetTargetUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Goal Parameter Form
  const [paramForm, setParamForm] = useState({
    name: '',
    categoryName: 'Software Engineering',
    metricType: 'HOURS',
    defaultTargetHours: 20,
    minTargetHours: 5,
    maxTargetHours: 60,
    suggestedDeadlineDays: 30,
    difficultyMultiplier: 1.2,
    isActive: true,
    description: '',
    color: '#8B5CF6'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all admin data
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Admin dashboard request failed (${response.status})`);
      }
      const data = await response.json();
      if (data.stats) setStats(data.stats);
      if (data.users) setUsers(data.users);
      if (data.parameters) setGoalParams(data.parameters);
      if (data.usage) setToolUsage(data.usage);
      if (data.logs) setAuditLogs(data.logs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // User Actions
  const handleToggleUserStatus = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`User ${user.email} status changed to ${newStatus}`);
        fetchData();
      } else {
        showToast(data.message || data.error || 'Failed to update user status');
      }
    } catch (err) {
      showToast('Network error');
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Permanently delete user ${user.email}? This will erase all habits and sessions.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`User ${user.email} deleted`);
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.message || data.error || 'Failed to delete user');
      }
    } catch (err) {
      showToast('Network error');
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || newPasswordInput.length < 8) return;

    try {
      const res = await fetch(`/api/admin/users/${resetTargetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Password updated for ${resetTargetUser.email}`);
        setIsResetPasswordModalOpen(false);
        setNewPasswordInput('');
        setResetTargetUser(null);
      } else {
        showToast(data.message || data.error || 'Password reset failed');
      }
    } catch (err) {
      showToast('Network error');
    }
  };

  // Goal Parameter Actions
  const handleSaveGoalParam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGoalParam) {
        const res = await fetch(`/api/admin/goals/${editingGoalParam.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paramForm)
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.message || data.error || 'Failed to update goal parameter');
          return;
        }
        showToast(`Goal parameter "${paramForm.name}" updated`);
      } else {
        const res = await fetch('/api/admin/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paramForm)
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.message || data.error || 'Failed to create goal parameter');
          return;
        }
        showToast(`Goal parameter "${paramForm.name}" created`);
      }
      setIsGoalModalOpen(false);
      setEditingGoalParam(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save goal parameter');
    }
  };

  const handleDeleteGoalParam = async (paramId: string, name: string) => {
    if (!window.confirm(`Delete goal parameter "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/goals/${paramId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Parameter "${name}" deleted`);
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.message || data.error || 'Failed to delete parameter');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete parameter');
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-[85vh] w-full pb-16 text-[#F5F3F7] font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#0D0912] border border-[#8B5CF6] text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-[#C084FC]" />
          <span className="text-xs font-semibold">{toast}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. ADMIN HEADER & NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 p-4 rounded-2xl bg-[#0C0910] border border-[#21182B] shadow-md">
        
        {/* Top-Left: ADMIN PANEL */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-[#8B5CF6]/50 flex items-center justify-center text-[#C084FC] shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white font-['Space_Grotesk'] uppercase">
              ADMIN PANEL
            </h1>
            <p className="text-[11px] text-[#8F879A] font-mono">Role-Based Security & OS Control</p>
          </div>
        </div>

        {/* Center: Admin Navigation Tabs */}
        <nav className="flex items-center p-1 rounded-xl bg-[#130E19] border border-[#21182B] overflow-x-auto max-w-full">
          {[
            { key: 'overview' as AdminTab, label: 'Dashboard', icon: TrendingUp },
            { key: 'goals' as AdminTab, label: 'Goal Parameters', icon: Sliders },
            { key: 'users' as AdminTab, label: 'Manage Users', icon: Users },
            { key: 'usage' as AdminTab, label: 'Tool Usage', icon: Activity },
            { key: 'audit' as AdminTab, label: 'Audit Logs', icon: FileText }
          ].map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                    : 'text-[#8F879A] hover:text-[#DDD6FE] hover:bg-[#100C15]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Top-Right: Admin Email & Logout */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{currentUser.name}</p>
            <p className="text-[10px] text-[#8F879A] font-mono">{currentUser.email}</p>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Log out of administrator session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 8. ADMIN DASHBOARD OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl bg-[#0C0910] border border-[#21182B] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <span className="text-[11px] font-bold text-[#8F879A] uppercase tracking-wider font-mono">TOTAL USERS</span>
              <p className="text-3xl font-extrabold text-white mt-1 font-['Space_Grotesk']">
                {stats?.totalUsers ?? users.length}
              </p>
              <span className="text-[10px] text-[#A855F7] font-semibold">Active in database</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C0910] border border-[#21182B] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <span className="text-[11px] font-bold text-[#8F879A] uppercase tracking-wider font-mono">ACTIVE USERS</span>
              <p className="text-3xl font-extrabold text-[#C084FC] mt-1 font-['Space_Grotesk']">
                {stats?.activeUsers ?? users.filter(u => u.status === 'ACTIVE').length}
              </p>
              <span className="text-[10px] text-[#DDD6FE] font-semibold">Unrestricted access</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C0910] border border-[#21182B] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <span className="text-[11px] font-bold text-[#8F879A] uppercase tracking-wider font-mono">HABITS COMPLETED</span>
              <p className="text-3xl font-extrabold text-[#DDD6FE] mt-1 font-['Space_Grotesk']">
                {stats?.habitsCompleted ?? 0}
              </p>
              <span className="text-[10px] text-[#A855F7] font-semibold">Across all user matrices</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C0910] border border-[#21182B] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <span className="text-[11px] font-bold text-[#8F879A] uppercase tracking-wider font-mono">TOOL INVOCATIONS</span>
              <p className="text-3xl font-extrabold text-white mt-1 font-['Space_Grotesk']">
                {stats?.totalToolInvocations ?? toolUsage.length}
              </p>
              <span className="text-[10px] text-green-400 font-semibold">Tracked system telemetry</span>
            </div>

          </div>

          {/* System Health & Recent Audit Trail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            <div className="p-5 rounded-2xl bg-[#0C0910] border border-[#21182B] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-[#DDD6FE] uppercase tracking-wider">
                  Recent Security & Admin Events
                </h3>
                <span className="text-[10px] text-[#8F879A] font-mono">Live Stream</span>
              </div>
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-[#130E19] border border-[#21182B] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#C084FC] font-mono text-[11px]">{log.action}</span>
                      <p className="text-[#8F879A] text-[11px] truncate max-w-xs">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-[#8F879A] font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C0910] border border-[#21182B] space-y-3">
              <h3 className="text-xs font-extrabold text-[#DDD6FE] uppercase tracking-wider">
                System Infrastructure Status
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2 rounded-lg bg-[#130E19]">
                  <span className="text-[#8F879A]">Database Driver</span>
                  <span className="font-bold text-white font-mono">MySQL / JDBC</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[#130E19]">
                  <span className="text-[#8F879A]">Authentication Cookie</span>
                  <span className="font-bold text-green-400 font-mono">HttpOnly / SameSite Protected</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-[#130E19]">
                  <span className="text-[#8F879A]">Password Encryption</span>
                  <span className="font-bold text-[#C084FC] font-mono">bcryptjs (Salt Rounds: 10)</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. CONFIGURE GOAL PARAMETERS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0C0910] border border-[#21182B]">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Global Goal Protocols</h2>
              <p className="text-xs text-[#8F879A]">Configure target parameters that propagate to all user profiles.</p>
            </div>
            <button
              onClick={() => {
                setEditingGoalParam(null);
                setParamForm({
                  name: '',
                  categoryName: 'Software Engineering',
                  metricType: 'HOURS',
                  defaultTargetHours: 20,
                  minTargetHours: 5,
                  maxTargetHours: 60,
                  suggestedDeadlineDays: 30,
                  difficultyMultiplier: 1.2,
                  isActive: true,
                  description: '',
                  color: '#8B5CF6'
                });
                setIsGoalModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Parameter</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goalParams.map(param => (
              <div key={param.id} className="p-4 rounded-2xl bg-[#0C0910] border border-[#21182B] hover:border-[#8B5CF6]/50 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#130E19] text-[#C084FC]" style={{ borderColor: param.color }}>
                      {param.categoryName}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingGoalParam(param);
                          setParamForm({ ...param });
                          setIsGoalModalOpen(true);
                        }}
                        className="p-1 rounded text-[#8F879A] hover:text-[#DDD6FE]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoalParam(param.id, param.name)}
                        className="p-1 rounded text-[#8F879A] hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-2">{param.name}</h3>
                  <p className="text-xs text-[#8F879A] mt-1">{param.description}</p>
                </div>

                <div className="pt-2 border-t border-[#21182B] text-[11px] flex justify-between text-[#8F879A]">
                  <span>Target: <strong className="text-white">{param.defaultTargetHours}h</strong></span>
                  <span>Range: {param.minTargetHours}h - {param.maxTargetHours}h</span>
                  <span>Diff: ×{param.difficultyMultiplier}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. MANAGE USERS TABLE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Search & Filters */}
          <div className="p-4 rounded-2xl bg-[#0C0910] border border-[#21182B] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F879A]" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#130E19] border border-[#21182B] focus:border-[#8B5CF6] text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#130E19] border border-[#21182B] text-xs text-white focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="USER">User Only</option>
                <option value="ADMIN">Admin Only</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#130E19] border border-[#21182B] text-xs text-white focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto rounded-2xl bg-[#0C0910] border border-[#21182B]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#08050B]/60 text-[#8F879A] border-b border-[#21182B] uppercase font-mono tracking-wider">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created</th>
                  <th className="p-3.5">Last Login</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21182B]/60">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-[#130E19]/40 transition-colors">
                    <td className="p-3.5 font-bold text-white">{user.name}</td>
                    <td className="p-3.5 font-mono text-[#DDD6FE]">{user.email}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        user.role === 'ADMIN' ? 'bg-purple-950 border border-[#8B5CF6] text-[#C084FC]' : 'bg-[#130E19] text-[#8F879A]'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.status === 'ACTIVE' ? 'bg-green-950/40 text-green-400' : 'bg-red-950/40 text-red-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#8F879A]">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-3.5 text-[#8F879A] font-mono">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-1 rounded bg-[#130E19] hover:bg-[#21182B] text-[#DDD6FE]"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className="p-1 rounded bg-[#130E19] hover:bg-[#21182B] text-amber-400"
                          title={user.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setResetTargetUser(user);
                            setIsResetPasswordModalOpen(true);
                          }}
                          className="p-1 rounded bg-[#130E19] hover:bg-[#21182B] text-[#C084FC]"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1 rounded bg-[#130E19] hover:bg-[#21182B] text-red-400"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 12. MONITOR TOOL USAGE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0C0910] border border-[#21182B]">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Application Telemetry & Tool Invocations</h2>
            <p className="text-xs text-[#8F879A]">Live record of habit toggles, stopwatch sessions, and user tools.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-[#0C0910] border border-[#21182B]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#08050B]/60 text-[#8F879A] border-b border-[#21182B] font-mono uppercase">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Tool</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21182B]/60">
                {toolUsage.map(u => (
                  <tr key={u.id} className="hover:bg-[#130E19]/40">
                    <td className="p-3.5 font-bold text-white">{u.userName || 'Anonymous'}</td>
                    <td className="p-3.5 text-[#C084FC]">{u.tool}</td>
                    <td className="p-3.5 font-mono text-[11px] text-[#DDD6FE]">{u.action}</td>
                    <td className="p-3.5 font-mono text-[#8F879A]">{u.durationMs}ms</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-950/40 text-green-400">
                        SUCCESS
                      </span>
                    </td>
                    <td className="p-3.5 text-[#8F879A] font-mono">{new Date(u.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 13. AUDIT LOGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0C0910] border border-[#21182B]">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Immutable Security Audit Trail</h2>
            <p className="text-xs text-[#8F879A]">Append-only log recording admin actions, privilege changes, and resets.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-[#0C0910] border border-[#21182B]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#08050B]/60 text-[#8F879A] border-b border-[#21182B] font-mono uppercase">
                <tr>
                  <th className="p-3.5">Admin</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target</th>
                  <th className="p-3.5">Details</th>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21182B]/60">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#130E19]/40 font-mono text-xs">
                    <td className="p-3.5 text-white font-bold">{log.adminEmail}</td>
                    <td className="p-3.5 text-[#C084FC]">{log.action}</td>
                    <td className="p-3.5 text-[#DDD6FE]">{log.targetUserEmail || 'N/A'}</td>
                    <td className="p-3.5 text-[#8F879A] max-w-xs truncate">{log.details}</td>
                    <td className="p-3.5 text-[#8F879A]">{log.ipAddress}</td>
                    <td className="p-3.5 text-[#8F879A]">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 11. MODAL: USER DETAILS */}
      {/* ------------------------------------------------------------- */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#0D0912] border border-[#8B5CF6]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <h3 className="text-sm font-bold text-white">User Profile & Metadata</h3>
              <button onClick={() => setSelectedUser(null)} className="text-[#8F879A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-[#130E19]">
                <span className="text-[#8F879A]">Full Name:</span>
                <span className="font-bold text-white">{selectedUser.name}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-[#130E19]">
                <span className="text-[#8F879A]">Email Address:</span>
                <span className="font-mono text-[#DDD6FE]">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-[#130E19]">
                <span className="text-[#8F879A]">Access Role:</span>
                <span className="font-bold text-[#C084FC]">{selectedUser.role}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-[#130E19]">
                <span className="text-[#8F879A]">Account Status:</span>
                <span className="font-bold text-green-400">{selectedUser.status}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-[#130E19]">
                <span className="text-[#8F879A]">Account Created:</span>
                <span className="text-[#8F879A]">{new Date(selectedUser.createdAt).toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#130E19] text-[#8F879A]">
                <span className="block font-semibold mb-1">Password Hash:</span>
                <span className="font-mono text-[10px] break-all text-purple-300">
                  [PROTECTED BCRYPT HASH]
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADMIN RESET USER PASSWORD */}
      {/* ------------------------------------------------------------- */}
      {isResetPasswordModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#0D0912] border border-[#8B5CF6]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <h3 className="text-sm font-bold text-white">Reset Password for {resetTargetUser.email}</h3>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="text-[#8F879A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase mb-1">
                  New Secure Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#130E19] border border-[#21182B] focus:border-[#8B5CF6] text-white text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8F879A] hover:bg-[#130E19]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT GOAL PARAMETER */}
      {/* ------------------------------------------------------------- */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#0D0912] border border-[#8B5CF6]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#21182B] pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingGoalParam ? 'Edit Goal Protocol' : 'Create Global Goal Protocol'}
              </h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-[#8F879A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoalParam} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  value={paramForm.name}
                  onChange={(e) => setParamForm({ ...paramForm, name: e.target.value })}
                  placeholder="e.g. Daily Study Time"
                  className="w-full px-3 py-2 rounded-xl bg-[#130E19] border border-[#21182B] text-white text-xs focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={paramForm.categoryName}
                    onChange={(e) => setParamForm({ ...paramForm, categoryName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#130E19] border border-[#21182B] text-white text-xs focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#DDD6FE] uppercase mb-1">Target Hours</label>
                  <input
                    type="number"
                    required
                    value={paramForm.defaultTargetHours}
                    onChange={(e) => setParamForm({ ...paramForm, defaultTargetHours: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#130E19] border border-[#21182B] text-white text-xs focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#DDD6FE] uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={paramForm.description}
                  onChange={(e) => setParamForm({ ...paramForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#130E19] border border-[#21182B] text-white text-xs focus:border-[#8B5CF6]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#21182B]">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8F879A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                >
                  Save Parameter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

