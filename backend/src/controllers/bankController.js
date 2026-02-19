const bankService = require('../services/bankService');
const bankUserModel = require('../models/bankUserModel');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

class BankController {
  // Get account balance
  getBalance = asyncHandler(async (req, res) => {
    const result = await bankService.getBalance(req.user.customer_id);

    logger.logBusinessEvent('BALANCE_CHECKED', req.user.customer_id, {
      balance: result.data.balance,
      ip: req.ip
    });

    res.json(result);
  });

  // Get full account details
  getFullDetails = asyncHandler(async (req, res) => {
    // req.token is populated by authenticate middleware
    const result = await bankService.getFullDetails(req.user.customer_id, {
      token_id: req.token.token_id,
      token_value: req.token.token_value,
      customer_id: req.user.customer_id,
      expiry_time: req.token.expiry_time
    });

    res.json(result);
  });

  // Transfer money to another customer
  transferMoney = asyncHandler(async (req, res) => {
    const { to_customer_id, amount, description } = req.body;

    const result = await bankService.transferMoney(req.user.customer_id, {
      to_customer_id,
      amount,
      description
    });

    logger.logTransaction('TRANSFER_COMPLETED', result.data.transaction_id,
      req.user.customer_id, to_customer_id, amount, {
      description,
      ip: req.ip
    });

    res.json(result);
  });

  // Get transaction history
  getTransactionHistory = asyncHandler(async (req, res) => {
    const {
      limit = 10,
      offset = 0,
      transaction_type,
      status,
      start_date,
      end_date
    } = req.query;

    const result = await bankService.getTransactionHistory(req.user.customer_id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      transaction_type,
      status,
      start_date,
      end_date
    });

    res.json(result);
  });

  // Get recent transactions
  getRecentTransactions = asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query;

    const result = await bankService.getRecentTransactions(req.user.customer_id, parseInt(limit));

    res.json(result);
  });

  // Deposit money
  depositMoney = asyncHandler(async (req, res) => {
    const { amount, description } = req.body;

    const result = await bankService.depositMoney(req.user.customer_id, {
      amount,
      description
    });

    logger.logTransaction('DEPOSIT_COMPLETED', result.data.transaction_id,
      req.user.customer_id, null, amount, {
      description,
      ip: req.ip
    });

    res.json(result);
  });

  // Withdraw money
  withdrawMoney = asyncHandler(async (req, res) => {
    const { amount, description } = req.body;

    const result = await bankService.withdrawMoney(req.user.customer_id, {
      amount,
      description
    });

    logger.logTransaction('WITHDRAWAL_COMPLETED', result.data.transaction_id,
      req.user.customer_id, null, amount, {
      description,
      ip: req.ip
    });

    res.json(result);
  });

  // Verify recipient exists (for transfer validation)
  verifyRecipient = asyncHandler(async (req, res) => {
    const { customer_id } = req.query;

    if (!customer_id || !/^\d+$/.test(customer_id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid customer ID is required'
      });
    }

    const recipientId = parseInt(customer_id);

    // Cannot verify self
    if (recipientId === req.user.customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to yourself'
      });
    }

    const recipient = await bankUserModel.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    res.json({
      success: true,
      data: {
        customer_id: recipient.customer_id,
        name: recipient.name
      }
    });
  });

  // Search transactions
  searchTransactions = asyncHandler(async (req, res) => {
    const { q: searchTerm, limit = 20, offset = 0 } = req.query;

    const result = await bankService.searchTransactions(req.user.customer_id, searchTerm, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    logger.logBusinessEvent('TRANSACTIONS_SEARCHED', req.user.customer_id, {
      search_term: searchTerm,
      results_count: result.data.count,
      ip: req.ip
    });

    res.json(result);
  });

  // Get transaction details
  getTransactionDetails = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;

    const result = await bankService.getTransactionDetails(req.user.customer_id, parseInt(transactionId));

    res.json(result);
  });

  // Get account statistics
  getAccountStatistics = asyncHandler(async (req, res) => {
    const { days = 30, start_date, end_date } = req.query;

    const result = await bankService.getAccountStatistics(req.user.customer_id, {
      days: parseInt(days),
      start_date,
      end_date
    });

    res.json(result);
  });

  // Validate transfer before execution
  validateTransfer = asyncHandler(async (req, res) => {
    const { to_customer_id, amount } = req.body;

    const result = await bankService.validateTransfer(req.user.customer_id, {
      to_customer_id,
      amount
    });

    logger.logBusinessEvent('TRANSFER_VALIDATED', req.user.customer_id, {
      to_customer_id,
      amount,
      sufficient_balance: result.data.sufficient_balance,
      ip: req.ip
    });

    res.json(result);
  });

  // Get mini statement (last 10 transactions)
  getMiniStatement = asyncHandler(async (req, res) => {
    const result = await bankService.getRecentTransactions(req.user.customer_id, 10);

    // Format as mini statement
    const miniStatement = {
      customer_id: req.user.customer_id,
      customer_name: req.user.name,
      current_balance: req.user.balance,
      generated_at: new Date().toISOString(),
      transactions: result.data.transactions.map(t => ({
        date: new Date(t.transaction_date).toLocaleDateString(),
        description: t.description || t.transaction_type,
        amount: t.amount,
        type: t.transaction_type,
        balance_after: null // Would need to calculate this
      }))
    };

    logger.logBusinessEvent('MINI_STATEMENT_GENERATED', req.user.customer_id, {
      transaction_count: miniStatement.transactions.length,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Mini statement generated successfully',
      data: miniStatement
    });
  });

  // Get account summary
  getAccountSummary = asyncHandler(async (req, res) => {
    const statistics = await bankService.getAccountStatistics(req.user.customer_id, { days: 30 });
    const recentTransactions = await bankService.getRecentTransactions(req.user.customer_id, 5);

    const summary = {
      customer_id: req.user.customer_id,
      customer_name: req.user.name,
      current_balance: req.user.balance,
      account_created: statistics.data.user.created_at,
      last_updated: statistics.data.user.updated_at,
      summary_30_days: {
        total_transactions: statistics.data.statistics.total_transactions,
        total_deposits: statistics.data.statistics.total_deposits,
        total_withdrawals: statistics.data.statistics.total_withdrawals,
        total_sent: statistics.data.statistics.total_sent,
        total_received: statistics.data.statistics.total_received,
        net_change: statistics.data.statistics.total_received - statistics.data.statistics.total_sent
      },
      recent_transactions: recentTransactions.data.transactions,
      health_indicators: {
        account_age_days: Math.floor((new Date() - new Date(statistics.data.user.created_at)) / (1000 * 60 * 60 * 24)),
        is_active: statistics.data.statistics.total_transactions > 0,
        last_transaction: recentTransactions.data.transactions[0]?.transaction_date || null
      }
    };

    logger.logBusinessEvent('ACCOUNT_SUMMARY_GENERATED', req.user.customer_id, {
      balance: summary.current_balance,
      transactions_30_days: summary.summary_30_days.total_transactions,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Account summary generated successfully',
      data: summary
    });
  });

  // Quick transfer (with minimal validation for speed)
  quickTransfer = asyncHandler(async (req, res) => {
    const { to_customer_id, amount } = req.body;

    // Skip description for quick transfers
    const result = await bankService.transferMoney(req.user.customer_id, {
      to_customer_id,
      amount,
      description: 'Quick transfer'
    });

    logger.logTransaction('QUICK_TRANSFER_COMPLETED', result.data.transaction_id,
      req.user.customer_id, to_customer_id, amount, {
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Quick transfer completed successfully',
      data: result.data
    });
  });

  // Get transfer suggestions (frequent recipients)
  getTransferSuggestions = asyncHandler(async (req, res) => {
    const transactionModel = require('../models/transactionModel');

    // Get recent transfers to find frequent recipients
    const recentTransfers = await transactionModel.getTransactionsByType(
      req.user.customer_id,
      'transfer',
      20,
      0
    );

    // Count frequency of recipients
    const recipientCounts = {};
    recentTransactions.forEach(transaction => {
      if (transaction.to_customer_id && transaction.to_customer_id !== req.user.customer_id) {
        const recipientId = transaction.to_customer_id;
        recipientCounts[recipientId] = (recipientCounts[recipientId] || 0) + 1;
      }
    });

    // Get recipient details
    const bankUserModel = require('../models/bankUserModel');
    const suggestions = [];

    for (const [recipientId, count] of Object.entries(recipientCounts)) {
      if (count >= 2) { // Only show recipients transferred to at least twice
        const recipient = await bankUserModel.findById(parseInt(recipientId));
        if (recipient) {
          suggestions.push({
            customer_id: recipient.customer_id,
            name: recipient.name,
            transfer_count: count,
            last_transfer: recentTransfers
              .filter(t => t.to_customer_id === parseInt(recipientId))
              .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))[0]?.transaction_date
          });
        }
      }
    }

    // Sort by transfer count (most frequent first)
    suggestions.sort((a, b) => b.transfer_count - a.transfer_count);

    logger.logBusinessEvent('TRANSFER_SUGGESTIONS_GENERATED', req.user.customer_id, {
      suggestions_count: suggestions.length,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Transfer suggestions generated successfully',
      data: {
        suggestions: suggestions.slice(0, 10) // Limit to top 10
      }
    });
  });

  // Get transaction receipt
  getTransactionReceipt = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;

    const transaction = await bankService.getTransactionDetails(req.user.customer_id, parseInt(transactionId));

    // Generate receipt format
    const receipt = {
      receipt_id: `RCP${transaction.data.transaction_id.toString().padStart(8, '0')}`,
      transaction_id: transaction.data.transaction_id,
      transaction_date: transaction.data.transaction_date,
      customer_info: {
        customer_id: req.user.customer_id,
        name: req.user.name,
        email: req.user.email
      },
      transaction_details: {
        type: transaction.data.transaction_type,
        amount: transaction.data.amount,
        description: transaction.data.description || 'No description',
        status: transaction.data.status
      },
      party_info: {
        from_customer: transaction.data.from_customer_name,
        to_customer: transaction.data.to_customer_name
      },
      generated_at: new Date().toISOString(),
      kodbank_footer: 'Thank you for banking with KodBank'
    };

    logger.logBusinessEvent('TRANSACTION_RECEIPT_GENERATED', req.user.customer_id, {
      transaction_id: transactionId,
      receipt_id: receipt.receipt_id,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Transaction receipt generated successfully',
      data: receipt
    });
  });

  // Export transaction history
  exportTransactionHistory = asyncHandler(async (req, res) => {
    const { format = 'json', start_date, end_date } = req.query;

    const transactions = await bankService.getTransactionHistory(req.user.customer_id, {
      limit: 1000, // Large limit for export
      offset: 0,
      start_date,
      end_date
    });

    const exportData = {
      export_info: {
        customer_id: req.user.customer_id,
        customer_name: req.user.name,
        export_date: new Date().toISOString(),
        format: format,
        total_transactions: transactions.data.pagination.total
      },
      transactions: transactions.data.transactions
    };

    logger.logBusinessEvent('TRANSACTION_HISTORY_EXPORTED', req.user.customer_id, {
      format,
      transaction_count: exportData.export_info.total_transactions,
      ip: req.ip
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Transaction ID,Date,Type,Amount,Status,Description,From,To\n';
      const csvRows = transactions.data.transactions.map(t =>
        `${t.transaction_id},${t.transaction_date},${t.transaction_type},${t.amount},${t.status},"${t.description || ''}",${t.from_customer_name || ''},${t.to_customer_name || ''}`
      ).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${req.user.customer_id}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        message: 'Transaction history exported successfully',
        data: exportData
      });
    }
  });
}

module.exports = new BankController();
