const authService = require('../services/authService');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
  // User registration
  register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const result = await authService.register({
      name,
      email,
      password
    });

    logger.logAuth('USER_REGISTERED', result.data.customer_id, result.data.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json(result);
  });

  // User login
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login({
      email,
      password
    });

    logger.logAuth('USER_LOGIN', result.data.user.customer_id, result.data.user.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(result);
  });

  // User logout
  logout = asyncHandler(async (req, res) => {
    const token = req.headers.authorization;
    
    const result = await authService.logout(token);

    logger.logAuth('USER_LOGOUT', req.user.customer_id, req.user.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(result);
  });

  // Refresh token
  refreshToken = asyncHandler(async (req, res) => {
    const token = req.headers.authorization;
    
    const result = await authService.refreshToken(token);

    logger.logAuth('TOKEN_REFRESHED', result.data.user.customer_id, result.data.user.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(result);
  });

  // Logout from all devices
  logoutFromAllDevices = asyncHandler(async (req, res) => {
    const result = await authService.logoutFromAllDevices(req.user.customer_id);

    logger.logAuth('USER_LOGOUT_ALL_DEVICES', req.user.customer_id, req.user.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(result);
  });

  // Get active sessions
  getActiveSessions = asyncHandler(async (req, res) => {
    const result = await authService.getActiveSessions(req.user.customer_id);

    res.json(result);
  });

  // Change password
  changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;

    const result = await authService.changePassword(req.user.customer_id, {
      current_password,
      new_password
    });

    logger.logAuth('PASSWORD_CHANGED', req.user.customer_id, req.user.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(result);
  });

  // Get user profile
  getProfile = asyncHandler(async (req, res) => {
    const result = await authService.getProfile(req.user.customer_id);

    res.json(result);
  });

  // Update user profile
  updateProfile = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    const result = await authService.updateProfile(req.user.customer_id, {
      name,
      email
    });

    logger.logAuth('PROFILE_UPDATED', result.data.customer_id, result.data.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      updated_fields: Object.keys({ name, email }).filter(key => req.body[key])
    });

    res.json(result);
  });

  // Delete user account
  deleteAccount = asyncHandler(async (req, res) => {
    const { password } = req.body;

    const result = await authService.deleteAccount(req.user.customer_id, password);

    logger.logAuth('ACCOUNT_DELETED', req.user.customer_id, req.user.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(result);
  });

  // Validate token (for testing/middleware purposes)
  validateToken = asyncHandler(async (req, res) => {
    const token = req.headers.authorization;
    
    const result = await authService.validateToken(token);

    res.json(result);
  });

  // Get authentication status
  getAuthStatus = asyncHandler(async (req, res) => {
    // If we reach here, the user is authenticated (due to auth middleware)
    res.json({
      success: true,
      message: 'User is authenticated',
      data: {
        customer_id: req.user.customer_id,
        name: req.user.name,
        email: req.user.email,
        token_info: {
          token_id: req.token.token_id,
          expiry_time: req.token.expiry_time
        }
      }
    });
  });

  // Extend session
  extendSession = asyncHandler(async (req, res) => {
    const jwtModel = require('../models/jwtModel');
    const jwtService = require('../config/jwt');

    // Extend current token expiry by 24 hours
    const newExpiryTime = new Date();
    newExpiryTime.setHours(newExpiryTime.getHours() + 24);

    const extendedToken = await jwtModel.extendTokenExpiry(
      req.token.token_value,
      newExpiryTime
    );

    if (!extendedToken) {
      return res.status(400).json({
        success: false,
        message: 'Failed to extend session',
        error: 'SESSION_EXTENSION_FAILED'
      });
    }

    logger.logAuth('SESSION_EXTENDED', req.user.customer_id, req.user.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      new_expiry_time: newExpiryTime
    });

    res.json({
      success: true,
      message: 'Session extended successfully',
      data: {
        new_expiry_time: newExpiryTime,
        hours_extended: 24
      }
    });
  });

  // Revoke specific session
  revokeSession = asyncHandler(async (req, res) => {
    const { tokenId } = req.params;
    const jwtModel = require('../models/jwtModel');

    // Get token details to verify ownership
    const tokenDetails = await jwtModel.getTokenDetails(parseInt(tokenId));
    
    if (!tokenDetails) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        error: 'SESSION_NOT_FOUND'
      });
    }

    // Verify ownership
    if (tokenDetails.customer_id !== req.user.customer_id) {
      logger.logSecurity('UNAUTHORIZED_SESSION_REVOCAL', 'medium', {
        customerId: req.user.customer_id,
        targetTokenId: tokenId,
        targetCustomerId: tokenDetails.customer_id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied: Session does not belong to this user',
        error: 'SESSION_ACCESS_DENIED'
      });
    }

    // Revoke the token
    const revokedToken = await jwtModel.deactivateToken(tokenDetails.token_value);

    if (!revokedToken) {
      return res.status(400).json({
        success: false,
        message: 'Session already revoked or not found',
        error: 'SESSION_ALREADY_REVOKED'
      });
    }

    logger.logAuth('SESSION_REVOKED', req.user.customer_id, req.user.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      revokedTokenId: tokenId
    });

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  });

  // Get authentication statistics
  getAuthStats = asyncHandler(async (req, res) => {
    const jwtModel = require('../models/jwtModel');

    // Get user's token statistics
    const tokenCount = await jwtModel.getTokenCountForUser(req.user.customer_id);
    const activeTokenCount = await jwtModel.getTokenCountForUser(req.user.customer_id, true);

    // Get user's recent sessions
    const recentSessions = await jwtModel.getAllTokensForUser(req.user.customer_id, 10, 0);

    const formattedSessions = recentSessions.map(session => ({
      token_id: session.token_id,
      created_at: session.created_at,
      expiry_time: session.expiry_time,
      is_active: session.is_active,
      is_expired: new Date(session.expiry_time) < new Date()
    }));

    res.json({
      success: true,
      data: {
        customer_id: req.user.customer_id,
        email: req.user.email,
        token_statistics: {
          total_tokens: tokenCount,
          active_tokens: activeTokenCount,
          inactive_tokens: tokenCount - activeTokenCount
        },
        recent_sessions: formattedSessions
      }
    });
  });

  // Security check (analyze current session)
  securityCheck = asyncHandler(async (req, res) => {
    const jwtService = require('../config/jwt');
    const jwtModel = require('../models/jwtModel');

    // Analyze current token
    const tokenInfo = jwtService.getTokenInfo(req.token.token_value);
    const isExpiringSoon = jwtService.isTokenExpiringSoon(req.token.token_value, 30);
    const tokenAge = Date.now() - new Date(tokenInfo.payload.iat * 1000).getTime();
    const tokenAgeHours = Math.floor(tokenAge / (1000 * 60 * 60));

    // Check for other active sessions
    const activeTokens = await jwtModel.findActiveTokensByUserId(req.user.customer_id);
    const hasMultipleSessions = activeTokens.length > 1;

    // Security recommendations
    const recommendations = [];
    
    if (isExpiringSoon) {
      recommendations.push('Token is expiring soon - consider refreshing');
    }
    
    if (tokenAgeHours > 12) {
      recommendations.push('Consider logging out and logging in for better security');
    }
    
    if (hasMultipleSessions) {
      recommendations.push('You have multiple active sessions - consider logging out from other devices');
    }

    res.json({
      success: true,
      data: {
        current_session: {
          token_id: req.token.token_id,
          created_at: new Date(tokenInfo.payload.iat * 1000),
          expiry_time: req.token.expiry_time,
          age_hours: tokenAgeHours,
          is_expiring_soon: isExpiringSoon
        },
        security_info: {
          active_sessions_count: activeTokens.length,
          has_multiple_sessions: hasMultipleSessions,
          last_activity: new Date().toISOString()
        },
        recommendations: recommendations
      }
    });
  });
}

module.exports = new AuthController();
