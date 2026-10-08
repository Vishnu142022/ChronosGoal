import React, { useState } from 'react';
import { ShieldAlert, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PurpleFireDO } from '../common/PurpleFireDO';

interface AdminLoginPageProps {
  onNavigateUserLogin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigateUserLogin }) => {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError('Admin email and security password required.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminLogin(email, password);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg('Administrator verified. Loading management system...');
      }
    } catch (err: any) {
      setError(err.message || 'Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#050307] text-[#F5F3F7] relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Background Ambient Dark Violet & Crimson Accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-[radial-gradient(circle,rgba(109,40,217,0.2)_0%,rgba(168,85,247,0.06)_50%,transparent_70%)] blur-3xl opacity-90" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl bg-[#0D0912]/95 border border-[#8B5CF6]/40 shadow-[0_0_50px_rgba(139,92,246,0.25)] backdrop-blur-2xl">
        
        {/* Admin Badge Header */}
        <div className="flex flex-col items-center text-center mb-6 space-y-2">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-950/60 border border-[#A855F7]/50 text-[#C084FC] text-[11px] font-mono font-bold tracking-widest uppercase mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[#A855F7]" />
            <span>Admin Control Portal</span>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight text-[#F5F3F7]">
            Authorized System Sign-In
          </h2>
          <p className="text-xs text-[#8F879A]">
            Restricted to administrative personnel. All access attempts are recorded in the audit log.
          </p>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/50 flex items-center space-x-2.5 text-xs text-red-200 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-purple-950/70 border border-[#A855F7] flex items-center space-x-2.5 text-xs text-[#DDD6FE]">
            <CheckCircle2 className="w-4 h-4 text-[#C084FC] flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F879A]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#130E19] border border-[#2A2035] focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] text-white text-xs font-medium focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F879A]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#130E19] border border-[#2A2035] focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] text-white text-xs font-medium focus:outline-none transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8F879A] hover:text-[#DDD6FE]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#581c87] text-white text-xs font-bold tracking-wider uppercase shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Verify Admin Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#21182B] text-center">
          <button
            type="button"
            onClick={onNavigateUserLogin}
            className="inline-flex items-center space-x-1.5 text-xs text-[#8F879A] hover:text-[#DDD6FE] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Standard User Login</span>
          </button>
        </div>

      </div>

    </div>
  );
};

