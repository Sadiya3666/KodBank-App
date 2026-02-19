const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Profile endpoints

// Get detailed user profile
router.get('/profile', 
  asyncHandler(userController.getProfile)
);

// Update user profile
router.put('/profile', 
  validate.updateProfile,
  asyncHandler(userController.updateProfile)
);

// Account activity endpoints

// Get account activity
router.get('/activity', 
  validate.pagination,
  asyncHandler(userController.getAccountActivity)
);

// Dashboard endpoints

// Get user dashboard data
router.get('/dashboard', 
  asyncHandler(userController.getDashboard)
);

// Preferences endpoints

// Get user preferences
router.get('/preferences', 
  asyncHandler(userController.getPreferences)
);

// Update user preferences
router.put('/preferences', 
  asyncHandler(userController.updatePreferences)
);

// Search endpoints

// Search users (for transfers)
router.get('/search', 
  validate.search,
  asyncHandler(userController.searchUsers)
);

// Account management endpoints

// Delete user account
router.delete('/account', 
  validate.deleteAccount,
  asyncHandler(userController.deleteAccount)
);

// Account statements endpoints

// Get account statements
router.get('/statements', 
  asyncHandler(userController.getAccountStatements)
);

module.exports = router;
