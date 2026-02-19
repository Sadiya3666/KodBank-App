import { useContext, useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';

// Custom hook for authentication
export const useAuth = () => {
  const {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    signup,
    logout,
    updateUser,
    refreshUser,
    clearAuthData,
    getUserRole,
    setError,
    refreshToken,
    isTokenExpired,
    getTokenExpiration
  } = useAuthContext();

  // Helper function to check if user has specific role
  const hasRole = useCallback((role) => {
    return getUserRole() === role;
  }, [getUserRole]);

  // Helper function to get user display name
  const getDisplayName = useCallback(() => {
    return user?.name || 'User';
  }, [user]);

  // Helper function to get user initials
  const getUserInitials = useCallback(() => {
    if (!user?.name) return 'U';
    
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[names.length - 1][0];
    }
    return names[0][0];
  }, [user]);

  // Helper function to format user creation date
  const getMemberSince = useCallback(() => {
    if (!user?.created_at) return null;
    
    return new Date(user.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [user]);

  // Clear any auth errors
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    // Core auth state
    user,
    token,
    loading,
    error,
    isAuthenticated,
    
    // Auth actions
    login,
    signup,
    logout,
    updateUser,
    refreshUser,
    clearAuthData,
    
    // User info helpers
    getDisplayName,
    getUserInitials,
    getMemberSince,
    getUserRole,
    hasRole,
    
    // Token helpers
    refreshToken,
    isTokenExpired,
    getTokenExpiration,
    
    // Error handling
    setError,
    clearError
  };
};

export default useAuth;
