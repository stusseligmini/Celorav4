const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const ExpressBrute = require('express-brute');
const RedisStore = require('express-brute-redis');
const Redis = require('ioredis');
const logger = require('./logger');
const { sentryUtils } = require('./sentry');

// Redis connection for brute force protection
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : null; // Fallback to memory store if no Redis

// Memory store fallback for express-brute
const MemoryStore = require('express-brute/lib/MemoryStore');

// Brute force protection store
const bruteStore = redis 
  ? new RedisStore({
      client: redis,
      prefix: 'bf:'
    })
  : new MemoryStore();

// Rate limiting configurations
const rateLimitConfigs = {
  // General API rate limiting
  general: rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
    message: {
      error: 'Too many requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      
      sentryUtils.api.rateLimitExceeded(req.ip, req.path, req.method);
      
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 15 * 60
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  }),
  
  // Strict rate limiting for auth endpoints
  auth: rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS) || 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 5 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      
      sentryUtils.api.rateLimitExceeded(req.ip, req.path, req.method);
      
      res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: 5 * 60
      });
    }
  }),
  
  // Very strict rate limiting for password reset
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    message: {
      error: 'Too many password reset attempts',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      retryAfter: 60 * 60
    },
    keyGenerator: (req) => {
      // Rate limit by email AND IP
      return `${req.ip}-${req.body.email || 'unknown'}`;
    },
    handler: (req, res) => {
      logger.warn('Password reset rate limit exceeded', {
        ip: req.ip,
        email: req.body.email,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        error: 'Too many password reset attempts. Please try again in an hour.',
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        retryAfter: 60 * 60
      });
    }
  }),
  
  // Rate limiting for blockchain transactions
  transaction: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 transactions per minute
    message: {
      error: 'Transaction rate limit exceeded',
      code: 'TRANSACTION_RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    },
    keyGenerator: (req) => {
      // Rate limit by user ID if authenticated, otherwise IP
      return req.user ? `user-${req.user.id}` : req.ip;
    },
    handler: (req, res) => {
      logger.warn('Transaction rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        endpoint: req.path
      });
      
      res.status(429).json({
        error: 'Too many transaction attempts. Please wait before trying again.',
        code: 'TRANSACTION_RATE_LIMIT_EXCEEDED',
        retryAfter: 60
      });
    }
  })
};

// Slow down configurations (progressive delay)
const slowDownConfigs = {
  // Progressive slowdown for auth endpoints
  auth: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // Allow 2 requests per windowMs without delay
    delayMs: 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 10000, // Maximum delay of 10 seconds
    skipFailedRequests: false,
    skipSuccessfulRequests: true
  })
};

// Brute force protection configurations
const bruteForceConfigs = {
  // Global brute force protection
  global: new ExpressBrute(bruteStore, {
    freeRetries: 5,
    minWait: 5 * 60 * 1000, // 5 minutes
    maxWait: 60 * 60 * 1000, // 1 hour
    failCallback: function(req, res, next, nextValidRequestDate) {
      logger.warn('Brute force protection triggered', {
        ip: req.ip,
        endpoint: req.path,
        nextValidRequestDate
      });
      
      sentryUtils.captureMessage('Brute force attack detected', 'warning', {
        tags: { operation: 'brute_force_protection' },
        extra: {
          ip: req.ip,
          endpoint: req.path,
          nextValidRequestDate
        }
      });
      
      res.status(429).json({
        error: 'Too many failed attempts. Please try again later.',
        code: 'BRUTE_FORCE_PROTECTION',
        retryAfter: Math.round((nextValidRequestDate.getTime() - Date.now()) / 1000)
      });
    }
  }),
  
  // Specific brute force protection for login
  login: new ExpressBrute(bruteStore, {
    freeRetries: 3, // Allow 3 failed login attempts
    minWait: 2 * 60 * 1000, // 2 minutes wait after 3 failures
    maxWait: 30 * 60 * 1000, // 30 minutes maximum wait
    lifetime: 24 * 60 * 60, // 24 hours
    failCallback: function(req, res, next, nextValidRequestDate) {
      logger.audit.securityEvent(
        'login_brute_force_protection',
        req.body.email,
        req.ip,
        'high',
        { nextValidRequestDate }
      );
      
      res.status(429).json({
        error: 'Account temporarily locked due to too many failed login attempts.',
        code: 'LOGIN_BRUTE_FORCE_PROTECTION',
        retryAfter: Math.round((nextValidRequestDate.getTime() - Date.now()) / 1000)
      });
    }
  })
};

// Custom middleware to track failed attempts
const trackFailedAttempt = (bruteInstance) => {
  return (req, res, next) => {
    res.on('finish', () => {
      // Track failed attempts (4xx and 5xx status codes)
      if (res.statusCode >= 400) {
        const key = req.ip; // Or use req.body.email for login-specific tracking
        bruteInstance.prevent(req, res, () => {
          // This callback is called if brute force limit is not exceeded
        });
      }
    });
    next();
  };
};

// Export all security middleware
module.exports = {
  rateLimits: rateLimitConfigs,
  slowDown: slowDownConfigs,
  bruteForce: bruteForceConfigs,
  trackFailedAttempt,
  
  // Convenience functions for applying multiple security layers
  authSecurity: [
    rateLimitConfigs.auth,
    slowDownConfigs.auth,
    bruteForceConfigs.login.prevent
  ],
  
  transactionSecurity: [
    rateLimitConfigs.transaction
  ],
  
  generalSecurity: [
    rateLimitConfigs.general
  ],
  
  // Health check for security systems
  healthCheck: () => {
    const health = {
      rateLimiting: true,
      bruteForceProtection: true,
      redis: false
    };
    
    if (redis) {
      health.redis = redis.status === 'ready';
    }
    
    return health;
  }
};
