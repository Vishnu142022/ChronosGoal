import React, { useState } from 'react';
import { User as UserIcon, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PurpleFireDO } from '../common/PurpleFireDO';

interface RegisterPageProps {
  onNavigateLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await register(name, email, password, confirmPassword);
      if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
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

      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl bg-[#0D0912]/90 border border-[#21182B] shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6 space-y-2">
          <div className="flex items-center space-x-1 mb-1">
            <span className="text-2xl font-black tracking-tight text-white font-['Space_Grotesk']">
              JUST
            </span>
            <PurpleFireDO size="md" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-[#F5F3F7]">
            Create an Account
          </h2>
          <p className="text-xs text-[#8F879A]">
            Initialize your personal habit and productivity matrix.
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center space-x-2.5 text-xs text-red-300 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F879A]">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#130E19] border border-[#21182B] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] text-white text-xs font-medium focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F879A]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#130E19] border border-[#21182B] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] text-white text-xs font-medium focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
              Password (min. 8 characters)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F879A]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
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

          <div>
            <label className="block text-xs font-bold text-[#DDD6FE] uppercase tracking-wider mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F879A]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#130E19] border border-[#21182B] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] text-white text-xs font-medium focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#581c87] text-white text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#21182B] text-center text-xs text-[#8F879A]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateLogin}
            className="font-bold text-[#A855F7] hover:text-[#C084FC] transition-colors"
          >
            Log In
          </button>
        </div>

      </div>

    </div>
  );
};

