import authService from './authService';

const tokenService = {
  // Check if token is expired
  isTokenExpired: (token) => {
    if (!token) return true;
    
    try {
      // Decode JWT token (without verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token expires within 5 minutes (300 seconds)
      return payload.exp < currentTime + 300;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  },

  // Get token expiration time
  getTokenExpiration: (token) => {
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  // Refresh token if needed
  refreshTokenIfNeeded: async () => {
    const token = authService.getToken();
    
    if (!token) {
      return false;
    }
    
    if (tokenService.isTokenExpired(token)) {
      // Token is expired or about to expire
      authService.clearAuthData();
      return false;
    }
    
    return true;
  },

  // Setup token refresh timer
  setupTokenRefreshTimer: (callback) => {
    const token = authService.getToken();
    
    if (!token) {
      return null;
    }
    
    const expiration = tokenService.getTokenExpiration(token);
    if (!expiration) {
      return null;
    }
    
    const currentTime = new Date();
    const timeUntilExpiration = expiration.getTime() - currentTime.getTime();
    
    // Set timer to 5 minutes before expiration
    const refreshTime = Math.max(timeUntilExpiration - 5 * 60 * 1000, 0);
    
    return setTimeout(() => {
      callback();
    }, refreshTime);
  },

  // Clear token refresh timer
  clearTokenRefreshTimer: (timerId) => {
    if (timerId) {
      clearTimeout(timerId);
    }
  },

  // Validate token format
  isValidTokenFormat: (token) => {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    const parts = token.split('.');
    return parts.length === 3;
  },

  // Get user ID from token
  getUserIdFromToken: (token) => {
    if (!token || !tokenService.isValidTokenFormat(token)) {
      return null;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.customer_id || payload.userId || payload.sub;
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
      return null;
    }
  },

  // Get token payload
  getTokenPayload: (token) => {
    if (!token || !tokenService.isValidTokenFormat(token)) {
      return null;
    }
    
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
      console.error('Error extracting token payload:', error);
      return null;
    }
  }
};

export default tokenService;
