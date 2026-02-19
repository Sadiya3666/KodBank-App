const jwtService = require('../config/jwt');
const jwtModel = require('../models/jwtModel');
const bankUserModel = require('../models/bankUserModel');
const logger = require('../utils/logger');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        error: 'MISSING_TOKEN'
      });
    }

    // Extract token from Bearer header
    const token = jwtService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Check if token is blacklisted/inactive
    const isBlacklisted = await jwtModel.isTokenBlacklisted(token);
    if (isBlacklisted) {
      logger.logSecurity('BLACKLISTED_TOKEN_USED', 'high', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: token.substring(0, 20) + '...'
      });

      return res.status(401).json({
        success: false,
        message: 'Access denied. Token has been invalidated.',
        error: 'TOKEN_BLACKLISTED'
      });
    }

    // Validate token with database
    const storedToken = await jwtModel.validateToken(token);
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is invalid or expired.',
        error: 'TOKEN_INVALID'
      });
    }

    // Verify JWT token
    const decodedToken = jwtService.verifyToken(token);

    // Get fresh user data
    const user = await bankUserModel.findById(decodedToken.customer_id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Attach user and token info to request
    req.user = {
      customer_id: user.customer_id,
      name: user.name,
      email: user.email,
      balance: user.balance
    };

    req.token = {
      token_id: storedToken.token_id,
      token_value: token,
      expiry_time: storedToken.expiry_time
    };

    // Log successful authentication
    logger.logAuth('TOKEN_VALIDATED', user.customer_id, user.email, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    logger.logError(error, req);

    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token has expired.',
        error: 'TOKEN_EXPIRED'
      });
    }

    if (error.message.includes('invalid') || error.message.includes('verification failed')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.',
        error: 'TOKEN_INVALID'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      error: 'AUTH_ERROR'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = jwtService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return next();
    }

    // Try to validate token but don't fail if it's invalid
    try {
      const storedToken = await jwtModel.validateToken(token);
      
      if (storedToken) {
        const decodedToken = jwtService.verifyToken(token);
        const user = await bankUserModel.findById(decodedToken.customer_id);
        
        if (user) {
          req.user = {
            customer_id: user.customer_id,
            name: user.name,
            email: user.email,
            balance: user.balance
          };

          req.token = {
            token_id: storedToken.token_id,
            token_value: token,
            expiry_time: storedToken.expiry_time
          };
        }
      }
    } catch (error) {
      // Ignore authentication errors for optional auth
      logger.debug('Optional authentication failed:', error.message);
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail the request
    logger.debug('Optional authentication middleware error:', error.message);
    next();
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    // For now, all users are 'customer' role
    // This can be extended for admin roles in the future
    const userRole = 'customer';
    
    if (roles.length > 0 && !roles.includes(userRole)) {
      logger.logSecurity('UNAUTHORIZED_ACCESS_ATTEMPT', 'medium', {
        customerId: req.user.customer_id,
        requiredRoles: roles,
        userRole,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Check if user can access a specific resource
const canAccessResource = (resourceIdParam = 'customerId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    const requestedResourceId = parseInt(req.params[resourceIdParam]);
    const userResourceId = req.user.customer_id;

    // Users can only access their own resources
    if (requestedResourceId !== userResourceId) {
      logger.logSecurity('UNAUTHORIZED_RESOURCE_ACCESS', 'medium', {
        customerId: req.user.customer_id,
        requestedResourceId,
        userResourceId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
        error: 'RESOURCE_ACCESS_DENIED'
      });
    }

    next();
  };
};

// Check if user has sufficient balance for transactions
const hasSufficientBalance = (amountParam = 'amount') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Authentication required.',
          error: 'AUTHENTICATION_REQUIRED'
        });
      }

      const amount = parseFloat(req.body[amountParam] || req.params[amountParam]);
      
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount specified.',
          error: 'INVALID_AMOUNT'
        });
      }

      const userBalance = await bankUserModel.getBalance(req.user.customer_id);
      
      if (userBalance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance for this transaction.',
          error: 'INSUFFICIENT_BALANCE',
          data: {
            current_balance: userBalance,
            required_amount: amount
          }
        });
      }

      next();
    } catch (error) {
      logger.logError(error, req);
      return res.status(500).json({
        success: false,
        message: 'Error checking balance.',
        error: 'BALANCE_CHECK_ERROR'
      });
    }
  };
};

// Rate limiting middleware (simple implementation)
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart);
      requests.set(key, userRequests);
    }

    const userRequests = requests.get(key) || [];

    if (userRequests.length >= maxRequests) {
      logger.logSecurity('RATE_LIMIT_EXCEEDED', 'medium', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requests: userRequests.length,
        maxRequests
      });

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED',
        data: {
          retryAfter: Math.ceil(windowMs / 1000)
        }
      });
    }

    userRequests.push(now);
    requests.set(key, userRequests);

    next();
  };
};

// Validate token freshness (check if token is about to expire)
const checkTokenFreshness = (minutesThreshold = 30) => {
  return (req, res, next) => {
    if (!req.token) {
      return next();
    }

    const isExpiringSoon = jwtService.isTokenExpiringSoon(req.token.token_value, minutesThreshold);
    
    if (isExpiringSoon) {
      // Add warning header but don't fail the request
      res.set('X-Token-Warning', 'Token is expiring soon');
      res.set('X-Token-Refresh-Recommended', 'true');
    }

    next();
  };
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Set security headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.http(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    logger.logRequest(req, res, duration);
    
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  canAccessResource,
  hasSufficientBalance,
  rateLimit,
  checkTokenFreshness,
  securityHeaders,
  requestLogger
};
