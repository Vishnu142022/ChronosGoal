import React, { useState } from 'react';
import { 
  Clock, 
  Target, 
  ShieldCheck, 
  Timer, 
  LogOut,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { PurpleFireDO } from './common/PurpleFireDO';
import { PurpleLightningLogo } from './common/PurpleLightningLogo';

interface NavbarProps {
  activeTab: 'user' | 'admin';
  setActiveTab: (tab: 'user' | 'admin') => void;
  currentUser: User;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onForbiddenAlert?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  theme = 'dark',
  onToggleTheme,
  onForbiddenAlert
}) => {
  const { logout } = useAuth();
  const [logoHovered, setLogoHovered] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleAdminTabClick = () => {
    if (currentUser.role !== 'ADMIN') {
      if (onForbiddenAlert) {
        onForbiddenAlert();
      }
      return;
    }
    setActiveTab('admin');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#08050D]/95 backdrop-blur-md border-b border-[#21182B] text-[#F8F7FC] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & App Branding */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
          >
            <div 
              onClick={() => setActiveTab('user')}
              className="w-10 h-10 rounded-xl overflow-hidden bg-[#050209] text-white flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] ring-1 ring-[#A855F7]/60 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(168,85,247,0.7)] group-hover:ring-[#C084FC]"
            >
              <PurpleLightningLogo />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span 
                  onClick={() => setActiveTab('user')}
                  className="text-xl font-bold tracking-tight text-white font-['Space_Grotesk'] leading-none transition-colors duration-300 group-hover:text-[#DDD6FE]"
                >
                  JUST
                </span>
                <PurpleFireDO 
                  size="sm" 
                  isHovered={logoHovered} 
                  onClick={onToggleTheme}
                  theme={theme}
                />
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs - Hidden */}
          <nav className="hidden items-center space-x-1 bg-[#0B0910] p-1 rounded-xl border border-[#21182B]">
            <button
              onClick={() => setActiveTab('user')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'user'
                  ? 'bg-[#140F1C] text-[#A855F7] border border-[#8B5CF6]/40 shadow-[0_0_12px_rgba(168,85,247,0.25)] font-bold'
                  : 'text-[#8F879A] hover:text-[#DDD6FE] hover:bg-[#100C16]'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Productivity OS</span>
            </button>

            {currentUser.role === 'ADMIN' ? (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-[#140F1C] text-[#A855F7] border border-[#8B5CF6]/40 shadow-[0_0_12px_rgba(168,85,247,0.25)] font-bold'
                    : 'text-[#8F879A] hover:text-[#DDD6FE] hover:bg-[#100C16]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Portal</span>
                <span className="text-[9px] bg-purple-950/60 text-[#C084FC] border border-[#8B5CF6]/40 px-1.5 py-0.2 rounded font-mono">
                  Admin
                </span>
              </button>
            ) : (
              <button
                onClick={handleAdminTabClick}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#5E5668] hover:text-[#8F879A] transition-all"
                title="Admin portal restricted to system administrators"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Portal</span>
              </button>
            )}
          </nav>

          {/* Right Action Tools: User Profile & Logout */}
          <div className="flex items-center space-x-3">
            
            {/* Authenticated User Pill & Logout Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0C0910] border border-[#21182B] hover:border-[#8B5CF6]/50 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-full bg-[#140F1C] border border-[#8B5CF6]/40 flex items-center justify-center text-xs font-bold text-[#DDD6FE]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-xs">
                  <div className="font-semibold text-white leading-tight flex items-center space-x-1.5">
                    <span>{currentUser.name.split(' ')[0]}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      currentUser.role === 'ADMIN' ? 'bg-purple-950 text-[#C084FC] border border-[#8B5CF6]' : 'bg-[#140F1C] text-[#8F879A]'
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#8F879A]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-[#0D0912] border border-[#21182B] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-[#21182B] text-xs">
                    <p className="font-bold text-white">{currentUser.name}</p>
                    <p className="text-[11px] text-[#8F879A] font-mono truncate">{currentUser.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs text-left text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};

