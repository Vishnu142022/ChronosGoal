import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { AdminLoginPage } from './components/auth/AdminLoginPage';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { Navbar } from './components/Navbar';
import { UserDashboard } from './components/user/UserDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { storageService } from './services/storageService';

type PublicRoute = 'login' | 'register' | 'admin-login';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const [publicRoute, setPublicRoute] = useState<PublicRoute>('login');
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('just_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('just_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Sync activeTab with user role on authentication
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        setActiveTab('admin');
      } else {
        setActiveTab('user');
      }
    }
  }, [user]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleForbidden = () => {
    setForbiddenMessage('403 Forbidden: Administrator access is restricted to authorized administrative accounts only.');
    setTimeout(() => setForbiddenMessage(null), 5000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050307] text-[#F5F3F7] flex flex-col items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6]/20 border-t-[#8B5CF6] animate-spin shadow-[0_0_20px_rgba(139,92,246,0.5)]" />
        <p className="mt-4 text-xs font-bold tracking-widest text-[#DDD6FE] uppercase font-mono">
          Verifying Authenticated Session...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // UNCONNECTED / UNAUTHENTICATED PUBLIC ROUTES
  // -------------------------------------------------------------
  if (!isAuthenticated || !user) {
    if (publicRoute === 'admin-login') {
      return (
        <AdminLoginPage
          onNavigateUserLogin={() => setPublicRoute('login')}
        />
      );
    }

    if (publicRoute === 'register') {
      return (
        <RegisterPage
          onNavigateLogin={() => setPublicRoute('login')}
        />
      );
    }

    return (
      <>
        <LoginPage
          onNavigateRegister={() => setPublicRoute('register')}
          onNavigateAdminLogin={() => setPublicRoute('admin-login')}
          onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
        />
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
        />
      </>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED USER & ADMIN ROUTED VIEWS
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#050307] text-[#F5F3F7] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* 403 Forbidden Alert Banner */}
      {forbiddenMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 px-5 py-3 rounded-2xl bg-red-950/90 border border-red-500/70 text-red-200 text-xs font-bold shadow-[0_0_30px_rgba(239,68,68,0.5)] backdrop-blur-xl animate-bounce-short">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>{forbiddenMessage}</span>
        </div>
      )}

      {/* Top Authenticated Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={user}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onForbiddenAlert={handleForbidden}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'user' && (
          <UserDashboard
            currentUser={user}
          />
        )}

        {activeTab === 'admin' && (
          user.role === 'ADMIN' ? (
            <AdminDashboard
              currentUser={user}
            />
          ) : (
            <div className="p-12 rounded-3xl bg-[#0D0912] border border-red-500/30 text-center space-y-4 max-w-xl mx-auto my-12">
              <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">403 Forbidden</h2>
              <p className="text-xs text-[#8F879A]">
                You do not have administrative privileges to view this section.
              </p>
              <button
                onClick={() => setActiveTab('user')}
                className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold shadow-lg"
              >
                Return to Productivity OS
              </button>
            </div>
          )
        )}
      </main>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

