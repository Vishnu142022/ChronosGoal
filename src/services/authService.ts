import { User } from '../types';
import { API_ENDPOINTS } from './apiConfig';

export interface AuthResponse {
  message?: string;
  user?: User;
  error?: string;
  redirectTo?: string;
}

class AuthService {

  public async getSession(): Promise<User | null> {
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.ME, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.user || null;

    } catch (err) {
      console.error('Failed to get session:', err);
      return null;
    }
  }

  public async login(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<AuthResponse> {

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          error: data.message || data.error || 'Authentication failed'
        };
      }

      return data;

    } catch (err) {
      console.error('Login error:', err);

      return {
        error: 'Network error. Please try again.'
      };
    }
  }

  public async adminLogin(
    email: string,
    password: string
  ): Promise<AuthResponse> {

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.ADMIN_LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          error: data.message || data.error || 'Admin authentication failed'
        };
      }

      return data;

    } catch (err) {
      console.error('Admin login error:', err);

      return {
        error: 'Network error. Please try again.'
      };
    }
  }

  public async register(
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<AuthResponse> {

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, confirmPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          error: data.message || data.error || 'Registration failed'
        };
      }

      return data;

    } catch (err) {
      console.error('Registration error:', err);

      return {
        error: 'Network error. Please try again.'
      };
    }
  }

  public async logout(): Promise<void> {
    try {
      await fetch(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

}

export const authService = new AuthService();
