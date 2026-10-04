import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('socialx_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication on app launch
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('socialx_token');
      if (storedToken) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
          setToken(storedToken);
        } catch (err) {
          console.warn('Stored token is invalid or expired:', err.message);
          localStorage.removeItem('socialx_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();

    const handleUnauthorized = () => {
      localStorage.removeItem('socialx_token');
      setUser(null);
      setToken(null);
    };

    window.addEventListener('socialx:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('socialx:unauthorized', handleUnauthorized);
  }, []);

  const login = async ({ emailOrUsername, password }) => {
    const result = await authService.login({ emailOrUsername, password });
    localStorage.setItem('socialx_token', result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  };

  const register = async ({ name, username, email, password }) => {
    const result = await authService.register({ name, username, email, password });
    localStorage.setItem('socialx_token', result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('socialx_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  // Quick 1-click Demo Login for testing college demo accounts
  const quickDemoLogin = async (username = 'alexrivera') => {
    return await login({
      emailOrUsername: username,
      password: 'password123'
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateUser,
        quickDemoLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
