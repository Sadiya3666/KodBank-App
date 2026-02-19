import { useState, useEffect, useCallback } from 'react';
import bankService from '../services/bankService';
import { useAuth } from './useAuth';

export const useBalance = () => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { isAuthenticated, user } = useAuth();

  // Fetch balance from server
  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await bankService.getBalance();
      
      if (response.success && response.data) {
        setBalance(parseFloat(response.data.balance || 0));
        setLastUpdated(new Date());
        
        // Update user data in auth context if balance changed
        if (response.data.balance !== user?.balance) {
          // This would typically be handled by a global state update
          // For now, we'll just update the local balance
        }
      } else {
        throw new Error(response.message || 'Failed to fetch balance');
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Balance fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.balance]);

  // Refresh balance (alias for fetchBalance)
  const refreshBalance = useCallback(async () => {
    return await fetchBalance();
  }, [fetchBalance]);

  // Format balance for display
  const formatBalance = useCallback((amount = balance) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }, [balance]);

  // Check if sufficient balance for transaction
  const hasSufficientBalance = useCallback((amount) => {
    const transactionAmount = parseFloat(amount);
    return !isNaN(transactionAmount) && transactionAmount <= balance;
  }, [balance]);

  // Get balance status
  const getBalanceStatus = useCallback(() => {
    if (balance === 0) return 'empty';
    if (balance < 1000) return 'low';
    if (balance < 10000) return 'medium';
    return 'high';
  }, [balance]);

  // Get balance color based on status
  const getBalanceColor = useCallback(() => {
    const status = getBalanceStatus();
    switch (status) {
      case 'empty':
        return '#f44336'; // Red
      case 'low':
        return '#ff9800'; // Orange
      case 'medium':
        return '#00897b'; // Teal
      case 'high':
        return '#4caf50'; // Green
      default:
        return '#1a237e'; // Deep Blue
    }
  }, [getBalanceStatus]);

  // Get last updated time formatted
  const getLastUpdatedFormatted = useCallback(() => {
    if (!lastUpdated) return null;
    
    const now = new Date();
    const diff = now - lastUpdated;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return lastUpdated.toLocaleDateString();
  }, [lastUpdated]);

  // Clear balance error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-refresh balance every 30 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Initial fetch
    fetchBalance();

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      fetchBalance();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchBalance]);

  // Reset balance when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setBalance(0);
      setLastUpdated(null);
      setError(null);
    }
  }, [isAuthenticated]);

  return {
    // State
    balance,
    loading,
    error,
    lastUpdated,
    
    // Actions
    fetchBalance,
    refreshBalance,
    clearError,
    
    // Utilities
    formatBalance,
    hasSufficientBalance,
    getBalanceStatus,
    getBalanceColor,
    getLastUpdatedFormatted
  };
};

export default useBalance;
