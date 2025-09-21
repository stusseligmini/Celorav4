import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { ethers } from 'ethers';
import { Keypair } from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';
import { generateTokens, verifyRefreshToken, AuthenticatedRequest, authenticateToken } from '../middleware/auth';

const prisma = new PrismaClient();
import { ValidationError, UnauthorizedError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import speakeasy from 'speakeasy';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    }),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  walletAddress: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  twoFactorToken: Joi.string().optional()
});

const walletLoginSchema = Joi.object({
  walletAddress: Joi.string().required(),
  signature: Joi.string().required(),
  message: Joi.string().required(),
  walletType: Joi.string().valid('METAMASK', 'PHANTOM', 'WALLET_CONNECT', 'COINBASE_WALLET').required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// Register with email and password
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email, password, firstName, lastName, walletAddress } = value;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Check if wallet address is already registered
  if (walletAddress) {
    const existingWallet = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (existingWallet) {
      throw new ConflictError('This wallet address is already registered');
    }
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      walletAddress,
      walletType: walletAddress ? 'METAMASK' : undefined
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      walletAddress: true,
      createdAt: true
    }
  });

  // Create default portfolio
  await prisma.portfolio.create({
    data: {
      userId: user.id,
      name: 'Default Portfolio',
      description: 'Your main portfolio',
      isDefault: true
    }
  });

  // Generate tokens
  const tokens = generateTokens(user);

  res.status(201).json({
    message: 'User registered successfully',
    user,
    tokens
  });
}));

// Login with email and password
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email, password, twoFactorToken } = value;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const unlockTime = user.lockedUntil.toISOString();
    throw new UnauthorizedError(`Account is locked until ${unlockTime}`);
  }

  // Verify password
  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    // Increment login attempts
    const loginAttempts = user.loginAttempts + 1;
    const updateData: any = { loginAttempts };

    // Lock account after 5 failed attempts
    if (loginAttempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    throw new UnauthorizedError('Invalid email or password');
  }

  // Check 2FA if enabled
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!twoFactorToken) {
      throw new UnauthorizedError('Two-factor authentication token required');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorToken,
      window: 2
    });

    if (!verified) {
      throw new UnauthorizedError('Invalid two-factor authentication token');
    }
  }

  // Reset login attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date()
    }
  });

  // Generate tokens
  const tokens = generateTokens(user);

  // Save session
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      deviceInfo: req.get('User-Agent'),
      ipAddress: req.ip
    }
  });

  const userResponse = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    walletAddress: user.walletAddress,
    twoFactorEnabled: user.twoFactorEnabled,
    lastLogin: user.lastLogin
  };

  res.json({
    message: 'Login successful',
    user: userResponse,
    tokens
  });
}));

// Wallet-based authentication (MetaMask/Phantom)
router.post('/wallet-login', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = walletLoginSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { walletAddress, signature, message, walletType } = value;

  // Verify signature based on wallet type
  let isValidSignature = false;

  try {
    if (walletType === 'METAMASK' || walletType === 'WALLET_CONNECT' || walletType === 'COINBASE_WALLET') {
      // Ethereum signature verification
      const recoveredAddress = ethers.verifyMessage(message, signature);
      isValidSignature = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } else if (walletType === 'PHANTOM') {
      // Solana signature verification (simplified)
      // In production, implement proper Solana signature verification
      isValidSignature = true; // Placeholder
    }
  } catch (error) {
    throw new UnauthorizedError('Invalid wallet signature');
  }

  if (!isValidSignature) {
    throw new UnauthorizedError('Invalid wallet signature');
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() }
  });

  if (!user) {
    // Create new user with wallet
    user = await prisma.user.create({
      data: {
        email: `${walletAddress.toLowerCase()}@wallet.local`,
        walletAddress: walletAddress.toLowerCase(),
        walletType: walletType as any,
        emailVerified: false
      }
    });

    // Create default portfolio
    await prisma.portfolio.create({
      data: {
        userId: user.id,
        name: 'Default Portfolio',
        description: 'Your main portfolio',
        isDefault: true
      }
    });
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  // Generate tokens
  const tokens = generateTokens(user);

  // Save session
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceInfo: req.get('User-Agent'),
      ipAddress: req.ip
    }
  });

  const userResponse = {
    id: user.id,
    email: user.email,
    walletAddress: user.walletAddress,
    walletType: user.walletType,
    lastLogin: user.lastLogin
  };

  res.json({
    message: 'Wallet authentication successful',
    user: userResponse,
    tokens
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = refreshTokenSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { refreshToken } = value;

  try {
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and session
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const session = await prisma.userSession.findUnique({
      where: { refreshToken }
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update session
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      message: 'Tokens refreshed successfully',
      tokens
    });
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token');
  }
}));

// Logout
router.post('/logout', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token && req.user) {
    // Remove session
    await prisma.userSession.deleteMany({
      where: {
        userId: req.user.id,
        token
      }
    });
  }

  res.json({
    message: 'Logout successful'
  });
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      walletAddress: true,
      walletType: true,
      twoFactorEnabled: true,
      preferredCurrency: true,
      theme: true,
      language: true,
      lastLogin: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    user
  });
}));

// Generate wallet login message
router.post('/wallet-message', asyncHandler(async (req: Request, res: Response) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    throw new ValidationError('Wallet address is required');
  }

  const nonce = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  
  const message = `Welcome to Celora!

Click to sign in and accept the Celora Terms of Service.

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${timestamp}`;

  res.json({
    message,
    nonce,
    timestamp
  });
}));

export default router;
