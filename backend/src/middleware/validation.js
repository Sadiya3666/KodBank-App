const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    logger.warn('Validation failed', {
      method: req.method,
      url: req.originalUrl,
      errors: errorMessages
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: errorMessages,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Common validation chains
const validations = {
  // User registration validation
  signup: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),

    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .isLength({ max: 150 })
      .withMessage('Email must be less than 150 characters'),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (@$!%*&)')
  ],

  // User login validation
  login: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Password change validation
  changePassword: [
    body('current_password')
      .notEmpty()
      .withMessage('Current password is required'),

    body('new_password')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (@$!%*&)')

      .custom((value, { req }) => {
        if (value === req.body.current_password) {
          throw new Error('New password must be different from current password');
        }
        return true;
      })
  ],

  // Profile update validation
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),

    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .isLength({ max: 150 })
      .withMessage('Email must be less than 150 characters')
  ],

  // Money transfer validation
  transfer: [
    body('to_customer_id')
      .notEmpty()
      .withMessage('Recipient customer ID is required')
      .isInt({ min: 1 })
      .withMessage('Recipient customer ID must be a positive integer'),

    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ min: 0.01, max: 10000 })
      .withMessage('Amount must be between 0.01 and 10000')
      .custom((value) => {
        // Check for maximum 2 decimal places
        const decimalPlaces = value.toString().split('.')[1];
        if (decimalPlaces && decimalPlaces.length > 2) {
          throw new Error('Amount can have maximum 2 decimal places');
        }
        return true;
      }),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Description must be less than 255 characters')
  ],

  // Deposit validation
  deposit: [
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ min: 0.01, max: 50000 })
      .withMessage('Amount must be between 0.01 and 50000')
      .custom((value) => {
        const decimalPlaces = value.toString().split('.')[1];
        if (decimalPlaces && decimalPlaces.length > 2) {
          throw new Error('Amount can have maximum 2 decimal places');
        }
        return true;
      }),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Description must be less than 255 characters')
  ],

  // Withdrawal validation
  withdraw: [
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ min: 0.01, max: 25000 })
      .withMessage('Amount must be between 0.01 and 25000')
      .custom((value) => {
        const decimalPlaces = value.toString().split('.')[1];
        if (decimalPlaces && decimalPlaces.length > 2) {
          throw new Error('Amount can have maximum 2 decimal places');
        }
        return true;
      }),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Description must be less than 255 characters')
  ],

  // Customer ID parameter validation
  customerId: [
    param('customerId')
      .isInt({ min: 1 })
      .withMessage('Customer ID must be a positive integer')
  ],

  // Transaction ID parameter validation
  transactionId: [
    param('transactionId')
      .isInt({ min: 1 })
      .withMessage('Transaction ID must be a positive integer')
  ],

  // Token ID parameter validation
  tokenId: [
    param('tokenId')
      .isInt({ min: 1 })
      .withMessage('Token ID must be a positive integer')
  ],

  // Pagination validation
  pagination: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
  ],

  // Transaction history filters validation
  transactionFilters: [
    query('transaction_type')
      .optional()
      .isIn(['transfer', 'deposit', 'withdrawal'])
      .withMessage('Transaction type must be one of: transfer, deposit, withdrawal'),

    query('status')
      .optional()
      .isIn(['completed', 'pending', 'failed'])
      .withMessage('Status must be one of: completed, pending, failed'),

    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date (ISO 8601 format)'),

    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date (ISO 8601 format)')
      .custom((value, { req }) => {
        if (req.query.start_date) {
          const startDate = new Date(req.query.start_date);
          const endDate = new Date(value);
          if (endDate <= startDate) {
            throw new Error('End date must be after start date');
          }
        }
        return true;
      })
  ],

  // Search validation
  search: [
    query('q')
      .trim()
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
  ],

  // Account deletion validation
  deleteAccount: [
    body('password')
      .notEmpty()
      .withMessage('Password is required for account deletion')
  ]
};

// Custom validation functions
const customValidations = {
  // Validate that customer exists
  customerExists: async (customerId, { req }) => {
    const bankUserModel = require('../models/bankUserModel');
    const exists = await bankUserModel.userExists(parseInt(customerId));
    if (!exists) {
      throw new Error('Customer does not exist');
    }
    return true;
  },

  // Validate email uniqueness (for updates)
  uniqueEmail: async (email, { req }) => {
    const bankUserModel = require('../models/bankUserModel');
    const customerId = req.user?.customer_id;
    const existingUser = await bankUserModel.findByEmail(email);

    if (existingUser && existingUser.customer_id !== customerId) {
      throw new Error('Email is already used by another user');
    }
    return true;
  },

  // Validate transfer amount against user balance
  sufficientBalance: async (amount, { req }) => {
    if (!req.user) return true; // Skip validation if user not authenticated

    const bankUserModel = require('../models/bankUserModel');
    const hasBalance = await bankUserModel.hasSufficientBalance(req.user.customer_id, parseFloat(amount));

    if (!hasBalance) {
      throw new Error('Insufficient balance for this transfer');
    }
    return true;
  },

  // Prevent self-transfer
  notSelfTransfer: (toCustomerId, { req }) => {
    if (!req.user) return true;

    const fromCustomerId = req.user.customer_id;
    const toId = parseInt(toCustomerId);

    if (fromCustomerId === toId) {
      throw new Error('Cannot transfer to yourself');
    }
    return true;
  },

  // Validate date range
  validDateRange: (endDate, { req }) => {
    if (req.query.start_date) {
      const startDate = new Date(req.query.start_date);
      const end = new Date(endDate);

      if (end <= startDate) {
        throw new Error('End date must be after start date');
      }

      // Don't allow dates too far in the future
      const maxFuture = new Date();
      maxFuture.setMonth(maxFuture.getMonth() + 1);

      if (end > maxFuture) {
        throw new Error('End date cannot be more than 1 month in the future');
      }
    }
    return true;
  },

  // Validate reasonable date range
  reasonableDateRange: (startDate, { req }) => {
    const start = new Date(startDate);
    const now = new Date();

    // Don't allow dates more than 1 year in the past
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 1);

    if (start < minDate) {
      throw new Error('Start date cannot be more than 1 year in the past');
    }

    // Don't allow future dates for start date
    if (start > now) {
      throw new Error('Start date cannot be in the future');
    }

    return true;
  }
};

// Validation middleware creators
const createValidation = (validationChain) => [
  validationChain,
  handleValidationErrors
];

const createParamValidation = (paramChain) => [
  paramChain,
  handleValidationErrors
];

const createQueryValidation = (queryChain) => [
  queryChain,
  handleValidationErrors
];

// Combined validation middleware
const validate = {
  signup: createValidation(validations.signup),
  login: createValidation(validations.login),
  changePassword: createValidation(validations.changePassword),
  updateProfile: createValidation(validations.updateProfile),
  transfer: [
    ...validations.transfer,
    body('to_customer_id').custom(customValidations.notSelfTransfer),
    body('amount').custom(customValidations.sufficientBalance),
    handleValidationErrors
  ],
  deposit: createValidation(validations.deposit),
  withdraw: createValidation(validations.withdraw),
  deleteAccount: createValidation(validations.deleteAccount),

  // Parameter validations
  customerId: createParamValidation(validations.customerId),
  transactionId: createParamValidation(validations.transactionId),
  tokenId: createParamValidation(validations.tokenId),

  // Query validations
  pagination: createQueryValidation(validations.pagination),
  transactionFilters: createQueryValidation(validations.transactionFilters),
  search: createQueryValidation(validations.search)
};

module.exports = {
  validate,
  validations,
  customValidations,
  handleValidationErrors,
  createValidation,
  createParamValidation,
  createQueryValidation
};
