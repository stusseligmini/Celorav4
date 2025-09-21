const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { sentryUtils } = require('../config/sentry');
const authService = require('../services/authService');

const prisma = new PrismaClient();

// Security middleware configuration
const securityMiddleware = {
  // Helmet configuration for security headers
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // unsafe-eval needed for Solana Web3.js
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.devnet.solana.com", "https://api.mainnet-beta.solana.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "same-origin" }
  }),
  
  // CORS configuration
  cors: cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'https://celora.net'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'X-Client-Version'],
    exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400 // 24 hours
  }),
  
  // Compression
  compression: compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      // Don't compress responses if the request includes a cache-control: no-transform directive
      if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
        return false;
      }
      
      return compression.filter(req, res);
    }
  }),
  
  // Request logging with Morgan
  morgan: morgan('combined', {
    stream: {
      write: (message) => {
        logger.info(message.trim());
      }
    },
    skip: (req) => {
      // Skip logging for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  })
};

// Authentication middleware
const auth = {
  // JWT verification middleware
  verifyToken: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        });
      }
      
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const decoded = authService.verifyToken(token);
      
      if (!decoded) {
        logger.audit.securityEvent(
          'invalid_token_attempt',
          null,
          req.ip,
          'medium',
          { endpoint: req.path, method: req.method }
        );
        
        return res.status(401).json({
          error: 'Invalid token.',
          code: 'INVALID_TOKEN'
        });
      }
      
      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          emailVerified: true,
          tokenVersion: true
        }
      });
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'User not found or inactive.',
          code: 'USER_INACTIVE'
        });
      }
      
      // Check token version (for token invalidation)
      if (decoded.tokenVersion && decoded.tokenVersion !== (user.tokenVersion || 0)) {
        return res.status(401).json({
          error: 'Token has been invalidated. Please login again.',
          code: 'TOKEN_INVALIDATED'
        });
      }
      
      req.user = user;
      
      // Log API access for audit
      logger.audit.apiAccess(
        user.id,
        req.path,
        req.method,
        req.ip,
        res.statusCode,
        Date.now() - req.startTime
      );
      
      next();
      
    } catch (error) {
      logger.error('Token verification failed', {
        error: error.message,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      sentryUtils.captureException(error, {
        tags: { operation: 'token_verification' },
        extra: {
          path: req.path,
          method: req.method,
          ip: req.ip
        }
      });
      
      return res.status(401).json({
        error: 'Token verification failed.',
        code: 'TOKEN_VERIFICATION_FAILED'
      });
    }
  },
  
  // Optional authentication (doesn't fail if no token)
  optionalAuth: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return auth.verifyToken(req, res, next);
      }
      
      req.user = null;
      next();
      
    } catch (error) {
      req.user = null;
      next();
    }
  },
  
  // Role-based authorization
  requireRole: (roles) => {
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }
      
      if (!roles.includes(req.user.role)) {
        logger.audit.securityEvent(
          'unauthorized_role_access',
          req.user.id,
          req.ip,
          'high',
          {
            requiredRoles: roles,
            userRole: req.user.role,
            endpoint: req.path
          }
        );
        
        return res.status(403).json({
          error: 'Insufficient permissions.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      
      next();
    };
  },
  
  // Email verification requirement
  requireEmailVerification: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!req.user.emailVerified) {
      return res.status(403).json({
        error: 'Email verification required.',
        code: 'EMAIL_VERIFICATION_REQUIRED'
      });
    }
    
    next();
  },
  
  // API key authentication
  verifyApiKey: async (req, res, next) => {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required.',
          code: 'API_KEY_REQUIRED'
        });
      }
      
      // Hash the API key to compare with stored hash
      const crypto = require('crypto');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { user: true }
      });
      
      if (!apiKeyRecord || !apiKeyRecord.active) {
        logger.audit.securityEvent(
          'invalid_api_key_attempt',
          null,
          req.ip,
          'medium',
          { endpoint: req.path }
        );
        
        return res.status(401).json({
          error: 'Invalid API key.',
          code: 'INVALID_API_KEY'
        });
      }
      
      // Check expiration
      if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        return res.status(401).json({
          error: 'API key expired.',
          code: 'API_KEY_EXPIRED'
        });
      }
      
      // Check rate limit
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (apiKeyRecord.usageCount >= apiKeyRecord.rateLimit) {
        return res.status(429).json({
          error: 'API key rate limit exceeded.',
          code: 'API_RATE_LIMIT_EXCEEDED'
        });
      }
      
      // Update usage statistics
      await prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: {
          lastUsed: new Date(),
          usageCount: { increment: 1 }
        }
      });
      
      req.user = apiKeyRecord.user;
      req.apiKey = apiKeyRecord;
      
      next();
      
    } catch (error) {
      logger.error('API key verification failed', {
        error: error.message,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(401).json({
        error: 'API key verification failed.',
        code: 'API_KEY_VERIFICATION_FAILED'
      });
    }
  }
};

// Request processing middleware
const requestMiddleware = {
  // Add request start time for response time measurement
  addStartTime: (req, res, next) => {
    req.startTime = Date.now();
    next();
  },
  
  // Request ID for tracing
  addRequestId: (req, res, next) => {
    req.id = require('crypto').randomBytes(16).toString('hex');
    res.set('X-Request-ID', req.id);
    next();
  },
  
  // Request size limiting
  limitRequestSize: (req, res, next) => {
    const maxSize = process.env.MAX_REQUEST_SIZE || '10mb';
    
    if (req.headers['content-length']) {
      const size = parseInt(req.headers['content-length']);
      const maxBytes = maxSize.endsWith('mb') 
        ? parseInt(maxSize) * 1024 * 1024 
        : parseInt(maxSize);
        
      if (size > maxBytes) {
        return res.status(413).json({
          error: 'Request entity too large.',
          code: 'REQUEST_TOO_LARGE'
        });
      }
    }
    
    next();
  },
  
  // Client version tracking
  trackClientVersion: (req, res, next) => {
    const clientVersion = req.headers['x-client-version'];
    if (clientVersion) {
      req.clientVersion = clientVersion;
    }
    next();
  }
};

// Error handling middleware
const errorHandler = (error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });
  
  // Capture error in Sentry
  sentryUtils.captureException(error, {
    user: req.user,
    request: req,
    tags: { operation: 'unhandled_error' }
  });
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      error: 'Internal server error.',
      code: 'INTERNAL_ERROR',
      requestId: req.id
    });
  } else {
    return res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR',
      stack: error.stack,
      requestId: req.id
    });
  }
};

// 404 handler
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Route not found.',
    code: 'ROUTE_NOT_FOUND',
    path: req.path,
    method: req.method
  });
};

module.exports = {
  security: securityMiddleware,
  auth,
  request: requestMiddleware,
  errorHandler,
  notFoundHandler
};
