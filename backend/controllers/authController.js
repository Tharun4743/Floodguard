const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'floodguard_super_secure_secret_key_2026', {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// Log simulated email for verification/reset
const logSimulatedEmail = (to, subject, body) => {
  console.log('\n==================================================');
  console.log(`✉️  SIMULATED EMAIL SENT TO: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('--------------------------------------------------');
  console.log(body);
  console.log('==================================================\n');
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  const { name, email, password, role } = req.body;

  try {
    // Check if user exists
    const userExist = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    // Set role (validate allowed roles: resident, responder, coordinator, admin)
    const allowedRoles = ['resident', 'responder', 'coordinator', 'admin'];
    const userRole = allowedRoles.includes(role) ? role : 'resident';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Insert user (unverified by default if they select resident/responder, but let's default to verified for admin or coordinator for ease, or keep all active by default for smooth demo unless verification is triggered)
    // The prompt says "Implement email verification"
    const status = 'unverified';

    const newUser = await db.query(
      `INSERT INTO users (name, email, password_hash, role, status, verification_token)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, status`,
      [name, email, passwordHash, userRole, status, verificationToken]
    );

    const user = newUser.rows[0];

    // Log verification link
    const verifyUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
    logSimulatedEmail(
      email,
      'Verify your FloodGuard account',
      `Welcome to FloodGuard, ${name}! Please click the link below to verify your email address:\n\n${verifyUrl}\n\nToken: ${verificationToken}`
    );

    // Write activity log
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [user.id, 'USER_REGISTER', `User registered with role ${userRole}`]
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email to login. Check console logs for simulated verification email.',
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  const { token } = req.params;

  try {
    const userResult = await db.query(
      'SELECT id, name FROM users WHERE verification_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    const user = userResult.rows[0];

    await db.query(
      'UPDATE users SET status = $1, verification_token = NULL WHERE id = $2',
      ['active', user.id]
    );

    // Write activity log
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [user.id, 'USER_VERIFY', 'User verified their email address']
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const userResult = await db.query(
      'SELECT id, name, email, password_hash, role, status FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check status
    if (user.status === 'unverified') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in. Check your email (or server log) for verification token.'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Update log
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [user.id, 'USER_LOGIN', 'User logged in successfully']
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const userResult = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No user registered with that email address'
      });
    }

    const user = userResult.rows[0];

    // Create reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    );

    // Log reset link
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    logSimulatedEmail(
      email,
      'Password Reset Request',
      `You requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nToken: ${resetToken}`
    );

    res.status(200).json({
      success: true,
      message: 'Password reset link sent! Check server console log for simulated email link.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  try {
    // Find user by valid reset token and time
    const userResult = await db.query(
      'SELECT id, name FROM users WHERE reset_token = $1 AND reset_token_expires > CURRENT_TIMESTAMP',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    const user = userResult.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update password, clear reset token
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [user.id, 'USER_RESET_PASSWORD', 'User successfully reset their password']
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // User is already attached via protect middleware
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};
