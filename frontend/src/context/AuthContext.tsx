import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'resident' | 'responder' | 'coordinator' | 'admin';
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<string>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('floodguard_token');
      const storedUser = localStorage.getItem('floodguard_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        try {
          // Fetch current profile to ensure token is still valid
          const response = await api.get('/api/auth/me');
          if (response.data.success) {
            setUser(response.data.user);
            localStorage.setItem('floodguard_user', JSON.stringify(response.data.user));
          }
        } catch (error) {
          console.error('Failed to verify token on startup', error);
          // Handled by axios response interceptor
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user: loggedUser } = response.data;
      
      localStorage.setItem('floodguard_token', token);
      localStorage.setItem('floodguard_user', JSON.stringify(loggedUser));
      
      setToken(token);
      setUser(loggedUser);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    try {
      const response = await api.post('/api/auth/register', { name, email, password, role });
      return response.data.message || 'Registration successful! Please verify your email.';
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('floodguard_token');
    localStorage.removeItem('floodguard_user');
    setToken(null);
    setUser(null);
  };

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await api.get(`/api/auth/verify-email/${verificationToken}`);
      return response.data.message;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Email verification failed';
      throw new Error(message);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data.message;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send recovery email';
      throw new Error(message);
    }
  };

  const resetPassword = async (resetToken: string, password: string) => {
    try {
      const response = await api.post('/api/auth/reset-password', { token: resetToken, password });
      return response.data.message;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password reset failed';
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        verifyEmail,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
