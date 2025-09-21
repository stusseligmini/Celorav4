require('dotenv').config();

// Validate environment variables first
const { validateEnvironment } = require('./utils/validateEnvironment');
const envStatus = validateEnvironment();

// Initialize Sentry first - TEMPORARILY DISABLED
// const { Sentry } = require('./config/sentry');

const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Import Netlify Database Service
const { netlifyDatabase } = require('./services/netlifyDatabase');

// Import middleware
const { security, auth, request, errorHandler, notFoundHandler } = require('./middleware');
const { rateLimits, authSecurity, transactionSecurity, generalSecurity } = require('./config/security');

// Import services
const logger = require('./config/logger');
const authService = require('./services/authService');
const emailService = require('./services/emailService');

// Import routes
const authRoutes = require('./routes/auth-advanced'); // Use new advanced auth
const walletRoutes = require('./routes/wallets');
const cardRoutes = require('./routes/cards');
const transactionRoutes = require('./routes/transactions');
const tradeRoutes = require('./routes/trade');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');
const databaseRoutes = require('./routes/database'); // New database management routes

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000;

// Trust proxy for production deployment
app.set('trust proxy', true);

// Sentry error handling (should be first) - TEMPORARILY DISABLED
// app.use(Sentry.Handlers.requestHandler());
// app.use(Sentry.Handlers.tracingHandler());

// Security middleware
app.use(security.helmet);
app.use(security.cors);
app.use(security.compression);

// Request processing middleware
app.use(request.addStartTime);
app.use(request.addRequestId);
app.use(request.limitRequestSize);
app.use(request.trackClientVersion);

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_REQUEST_SIZE || '10mb' 
}));

// Logging middleware
app.use(security.morgan);

// Apply general rate limiting
app.use('/api/', generalSecurity);

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: 'Celora Backend API',
    version: '4.0.0',
    status: 'running',
    environment: process.env.NODE_ENV,
    features: {
      authentication: 'JWT + Database',
      security: 'Advanced (Rate limiting, Brute force protection)',
      logging: 'Winston + Sentry',
      email: 'SendGrid',
      database: 'PostgreSQL + Prisma',
      realtime: 'WebSocket',
      monitoring: 'Health checks + Metrics'
    },
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      wallets: '/api/wallets', 
      cards: '/api/cards',
      transactions: '/api/transactions',
      trade: '/api/trade',
      admin: '/api/admin',
      docs: '/api/docs'
    },
    documentation: 'https://github.com/stusseligmini/Celora-platform'
  });
});

// Health check routes (no rate limiting)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Database management routes
app.use('/api/database', databaseRoutes);

// API routes with specific security measures
app.use('/api/auth', authSecurity, authRoutes);
app.use('/api/wallets', auth.verifyToken, auth.requireEmailVerification, walletRoutes);
app.use('/api/cards', auth.verifyToken, auth.requireEmailVerification, cardRoutes);
app.use('/api/transactions', auth.verifyToken, auth.requireEmailVerification, transactionSecurity, transactionRoutes);
app.use('/api/trade', auth.verifyToken, auth.requireEmailVerification, transactionSecurity, tradeRoutes);
app.use('/api/admin', auth.verifyToken, auth.requireRole(['admin', 'moderator']), adminRoutes);

// API documentation route
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Celora API Documentation',
    version: '4.0.0',
    description: 'Advanced cryptocurrency banking platform API',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      endpoints: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        refresh: 'POST /auth/refresh',
        logout: 'POST /auth/logout'
      }
    },
    endpoints: {
      authentication: {
        'POST /auth/register': 'Register new user',
        'POST /auth/login': 'User login',
        'POST /auth/refresh': 'Refresh access token',
        'POST /auth/logout': 'User logout',
        'POST /auth/verify-email': 'Verify email address',
        'POST /auth/forgot-password': 'Request password reset',
        'POST /auth/reset-password': 'Reset password',
        'GET /auth/profile': 'Get user profile',
        'PUT /auth/profile': 'Update user profile',
        'POST /auth/change-password': 'Change password'
      },
      wallets: {
        'GET /wallets': 'List user wallets',
        'POST /wallets': 'Add new wallet',
        'GET /wallets/:id': 'Get wallet details',
        'PUT /wallets/:id': 'Update wallet',
        'DELETE /wallets/:id': 'Remove wallet',
        'GET /wallets/:id/balance': 'Get wallet balance',
        'POST /wallets/:id/sync': 'Sync wallet with blockchain'
      },
      transactions: {
        'GET /transactions': 'List transactions',
        'POST /transactions/send': 'Send cryptocurrency',
        'GET /transactions/:id': 'Get transaction details',
        'POST /transactions/:id/cancel': 'Cancel pending transaction'
      },
      cards: {
        'GET /cards': 'List virtual cards',
        'POST /cards': 'Request new virtual card',
        'GET /cards/:id': 'Get card details',
        'PUT /cards/:id': 'Update card settings',
        'POST /cards/:id/block': 'Block card',
        'POST /cards/:id/unblock': 'Unblock card'
      }
    },
    rateLimits: {
      general: '100 requests per 15 minutes',
      authentication: '5 requests per 15 minutes',
      transactions: '10 requests per minute',
      passwordReset: '3 requests per hour'
    },
    errors: {
      400: 'Bad Request - Invalid input',
      401: 'Unauthorized - Invalid or missing token',
      403: 'Forbidden - Insufficient permissions',
      404: 'Not Found - Resource not found',
      429: 'Too Many Requests - Rate limit exceeded',
      500: 'Internal Server Error - Server error'
    }
  });
});

// API status
app.get('/api', (req, res) => {
  res.json({
    message: 'Celora Backend API v4.0',
    timestamp: new Date().toISOString(),
    status: 'running',
    version: '4.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    features: [
      'JWT Authentication',
      'PostgreSQL Database',
      'Rate Limiting',
      'Email Integration',
      'WebSocket Support',
      'Security Monitoring',
      'Audit Logging',
      'Error Tracking'
    ],
    endpoints: {
      documentation: '/api/docs',
      health: '/health',
      auth: '/api/auth',
      wallets: '/api/wallets',
      cards: '/api/cards',
      transactions: '/api/transactions',
      trade: '/api/trade',
      admin: '/api/admin'
    }
  });
});

// Catch-all route for non-API requests (frontend)
app.get('*', (req, res) => {
  // If it's an API route that doesn't exist, use 404 handler
  if (req.path.startsWith('/api/')) {
    return notFoundHandler(req, res);
  }
  
  // Otherwise serve the frontend
  res.sendFile('index.html', { root: './' });
});

// Sentry error handling middleware (before other error handlers) - TEMPORARILY DISABLED
// app.use(Sentry.Handlers.errorHandler());

// Custom error handling middleware
app.use(errorHandler);

// 404 handler for all unmatched routes
app.use(notFoundHandler);

// Start server
const server = app.listen(PORT, async () => {
  try {
    // Initialize Netlify Database
    logger.info('🔗 Initializing Netlify database...');
    await netlifyDatabase.initialize();
    
    // Database connection health check
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    // Get database stats
    const dbStats = await netlifyDatabase.getStats();
    logger.info('📊 Database Stats:', dbStats);
    
    // Email service health check
    const emailStatus = emailService.getStatus();
    logger.info('📧 Email service status:', emailStatus);
    
    logger.info(`🚀 Celora Backend API v4.0 running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔒 Security: Rate limiting, brute force protection, JWT auth`);
    logger.info(`📧 Email: ${emailStatus.configured ? 'Configured' : 'Not configured'}`);
    logger.info(`💾 Database: ${dbStats.connected ? 'Netlify Neon Connected' : 'Database Error'}`);
    logger.info(`🐛 Error tracking: ${process.env.SENTRY_DSN ? 'Sentry enabled' : 'Sentry disabled'}`);
    logger.info(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'development origins'}`);
    logger.info(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
    
  } catch (error) {
    logger.error('❌ Server startup error:', error);
    // Don't exit on database errors, allow server to start
    logger.warn('⚠️ Continuing server startup despite database errors');
  }
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ 
  server,
  path: '/api/ws',
  verifyClient: (info) => {
    // Add authentication for WebSocket connections if needed
    return true;
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const clientId = require('crypto').randomBytes(16).toString('hex');
  logger.info('🔌 WebSocket client connected', { clientId, ip: req.ip });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to Celora real-time updates',
    clientId,
    timestamp: new Date().toISOString(),
    features: [
      'transaction_updates',
      'balance_changes', 
      'security_alerts',
      'system_notifications'
    ]
  }));
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.debug('📨 WebSocket message received', { clientId, data });
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'subscribe':
          // Handle subscription to specific events
          logger.info('📡 Client subscribed', { clientId, channels: data.channels });
          ws.send(JSON.stringify({
            type: 'subscribed',
            channels: data.channels,
            timestamp: new Date().toISOString()
          }));
          break;
          
        default:
          logger.warn('❓ Unknown WebSocket message type', { type: data.type });
      }
      
    } catch (error) {
      logger.error('❌ WebSocket message error', { clientId, error: error.message });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Handle client disconnect
  ws.on('close', (code, reason) => {
    logger.info('🔌 WebSocket client disconnected', { 
      clientId, 
      code, 
      reason: reason.toString() 
    });
  });
  
  // Handle errors
  ws.on('error', (error) => {
    logger.error('❌ WebSocket error', { clientId, error: error.message });
  });
  
  // Set up periodic ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // 30 seconds
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`🛑 ${signal} received. Shutting down gracefully...`);
  
  // Stop accepting new connections
  server.close(async () => {
    try {
      // Close WebSocket connections
      wss.clients.forEach((ws) => {
        ws.close(1001, 'Server shutting down');
      });
      
      // Close database connections
      await Promise.all([
        prisma.$disconnect(),
        netlifyDatabase.disconnect()
      ]);
      logger.info('📊 Database connections closed');
      
      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
