const bankUserModel = require('../models/bankUserModel');
const transactionModel = require('../models/transactionModel');
const jwtModel = require('../models/jwtModel');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

class UserController {
  // Get user profile (detailed version)
  getProfile = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;

    // Get basic user info
    const user = await bankUserModel.findById(customerId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Get user statistics
    const statistics = await bankUserModel.getUserStatistics(customerId);

    // Get recent transactions
    const recentTransactions = await transactionModel.getRecentTransactions(customerId, 5);

    // Get active sessions
    const activeTokens = await jwtModel.findActiveTokensByUserId(customerId);

    const profile = {
      customer_id: user.customer_id,
      name: user.name,
      email: user.email,
      balance: parseFloat(user.balance),
      account_info: {
        created_at: user.created_at,
        updated_at: user.updated_at,
        account_age_days: Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24))
      },
      statistics: {
        total_transactions: statistics.total_transactions,
        total_deposits: parseFloat(statistics.total_deposits),
        total_withdrawals: parseFloat(statistics.total_withdrawals),
        total_sent: parseFloat(statistics.total_sent),
        total_received: parseFloat(statistics.total_received),
        net_transfers: parseFloat(statistics.total_received) - parseFloat(statistics.total_sent)
      },
      activity: {
        recent_transactions: recentTransactions.map(t => ({
          transaction_id: t.transaction_id,
          type: t.transaction_type,
          amount: parseFloat(t.amount),
          date: t.transaction_date,
          description: t.description
        })),
        active_sessions: activeTokens.length,
        last_login: activeTokens.length > 0 ? activeTokens[0].created_at : null
      }
    };

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profile
    });
  });

  // Update user profile
  updateProfile = asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    const customerId = req.user.customer_id;

    const updatedUser = await bankUserModel.updateProfile(customerId, {
      name,
      email
    });

    logger.logBusinessEvent('PROFILE_UPDATED', customerId, {
      updated_fields: Object.keys({ name, email }).filter(key => req.body[key]),
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        customer_id: updatedUser.customer_id,
        name: updatedUser.name,
        email: updatedUser.email,
        balance: parseFloat(updatedUser.balance),
        updated_at: updatedUser.updated_at
      }
    });
  });

  // Get account activity
  getAccountActivity = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;
    const { days = 30, limit = 50 } = req.query;

    const parsedDays = parseInt(days);
    const parsedLimit = parseInt(limit);

    // Get transaction summary
    const transactionSummary = await transactionModel.getTransactionSummary(customerId, parsedDays);
    
    // Get recent transactions
    const recentTransactions = await transactionModel.getRecentTransactions(customerId, parsedLimit);

    // Get transaction statistics
    const transactionStats = await transactionModel.getUserTransactionStatistics(customerId);

    const activity = {
      customer_id: customerId,
      period_days: parsedDays,
      summary: {
        total_transactions: transactionStats.total_transactions,
        total_amount: parseFloat(transactionStats.total_deposits) + parseFloat(transactionStats.total_withdrawals),
        total_deposits: parseFloat(transactionStats.total_deposits),
        total_withdrawals: parseFloat(transactionStats.total_withdrawals),
        net_change: parseFloat(transactionStats.total_deposits) - parseFloat(transactionStats.total_withdrawals)
      },
      daily_activity: transactionSummary.map(item => ({
        date: item.date,
        transaction_count: parseInt(item.transaction_count),
        total_amount: parseFloat(item.total_amount),
        deposits: parseInt(item.deposits),
        withdrawals: parseInt(item.withdrawals),
        transfers: parseInt(item.transfers)
      })),
      recent_transactions: recentTransactions.map(t => ({
        transaction_id: t.transaction_id,
        type: t.transaction_type,
        amount: parseFloat(t.amount),
        date: t.transaction_date,
        status: t.status,
        description: t.description,
        from_customer_name: t.from_customer_name,
        to_customer_name: t.to_customer_name
      }))
    };

    res.json({
      success: true,
      message: 'Account activity retrieved successfully',
      data: activity
    });
  });

  // Get user preferences (for future features)
  getPreferences = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;

    // For now, return default preferences
    // In the future, this could be stored in a separate preferences table
    const preferences = {
      customer_id: customerId,
      notifications: {
        email_notifications: true,
        transaction_alerts: true,
        balance_alerts: true,
        security_alerts: true
      },
      display: {
        currency: 'INR',
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        language: 'en'
      },
      security: {
        session_timeout: 24, // hours
        require_password_for_transfers: false,
        two_factor_enabled: false
      },
      privacy: {
        show_profile_to_others: false,
        allow_transaction_search: true
      }
    };

    res.json({
      success: true,
      message: 'Preferences retrieved successfully',
      data: preferences
    });
  });

  // Update user preferences
  updatePreferences = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;
    const preferences = req.body;

    // For now, just validate and return success
    // In the future, this would be stored in a preferences table
    const validSections = ['notifications', 'display', 'security', 'privacy'];
    
    for (const section of Object.keys(preferences)) {
      if (!validSections.includes(section)) {
        return res.status(400).json({
          success: false,
          message: `Invalid preference section: ${section}`,
          error: 'INVALID_PREFERENCE_SECTION'
        });
      }
    }

    logger.logBusinessEvent('PREFERENCES_UPDATED', customerId, {
      updated_sections: Object.keys(preferences),
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        customer_id: customerId,
        updated_sections: Object.keys(preferences),
        updated_at: new Date().toISOString()
      }
    });
  });

  // Get user dashboard data
  getDashboard = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;

    // Get user info
    const user = await bankUserModel.findById(customerId);
    
    // Get recent transactions
    const recentTransactions = await transactionModel.getRecentTransactions(customerId, 5);
    
    // Get transaction statistics for last 30 days
    const transactionStats = await transactionModel.getUserTransactionStatistics(customerId);
    
    // Get daily activity for last 7 days
    const dailyActivity = await transactionModel.getTransactionSummary(customerId, 7);

    const dashboard = {
      user: {
        customer_id: user.customer_id,
        name: user.name,
        email: user.email,
        balance: parseFloat(user.balance)
      },
      quick_stats: {
        total_transactions: transactionStats.total_transactions,
        total_deposits: parseFloat(transactionStats.total_deposits),
        total_withdrawals: parseFloat(transactionStats.total_withdrawals),
        total_sent: parseFloat(transactionStats.total_sent),
        total_received: parseFloat(transactionStats.total_received)
      },
      recent_transactions: recentTransactions.map(t => ({
        transaction_id: t.transaction_id,
        type: t.transaction_type,
        amount: parseFloat(t.amount),
        date: t.transaction_date,
        description: t.description || t.transaction_type,
        from_customer_name: t.from_customer_name,
        to_customer_name: t.to_customer_name
      })),
      activity_chart: dailyActivity.map(item => ({
        date: item.date,
        transactions: parseInt(item.transaction_count),
        amount: parseFloat(item.total_amount)
      })),
      alerts: [],
      recommendations: this.generateRecommendations(user, transactionStats)
    };

    // Generate alerts
    if (parseFloat(user.balance) < 1000) {
      dashboard.alerts.push({
        type: 'warning',
        message: 'Your balance is below ₹1,000',
        action: 'Consider depositing funds to maintain a healthy balance'
      });
    }

    if (transactionStats.total_transactions === 0) {
      dashboard.alerts.push({
        type: 'info',
        message: 'Start using your account',
        action: 'Make your first deposit or transfer to get started'
      });
    }

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboard
    });
  });

  // Generate personalized recommendations
  generateRecommendations(user, stats) {
    const recommendations = [];

    if (parseFloat(user.balance) > 50000) {
      recommendations.push({
        type: 'investment',
        title: 'Consider investment options',
        description: 'You have a healthy balance that could benefit from investment options'
      });
    }

    if (stats.total_transactions > 50) {
      recommendations.push({
        type: 'upgrade',
        title: 'Premium account benefits',
        description: 'As an active user, you may qualify for premium account benefits'
      });
    }

    if (stats.total_deposits > stats.total_withdrawals * 2) {
      recommendations.push({
        type: 'savings',
        title: 'Great saving habits',
        description: 'You have good saving habits. Consider setting up automatic savings'
      });
    }

    if (stats.total_sent > stats.total_received * 2) {
      recommendations.push({
        type: 'budget',
        title: 'Review your spending',
        description: 'You send more than you receive. Consider reviewing your spending patterns'
      });
    }

    return recommendations;
  }

  // Search users (for transfers)
  searchUsers = asyncHandler(async (req, res) => {
    const { q: query, limit = 10 } = req.query;
    const customerId = req.user.customer_id;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
        error: 'INVALID_SEARCH_QUERY'
      });
    }

    const users = await bankUserModel.searchUsers(query.trim(), parseInt(limit));

    // Filter out current user and format results
    const filteredUsers = users
      .filter(user => user.customer_id !== customerId)
      .map(user => ({
        customer_id: user.customer_id,
        name: user.name,
        email: user.email
      }));

    logger.logBusinessEvent('USERS_SEARCHED', customerId, {
      search_query: query,
      results_count: filteredUsers.length,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Users found successfully',
      data: {
        users: filteredUsers,
        count: filteredUsers.length
      }
    });
  });

  // Delete user account
  deleteAccount = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const customerId = req.user.customer_id;

    // Additional validation before deletion
    const user = await bankUserModel.findById(customerId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check if balance is zero
    if (parseFloat(user.balance) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Account must have zero balance to be deleted',
        error: 'NON_ZERO_BALANCE',
        data: {
          current_balance: parseFloat(user.balance)
        }
      });
    }

    // Check for pending transactions
    const pendingTransactions = await transactionModel.getUserTransactions(customerId, {
      limit: 1,
      status: 'pending'
    });

    if (pendingTransactions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with pending transactions',
        error: 'PENDING_TRANSACTIONS'
      });
    }

    // Verify password one more time
    const bankUserModel = require('../models/bankUserModel');
    const isValidPassword = await bankUserModel.validatePassword(user.email, password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
        error: 'INVALID_PASSWORD'
      });
    }

    // Delete the user
    await bankUserModel.deleteUser(customerId);

    logger.logAuth('ACCOUNT_DELETED_PERMANENTLY', customerId, user.email, {
      ip: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
      data: {
        deleted_at: new Date().toISOString()
      }
    });
  });

  // Get account statements
  getAccountStatements = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;
    const { month, year, format = 'json' } = req.query;

    // Parse month and year
    const statementMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const statementYear = year ? parseInt(year) : new Date().getFullYear();

    // Validate month and year
    if (statementMonth < 1 || statementMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month. Must be between 1 and 12',
        error: 'INVALID_MONTH'
      });
    }

    if (statementYear < 2020 || statementYear > new Date().getFullYear() + 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year',
        error: 'INVALID_YEAR'
      });
    }

    // Calculate date range for the statement
    const startDate = new Date(statementYear, statementMonth - 1, 1);
    const endDate = new Date(statementYear, statementMonth, 0, 23, 59, 59);

    // Get transactions for the period
    const transactions = await transactionModel.getUserTransactions(customerId, {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      limit: 1000
    });

    // Get user info for the period
    const user = await bankUserModel.findById(customerId);

    const statement = {
      statement_info: {
        customer_id: customerId,
        customer_name: user.name,
        customer_email: user.email,
        period: `${statementMonth.toString().padStart(2, '0')}/${statementYear}`,
        generated_at: new Date().toISOString(),
        format: format
      },
      opening_balance: 0, // Would need to calculate this from previous periods
      closing_balance: parseFloat(user.balance),
      summary: {
        total_transactions: transactions.length,
        total_deposits: transactions
          .filter(t => t.transaction_type === 'deposit')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        total_withdrawals: transactions
          .filter(t => t.transaction_type === 'withdrawal')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        total_sent: transactions
          .filter(t => t.transaction_type === 'transfer' && t.from_customer_id === customerId)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        total_received: transactions
          .filter(t => t.transaction_type === 'transfer' && t.to_customer_id === customerId)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      },
      transactions: transactions.map(t => ({
        date: new Date(t.transaction_date).toLocaleDateString(),
        description: t.description || t.transaction_type,
        type: t.transaction_type,
        amount: parseFloat(t.amount),
        balance: null // Would need to calculate running balance
      }))
    };

    logger.logBusinessEvent('ACCOUNT_STATEMENT_GENERATED', customerId, {
      period: statement.statement_info.period,
      transaction_count: transactions.length,
      format: format,
      ip: req.ip
    });

    if (format === 'pdf') {
      // For now, return JSON with a note about PDF generation
      res.json({
        success: true,
        message: 'Statement generated successfully (PDF format not yet implemented)',
        data: statement
      });
    } else {
      res.json({
        success: true,
        message: 'Account statement generated successfully',
        data: statement
      });
    }
  });
}

module.exports = new UserController();
