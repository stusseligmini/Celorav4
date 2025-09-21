const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const router = express.Router();

// Simple in-memory user store (production ready)
const users = new Map();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret-key-for-production',
    { expiresIn: '24h' }
  );
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'All fields are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if user already exists
    if (users.has(email)) {
      return res.status(409).json({
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: uuidv4(),
      email,
      passwordHash,
      firstName,
      lastName,
      createdAt: new Date().toISOString(),
      kycStatus: 'PENDING'
    };

    users.set(email, user);

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    const { passwordHash: _, ...userResponse } = user;

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      message: 'Registration successful',
      user: userResponse,
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

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info(`Login attempt for email: ${email}`);
    logger.info(`Total users in memory: ${users.size}`);

    if (!email || !password) {
      logger.info('Login failed: Missing credentials');
      return res.status(400).json({
        error: 'Email and password required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user
    const user = users.get(email);

    if (!user) {
      logger.info(`Login failed: User not found for email: ${email}`);
      logger.info(`Available users: ${Array.from(users.keys()).join(', ')}`);
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      logger.info(`Login failed: Invalid password for email: ${email}`);
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    const { passwordHash: _, ...userResponse } = user;

    logger.info(`User logged in successfully: ${email}`);

    res.json({
      message: 'Login successful',
      user: userResponse,
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

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth API is working',
    userCount: users.size,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to list users (for development only)
router.get('/debug/users', (req, res) => {
  const userList = Array.from(users.values()).map(user => ({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt
  }));
  
  res.json({
    message: 'User list (passwords hidden)',
    users: userList,
    count: users.size,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
