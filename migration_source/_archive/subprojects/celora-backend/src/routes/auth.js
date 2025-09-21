const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const { handleValidation } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { generateSolanaWallet, generateWalletName } = require('../utils/walletGenerator');
const { sendVerificationCode, verifyCode } = require('../utils/emailVerification');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('firstName').notEmpty().trim().withMessage('First name required'),
  body('lastName').notEmpty().trim().withMessage('Last name required'),
  body('securityIcons').optional().isArray().withMessage('Security icons must be an array')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: '24h',
      issuer: 'celora-api',
      audience: 'celora-client'
    }
  );
};

// Register new user
router.post('/register', registerValidation, handleValidation, async (req, res) => {
  try {
    const { email, password, firstName, lastName, securityIcons } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Process security icons
    const securityIconsJson = securityIcons ? JSON.stringify(securityIcons) : null;
    
    // Create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
        firstName,
        lastName,
        isActive: true,
        kycStatus: 'PENDING',
        ...(securityIconsJson && { securityIcons: securityIconsJson })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kycStatus: true,
        createdAt: true
      }
    });
    
    // Generate default Solana wallet
    try {
      const walletData = await generateSolanaWallet(user.id, securityIcons);
      const walletName = generateWalletName(firstName, 0);
      
      await prisma.wallet.create({
        data: {
          ...walletData,
          userId: user.id,
          name: walletName
        }
      });
      
      logger.info(`Default wallet created for user ${email}`);
    } catch (walletError) {
      logger.error('Failed to create default wallet:', walletError);
      // Continue with registration even if wallet creation fails
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    logger.info(`New user registered: ${email} with ${securityIcons ? securityIcons.length : 0} security icons`);
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
    
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login user
router.post('/login', loginValidation, handleValidation, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        isActive: true,
        kycStatus: true,
        lastLoginAt: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordValid) {
      logger.warn(`Failed login attempt for: ${email}`);
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    
    // Generate token
    const token = generateToken(user.id);
    
    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;
    
    logger.info(`User logged in: ${email}`);
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kycStatus: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            wallets: true,
            virtualCards: true,
            transactions: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json({
      user
    });
    
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('phone').optional().isMobilePhone()
], handleValidation, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        kycStatus: true,
        updatedAt: true
      }
    });
    
    logger.info(`Profile updated for user: ${req.user.email}`);
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
    
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generate new token
    const token = generateToken(req.user.id);
    
    res.json({
      message: 'Token refreshed',
      token
    });
    
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'TOKEN_REFRESH_ERROR'
    });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    logger.info(`User logged out: ${req.user.email}`);
    
    res.json({
      message: 'Logout successful'
    });
    
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Send email verification code
router.post('/send-verification', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('purpose').isIn(['registration', 'login', 'password-reset']).withMessage('Valid purpose required')
], handleValidation, async (req, res) => {
  try {
    const { email, purpose } = req.body;
    
    // For registration, check if user already exists
    if (purpose === 'registration') {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          code: 'USER_EXISTS'
        });
      }
    }
    
    // For login/password-reset, check if user exists
    if (purpose === 'login' || purpose === 'password-reset') {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { firstName: true, isActive: true }
      });
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      if (!user.isActive) {
        return res.status(401).json({
          error: 'Account deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }
    }
    
    // Send verification code
    const result = await sendVerificationCode(email, purpose, 'User');
    
    if (result.success) {
      res.json({
        message: 'Verification code sent successfully',
        codeId: result.codeId,
        expiresAt: result.expiresAt
      });
    } else {
      res.status(500).json({
        error: result.error || 'Failed to send verification code',
        code: 'SEND_CODE_ERROR'
      });
    }
    
  } catch (error) {
    logger.error('Send verification error:', error);
    res.status(500).json({
      error: 'Failed to send verification code',
      code: 'SEND_CODE_ERROR'
    });
  }
});

// Verify email code
router.post('/verify-email', [
  body('codeId').notEmpty().withMessage('Code ID required'),
  body('code').notEmpty().withMessage('Verification code required')
], handleValidation, async (req, res) => {
  try {
    const { codeId, code } = req.body;
    
    const result = verifyCode(codeId, code);
    
    if (result.success) {
      res.json({
        message: 'Email verified successfully',
        email: result.email,
        purpose: result.purpose
      });
    } else {
      res.status(400).json({
        error: result.error,
        code: result.code,
        ...(result.attemptsRemaining && { attemptsRemaining: result.attemptsRemaining })
      });
    }
    
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed',
      code: 'EMAIL_VERIFICATION_ERROR'
    });
  }
});

module.exports = router;
