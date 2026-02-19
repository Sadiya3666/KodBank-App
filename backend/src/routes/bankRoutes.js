const express = require('express');
const bankController = require('../controllers/bankController');
const { authenticate, canAccessResource, hasSufficientBalance } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Balance endpoints

// Get account balance
router.get('/balance',
  asyncHandler(bankController.getBalance)
);

// Get full account details (debug view)
router.get('/full-details',
  asyncHandler(bankController.getFullDetails)
);

// Transaction endpoints

// Get transaction history
router.get('/transactions',
  validate.pagination,
  validate.transactionFilters,
  asyncHandler(bankController.getTransactionHistory)
);

// Get recent transactions
router.get('/transactions/recent',
  asyncHandler(bankController.getRecentTransactions)
);

// Get transaction details
router.get('/transactions/:transactionId',
  validate.transactionId,
  asyncHandler(bankController.getTransactionDetails)
);

// Search transactions
router.get('/transactions/search',
  validate.search,
  asyncHandler(bankController.searchTransactions)
);

// Get transaction receipt
router.get('/transactions/:transactionId/receipt',
  validate.transactionId,
  asyncHandler(bankController.getTransactionReceipt)
);

// Export transaction history
router.get('/transactions/export',
  validate.transactionFilters,
  asyncHandler(bankController.exportTransactionHistory)
);

// Recipient verification

// Verify if a recipient exists (for transfer validation)
router.get('/verify-recipient',
  asyncHandler(bankController.verifyRecipient)
);

// Transfer endpoints

// Transfer money to another customer
router.post('/transfer',
  validate.transfer,
  hasSufficientBalance('amount'),
  asyncHandler(bankController.transferMoney)
);

// Quick transfer (minimal validation)
router.post('/transfer/quick',
  validate.transfer,
  hasSufficientBalance('amount'),
  asyncHandler(bankController.quickTransfer)
);

// Validate transfer before execution
router.post('/transfer/validate',
  validate.transfer,
  asyncHandler(bankController.validateTransfer)
);

// Get transfer suggestions (frequent recipients)
router.get('/transfer/suggestions',
  asyncHandler(bankController.getTransferSuggestions)
);

// Deposit endpoints

// Deposit money
router.post('/deposit',
  validate.deposit,
  asyncHandler(bankController.depositMoney)
);

// Withdrawal endpoints

// Withdraw money
router.post('/withdraw',
  validate.withdraw,
  hasSufficientBalance('amount'),
  asyncHandler(bankController.withdrawMoney)
);

// Account endpoints

// Get account statistics
router.get('/statistics',
  asyncHandler(bankController.getAccountStatistics)
);

// Get mini statement
router.get('/statement/mini',
  asyncHandler(bankController.getMiniStatement)
);

// Get account summary
router.get('/summary',
  asyncHandler(bankController.getAccountSummary)
);

// Get account statements (monthly)
router.get('/statement',
  asyncHandler(bankController.getAccountStatements)
);

module.exports = router;
