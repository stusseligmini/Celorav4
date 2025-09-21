import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  email: string;
  walletAddress?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    walletAddress?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid access token'
      });
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication service unavailable'
      });
      return;
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        isActive: true,
      }
    });

    if (!user) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      walletAddress: user.walletAddress || undefined
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Please provide a valid access token'
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Unable to authenticate request'
    });
  }
};

export const generateTokens = (user: { id: string; email: string; walletAddress?: string | null }) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets not configured');
  }

  const payload = {
    userId: user.id,
    email: user.email,
    walletAddress: user.walletAddress
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (refreshToken: string): JwtPayload => {
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT refresh secret not configured');
  }

  return jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload;
};

// Optional authentication - for endpoints that work with or without auth
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      await authenticateToken(req, res, next);
      return;
    } catch (error) {
      // If token is invalid, continue without authentication
    }
  }

  next();
};

// API Key authentication for server-to-server communication
export const authenticateApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key'
      });
      return;
    }

    // TODO: Implement API key authentication when ApiKey model is added to schema
    /*
    // Find API key in database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash: apiKey },
      include: { user: true }
    });

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'Please provide a valid API key'
      });
      return;
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      res.status(401).json({
        error: 'API key expired',
        message: 'Your API key has expired'
      });
      return;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsed: new Date() }
    });
    */

    // For now, return error since API key model doesn't exist
    res.status(501).json({
      error: 'API key authentication not implemented',
      message: 'API key authentication requires ApiKey model in database schema'
    });
    return;
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Unable to authenticate API key'
    });
  }
};
