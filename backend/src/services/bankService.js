const bankUserModel = require('../models/bankUserModel');
const transactionModel = require('../models/transactionModel');
const logger = require('../utils/logger');

class BankService {
  // Get account balance
  async getBalance(customerId) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      // Verify user exists
      const user = await bankUserModel.findById(customerId);
      if (!user) {
        throw new Error('User not found');
      }

      const balance = await bankUserModel.getBalance(customerId);

      logger.info('Balance retrieved', {
        customer_id: customerId,
        balance
      });

      return {
        success: true,
        data: {
          customer_id: user.customer_id,
          name: user.name,
          balance: parseFloat(balance),
          last_updated: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Get balance failed:', error);
      throw error;
    }
  }

  // Get full account details (including password and token info for debug/educational purposes)
  async getFullDetails(customerId, tokenInfo) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      // Verify user exists
      const user = await bankUserModel.findFullById(customerId);
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
            password: user.password,
            balance: parseFloat(user.balance)
          },
          token: {
            token_id: tokenInfo.token_id,
            token_value: tokenInfo.token_value,
            customer_id: tokenInfo.customer_id,
            expiry_time: tokenInfo.expiry_time
          }
        }
      };
    } catch (error) {
      logger.error('Get full details failed:', error);
      throw error;
    }
  }

  // Transfer money to another customer
  async transferMoney(customerId, transferData) {
    try {
      const { to_customer_id, amount, description } = transferData;

      // Validate input
      if (!to_customer_id || !amount) {
        throw new Error('Recipient customer ID and amount are required');
      }

      if (!/^\d+$/.test(to_customer_id.toString())) {
        throw new Error('Recipient customer ID must be a number');
      }

      const transferAmount = parseFloat(amount);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      if (transferAmount > 10000) {
        throw new Error('Maximum transfer amount is ₹10,000');
      }

      // Check for too many decimal places
      const decimalPlaces = amount.toString().split('.')[1];
      if (decimalPlaces && decimalPlaces.length > 2) {
        throw new Error('Amount can have maximum 2 decimal places');
      }

      const toCustomerId = parseInt(to_customer_id);

      // Cannot transfer to self
      if (customerId === toCustomerId) {
        throw new Error('Cannot transfer to yourself');
      }

      // Verify sender exists
      const sender = await bankUserModel.findById(customerId);
      if (!sender) {
        throw new Error('Sender account not found');
      }

      // Verify recipient exists
      const recipient = await bankUserModel.findById(toCustomerId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Check sender's balance
      const senderBalance = await bankUserModel.getBalance(customerId);
      if (senderBalance < transferAmount) {
        throw new Error('Insufficient balance');
      }

      // Execute transfer
      const transaction = await transactionModel.executeTransfer(
        customerId,
        toCustomerId,
        transferAmount,
        description || 'Money transfer'
      );

      // Get updated sender balance
      const newBalance = await bankUserModel.getBalance(customerId);

      logger.info('Transfer completed successfully', {
        transaction_id: transaction.transaction_id,
        from_customer_id: customerId,
        to_customer_id: toCustomerId,
        amount: transferAmount
      });

      return {
        success: true,
        message: 'Transfer successful',
        data: {
          transaction_id: transaction.transaction_id,
          from_customer_id: transaction.from_customer_id,
          to_customer_id: transaction.to_customer_id,
          amount: parseFloat(transaction.amount),
          new_balance: parseFloat(newBalance),
          transaction_date: transaction.transaction_date,
          description: transaction.description
        }
      };
    } catch (error) {
      logger.error('Transfer money failed:', error);
      throw error;
    }
  }

  // Get transaction history
  async getTransactionHistory(customerId, options = {}) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const {
        limit = 10,
        offset = 0,
        transaction_type,
        status,
        start_date,
        end_date
      } = options;

      // Validate pagination parameters
      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new Error('Offset must be a non-negative number');
      }

      // Validate transaction type if provided
      if (transaction_type && !['transfer', 'deposit', 'withdrawal'].includes(transaction_type)) {
        throw new Error('Invalid transaction type');
      }

      // Validate status if provided
      if (status && !['completed', 'pending', 'failed'].includes(status)) {
        throw new Error('Invalid transaction status');
      }

      // Get transactions
      const transactions = await transactionModel.getUserTransactions(customerId, {
        limit: parsedLimit,
        offset: parsedOffset,
        transaction_type,
        status,
        start_date,
        end_date
      });

      // Get total count for pagination
      const totalCount = await transactionModel.getUserTransactionCount(customerId, {
        transaction_type,
        status,
        start_date,
        end_date
      });

      // Format transactions
      const formattedTransactions = transactions.map(transaction => ({
        transaction_id: transaction.transaction_id,
        from_customer_id: transaction.from_customer_id,
        to_customer_id: transaction.to_customer_id,
        amount: parseFloat(transaction.amount),
        transaction_type: transaction.transaction_type,
        transaction_date: transaction.transaction_date,
        status: transaction.status,
        description: transaction.description,
        from_customer_name: transaction.from_customer_name,
        to_customer_name: transaction.to_customer_name
      }));

      logger.info('Transaction history retrieved', {
        customer_id: customerId,
        count: formattedTransactions.length,
        total: totalCount
      });

      return {
        success: true,
        data: {
          transactions: formattedTransactions,
          pagination: {
            limit: parsedLimit,
            offset: parsedOffset,
            total: totalCount,
            has_more: parsedOffset + parsedLimit < totalCount
          }
        }
      };
    } catch (error) {
      logger.error('Get transaction history failed:', error);
      throw error;
    }
  }

  // Get recent transactions
  async getRecentTransactions(customerId, limit = 5) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 20) {
        throw new Error('Limit must be between 1 and 20');
      }

      const transactions = await transactionModel.getRecentTransactions(customerId, parsedLimit);

      const formattedTransactions = transactions.map(transaction => ({
        transaction_id: transaction.transaction_id,
        from_customer_id: transaction.from_customer_id,
        to_customer_id: transaction.to_customer_id,
        amount: parseFloat(transaction.amount),
        transaction_type: transaction.transaction_type,
        transaction_date: transaction.transaction_date,
        status: transaction.status,
        description: transaction.description,
        from_customer_name: transaction.from_customer_name,
        to_customer_name: transaction.to_customer_name
      }));

      return {
        success: true,
        data: {
          transactions: formattedTransactions
        }
      };
    } catch (error) {
      logger.error('Get recent transactions failed:', error);
      throw error;
    }
  }

  // Deposit money
  async depositMoney(customerId, depositData) {
    try {
      const { amount, description } = depositData;

      if (!amount) {
        throw new Error('Amount is required');
      }

      const depositAmount = parseFloat(amount);
      if (isNaN(depositAmount) || depositAmount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      if (depositAmount > 50000) {
        throw new Error('Maximum deposit amount is ₹50,000');
      }

      // Verify user exists
      const user = await bankUserModel.findById(customerId);
      if (!user) {
        throw new Error('User not found');
      }

      // Execute deposit
      const transaction = await transactionModel.executeDeposit(
        customerId,
        depositAmount,
        description || 'Deposit'
      );

      // Get updated balance
      const newBalance = await bankUserModel.getBalance(customerId);

      logger.info('Deposit completed successfully', {
        transaction_id: transaction.transaction_id,
        customer_id: customerId,
        amount: depositAmount
      });

      return {
        success: true,
        message: 'Deposit successful',
        data: {
          transaction_id: transaction.transaction_id,
          amount: parseFloat(transaction.amount),
          new_balance: parseFloat(newBalance),
          transaction_date: transaction.transaction_date,
          description: transaction.description
        }
      };
    } catch (error) {
      logger.error('Deposit money failed:', error);
      throw error;
    }
  }

  // Withdraw money
  async withdrawMoney(customerId, withdrawalData) {
    try {
      const { amount, description } = withdrawalData;

      if (!amount) {
        throw new Error('Amount is required');
      }

      const withdrawalAmount = parseFloat(amount);
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      if (withdrawalAmount > 25000) {
        throw new Error('Maximum withdrawal amount is ₹25,000');
      }

      // Verify user exists
      const user = await bankUserModel.findById(customerId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check sufficient balance
      const currentBalance = await bankUserModel.getBalance(customerId);
      if (currentBalance < withdrawalAmount) {
        throw new Error('Insufficient balance');
      }

      // Execute withdrawal
      const transaction = await transactionModel.executeWithdrawal(
        customerId,
        withdrawalAmount,
        description || 'Withdrawal'
      );

      // Get updated balance
      const newBalance = await bankUserModel.getBalance(customerId);

      logger.info('Withdrawal completed successfully', {
        transaction_id: transaction.transaction_id,
        customer_id: customerId,
        amount: withdrawalAmount
      });

      return {
        success: true,
        message: 'Withdrawal successful',
        data: {
          transaction_id: transaction.transaction_id,
          amount: parseFloat(transaction.amount),
          new_balance: parseFloat(newBalance),
          transaction_date: transaction.transaction_date,
          description: transaction.description
        }
      };
    } catch (error) {
      logger.error('Withdraw money failed:', error);
      throw error;
    }
  }

  // Search transactions
  async searchTransactions(customerId, searchTerm, options = {}) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new Error('Search term is required');
      }

      const { limit = 20, offset = 0 } = options;

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      const transactions = await transactionModel.searchTransactions(
        customerId,
        searchTerm.trim(),
        { limit: parsedLimit, offset: parsedOffset }
      );

      const formattedTransactions = transactions.map(transaction => ({
        transaction_id: transaction.transaction_id,
        from_customer_id: transaction.from_customer_id,
        to_customer_id: transaction.to_customer_id,
        amount: parseFloat(transaction.amount),
        transaction_type: transaction.transaction_type,
        transaction_date: transaction.transaction_date,
        status: transaction.status,
        description: transaction.description,
        from_customer_name: transaction.from_customer_name,
        to_customer_name: transaction.to_customer_name
      }));

      return {
        success: true,
        data: {
          transactions: formattedTransactions,
          search_term: searchTerm,
          count: formattedTransactions.length
        }
      };
    } catch (error) {
      logger.error('Search transactions failed:', error);
      throw error;
    }
  }

  // Get transaction details
  async getTransactionDetails(customerId, transactionId) {
    try {
      if (!customerId || !transactionId) {
        throw new Error('Customer ID and transaction ID are required');
      }

      const transaction = await transactionModel.findById(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify user is part of this transaction
      if (transaction.from_customer_id !== customerId && transaction.to_customer_id !== customerId) {
        throw new Error('Access denied: Transaction does not belong to this user');
      }

      const formattedTransaction = {
        transaction_id: transaction.transaction_id,
        from_customer_id: transaction.from_customer_id,
        to_customer_id: transaction.to_customer_id,
        amount: parseFloat(transaction.amount),
        transaction_type: transaction.transaction_type,
        transaction_date: transaction.transaction_date,
        status: transaction.status,
        description: transaction.description,
        from_customer_name: transaction.from_customer_name,
        to_customer_name: transaction.to_customer_name
      };

      return {
        success: true,
        data: formattedTransaction
      };
    } catch (error) {
      logger.error('Get transaction details failed:', error);
      throw error;
    }
  }

  // Get account statistics
  async getAccountStatistics(customerId, options = {}) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const { days = 30, start_date, end_date } = options;

      // Get user statistics
      const userStats = await bankUserModel.getUserStatistics(customerId);

      // Get transaction statistics
      const transactionStats = await transactionModel.getUserTransactionStatistics(
        customerId,
        start_date,
        end_date
      );

      // Get transaction summary for charts
      const transactionSummary = await transactionModel.getTransactionSummary(customerId, days);

      return {
        success: true,
        data: {
          user: {
            customer_id: userStats.customer_id,
            name: userStats.name,
            email: userStats.email,
            balance: parseFloat(userStats.balance),
            created_at: userStats.created_at,
            updated_at: userStats.updated_at
          },
          statistics: {
            total_transactions: userStats.total_transactions,
            total_deposits: parseFloat(userStats.total_deposits),
            total_withdrawals: parseFloat(userStats.total_withdrawals),
            total_sent: parseFloat(userStats.total_sent),
            total_received: parseFloat(userStats.total_received),
            net_transfers: parseFloat(transactionStats.net_transfers)
          },
          transaction_summary: transactionSummary.map(item => ({
            date: item.date,
            transaction_count: parseInt(item.transaction_count),
            total_amount: parseFloat(item.total_amount),
            deposits: parseInt(item.deposits),
            withdrawals: parseInt(item.withdrawals),
            transfers: parseInt(item.transfers)
          }))
        }
      };
    } catch (error) {
      logger.error('Get account statistics failed:', error);
      throw error;
    }
  }

  // Validate transfer before execution
  async validateTransfer(customerId, transferData) {
    try {
      const { to_customer_id, amount } = transferData;

      if (!to_customer_id || !amount) {
        throw new Error('Recipient customer ID and amount are required');
      }

      const transferAmount = parseFloat(amount);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const toCustomerId = parseInt(to_customer_id);

      // Cannot transfer to self
      if (customerId === toCustomerId) {
        throw new Error('Cannot transfer to yourself');
      }

      // Verify sender exists
      const sender = await bankUserModel.findById(customerId);
      if (!sender) {
        throw new Error('Sender account not found');
      }

      // Verify recipient exists
      const recipient = await bankUserModel.findById(toCustomerId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Check sender's balance
      const senderBalance = await bankUserModel.getBalance(customerId);
      const hasSufficientBalance = senderBalance >= transferAmount;

      return {
        success: true,
        data: {
          valid: true,
          sender: {
            customer_id: sender.customer_id,
            name: sender.name,
            balance: parseFloat(senderBalance)
          },
          recipient: {
            customer_id: recipient.customer_id,
            name: recipient.name
          },
          transfer_amount: transferAmount,
          sufficient_balance: hasSufficientBalance
        }
      };
    } catch (error) {
      logger.error('Validate transfer failed:', error);
      throw error;
    }
  }
}

module.exports = new BankService();
