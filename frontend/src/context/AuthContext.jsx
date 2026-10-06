import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { e2eeService } from '../services/e2eeService';
import { secretChatService } from '../services/secretChatService';

const AuthContext = createContext();

const normalizeUser = (u) => {
  if (!u) return null;
  const id = (u._id || u.id)?.toString();
  return {
    ...u,
    _id: id,
    id: id
  };
};

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
          setUser(normalizeUser(userData));
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

  // Ensure client-side E2EE Identity key is generated and registered whenever user is authenticated
  useEffect(() => {
    const myId = (user?._id || user?.id)?.toString();
    if (!myId) return;

    e2eeService
      .getOrCreateIdentityKey(myId)
      .then((identity) => {
        if (identity?.publicKeyJwk) {
          secretChatService.registerPublicKey(identity.publicKeyJwk).catch(() => {});
        }
      })
      .catch(() => {});
  }, [user?._id, user?.id]);

  const login = async ({ emailOrUsername, password }) => {
    const result = await authService.login({ emailOrUsername, password });
    localStorage.setItem('socialx_token', result.token);
    setToken(result.token);
    const normalized = normalizeUser(result.user);
    setUser(normalized);
    return normalized;
  };

  const register = async ({ name, username, email, password }) => {
    const result = await authService.register({ name, username, email, password });
    localStorage.setItem('socialx_token', result.token);
    setToken(result.token);
    const normalized = normalizeUser(result.user);
    setUser(normalized);
    return normalized;
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
    setUser((prev) => (prev ? normalizeUser({ ...prev, ...updatedFields }) : prev));
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
