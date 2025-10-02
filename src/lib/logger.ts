/**
 * Secure logging utilities for the CeloraV2 application
 * 
 * Provides structured logging with PII masking, correlation IDs,
 * and configurable log levels.
 */

import { maskSensitiveData, maskPII } from './dataMasking';

// Define log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY'
}

interface LogOptions {
  level?: LogLevel;
  correlationId?: string;
  userId?: string;
  componentName?: string;
  sensitiveKeys?: string[];
  maskObjects?: boolean;
  action?: string;
  additionalContext?: Record<string, any>;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  correlationId?: string;
  userId?: string;
  componentName?: string;
  action?: string;
  data?: any;
  error?: any;
}

// Global correlation ID (useful for tracking requests)
let currentCorrelationId: string | null = null;

// Define the minimum log level to output (can be overridden from config)
let minimumLogLevel = LogLevel.DEBUG;
// Flag to enable detailed logging
let detailedLogging = process.env.NODE_ENV !== 'production';
// Flag to enable security event logging
let securityLogging = true;

/**
 * Configure the logger with the minimum log level and other settings
 */
export function configureLogger({
  logLevel = LogLevel.DEBUG,
  enableDetailedLogging = process.env.NODE_ENV !== 'production',
  enableSecurityLogging = true
}: {
  logLevel?: LogLevel;
  enableDetailedLogging?: boolean;
  enableSecurityLogging?: boolean;
} = {}) {
  minimumLogLevel = logLevel;
  detailedLogging = enableDetailedLogging;
  securityLogging = enableSecurityLogging;
  
  console.log(`Logger configured: level=${logLevel}, detailed=${enableDetailedLogging}, security=${enableSecurityLogging}`);
}

/**
 * Set the global correlation ID for the current request
 */
export function setCorrelationId(id: string) {
  currentCorrelationId = id;
}

/**
 * Get the current correlation ID
 */
export function getCorrelationId(): string {
  if (!currentCorrelationId) {
    // Generate a new correlation ID if none exists
    currentCorrelationId = generateCorrelationId();
  }
  return currentCorrelationId;
}

/**
 * Generate a new correlation ID
 */
function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Log a message at the given level
 */
export function log(message: string, options: LogOptions = {}, data?: any, error?: Error) {
  const {
    level = LogLevel.INFO,
    correlationId = currentCorrelationId || generateCorrelationId(),
    userId,
    componentName,
    maskObjects = true,
    sensitiveKeys,
    action,
    additionalContext = {}
  } = options;
  
  // Check if this log level should be output
  const levelOrder = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.SECURITY]: 4
  };
  
  // Skip logging if the level is below the minimum (except SECURITY logs which are always logged if enabled)
  if (level !== LogLevel.SECURITY && levelOrder[level] < levelOrder[minimumLogLevel]) {
    return;
  }
  
  // Skip security logs if disabled
  if (level === LogLevel.SECURITY && !securityLogging) {
    return;
  }
  
  // Create the log entry
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: maskPII(message), // Always mask PII in messages
    correlationId,
    componentName,
    action
  };
  
  // Add user ID if provided
  if (userId) {
    logEntry.userId = userId;
  }
  
  // Add additional context
  if (Object.keys(additionalContext).length > 0) {
    Object.assign(logEntry, maskObjects ? maskSensitiveData(additionalContext, sensitiveKeys) : additionalContext);
  }
  
  // Add data if provided
  if (data !== undefined) {
    logEntry.data = maskObjects ? maskSensitiveData(data, sensitiveKeys) : data;
  }
  
  // Add error details if provided
  if (error) {
    logEntry.error = {
      message: error.message,
      stack: detailedLogging ? error.stack : undefined,
      name: error.name
    };
  }
  
  // Output the log entry based on level
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(JSON.stringify(logEntry));
      break;
    case LogLevel.INFO:
      console.info(JSON.stringify(logEntry));
      break;
    case LogLevel.WARN:
      console.warn(JSON.stringify(logEntry));
      break;
    case LogLevel.ERROR:
    case LogLevel.SECURITY:
      console.error(JSON.stringify(logEntry));
      break;
  }
  
  // For security events, we might want to send them to a security monitoring system
  if (level === LogLevel.SECURITY) {
    // In a real implementation, we'd send this to a security monitoring system
    // For now, just add a distinctive console log
    console.error('⚠️ SECURITY EVENT:', JSON.stringify(logEntry));
  }
}

// Convenience logging methods
export const logDebug = (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any) => 
  log(message, { ...options, level: LogLevel.DEBUG }, data);

export const logInfo = (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any) => 
  log(message, { ...options, level: LogLevel.INFO }, data);

export const logWarn = (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any) => 
  log(message, { ...options, level: LogLevel.WARN }, data);

export const logError = (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any, error?: Error) => 
  log(message, { ...options, level: LogLevel.ERROR }, data, error);

export const logSecurity = (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any) => 
  log(message, { ...options, level: LogLevel.SECURITY }, data);

/**
 * Log an authenticated user action (for audit trail)
 */
export function logUserAction(userId: string, action: string, details?: any) {
  logSecurity(`User ${userId} performed action: ${action}`, { 
    userId, 
    action,
    componentName: 'AuditTrail' 
  }, details);
}

/**
 * Log a security event
 */
export function logSecurityEvent(
  eventType: string, 
  message: string, 
  options: Omit<LogOptions, 'level'> = {}, 
  data?: any
) {
  logSecurity(
    message,
    { 
      ...options, 
      componentName: options.componentName || 'SecurityMonitor',
      action: eventType
    },
    data
  );
}

/**
 * Create a logger instance for a specific component
 */
export function createLogger(componentName: string, defaultOptions: Omit<LogOptions, 'level'> = {}) {
  return {
    debug: (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any) => 
      logDebug(message, { ...defaultOptions, ...options, componentName }, data),
    
    info: (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any) => 
      logInfo(message, { ...defaultOptions, ...options, componentName }, data),
    
    warn: (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any) => 
      logWarn(message, { ...defaultOptions, ...options, componentName }, data),
    
    error: (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any, error?: Error) => 
      logError(message, { ...defaultOptions, ...options, componentName }, data, error),
    
    security: (message: string, options: Omit<LogOptions, 'level'> = {}, data?: any) => 
      logSecurity(message, { ...defaultOptions, ...options, componentName }, data)
  };
}
