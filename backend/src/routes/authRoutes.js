const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Public routes (no authentication required)

// User registration
router.post('/signup', 
  validate.signup,
  asyncHandler(authController.register)
);

// User login
router.post('/login', 
  validate.login,
  asyncHandler(authController.login)
);

// Protected routes (authentication required)

// User logout
router.post('/logout', 
  authenticate,
  asyncHandler(authController.logout)
);

// Refresh token
router.post('/refresh', 
  authenticate,
  asyncHandler(authController.refreshToken)
);

// Logout from all devices
router.post('/logout-all', 
  authenticate,
  asyncHandler(authController.logoutFromAllDevices)
);

// Get active sessions
router.get('/sessions', 
  authenticate,
  asyncHandler(authController.getActiveSessions)
);

// Change password
router.post('/change-password', 
  authenticate,
  validate.changePassword,
  asyncHandler(authController.changePassword)
);

// Get user profile
router.get('/profile', 
  authenticate,
  asyncHandler(authController.getProfile)
);

// Update user profile
router.put('/profile', 
  authenticate,
  validate.updateProfile,
  asyncHandler(authController.updateProfile)
);

// Delete user account
router.delete('/account', 
  authenticate,
  validate.deleteAccount,
  asyncHandler(authController.deleteAccount)
);

// Validate token (for testing/middleware purposes)
router.post('/validate', 
  authenticate,
  asyncHandler(authController.validateToken)
);

// Get authentication status
router.get('/status', 
  authenticate,
  asyncHandler(authController.getAuthStatus)
);

// Extend current session
router.post('/extend-session', 
  authenticate,
  asyncHandler(authController.extendSession)
);

// Revoke specific session
router.delete('/sessions/:tokenId', 
  authenticate,
  validate.tokenId,
  asyncHandler(authController.revokeSession)
);

// Get authentication statistics
router.get('/stats', 
  authenticate,
  asyncHandler(authController.getAuthStats)
);

// Security check
router.get('/security-check', 
  authenticate,
  asyncHandler(authController.securityCheck)
);

module.exports = router;
