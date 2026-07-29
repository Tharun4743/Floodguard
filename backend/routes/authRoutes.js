const express = require('express');
const { body } = require('express-validator');
const {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Register Route
router.post(
  '/register',
  [
    body('name', 'Name is required and should be between 2 and 50 characters').isLength({ min: 2, max: 50 }),
    body('email', 'Please include a valid email address').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    body('role', 'Role must be admin, coordinator, responder, or resident').optional().isIn(['admin', 'coordinator', 'responder', 'resident']),
    validate
  ],
  register
);

// Verify Email Route
router.get('/verify-email/:token', verifyEmail);

// Login Route
router.post(
  '/login',
  [
    body('email', 'Please include a valid email address').isEmail(),
    body('password', 'Password is required').exists(),
    validate
  ],
  login
);

// Forgot Password Route
router.post(
  '/forgot-password',
  [
    body('email', 'Please include a valid email address').isEmail(),
    validate
  ],
  forgotPassword
);

// Reset Password Route
router.post(
  '/reset-password',
  [
    body('token', 'Token is required').notEmpty(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    validate
  ],
  resetPassword
);

// Get Current User Profile (Me)
router.get('/me', protect, getMe);

module.exports = router;
