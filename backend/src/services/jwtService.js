const jwtModel = require('../models/jwtModel');
const logger = require('../utils/logger');

class JWTService {
  // Cleanup expired tokens
  async cleanupExpiredTokens() {
    try {
      const deletedCount = await jwtModel.cleanupExpiredTokens();
      
      logger.info('Token cleanup completed', {
        deleted_tokens: deletedCount
      });

      return {
        success: true,
        message: 'Token cleanup completed',
        data: {
          deleted_tokens: deletedCount
        }
      };
    } catch (error) {
      logger.error('Token cleanup failed:', error);
      throw error;
    }
  }

  // Get token statistics
  async getTokenStatistics() {
    try {
      const statistics = await jwtModel.getTokenStatistics();

      return {
        success: true,
        data: {
          total_tokens: parseInt(statistics.total_tokens),
          active_tokens: parseInt(statistics.active_tokens),
          inactive_tokens: parseInt(statistics.inactive_tokens),
          expired_tokens: parseInt(statistics.expired_tokens),
          expiring_soon: parseInt(statistics.expiring_soon)
        }
      };
    } catch (error) {
      logger.error('Get token statistics failed:', error);
      throw error;
    }
  }

  // Get tokens expiring soon
  async getTokensExpiringSoon(withinMinutes = 30) {
    try {
      const tokens = await jwtModel.getTokensExpiringSoon(withinMinutes);

      const formattedTokens = tokens.map(token => ({
        token_id: token.token_id,
        customer_id: token.customer_id,
        customer_name: token.name,
        customer_email: token.email,
        expiry_time: token.expiry_time,
        minutes_until_expiry: Math.max(0, Math.floor((new Date(token.expiry_time) - new Date()) / (1000 * 60)))
      }));

      return {
        success: true,
        data: {
          tokens: formattedTokens,
          count: formattedTokens
        }
      };
    } catch (error) {
      logger.error('Get tokens expiring soon failed:', error);
      throw error;
    }
  }

  // Get daily token usage
  async getDailyTokenUsage(days = 30) {
    try {
      const usage = await jwtModel.getDailyTokenUsage(days);

      const formattedUsage = usage.map(item => ({
        date: item.date,
        tokens_created: parseInt(item.tokens_created),
        active_tokens: parseInt(item.active_tokens)
      }));

      return {
        success: true,
        data: {
          usage: formattedUsage,
          period_days: days
        }
      };
    } catch (error) {
      logger.error('Get daily token usage failed:', error);
      throw error;
    }
  }

  // Get user token details
  async getUserTokens(customerId, options = {}) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const { limit = 50, offset = 0, active_only = false } = options;

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new Error('Offset must be a non-negative number');
      }

      let tokens;
      if (active_only) {
        tokens = await jwtModel.findActiveTokensByUserId(customerId);
      } else {
        tokens = await jwtModel.getAllTokensForUser(customerId, parsedLimit, parsedOffset);
      }

      const formattedTokens = tokens.map(token => ({
        token_id: token.token_id,
        created_at: token.created_at,
        expiry_time: token.expiry_time,
        is_active: token.is_active,
        is_expired: new Date(token.expiry_time) < new Date(),
        minutes_until_expiry: Math.max(0, Math.floor((new Date(token.expiry_time) - new Date()) / (1000 * 60)))
      }));

      // Get token counts
      const totalCount = await jwtModel.getTokenCountForUser(customerId);
      const activeCount = await jwtModel.getTokenCountForUser(customerId, true);

      return {
        success: true,
        data: {
          tokens: formattedTokens,
          counts: {
            total: totalCount,
            active: activeCount,
            inactive: totalCount - activeCount
          },
          pagination: active_only ? null : {
            limit: parsedLimit,
            offset: parsedOffset,
            has_more: parsedOffset + parsedLimit < totalCount
          }
        }
      };
    } catch (error) {
      logger.error('Get user tokens failed:', error);
      throw error;
    }
  }

  // Revoke specific token
  async revokeToken(tokenId, customerId) {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }

      // Get token details first
      const tokenDetails = await jwtModel.getTokenDetails(tokenId);
      if (!tokenDetails) {
        throw new Error('Token not found');
      }

      // Verify ownership if customer_id is provided
      if (customerId && tokenDetails.customer_id !== customerId) {
        throw new Error('Access denied: Token does not belong to this user');
      }

      // Deactivate the token
      const deactivatedToken = await jwtModel.deactivateToken(tokenDetails.token_value);

      if (!deactivatedToken) {
        throw new Error('Token already inactive or not found');
      }

      logger.info('Token revoked successfully', {
        token_id: tokenId,
        customer_id: tokenDetails.customer_id
      });

      return {
        success: true,
        message: 'Token revoked successfully'
      };
    } catch (error) {
      logger.error('Revoke token failed:', error);
      throw error;
    }
  }

  // Extend token expiry
  async extendTokenExpiry(tokenId, customerId, hours = 24) {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }

      // Get token details first
      const tokenDetails = await jwtModel.getTokenDetails(tokenId);
      if (!tokenDetails) {
        throw new Error('Token not found');
      }

      // Verify ownership if customer_id is provided
      if (customerId && tokenDetails.customer_id !== customerId) {
        throw new Error('Access denied: Token does not belong to this user');
      }

      // Calculate new expiry time
      const newExpiryTime = new Date();
      newExpiryTime.setHours(newExpiryTime.getHours() + hours);

      // Extend token expiry
      const extendedToken = await jwtModel.extendTokenExpiry(
        tokenDetails.token_value,
        newExpiryTime
      );

      if (!extendedToken) {
        throw new Error('Token not found or inactive');
      }

      logger.info('Token expiry extended successfully', {
        token_id: tokenId,
        customer_id: tokenDetails.customer_id,
        new_expiry_time: newExpiryTime
      });

      return {
        success: true,
        message: 'Token expiry extended successfully',
        data: {
          new_expiry_time: newExpiryTime,
          hours_extended: hours
        }
      };
    } catch (error) {
      logger.error('Extend token expiry failed:', error);
      throw error;
    }
  }

  // Remove old inactive tokens
  async removeOldInactiveTokens(olderThanDays = 30) {
    try {
      const removedCount = await jwtModel.removeOldInactiveTokens(olderThanDays);

      logger.info('Old inactive tokens removed', {
        removed_tokens: removedCount,
        older_than_days: olderThanDays
      });

      return {
        success: true,
        message: 'Old inactive tokens removed successfully',
        data: {
          removed_tokens: removedCount,
          older_than_days: olderThanDays
        }
      };
    } catch (error) {
      logger.error('Remove old inactive tokens failed:', error);
      throw error;
    }
  }

  // Create blacklist table if not exists
  async ensureBlacklistTable() {
    try {
      await jwtModel.createBlacklistTable();

      return {
        success: true,
        message: 'Blacklist table ensured'
      };
    } catch (error) {
      logger.error('Ensure blacklist table failed:', error);
      throw error;
    }
  }

  // Check if token is blacklisted
  async isTokenBlacklisted(tokenValue) {
    try {
      if (!tokenValue) {
        throw new Error('Token value is required');
      }

      const isBlacklisted = await jwtModel.isTokenBlacklisted(tokenValue);

      return {
        success: true,
        data: {
          is_blacklisted: isBlacklisted
        }
      };
    } catch (error) {
      logger.error('Check if token is blacklisted failed:', error);
      throw error;
    }
  }

  // Get token health metrics
  async getTokenHealthMetrics() {
    try {
      const statistics = await jwtModel.getTokenStatistics();
      const expiringSoon = await jwtModel.getTokensExpiringSoon(60); // Next hour

      const metrics = {
        total_tokens: parseInt(statistics.total_tokens),
        active_tokens: parseInt(statistics.active_tokens),
        inactive_tokens: parseInt(statistics.inactive_tokens),
        expired_tokens: parseInt(statistics.expired_tokens),
        expiring_soon: parseInt(statistics.expiring_soon),
        expiring_next_hour: expiringSoon.length,
        health_score: this.calculateHealthScore(statistics),
        last_updated: new Date().toISOString()
      };

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      logger.error('Get token health metrics failed:', error);
      throw error;
    }
  }

  // Calculate health score for tokens (0-100)
  calculateHealthScore(statistics) {
    try {
      const total = parseInt(statistics.total_tokens);
      const active = parseInt(statistics.active_tokens);
      const expired = parseInt(statistics.expired_tokens);
      const expiringSoon = parseInt(statistics.expiring_soon);

      if (total === 0) {
        return 100; // Perfect score if no tokens
      }

      // Base score from active tokens ratio
      const activeRatio = active / total;
      let score = activeRatio * 70; // 70% of score from active ratio

      // Penalty for expired tokens
      const expiredRatio = expired / total;
      score -= expiredRatio * 30; // Up to 30% penalty for expired tokens

      // Small penalty for tokens expiring soon
      const expiringSoonRatio = expiringSoon / total;
      score -= expiringSoonRatio * 10; // Up to 10% penalty

      // Ensure score is between 0 and 100
      return Math.max(0, Math.min(100, Math.round(score)));
    } catch (error) {
      logger.error('Calculate health score failed:', error);
      return 50; // Default to middle score on error
    }
  }

  // Perform comprehensive token maintenance
  async performTokenMaintenance() {
    try {
      const results = {
        cleanup_expired: null,
        remove_old_inactive: null,
        health_metrics: null,
        timestamp: new Date().toISOString()
      };

      // Cleanup expired tokens
      try {
        results.cleanup_expired = await this.cleanupExpiredTokens();
      } catch (error) {
        logger.error('Cleanup expired tokens failed during maintenance:', error);
        results.cleanup_expired = { success: false, error: error.message };
      }

      // Remove old inactive tokens
      try {
        results.remove_old_inactive = await this.removeOldInactiveTokens(7); // 7 days
      } catch (error) {
        logger.error('Remove old inactive tokens failed during maintenance:', error);
        results.remove_old_inactive = { success: false, error: error.message };
      }

      // Get health metrics
      try {
        results.health_metrics = await this.getTokenHealthMetrics();
      } catch (error) {
        logger.error('Get health metrics failed during maintenance:', error);
        results.health_metrics = { success: false, error: error.message };
      }

      logger.info('Token maintenance completed', results);

      return {
        success: true,
        message: 'Token maintenance completed',
        data: results
      };
    } catch (error) {
      logger.error('Token maintenance failed:', error);
      throw error;
    }
  }

  // Get token analytics dashboard data
  async getTokenAnalytics() {
    try {
      const [
        statistics,
        dailyUsage,
        expiringSoon,
        healthMetrics
      ] = await Promise.all([
        this.getTokenStatistics(),
        this.getDailyTokenUsage(7), // Last 7 days
        this.getTokensExpiringSoon(60), // Next hour
        this.getTokenHealthMetrics()
      ]);

      return {
        success: true,
        data: {
          overview: statistics.data,
          daily_usage: dailyUsage.data,
          expiring_soon: expiringSoon.data,
          health_metrics: healthMetrics.data,
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Get token analytics failed:', error);
      throw error;
    }
  }
}

module.exports = new JWTService();
