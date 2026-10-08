import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PurpleFireDO } from '../common/PurpleFireDO';

interface LoginPageProps {
  onNavigateRegister: () => void;
  onNavigateAdminLogin: () => void;
  onOpenForgotPassword: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateRegister,
  onNavigateAdminLogin,
  onOpenForgotPassword
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('chronos_remembered_email') || '';
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('chronos_remember_user') !== 'false';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Persist or clear remembered email locally for User Login
    if (rememberMe) {
      localStorage.setItem('chronos_remembered_email', email.trim());
      localStorage.setItem('chronos_remember_user', 'true');
    } else {
      localStorage.removeItem('chronos_remembered_email');
      localStorage.setItem('chronos_remember_user', 'false');
    }

    setLoading(true);
    try {
      const res = await login(email, password, rememberMe);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg('Authenticated! Entering Discipline OS...');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#050307] text-[#F5F3F7] relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Background Ambient Violet Halo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-[radial-gradient(circle,rgba(139,92,246,0.15)_0%,rgba(168,85,247,0.05)_45%,transparent_70%)] blur-3xl opacity-80" />
      </div>

      {/* Centered Premium Dark/Purple Card */}
      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl bg-[#0D0912]/90 border border-[#21182B] shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-300">
        
        {/* Top Header & Branding */}
        <div className="flex flex-col items-center text-center mb-6 space-y-2">
          <div className="flex items-center space-x-1 mb-1">
            <span className="text-2xl font-black tracking-tight text-white font-['Space_Grotesk']">
              JUST
            </span>
            <PurpleFireDO size="md" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-[#F5F3F7]">
            Sign in to Discipline OS
          </h2>
          <p className="text-xs text-[#8F879A]">
            Enter your email and password to access your habit matrix.
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center space-x-2.5 text-xs text-red-300 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-purple-950/60 border border-[#A855F7]/60 flex items-center space-x-2.5 text-xs text-[#DDD6FE]">
            <CheckCircle2 className="w-4 h-4 text-[#C084FC] flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1.5">
              Email Address
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
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#130E19] border border-[#21182B] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] text-white text-xs font-medium focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={onOpenForgotPassword}
                className="text-xs text-[#A855F7] hover:text-[#C084FC] transition-colors"
              >
                Forgot Password?
              </button>
            </div>
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
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#130E19] border border-[#21182B] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] text-white text-xs font-medium focus:outline-none transition-all shadow-inner"
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

          {/* Remember Me Option (User Login Only) */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all duration-200 ${
                rememberMe
                  ? 'bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] border-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                  : 'bg-[#130E19] border-[#21182B] group-hover:border-[#8B5CF6]/50'
              }`}>
                {rememberMe && (
                  <svg className="w-2.5 h-2.5 text-white stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-[#8F879A] group-hover:text-[#DDD6FE] transition-colors font-medium">
                Remember me
              </span>
            </label>

            <span className="text-[11px] text-[#8F879A]/70 font-mono">
              30-day session
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#581c87] text-white text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-4 border-t border-[#21182B] flex flex-col items-center space-y-3 text-xs">
          <p className="text-[#8F879A]">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onNavigateRegister}
              className="font-bold text-[#A855F7] hover:text-[#C084FC] transition-colors"
            >
              Create Account
            </button>
          </p>

          <button
            type="button"
            onClick={onNavigateAdminLogin}
            className="flex items-center space-x-1.5 text-[#8F879A] hover:text-[#DDD6FE] transition-colors pt-1"
          >
            <Shield className="w-3.5 h-3.5 text-[#A855F7]" />
            <span>Administrator Access Portal</span>
          </button>
        </div>

      </div>

    </div>
  );
};

