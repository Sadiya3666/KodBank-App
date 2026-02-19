const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT Configuration
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-characters-long',
  expiresIn: process.env.JWT_EXPIRY || '24h',
  algorithm: 'HS256',
  issuer: 'kodbank',
  audience: 'kodbank-users'
};

// JWT Service
class JWTService {
  constructor() {
    this.config = JWT_CONFIG;
  }

  // Generate JWT token
  generateToken(payload) {
    try {
      const tokenPayload = {
        customer_id: payload.customer_id,
        email: payload.email,
        name: payload.name,
        iat: Math.floor(Date.now() / 1000),
        iss: this.config.issuer,
        aud: this.config.audience
      };

      const token = jwt.sign(tokenPayload, this.config.secret, {
        expiresIn: this.config.expiresIn,
        algorithm: this.config.algorithm
      });

      logger.info('JWT token generated', { 
        customer_id: payload.customer_id, 
        email: payload.email 
      });

      return token;
    } catch (error) {
      logger.error('JWT token generation failed:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience
      });

      logger.debug('JWT token verified', { 
        customer_id: decoded.customer_id, 
        email: decoded.email 
      });

      return decoded;
    } catch (error) {
      logger.error('JWT token verification failed:', error);
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not active');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  // Decode token without verification (for debugging)
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('JWT token decode failed:', error);
      return null;
    }
  }

  // Get token expiration time
  getTokenExpiration(token) {
    try {
      const decoded = this.verifyToken(token);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  // Check if token will expire within specified minutes
  isTokenExpiringSoon(token, minutes = 5) {
    try {
      const decoded = this.verifyToken(token);
      const now = Math.floor(Date.now() / 1000);
      const threshold = minutes * 60;
      
      return (decoded.exp - now) <= threshold;
    } catch (error) {
      return true; // Consider invalid tokens as expiring
    }
  }

  // Refresh token (generate new token with same payload)
  refreshToken(token) {
    try {
      const decoded = this.verifyToken(token);
      
      // Remove JWT specific fields and timestamps
      const { iat, exp, iss, aud, ...payload } = decoded;
      
      return this.generateToken(payload);
    } catch (error) {
      logger.error('JWT token refresh failed:', error);
      throw new Error('Failed to refresh token');
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Generate token with custom expiration
  generateTokenWithCustomExpiration(payload, expiresIn) {
    try {
      const tokenPayload = {
        customer_id: payload.customer_id,
        email: payload.email,
        name: payload.name,
        iat: Math.floor(Date.now() / 1000),
        iss: this.config.issuer,
        aud: this.config.audience
      };

      const token = jwt.sign(tokenPayload, this.config.secret, {
        expiresIn,
        algorithm: this.config.algorithm
      });

      return token;
    } catch (error) {
      logger.error('Custom JWT token generation failed:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  // Generate password reset token
  generatePasswordResetToken(payload) {
    return this.generateTokenWithCustomExpiration(payload, '1h');
  }

  // Generate email verification token
  generateEmailVerificationToken(payload) {
    return this.generateTokenWithCustomExpiration(payload, '24h');
  }

  // Validate token strength
  validateTokenStrength(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token must be a non-empty string' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Token must have 3 parts' };
    }

    try {
      // Try to decode header
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      if (!header.alg || !header.typ) {
        return { valid: false, error: 'Invalid token header' };
      }

      // Try to decode payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (!payload.customer_id || !payload.email) {
        return { valid: false, error: 'Invalid token payload' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Token decoding failed' };
    }
  }

  // Get token info (without verification)
  getTokenInfo(token) {
    const validation = this.validateTokenStrength(token);
    if (!validation.valid) {
      return null;
    }

    try {
      const decoded = this.decodeToken(token);
      return {
        header: decoded.header,
        payload: decoded.payload,
        signature: decoded.signature
      };
    } catch (error) {
      return null;
    }
  }

  // Blacklist token (for logout functionality)
  async blacklistToken(token, database) {
    try {
      const decoded = this.verifyToken(token);
      const expiryTime = new Date(decoded.exp * 1000);

      // Store in database
      await database.query(
        'INSERT INTO blacklisted_tokens (token, expiry_time) VALUES ($1, $2)',
        [token, expiryTime]
      );

      logger.info('Token blacklisted', { customer_id: decoded.customer_id });
      return true;
    } catch (error) {
      logger.error('Token blacklisting failed:', error);
      return false;
    }
  }

  // Check if token is blacklisted
  async isTokenBlacklisted(token, database) {
    try {
      const result = await database.query(
        'SELECT 1 FROM blacklisted_tokens WHERE token = $1 AND expiry_time > NOW()',
        [token]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Blacklist check failed:', error);
      return false;
    }
  }

  // Clean up expired blacklisted tokens
  async cleanupBlacklistedTokens(database) {
    try {
      const result = await database.query(
        'DELETE FROM blacklisted_tokens WHERE expiry_time <= NOW()'
      );

      logger.info('Cleaned up expired blacklisted tokens', { 
        count: result.rowCount 
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Blacklisted tokens cleanup failed:', error);
      return 0;
    }
  }
}

// Create and export JWT service instance
const jwtService = new JWTService();

module.exports = jwtService;
