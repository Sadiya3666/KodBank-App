import { apiRequest, handleApiError } from './api';

const authService = {
  // Register new user
  signup: async (name, email, password) => {
    try {
      const response = await apiRequest.post('/auth/signup', {
        name,
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await apiRequest.post('/auth/login', {
        email,
        password
      });
      
      // Store token and user data
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Logout user
  logout: async () => {
    try {
      await apiRequest.post('/auth/logout');
    } catch (error) {
      // Even if logout fails on server, clear local storage
      console.warn('Logout request failed:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Get current user profile
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Store user data
  setUserData: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Clear all auth data
  clearAuthData: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export default authService;
