const bankUserModel = require('../models/bankUserModel');
const jwtModel = require('../models/jwtModel');
const jwtService = require('../config/jwt');
const logger = require('../utils/logger');

class AuthService {
  // User registration
  async register(userData) {
    try {
      const { name, email, password } = userData;

      // Validate input data
      if (!name || !email || !password) {
        throw new Error('Name, email, and password are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
        throw new Error('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character');
      }

      // Validate name
      if (name.length < 2 || name.length > 100) {
        throw new Error('Name must be between 2 and 100 characters');
      }

      if (!/^[a-zA-Z\s]+$/.test(name)) {
        throw new Error('Name can only contain letters and spaces');
      }

      // Check if email already exists
      const existingUser = await bankUserModel.findByEmail(email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Create new user
      const newUser = await bankUserModel.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password
      });

      logger.info('User registered successfully', {
        customer_id: newUser.customer_id,
        email: newUser.email
      });

      // Return user data without sensitive information
      return {
        success: true,
        message: 'User registered successfully',
        data: {
          customer_id: newUser.customer_id,
          name: newUser.name,
          email: newUser.email,
          balance: newUser.balance,
          created_at: newUser.created_at
        }
      };
    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  // User login
  async login(credentials) {
    try {
      const { email, password } = credentials;

      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Authenticate user
      const user = await bankUserModel.validatePassword(
        email.toLowerCase().trim(),
        password
      );

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT token
      const token = jwtService.generateToken({
        customer_id: user.customer_id,
        email: user.email,
        name: user.name
      });

      // Calculate token expiry time
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 24); // 24 hours from now

      // Store token in database
      await jwtModel.storeToken({
        customer_id: user.customer_id,
        token_value: token,
        expiry_time: expiryTime
      });

      logger.info('User logged in successfully', {
        customer_id: user.customer_id,
        email: user.email
      });

      return {
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            customer_id: user.customer_id,
            name: user.name,
            email: user.email,
            balance: user.balance
          }
        }
      };
    } catch (error) {
      logger.error('User login failed:', error);
      throw error;
    }
  }

  // User logout
  async logout(token) {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      // Extract token from Authorization header if needed
      const tokenValue = jwtService.extractTokenFromHeader(token) || token;

      // Deactivate token in database
      const deactivatedToken = await jwtModel.deactivateToken(tokenValue);

      if (!deactivatedToken) {
        logger.warn('Token not found for logout', { token: tokenValue.substring(0, 20) + '...' });
      } else {
        logger.info('User logged out successfully', {
          customer_id: deactivatedToken.customer_id
        });
      }

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      logger.error('User logout failed:', error);
      throw error;
    }
  }

  // Validate token
  async validateToken(token) {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      // Extract token from Authorization header if needed
      const tokenValue = jwtService.extractTokenFromHeader(token) || token;

      // Check if token exists in database and is active
      const storedToken = await jwtModel.validateToken(tokenValue);

      if (!storedToken) {
        throw new Error('Invalid or expired token');
      }

      // Verify JWT token
      const decodedToken = jwtService.verifyToken(tokenValue);

      // Get fresh user data
      const user = await bankUserModel.findById(decodedToken.customer_id);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        data: {
          user: {
            customer_id: user.customer_id,
            name: user.name,
            email: user.email,
            balance: user.balance
          },
          token: {
            token_id: storedToken.token_id,
            expiry_time: storedToken.expiry_time
          }
        }
      };
    } catch (error) {
      logger.error('Token validation failed:', error);
      throw error;
    }
  }

  // Refresh token
  async refreshToken(oldToken) {
    try {
      if (!oldToken) {
        throw new Error('No token provided');
      }

      // Extract token from Authorization header if needed
      const tokenValue = jwtService.extractTokenFromHeader(oldToken) || oldToken;

      // Validate old token
      const tokenValidation = await this.validateToken(tokenValue);
      if (!tokenValidation.success) {
        throw new Error('Invalid token for refresh');
      }

      // Generate new token
      const newToken = jwtService.refreshToken(tokenValue);

      // Calculate new token expiry time
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 24);

      // Store new token
      await jwtModel.storeToken({
        customer_id: tokenValidation.data.user.customer_id,
        token_value: newToken,
        expiry_time: expiryTime
      });

      // Deactivate old token
      await jwtModel.deactivateToken(tokenValue);

      logger.info('Token refreshed successfully', {
        customer_id: tokenValidation.data.user.customer_id
      });

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          user: tokenValidation.data.user
        }
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  // Logout from all devices
  async logoutFromAllDevices(customerId) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      // Deactivate all tokens for the user
      const deactivatedCount = await jwtModel.deactivateAllTokensForUser(customerId);

      logger.info('User logged out from all devices', {
        customer_id: customerId,
        tokens_deactivated: deactivatedCount
      });

      return {
        success: true,
        message: 'Logged out from all devices successfully',
        data: {
          tokens_deactivated: deactivatedCount
        }
      };
    } catch (error) {
      logger.error('Logout from all devices failed:', error);
      throw error;
    }
  }

  // Get active sessions for user
  async getActiveSessions(customerId) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const activeTokens = await jwtModel.findActiveTokensByUserId(customerId);

      const sessions = activeTokens.map(token => ({
        token_id: token.token_id,
        created_at: token.created_at,
        expiry_time: token.expiry_time,
        is_expiring_soon: jwtService.isTokenExpiringSoon(token.token_value, 30)
      }));

      return {
        success: true,
        data: {
          sessions,
          active_sessions_count: sessions.length
        }
      };
    } catch (error) {
      logger.error('Get active sessions failed:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(customerId, passwordData) {
    try {
      const { current_password, new_password } = passwordData;

      if (!current_password || !new_password) {
        throw new Error('Current password and new password are required');
      }

      // Validate new password strength
      if (new_password.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(new_password)) {
        throw new Error('New password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character');
      }

      if (current_password === new_password) {
        throw new Error('New password must be different from current password');
      }

      // Get user to verify current password
      const user = await bankUserModel.findById(customerId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bankUserModel.validatePassword(user.email, current_password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      await bankUserModel.updatePassword(customerId, new_password);

      // Logout from all devices (force re-login with new password)
      await this.logoutFromAllDevices(customerId);

      logger.info('Password changed successfully', {
        customer_id: customerId
      });

      return {
        success: true,
        message: 'Password changed successfully. Please login again.'
      };
    } catch (error) {
      logger.error('Change password failed:', error);
      throw error;
    }
  }

  // Get user profile
  async getProfile(customerId) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const user = await bankUserModel.findById(customerId);
      if (!user) {
        throw new Error('User not found');
      }

      const statistics = await bankUserModel.getUserStatistics(customerId);

      return {
        success: true,
        data: {
          customer_id: user.customer_id,
          name: user.name,
          email: user.email,
          balance: user.balance,
          created_at: user.created_at,
          updated_at: user.updated_at,
          statistics: {
            total_transactions: statistics.total_transactions,
            total_deposits: statistics.total_deposits,
            total_withdrawals: statistics.total_withdrawals,
            total_sent: statistics.total_sent,
            total_received: statistics.total_received
          }
        }
      };
    } catch (error) {
      logger.error('Get profile failed:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(customerId, updateData) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const { name, email } = updateData;

      // Validate update data
      if (!name && !email) {
        throw new Error('At least name or email must be provided');
      }

      if (name) {
        if (name.length < 2 || name.length > 100) {
          throw new Error('Name must be between 2 and 100 characters');
        }

        if (!/^[a-zA-Z\s]+$/.test(name)) {
          throw new Error('Name can only contain letters and spaces');
        }
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Invalid email format');
        }

        // Check if email is already used by another user
        const existingUser = await bankUserModel.findByEmail(email);
        if (existingUser && existingUser.customer_id !== customerId) {
          throw new Error('Email already used by another user');
        }
      }

      // Update profile
      const updatedUser = await bankUserModel.updateProfile(customerId, {
        name: name ? name.trim() : undefined,
        email: email ? email.toLowerCase().trim() : undefined
      });

      logger.info('Profile updated successfully', {
        customer_id: customerId
      });

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          customer_id: updatedUser.customer_id,
          name: updatedUser.name,
          email: updatedUser.email,
          balance: updatedUser.balance,
          updated_at: updatedUser.updated_at
        }
      };
    } catch (error) {
      logger.error('Update profile failed:', error);
      throw error;
    }
  }

  // Delete user account
  async deleteAccount(customerId, password) {
    try {
      if (!customerId || !password) {
        throw new Error('Customer ID and password are required');
      }

      // Get user to verify password
      const user = await bankUserModel.findById(customerId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const isValidPassword = await bankUserModel.validatePassword(user.email, password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Check if user has zero balance
      if (parseFloat(user.balance) > 0) {
        throw new Error('Account must have zero balance to be deleted');
      }

      // Delete user (this will also delete associated tokens)
      await bankUserModel.deleteUser(customerId);

      logger.info('User account deleted successfully', {
        customer_id: customerId
      });

      return {
        success: true,
        message: 'Account deleted successfully'
      };
    } catch (error) {
      logger.error('Delete account failed:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
