const database = require('../config/database');
const logger = require('../utils/logger');

class TransactionModel {
  constructor() {
    this.tableName = 'Transactions';
  }

  // Create new transaction
  async create(transactionData) {
    try {
      const {
        from_customer_id,
        to_customer_id,
        amount,
        transaction_type,
        status = 'completed',
        description
      } = transactionData;

      const query = `
        INSERT INTO ${this.tableName} 
        (from_customer_id, to_customer_id, amount, transaction_type, status, description) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `;

      const result = await database.query(query, [
        from_customer_id,
        to_customer_id,
        amount,
        transaction_type,
        status,
        description
      ]);

      logger.info('Transaction created', {
        transaction_id: result.rows[0].transaction_id,
        type: transaction_type,
        amount,
        from_customer_id,
        to_customer_id
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Transaction creation failed:', error);
      throw error;
    }
  }

  // Get transaction by ID
  async findById(transactionId) {
    try {
      const query = `
        SELECT t.*, 
               fu.name as from_customer_name,
               tu.name as to_customer_name
        FROM ${this.tableName} t
        LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
        LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
        WHERE t.transaction_id = $1
      `;

      const result = await database.query(query, [transactionId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Find transaction by ID failed:', error);
      throw error;
    }
  }

  // Get transactions for a user
  async getUserTransactions(customerId, options = {}) {
    try {
      const {
        limit = 10,
        offset = 0,
        transaction_type,
        status,
        start_date,
        end_date
      } = options;

      let query = `
        SELECT t.*, 
               fu.name as from_customer_name,
               tu.name as to_customer_name
        FROM ${this.tableName} t
        LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
        LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
        WHERE (t.from_customer_id = $1 OR t.to_customer_id = $1)
      `;

      const params = [customerId];
      let paramIndex = 2;

      // Add optional filters
      if (transaction_type) {
        query += ` AND t.transaction_type = $${paramIndex++}`;
        params.push(transaction_type);
      }

      if (status) {
        query += ` AND t.status = $${paramIndex++}`;
        params.push(status);
      }

      if (start_date) {
        query += ` AND t.transaction_date >= $${paramIndex++}`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND t.transaction_date <= $${paramIndex++}`;
        params.push(end_date);
      }

      query += ` ORDER BY t.transaction_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Get user transactions failed:', error);
      throw error;
    }
  }

  // Get transaction count for a user
  async getUserTransactionCount(customerId, options = {}) {
    try {
      const {
        transaction_type,
        status,
        start_date,
        end_date
      } = options;

      let query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE (from_customer_id = $1 OR to_customer_id = $1)
      `;

      const params = [customerId];
      let paramIndex = 2;

      // Add optional filters
      if (transaction_type) {
        query += ` AND transaction_type = $${paramIndex++}`;
        params.push(transaction_type);
      }

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      if (start_date) {
        query += ` AND transaction_date >= $${paramIndex++}`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND transaction_date <= $${paramIndex++}`;
        params.push(end_date);
      }

      const result = await database.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Get user transaction count failed:', error);
      throw error;
    }
  }

  // Execute transfer transaction
  async executeTransfer(fromCustomerId, toCustomerId, amount, description) {
    try {
      return await database.transaction(async (client) => {
        // Validate transfer using database function
        const validateQuery = 'SELECT validate_transfer($1, $2, $3) as valid';
        const validateResult = await client.query(validateQuery, [fromCustomerId, toCustomerId, amount]);

        if (!validateResult.rows[0].valid) {
          throw new Error('Invalid transfer');
        }

        // Execute transfer using database function
        const transferQuery = 'SELECT execute_transfer($1, $2, $3, $4) as transaction_id';
        const transferResult = await client.query(transferQuery, [fromCustomerId, toCustomerId, amount, description]);

        const transactionId = transferResult.rows[0].transaction_id;

        // Get complete transaction details using the SAME client (transaction hasn't committed yet)
        const detailsQuery = `
          SELECT t.*, 
                 fu.name as from_customer_name,
                 tu.name as to_customer_name
          FROM ${this.tableName} t
          LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
          LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
          WHERE t.transaction_id = $1
        `;
        const detailsResult = await client.query(detailsQuery, [transactionId]);
        const transaction = detailsResult.rows[0];

        logger.info('Transfer executed successfully', {
          transaction_id: transactionId,
          from_customer_id: fromCustomerId,
          to_customer_id: toCustomerId,
          amount
        });

        return transaction;
      });
    } catch (error) {
      logger.error('Transfer execution failed:', error);
      throw error;
    }
  }

  // Execute deposit transaction
  async executeDeposit(customerId, amount, description) {
    try {
      return await database.transaction(async (client) => {
        // Execute deposit using database function
        const depositQuery = 'SELECT deposit_money($1, $2, $3) as transaction_id';
        const depositResult = await client.query(depositQuery, [customerId, amount, description]);

        const transactionId = depositResult.rows[0].transaction_id;

        // Get complete transaction details using the SAME client (transaction hasn't committed yet)
        const detailsQuery = `
          SELECT t.*, 
                 fu.name as from_customer_name,
                 tu.name as to_customer_name
          FROM ${this.tableName} t
          LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
          LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
          WHERE t.transaction_id = $1
        `;
        const detailsResult = await client.query(detailsQuery, [transactionId]);
        const transaction = detailsResult.rows[0];

        logger.info('Deposit executed successfully', {
          transaction_id: transactionId,
          customer_id: customerId,
          amount
        });

        return transaction;
      });
    } catch (error) {
      logger.error('Deposit execution failed:', error);
      throw error;
    }
  }

  // Execute withdrawal transaction
  async executeWithdrawal(customerId, amount, description) {
    try {
      return await database.transaction(async (client) => {
        // Execute withdrawal using database function
        const withdrawalQuery = 'SELECT withdraw_money($1, $2, $3) as transaction_id';
        const withdrawalResult = await client.query(withdrawalQuery, [customerId, amount, description]);

        const transactionId = withdrawalResult.rows[0].transaction_id;

        // Get complete transaction details using the SAME client (transaction hasn't committed yet)
        const detailsQuery = `
          SELECT t.*, 
                 fu.name as from_customer_name,
                 tu.name as to_customer_name
          FROM ${this.tableName} t
          LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
          LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
          WHERE t.transaction_id = $1
        `;
        const detailsResult = await client.query(detailsQuery, [transactionId]);
        const transaction = detailsResult.rows[0];

        logger.info('Withdrawal executed successfully', {
          transaction_id: transactionId,
          customer_id: customerId,
          amount
        });

        return transaction;
      });
    } catch (error) {
      logger.error('Withdrawal execution failed:', error);
      throw error;
    }
  }

  // Get recent transactions for a user
  async getRecentTransactions(customerId, limit = 5) {
    try {
      const query = `
        SELECT t.*, 
               fu.name as from_customer_name,
               tu.name as to_customer_name
        FROM ${this.tableName} t
        LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
        LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
        WHERE (t.from_customer_id = $1 OR t.to_customer_id = $1)
        ORDER BY t.transaction_date DESC
        LIMIT $2
      `;

      const result = await database.query(query, [customerId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Get recent transactions failed:', error);
      throw error;
    }
  }

  // Search transactions
  async searchTransactions(customerId, searchTerm, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const query = `
        SELECT t.*, 
               fu.name as from_customer_name,
               tu.name as to_customer_name
        FROM ${this.tableName} t
        LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
        LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
        WHERE (t.from_customer_id = $1 OR t.to_customer_id = $1)
        AND (
          t.description ILIKE $2 
          OR fu.name ILIKE $2 
          OR tu.name ILIKE $2
          OR t.amount::text ILIKE $2
        )
        ORDER BY t.transaction_date DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await database.query(query, [customerId, `%${searchTerm}%`, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Search transactions failed:', error);
      throw error;
    }
  }

  // Get transaction statistics for a user
  async getUserTransactionStatistics(customerId, startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposits,
          COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals,
          COALESCE(SUM(CASE WHEN transaction_type = 'transfer' AND from_customer_id = $1 THEN amount ELSE 0 END), 0) as total_sent,
          COALESCE(SUM(CASE WHEN transaction_type = 'transfer' AND to_customer_id = $1 THEN amount ELSE 0 END), 0) as total_received,
          COALESCE(SUM(CASE WHEN transaction_type = 'transfer' AND from_customer_id = $1 THEN amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN transaction_type = 'transfer' AND to_customer_id = $1 THEN amount ELSE 0 END), 0) as net_transfers
        FROM ${this.tableName}
        WHERE (from_customer_id = $1 OR to_customer_id = $1)
      `;

      const params = [customerId];
      let paramIndex = 2;

      if (startDate) {
        query += ` AND transaction_date >= $${paramIndex++}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND transaction_date <= $${paramIndex++}`;
        params.push(endDate);
      }

      const result = await database.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Get user transaction statistics failed:', error);
      throw error;
    }
  }

  // Get transactions by type for a user
  async getTransactionsByType(customerId, transactionType, limit = 10, offset = 0) {
    try {
      const query = `
        SELECT t.*, 
               fu.name as from_customer_name,
               tu.name as to_customer_name
        FROM ${this.tableName} t
        LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
        LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
        WHERE (t.from_customer_id = $1 OR t.to_customer_id = $1)
        AND t.transaction_type = $2
        ORDER BY t.transaction_date DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await database.query(query, [customerId, transactionType, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Get transactions by type failed:', error);
      throw error;
    }
  }

  // Update transaction status
  async updateStatus(transactionId, newStatus) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET status = $2 
        WHERE transaction_id = $1 
        RETURNING *
      `;

      const result = await database.query(query, [transactionId, newStatus]);

      if (result.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      logger.info('Transaction status updated', {
        transaction_id: transactionId,
        new_status: newStatus
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Transaction status update failed:', error);
      throw error;
    }
  }

  // Get failed transactions for retry
  async getFailedTransactions(limit = 50) {
    try {
      const query = `
        SELECT t.*, 
               fu.name as from_customer_name,
               tu.name as to_customer_name
        FROM ${this.tableName} t
        LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
        LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
        WHERE t.status = 'failed'
        ORDER BY t.transaction_date DESC
        LIMIT $1
      `;

      const result = await database.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Get failed transactions failed:', error);
      throw error;
    }
  }

  // Get transaction summary for dashboard
  async getTransactionSummary(customerId, days = 30) {
    try {
      const query = `
        SELECT 
          DATE(transaction_date) as date,
          COUNT(*) as transaction_count,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) as deposits,
          COUNT(CASE WHEN transaction_type = 'withdrawal' THEN 1 END) as withdrawals,
          COUNT(CASE WHEN transaction_type = 'transfer' THEN 1 END) as transfers
        FROM ${this.tableName}
        WHERE (from_customer_id = $1 OR to_customer_id = $1)
        AND transaction_date >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(transaction_date)
        ORDER BY date DESC
      `;

      const result = await database.query(query, [customerId]);
      return result.rows;
    } catch (error) {
      logger.error('Get transaction summary failed:', error);
      throw error;
    }
  }

  // Validate transaction before execution
  async validateTransaction(transactionData) {
    try {
      const { from_customer_id, to_customer_id, amount, transaction_type } = transactionData;

      // Basic validation
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (!['transfer', 'deposit', 'withdrawal'].includes(transaction_type)) {
        throw new Error('Invalid transaction type');
      }

      // For transfers, validate both customers exist
      if (transaction_type === 'transfer') {
        if (!to_customer_id) {
          throw new Error('Recipient customer ID is required for transfers');
        }

        if (from_customer_id === to_customer_id) {
          throw new Error('Cannot transfer to yourself');
        }

        // Check if both customers exist
        const fromExists = await database.query(
          'SELECT 1 FROM BankUser WHERE customer_id = $1',
          [from_customer_id]
        );

        const toExists = await database.query(
          'SELECT 1 FROM BankUser WHERE customer_id = $1',
          [to_customer_id]
        );

        if (fromExists.rows.length === 0) {
          throw new Error('Sender not found');
        }

        if (toExists.rows.length === 0) {
          throw new Error('Recipient not found');
        }

        // Check sufficient balance
        const balanceResult = await database.query(
          'SELECT balance FROM BankUser WHERE customer_id = $1',
          [from_customer_id]
        );

        const currentBalance = parseFloat(balanceResult.rows[0].balance);
        if (currentBalance < amount) {
          throw new Error('Insufficient balance');
        }
      }

      // For deposits and withdrawals, validate customer exists
      if (['deposit', 'withdrawal'].includes(transaction_type)) {
        const customerExists = await database.query(
          'SELECT 1 FROM BankUser WHERE customer_id = $1',
          [from_customer_id]
        );

        if (customerExists.rows.length === 0) {
          throw new Error('Customer not found');
        }

        // For withdrawals, check sufficient balance
        if (transaction_type === 'withdrawal') {
          const balanceResult = await database.query(
            'SELECT balance FROM BankUser WHERE customer_id = $1',
            [from_customer_id]
          );

          const currentBalance = parseFloat(balanceResult.rows[0].balance);
          if (currentBalance < amount) {
            throw new Error('Insufficient balance');
          }
        }
      }

      return { valid: true };
    } catch (error) {
      logger.error('Transaction validation failed:', error);
      throw error;
    }
  }
}

module.exports = new TransactionModel();
