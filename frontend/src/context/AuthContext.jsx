import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import bankService from '../services/bankService';
import tokenService from '../services/tokenService';

const AuthContext = createContext();

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const tokenRefreshTimerRef = React.useRef(null);

  // Clear auth data
  const clearAuthData = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    authService.clearAuthData();

    if (tokenRefreshTimerRef.current) {
      tokenService.clearTokenRefreshTimer(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
  }, []);

  // Handle token expiry
  const handleTokenExpiry = useCallback(() => {
    console.warn('Token is about to expire or has expired');
    setShowSessionWarning(false);
    clearAuthData();
    window.location.href = '/login?session=expired';
  }, [clearAuthData]);

  // Setup token refresh timer
  const setupTokenRefreshTimer = useCallback((token) => {
    if (tokenRefreshTimerRef.current) {
      tokenService.clearTokenRefreshTimer(tokenRefreshTimerRef.current);
    }

    const timerId = tokenService.setupTokenRefreshTimer(() => {
      handleTokenExpiry();
    });

    tokenRefreshTimerRef.current = timerId;
  }, [handleTokenExpiry]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = authService.getCurrentUser();

      if (storedToken && storedUser) {
        try {
          // Validate token format
          if (!tokenService.isValidTokenFormat(storedToken)) {
            throw new Error('Invalid token format');
          }

          // Check if token is expired
          if (tokenService.isTokenExpired(storedToken)) {
            throw new Error('Token expired');
          }

          // For now, use stored user data without server verification
          // This allows the app to work even if backend is not running
          setUser(storedUser);
          setToken(storedToken);
          setupTokenRefreshTimer(storedToken);

          // Try to verify with server in the background
          try {
            const response = await bankService.getProfile();
            if (response.success && response.data) {
              setUser(response.data);
            }
          } catch (serverError) {
            console.warn('Server verification failed, using cached user data:', serverError);
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          clearAuthData();
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, [clearAuthData, setupTokenRefreshTimer]);

  // Check session expiry frequently
  useEffect(() => {
    if (!token) return;

    const checkExpiry = () => {
      const expiration = tokenService.getTokenExpiration(token);
      if (!expiration) return;

      const now = new Date().getTime();
      const timeLeft = expiration - now;

      // Warning at 5 minutes
      if (timeLeft > 0 && timeLeft <= 5 * 60 * 1000 && !showSessionWarning) {
        setShowSessionWarning(true);
      }

      if (timeLeft <= 0) {
        handleTokenExpiry();
      }
    };

    const interval = setInterval(checkExpiry, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [token, showSessionWarning, handleTokenExpiry]);

  // Login function
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(email, password);

      if (response.success && response.data) {
        const { token: newToken, user: userData } = response.data;

        setUser(userData);
        setToken(newToken);

        // Setup token refresh timer
        setupTokenRefreshTimer(newToken);

        return response;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setupTokenRefreshTimer]);

  // Signup function
  const signup = useCallback(async (name, email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.signup(name, email, password);

      if (response.success) {
        return response;
      } else {
        throw new Error(response.message || 'Signup failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Signup failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      clearAuthData();
      setLoading(false);
    }
  }, [clearAuthData]);

  // Update user data
  const updateUser = useCallback((userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
    authService.setUserData({ ...user, ...userData });
  }, [user]);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await bankService.getProfile();

      if (response.success && response.data) {
        setUser(response.data);
        authService.setUserData(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If refresh fails due to auth error, logout
      if (error.message.includes('Unauthorized') || error.message.includes('Token')) {
        clearAuthData();
      }
    }
  }, [token, clearAuthData]);

  // Check authentication status
  const isAuthenticated = useCallback(() => {
    return !!(token && user && !loading);
  }, [token, user, loading]);

  // Get user role (for future role-based features)
  const getUserRole = useCallback(() => {
    return user?.role || 'customer';
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshTimerRef.current) {
        tokenService.clearTokenRefreshTimer(tokenRefreshTimerRef.current);
      }
    };
  }, []);

  const value = {
    // State
    user,
    token,
    loading,
    error,
    isAuthenticated: isAuthenticated(),

    // Actions
    login,
    signup,
    logout,
    updateUser,
    refreshUser,
    clearAuthData,

    // Utilities
    getUserRole,
    setError,

    showSessionWarning,
    dismissSessionWarning: () => setShowSessionWarning(false),

    // Token management
    refreshToken: tokenService.refreshTokenIfNeeded,
    isTokenExpired: () => tokenService.isTokenExpired(token),
    getTokenExpiration: () => tokenService.getTokenExpiration(token)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
