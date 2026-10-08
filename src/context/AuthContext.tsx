import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService, AuthResponse } from '../services/authService';

interface AuthContextType {
  user: User | null;
  role: 'USER' | 'ADMIN' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResponse>;
  adminLogin: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    setIsLoading(true);
    try {
      const activeUser = await authService.getSession();
      setUser(activeUser);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> => {
    const res = await authService.login(email, password, rememberMe);
    if (res.user) {
      setUser(res.user);
    }
    return res;
  };

  const adminLogin = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await authService.adminLogin(email, password);
    if (res.user) {
      setUser(res.user);
    }
    return res;
  };

  const register = async (name: string, email: string, password: string, confirmPassword: string): Promise<AuthResponse> => {
    const res = await authService.register(name, email, password, confirmPassword);
    if (res.user) {
      setUser(res.user);
    }
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        adminLogin,
        register,
        logout,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

