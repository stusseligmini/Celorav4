const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const emailService = require('../services/emailService');
const { healthCheck } = require('../config/security');

const router = express.Router();
const prisma = new PrismaClient();

// Main health check endpoint
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '4.0.0',
      checks: {}
    };
    
    // Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
      health.status = 'unhealthy';
    }
    
    // Memory usage check
    const memoryUsage = process.memoryUsage();
    health.checks.memory = {
      status: 'healthy',
      usage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      }
    };
    
    // Email service check
    const emailStatus = emailService.getStatus();
    health.checks.email = {
      status: emailStatus.configured ? 'healthy' : 'warning',
      configured: emailStatus.configured,
      provider: 'SendGrid'
    };
    
    // Security systems check
    const securityHealth = healthCheck();
    health.checks.security = {
      status: 'healthy',
      rateLimiting: securityHealth.rateLimiting,
      bruteForceProtection: securityHealth.bruteForceProtection,
      redis: securityHealth.redis
    };
    
    // API response time
    health.responseTime = `${Date.now() - startTime}ms`;
    
    // Set appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(health);
    
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

// Detailed system metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      eventLoop: {
        delay: process.hrtime.bigint()
      }
    };
    
    // Database metrics
    try {
      const userCount = await prisma.user.count();
      const transactionCount = await prisma.transaction.count();
      const walletCount = await prisma.wallet.count();
      
      metrics.database = {
        connected: true,
        users: userCount,
        transactions: transactionCount,
        wallets: walletCount
      };
    } catch (error) {
      metrics.database = {
        connected: false,
        error: error.message
      };
    }
    
    res.json(metrics);
    
  } catch (error) {
    logger.error('Metrics collection failed', { error: error.message });
    
    res.status(500).json({
      error: 'Failed to collect metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Database health check
router.get('/database', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get database stats
    const userCount = await prisma.user.count();
    const transactionCount = await prisma.transaction.count();
    
    res.json({
      status: 'healthy',
      connected: true,
      responseTime: `${Date.now() - startTime}ms`,
      stats: {
        users: userCount,
        transactions: transactionCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      connected: false,
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// Email service health check
router.get('/email', async (req, res) => {
  try {
    const emailStatus = emailService.getStatus();
    
    res.json({
      status: emailStatus.configured ? 'healthy' : 'warning',
      ...emailStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Email health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Security systems health check
router.get('/security', (req, res) => {
  try {
    const securityHealth = healthCheck();
    
    res.json({
      status: 'healthy',
      ...securityHealth,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Security health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness probe (for Kubernetes/container orchestration)
router.get('/ready', async (req, res) => {
  try {
    // Check critical services
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe (for Kubernetes/container orchestration)
router.get('/live', (req, res) => {
  // Simple liveness check - if this endpoint responds, the app is alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API version and build info
router.get('/info', (req, res) => {
  res.json({
    name: 'Celora Backend API',
    version: '4.0.0',
    description: 'Advanced cryptocurrency banking platform',
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    buildTime: new Date().toISOString(),
    features: [
      'JWT Authentication',
      'PostgreSQL Database',
      'Email Integration',
      'Rate Limiting',
      'Security Monitoring',
      'Real-time WebSocket',
      'Audit Logging',
      'Error Tracking'
    ],
    author: 'Celora Team',
    license: 'MIT',
    repository: 'https://github.com/stusseligmini/Celora-platform'
  });
});

module.exports = router;
