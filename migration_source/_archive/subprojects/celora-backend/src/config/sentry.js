require('dotenv').config();
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Profiling
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  integrations: [
    // Enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // Enable Express.js middleware tracing
    new Sentry.Integrations.Express({ app: undefined }),
    // Enable profiling
    nodeProfilingIntegration(),
  ],
  
  // Set custom tags
  initialScope: {
    tags: {
      service: 'celora-backend',
      version: process.env.npm_package_version || '1.0.0',
    },
  },
  
  // Custom error filtering
  beforeSend(event, hint) {
    // Don't send certain errors to Sentry
    const error = hint.originalException;
    
    if (error && error.message) {
      // Filter out common non-critical errors
      if (error.message.includes('ECONNRESET') ||
          error.message.includes('socket hang up') ||
          error.message.includes('Request timeout')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Custom breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    // Filter sensitive data from breadcrumbs
    if (breadcrumb.category === 'http' && breadcrumb.data) {
      delete breadcrumb.data.password;
      delete breadcrumb.data.token;
      delete breadcrumb.data.privateKey;
    }
    
    return breadcrumb;
  }
});

// Custom Sentry utilities
const sentryUtils = {
  // Capture exception with context
  captureException: (error, context = {}) => {
    Sentry.withScope((scope) => {
      // Add user context if available
      if (context.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
          username: context.user.username
        });
      }
      
      // Add request context
      if (context.request) {
        scope.setTag('endpoint', context.request.path);
        scope.setTag('method', context.request.method);
        scope.setContext('request', {
          url: context.request.url,
          headers: context.request.headers,
          ip: context.request.ip
        });
      }
      
      // Add custom tags
      if (context.tags) {
        Object.keys(context.tags).forEach(key => {
          scope.setTag(key, context.tags[key]);
        });
      }
      
      // Add extra context
      if (context.extra) {
        scope.setContext('extra', context.extra);
      }
      
      Sentry.captureException(error);
    });
  },
  
  // Capture message with severity
  captureMessage: (message, level = 'info', context = {}) => {
    Sentry.withScope((scope) => {
      if (context.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email
        });
      }
      
      if (context.tags) {
        Object.keys(context.tags).forEach(key => {
          scope.setTag(key, context.tags[key]);
        });
      }
      
      Sentry.captureMessage(message, level);
    });
  },
  
  // Add breadcrumb for tracking user actions
  addBreadcrumb: (message, category = 'custom', level = 'info', data = {}) => {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data
    });
  },
  
  // Transaction monitoring for performance
  startTransaction: (name, operation = 'http') => {
    return Sentry.startTransaction({
      name,
      op: operation
    });
  },
  
  // Set user context for current scope
  setUser: (user) => {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      ip_address: user.ip
    });
  },
  
  // Clear user context (e.g., on logout)
  clearUser: () => {
    Sentry.setUser(null);
  },
  
  // Custom error handling for specific operations
  blockchain: {
    transactionError: (error, txHash, wallet, amount) => {
      sentryUtils.captureException(error, {
        tags: {
          operation: 'blockchain_transaction',
          severity: 'high'
        },
        extra: {
          txHash,
          wallet,
          amount,
          timestamp: new Date().toISOString()
        }
      });
    },
    
    walletConnectionError: (error, walletType) => {
      sentryUtils.captureException(error, {
        tags: {
          operation: 'wallet_connection',
          walletType
        }
      });
    }
  },
  
  auth: {
    loginFailure: (error, email, ip) => {
      sentryUtils.captureException(error, {
        tags: {
          operation: 'auth_login',
          severity: 'medium'
        },
        extra: {
          email: email.replace(/(.{2}).*@/, '$1***@'), // Mask email
          ip,
          timestamp: new Date().toISOString()
        }
      });
    },
    
    registrationFailure: (error, email, ip) => {
      sentryUtils.captureException(error, {
        tags: {
          operation: 'auth_registration'
        },
        extra: {
          email: email.replace(/(.{2}).*@/, '$1***@'),
          ip
        }
      });
    }
  },
  
  api: {
    rateLimitExceeded: (ip, endpoint, method) => {
      sentryUtils.captureMessage('Rate limit exceeded', 'warning', {
        tags: {
          operation: 'rate_limit',
          endpoint,
          method
        },
        extra: {
          ip,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};

module.exports = {
  Sentry,
  sentryUtils
};
