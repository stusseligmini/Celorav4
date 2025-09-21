const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const logger = require('../config/logger');
const { sentryUtils } = require('../config/sentry');
const { auth } = require('../middleware');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      ip: req.ip,
      endpoint: req.path
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Registration validation
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Password reset validation
const passwordResetValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Change password validation
const changePasswordValidation = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Register new user
router.post('/register', registerValidation, validateRequest, async (req, res) => {
  try {
    const result = await authService.register(req.body, req);
    
    res.status(201).json({
      success: true,
      message: result.message,
      user: result.user,
      tokens: result.tokens
    });
    
  } catch (error) {
    logger.error('Registration failed', {
      error: error.message,
      email: req.body.email,
      ip: req.ip
    });
    
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'REGISTRATION_FAILED'
    });
  }
});

// Login user
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const result = await authService.login(req.body, req);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.json({
      success: true,
      message: result.message,
      user: result.user,
      accessToken: result.tokens.accessToken
    });
    
  } catch (error) {
    logger.error('Login failed', {
      error: error.message,
      email: req.body.email,
      ip: req.ip
    });
    
    res.status(401).json({
      success: false,
      error: error.message,
      code: 'LOGIN_FAILED'
    });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not provided',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }
    
    const result = await authService.refreshToken(refreshToken, req);
    
    // Update refresh token cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.json({
      success: true,
      message: result.message,
      user: result.user,
      accessToken: result.tokens.accessToken
    });
    
  } catch (error) {
    logger.error('Token refresh failed', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(401).json({
      success: false,
      error: error.message,
      code: 'TOKEN_REFRESH_FAILED'
    });
  }
});

// Logout user
router.post('/logout', auth.verifyToken, async (req, res) => {
  try {
    await authService.logout(req.user.id, req);
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    logger.error('Logout failed', {
      error: error.message,
      userId: req.user?.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_FAILED'
    });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    const result = await authService.verifyEmail(token, req);
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    logger.error('Email verification failed', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'EMAIL_VERIFICATION_FAILED'
    });
  }
});

// Request password reset
router.post('/forgot-password', passwordResetValidation, validateRequest, async (req, res) => {
  try {
    const result = await authService.requestPasswordReset(req.body.email, req);
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    logger.error('Password reset request failed', {
      error: error.message,
      email: req.body.email,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to send password reset email',
      code: 'PASSWORD_RESET_REQUEST_FAILED'
    });
  }
});

// Reset password
router.post('/reset-password', resetPasswordValidation, validateRequest, async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password, req);
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    logger.error('Password reset failed', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'PASSWORD_RESET_FAILED'
    });
  }
});

// Change password (authenticated)
router.post('/change-password', auth.verifyToken, changePasswordValidation, validateRequest, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, oldPassword, newPassword, req);
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    logger.error('Password change failed', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'PASSWORD_CHANGE_FAILED'
    });
  }
});

// Get user profile
router.get('/profile', auth.verifyToken, async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user.id);
    
    res.json({
      success: true,
      user
    });
    
  } catch (error) {
    logger.error('Get profile failed', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      code: 'GET_PROFILE_FAILED'
    });
  }
});

// Update user profile
router.put('/profile', auth.verifyToken, [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be a valid object')
], validateRequest, async (req, res) => {
  try {
    // Update user profile logic would go here
    // For now, just return success
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    logger.error('Profile update failed', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_FAILED'
    });
  }
});

// Resend email verification
router.post('/resend-verification', auth.verifyToken, async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified',
        code: 'EMAIL_ALREADY_VERIFIED'
      });
    }
    
    // Generate new verification token and send email
    // This would be implemented in authService
    res.json({
      success: true,
      message: 'Verification email sent'
    });
    
  } catch (error) {
    logger.error('Resend verification failed', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email',
      code: 'RESEND_VERIFICATION_FAILED'
    });
  }
});

// Check auth status
router.get('/status', auth.optionalAuth, (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user || null
  });
});

// Health check for auth service
router.get('/health', async (req, res) => {
  try {
    const health = await authService.healthCheck();
    
    res.json({
      status: 'healthy',
      ...health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
