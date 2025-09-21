import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Simple in-memory user store for demo purposes
const users: Array<{
  id: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
}> = [];

// Demo user
users.push({
  id: 'demo-user',
  email: 'demo@celora.io',
  password: bcrypt.hashSync('Demo123!', 10), // Pre-hashed password for demo user
  firstName: 'Demo',
  lastName: 'User',
  createdAt: new Date()
});

// Register endpoint
router.post('/register', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName } = req.body;

  // Check if user exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    res.status(400).json({
      success: false,
      message: 'User already exists with this email'
    });
    return;
  }

  // Validate password
  if (!password || password.length < 8) {
    res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
    return;
  }

  // Create new user
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: `user-${Date.now()}`,
    email,
    password: hashedPassword,
    firstName,
    lastName,
    createdAt: new Date()
  };

  users.push(newUser);

  // Generate token
  const token = jwt.sign(
    { 
      userId: newUser.id, 
      email: newUser.email 
    },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      },
      token
    }
  });
}));

// Login endpoint
router.post('/login', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
    return;
  }

  // Find user
  const user = users.find(u => u.email === email);
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
    return;
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
    return;
  }

  // Generate token
  const token = jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      token
    }
  });
}));

// Get user profile
router.get('/profile', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = users.find(u => u.id === decoded.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
    return;
  }
}));

export default router;
