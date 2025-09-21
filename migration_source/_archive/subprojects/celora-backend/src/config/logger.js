const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory
const logDir = path.join(__dirname, '../../logs');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Security audit log format
const auditFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
      audit: true
    });
  })
);

// Main application logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'celora-backend' },
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      handleExceptions: true,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    
    // Combined logs
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Security audit logger (separate from main logs)
const auditLogger = winston.createLogger({
  level: 'info',
  format: auditFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'security-audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '90d' // Keep security logs longer
    })
  ]
});

// Transaction logger for financial operations
const transactionLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'transactions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '365d' // Keep transaction logs for a year
    })
  ]
});

// Helper functions for structured logging
const loggers = {
  // Main application logger
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Security audit logging
  audit: {
    login: (userId, ip, success, meta = {}) => {
      auditLogger.info('User login attempt', {
        userId,
        ip,
        success,
        action: 'login',
        ...meta
      });
    },
    
    register: (email, ip, success, meta = {}) => {
      auditLogger.info('User registration attempt', {
        email,
        ip,
        success,
        action: 'register',
        ...meta
      });
    },
    
    passwordChange: (userId, ip, success, meta = {}) => {
      auditLogger.info('Password change attempt', {
        userId,
        ip,
        success,
        action: 'password_change',
        ...meta
      });
    },
    
    apiAccess: (userId, endpoint, method, ip, statusCode, responseTime, meta = {}) => {
      auditLogger.info('API access', {
        userId,
        endpoint,
        method,
        ip,
        statusCode,
        responseTime,
        action: 'api_access',
        ...meta
      });
    },
    
    securityEvent: (event, userId, ip, severity = 'medium', meta = {}) => {
      auditLogger.warn('Security event', {
        event,
        userId,
        ip,
        severity,
        action: 'security_event',
        ...meta
      });
    }
  },
  
  // Transaction logging
  transaction: {
    send: (userId, fromWallet, toWallet, amount, currency, txHash, status, meta = {}) => {
      transactionLogger.info('Transaction sent', {
        userId,
        fromWallet,
        toWallet,
        amount,
        currency,
        txHash,
        status,
        action: 'transaction_send',
        ...meta
      });
    },
    
    receive: (userId, wallet, amount, currency, txHash, status, meta = {}) => {
      transactionLogger.info('Transaction received', {
        userId,
        wallet,
        amount,
        currency,
        txHash,
        status,
        action: 'transaction_receive',
        ...meta
      });
    },
    
    error: (userId, action, error, meta = {}) => {
      transactionLogger.error('Transaction error', {
        userId,
        action,
        error: error.message,
        stack: error.stack,
        action: 'transaction_error',
        ...meta
      });
    }
  }
};

// Create logs directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

module.exports = loggers;
