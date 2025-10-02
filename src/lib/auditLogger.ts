/**
 * Advanced Audit Logging System for Celora V2
 * Comprehensive audit trail with:
 * - Financial transaction logging
 * - Security event tracking
 * - User activity monitoring
 * - Admin action logging
 * - Compliance reporting
 * - Data integrity verification
 * - Performance metrics
 * - Real-time alerting for suspicious activities
 */

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  details: Record<string, any>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: {
      country?: string;
      city?: string;
      coordinates?: [number, number];
    };
    requestId?: string;
    duration?: number;
    httpMethod?: string;
    endpoint?: string;
    statusCode?: number;
  };
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  hash?: string; // For integrity verification
  previousHash?: string; // Chain integrity
}

export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'financial'
  | 'security'
  | 'admin'
  | 'user'
  | 'system'
  | 'api'
  | 'compliance'
  | 'error';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditQuery {
  userId?: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  action?: string;
  startTime?: number;
  endTime?: number;
  ipAddress?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface ComplianceReport {
  period: { start: number; end: number };
  totalEvents: number;
  categorySummary: Record<AuditCategory, number>;
  severitySummary: Record<AuditSeverity, number>;
  topActions: Array<{ action: string; count: number }>;
  suspiciousActivities: AuditLogEntry[];
  complianceViolations: AuditLogEntry[];
  dataIntegrityStatus: {
    verified: boolean;
    brokenChain?: number;
    tamperedEntries?: string[];
  };
}

export interface AlertRule {
  id: string;
  name: string;
  category?: AuditCategory;
  action?: string;
  conditions: {
    threshold?: number; // Events within time window
    timeWindow?: number; // Milliseconds
    severity?: AuditSeverity;
    userPattern?: RegExp;
    ipPattern?: RegExp;
    customCondition?: (entry: AuditLogEntry) => boolean;
  };
  actions: {
    email?: string[];
    webhook?: string;
    block?: boolean; // Block user/IP
    escalate?: boolean;
  };
  enabled: boolean;
}

class AuditLogger {
  private static instance: AuditLogger;
  private logs: Map<string, AuditLogEntry> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private lastHash: string = '';
  private eventCounts: Map<string, { count: number; lastReset: number }> = new Map();

  // Default alert rules for financial applications
  private readonly defaultAlertRules: AlertRule[] = [
    {
      id: 'multiple-failed-logins',
      name: 'Multiple Failed Login Attempts',
      category: 'authentication',
      action: 'login_failed',
      conditions: {
        threshold: 5,
        timeWindow: 15 * 60 * 1000 // 15 minutes
      },
      actions: {
        email: ['security@celora.com'],
        block: true
      },
      enabled: true
    },
    {
      id: 'large-transaction',
      name: 'Large Financial Transaction',
      category: 'financial',
      conditions: {
        customCondition: (entry) => {
          const amount = entry.details.amount;
          return Boolean(amount && parseFloat(amount) > 10000);
        }
      },
      actions: {
        email: ['compliance@celora.com'],
        escalate: true
      },
      enabled: true
    },
    {
      id: 'admin-bulk-operations',
      name: 'Bulk Admin Operations',
      category: 'admin',
      conditions: {
        threshold: 10,
        timeWindow: 60 * 1000 // 1 minute
      },
      actions: {
        email: ['admin-alerts@celora.com'],
        escalate: true
      },
      enabled: true
    },
    {
      id: 'suspicious-ip',
      name: 'Access from New Location',
      category: 'security',
      conditions: {
        customCondition: (entry) => {
          // Check if IP is from a different country than usual
          return Boolean(entry.metadata.location?.country && 
                 this.isUnusualLocation(entry.userId!, entry.metadata.location));
        }
      },
      actions: {
        email: ['security@celora.com']
      },
      enabled: true
    },
    {
      id: 'data-export',
      name: 'Large Data Export',
      action: 'data_export',
      conditions: {
        customCondition: (entry) => {
          const recordCount = entry.details.recordCount;
          return Boolean(recordCount && parseInt(recordCount) > 1000);
        }
      },
      actions: {
        email: ['compliance@celora.com'],
        escalate: true
      },
      enabled: true
    }
  ];

  private constructor() {
    // Initialize default alert rules
    this.defaultAlertRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });

    // Cleanup old logs periodically (keep 90 days)
    setInterval(() => {
      this.cleanupOldLogs(90 * 24 * 60 * 60 * 1000);
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(
    action: string,
    category: AuditCategory,
    details: Record<string, any>,
    options: {
      userId?: string;
      sessionId?: string;
      severity?: AuditSeverity;
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
      beforeState?: Record<string, any>;
      afterState?: Record<string, any>;
      httpMethod?: string;
      endpoint?: string;
      statusCode?: number;
      duration?: number;
    } = {}
  ): Promise<string> {
    const timestamp = Date.now();
    const id = this.generateLogId(timestamp, action, options.userId);

    const entry: AuditLogEntry = {
      id,
      timestamp,
      userId: options.userId,
      sessionId: options.sessionId,
      action,
      category,
      severity: options.severity || this.determineSeverity(action, category, details),
      details: this.sanitizeDetails(details),
      metadata: {
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        deviceId: options.deviceId,
        requestId: this.generateRequestId(),
        httpMethod: options.httpMethod,
        endpoint: options.endpoint,
        statusCode: options.statusCode,
        duration: options.duration,
        location: await this.getLocationFromIP(options.ipAddress)
      },
      beforeState: options.beforeState,
      afterState: options.afterState,
      previousHash: this.lastHash,
      hash: ''
    };

    // Generate hash for integrity
    entry.hash = this.generateHash(entry);
    this.lastHash = entry.hash;

    // Store the log
    this.logs.set(id, entry);

    // Check alert rules
    await this.checkAlertRules(entry);

    // Log to external systems in production
    if (process.env.NODE_ENV === 'production') {
      await this.logToExternalSystems(entry);
    }

    return id;
  }

  /**
   * Log authentication events
   */
  async logAuth(
    action: 'login_success' | 'login_failed' | 'logout' | 'signup' | 'password_reset' | 'mfa_enabled' | 'mfa_disabled' | 'mfa_success' | 'mfa_failed',
    userId?: string,
    details: Record<string, any> = {},
    metadata: any = {}
  ): Promise<string> {
    const severity = action.includes('failed') ? 'medium' : 'low';
    
    return this.log(action, 'authentication', details, {
      userId,
      severity,
      ...metadata
    });
  }

  /**
   * Log financial transactions
   */
  async logFinancial(
    action: 'transaction_created' | 'transaction_completed' | 'transaction_failed' | 'card_added' | 'card_removed' | 'wallet_created' | 'balance_check',
    userId: string,
    details: Record<string, any>,
    metadata: any = {}
  ): Promise<string> {
    // Always high severity for financial operations
    const severity: AuditSeverity = 'high';
    
    // Mask sensitive financial data
    const sanitizedDetails = {
      ...details,
      cardNumber: details.cardNumber ? this.maskCardNumber(details.cardNumber) : undefined,
      accountNumber: details.accountNumber ? this.maskAccountNumber(details.accountNumber) : undefined
    };

    return this.log(action, 'financial', sanitizedDetails, {
      userId,
      severity,
      ...metadata
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    action: 'suspicious_activity' | 'rate_limit_exceeded' | 'invalid_token' | 'unauthorized_access' | 'data_breach_attempt' | 'device_registered' | 'device_blocked',
    details: Record<string, any>,
    metadata: any = {}
  ): Promise<string> {
    const severity: AuditSeverity = action.includes('breach') || action.includes('suspicious') ? 'critical' : 'medium';
    
    return this.log(action, 'security', details, {
      severity,
      ...metadata
    });
  }

  /**
   * Log admin actions
   */
  async logAdmin(
    action: string,
    adminUserId: string,
    details: Record<string, any>,
    metadata: any = {}
  ): Promise<string> {
    return this.log(action, 'admin', details, {
      userId: adminUserId,
      severity: 'medium',
      ...metadata
    });
  }

  /**
   * Log system events
   */
  async logSystem(
    action: 'startup' | 'shutdown' | 'error' | 'backup_created' | 'backup_restored' | 'maintenance_started' | 'maintenance_completed',
    details: Record<string, any> = {},
    metadata: any = {}
  ): Promise<string> {
    const severity = action === 'error' ? 'high' : 'low';
    
    return this.log(action, 'system', details, {
      severity,
      ...metadata
    });
  }

  /**
   * Query audit logs
   */
  async query(query: AuditQuery): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    let filteredLogs = Array.from(this.logs.values());

    // Apply filters
    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }

    if (query.category) {
      filteredLogs = filteredLogs.filter(log => log.category === query.category);
    }

    if (query.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === query.severity);
    }

    if (query.action) {
      filteredLogs = filteredLogs.filter(log => log.action === query.action);
    }

    if (query.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endTime!);
    }

    if (query.ipAddress) {
      filteredLogs = filteredLogs.filter(log => log.metadata.ipAddress === query.ipAddress);
    }

    // Sort
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    
    filteredLogs.sort((a, b) => {
      let aValue: any, bValue: any;
      
      if (sortBy === 'timestamp') {
        aValue = a.timestamp;
        bValue = b.timestamp;
      } else if (sortBy === 'severity') {
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        aValue = severityOrder[a.severity];
        bValue = severityOrder[b.severity];
      } else if (sortBy === 'category') {
        aValue = a.category;
        bValue = b.category;
      } else {
        return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    const total = filteredLogs.length;
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      logs: paginatedLogs,
      total,
      hasMore
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startTime: number,
    endTime: number
  ): Promise<ComplianceReport> {
    const query = await this.query({ startTime, endTime, limit: 10000 });
    const logs = query.logs;

    const categorySummary: Record<AuditCategory, number> = {
      authentication: 0,
      authorization: 0,
      financial: 0,
      security: 0,
      admin: 0,
      user: 0,
      system: 0,
      api: 0,
      compliance: 0,
      error: 0
    };

    const severitySummary: Record<AuditSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const actionCounts: Record<string, number> = {};

    logs.forEach(log => {
      categorySummary[log.category]++;
      severitySummary[log.severity]++;
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Identify suspicious activities
    const suspiciousActivities = logs.filter(log => 
      log.severity === 'critical' || 
      log.action.includes('suspicious') ||
      log.action.includes('failed') ||
      log.category === 'security'
    );

    // Check data integrity
    const dataIntegrityStatus = this.verifyLogIntegrity();

    return {
      period: { start: startTime, end: endTime },
      totalEvents: logs.length,
      categorySummary,
      severitySummary,
      topActions,
      suspiciousActivities,
      complianceViolations: logs.filter(log => log.severity === 'critical'),
      dataIntegrityStatus
    };
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  /**
   * Check alert rules against new log entry
   */
  private async checkAlertRules(entry: AuditLogEntry): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      let triggered = false;

      // Check category filter
      if (rule.category && rule.category !== entry.category) continue;
      
      // Check action filter
      if (rule.action && rule.action !== entry.action) continue;

      // Check severity filter
      if (rule.conditions.severity && entry.severity !== rule.conditions.severity) continue;

      // Check threshold conditions
      if (rule.conditions.threshold && rule.conditions.timeWindow) {
        const key = `${rule.id}:${entry.userId || entry.metadata.ipAddress || 'global'}`;
        const now = Date.now();
        const window = rule.conditions.timeWindow;
        
        let eventCount = this.eventCounts.get(key);
        if (!eventCount || now - eventCount.lastReset > window) {
          eventCount = { count: 0, lastReset: now };
        }
        
        eventCount.count++;
        this.eventCounts.set(key, eventCount);
        
        if (eventCount.count >= rule.conditions.threshold) {
          triggered = true;
          // Reset counter after trigger
          this.eventCounts.set(key, { count: 0, lastReset: now });
        }
      }

      // Check custom conditions
      if (rule.conditions.customCondition && rule.conditions.customCondition(entry)) {
        triggered = true;
      }

      // Check pattern matching
      if (rule.conditions.userPattern && entry.userId && rule.conditions.userPattern.test(entry.userId)) {
        triggered = true;
      }

      if (rule.conditions.ipPattern && entry.metadata.ipAddress && rule.conditions.ipPattern.test(entry.metadata.ipAddress)) {
        triggered = true;
      }

      if (triggered) {
        await this.executeAlertActions(rule, entry);
      }
    }
  }

  /**
   * Execute alert actions
   */
  private async executeAlertActions(rule: AlertRule, entry: AuditLogEntry): Promise<void> {
    console.warn(`SECURITY ALERT: ${rule.name}`, {
      rule: rule.id,
      entry: entry.id,
      action: entry.action,
      userId: entry.userId,
      details: entry.details
    });

    // Email notifications
    if (rule.actions.email && rule.actions.email.length > 0) {
      await this.sendAlertEmail(rule, entry);
    }

    // Webhook notifications
    if (rule.actions.webhook) {
      await this.sendWebhookAlert(rule, entry);
    }

    // Block user/IP
    if (rule.actions.block) {
      await this.blockUserOrIP(entry);
    }

    // Escalate to admin
    if (rule.actions.escalate) {
      await this.escalateToAdmin(rule, entry);
    }
  }

  /**
   * Helper methods
   */
  private generateLogId(timestamp: number, action: string, userId?: string): string {
    return `log_${timestamp}_${action}_${userId || 'anon'}_${Math.random().toString(36).substring(7)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateHash(entry: Omit<AuditLogEntry, 'hash'>): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      details: entry.details,
      previousHash: entry.previousHash
    });
    
    // Simple hash implementation (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private determineSeverity(action: string, category: AuditCategory, details: Record<string, any>): AuditSeverity {
    // High-risk actions
    if (action.includes('failed') || action.includes('suspicious') || action.includes('breach')) {
      return 'critical';
    }
    
    // Financial operations are generally high severity
    if (category === 'financial') {
      return 'high';
    }
    
    // Admin actions are medium severity
    if (category === 'admin') {
      return 'medium';
    }
    
    return 'low';
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove or mask sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'cardNumber'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        if (field === 'cardNumber') {
          sanitized[field] = this.maskCardNumber(sanitized[field]);
        } else {
          sanitized[field] = '***REDACTED***';
        }
      }
    }
    
    return sanitized;
  }

  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 8) return '****';
    return '*'.repeat(cardNumber.length - 4) + cardNumber.slice(-4);
  }

  private maskAccountNumber(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 6) return '****';
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  }

  private async getLocationFromIP(ipAddress?: string): Promise<any> {
    // In production, integrate with IP geolocation service
    // For now, return mock data
    if (!ipAddress) return undefined;
    
    return {
      country: 'NO',
      city: 'Oslo',
      coordinates: [59.9139, 10.7522] as [number, number]
    };
  }

  private isUnusualLocation(userId: string, location: any): boolean {
    // In production, check against user's typical locations
    // For now, return false
    return false;
  }

  private verifyLogIntegrity(): { verified: boolean; brokenChain?: number; tamperedEntries?: string[] } {
    const logs = Array.from(this.logs.values()).sort((a, b) => a.timestamp - b.timestamp);
    const tamperedEntries: string[] = [];
    let brokenChain = 0;
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const { hash, ...logWithoutHash } = log;
      const expectedHash = this.generateHash(logWithoutHash);
      
      if (log.hash !== expectedHash) {
        tamperedEntries.push(log.id);
      }
      
      if (i > 0) {
        const previousLog = logs[i - 1];
        if (log.previousHash !== previousLog.hash) {
          brokenChain++;
        }
      }
    }
    
    return {
      verified: tamperedEntries.length === 0 && brokenChain === 0,
      brokenChain: brokenChain || undefined,
      tamperedEntries: tamperedEntries.length > 0 ? tamperedEntries : undefined
    };
  }

  private cleanupOldLogs(maxAge: number): void {
    const cutoff = Date.now() - maxAge;
    
    for (const [id, log] of this.logs.entries()) {
      if (log.timestamp < cutoff) {
        this.logs.delete(id);
      }
    }
  }

  private async sendAlertEmail(rule: AlertRule, entry: AuditLogEntry): Promise<void> {
    // In production, integrate with email service
    console.log(`Would send email alert for rule: ${rule.name}`, { rule, entry });
  }

  private async sendWebhookAlert(rule: AlertRule, entry: AuditLogEntry): Promise<void> {
    // In production, send HTTP POST to webhook URL
    console.log(`Would send webhook alert to: ${rule.actions.webhook}`, { rule, entry });
  }

  private async blockUserOrIP(entry: AuditLogEntry): Promise<void> {
    // In production, add to rate limiter blacklist
    console.log(`Would block user/IP:`, { 
      userId: entry.userId, 
      ipAddress: entry.metadata.ipAddress 
    });
  }

  private async escalateToAdmin(rule: AlertRule, entry: AuditLogEntry): Promise<void> {
    // In production, notify admin via priority channel
    console.log(`Escalating to admin for rule: ${rule.name}`, { rule, entry });
  }

  private async logToExternalSystems(entry: AuditLogEntry): Promise<void> {
    // In production, send to external logging services (Splunk, ELK, etc.)
    console.log(`Would log to external systems:`, entry);
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Utility functions for common audit logging
export const logAuth = (action: any, userId?: string, details?: any, metadata?: any) =>
  auditLogger.logAuth(action, userId, details, metadata);

export const logFinancial = (action: any, userId: string, details: any, metadata?: any) =>
  auditLogger.logFinancial(action, userId, details, metadata);

export const logSecurity = (action: any, details: any, metadata?: any) =>
  auditLogger.logSecurity(action, details, metadata);

export const logAdmin = (action: string, adminUserId: string, details: any, metadata?: any) =>
  auditLogger.logAdmin(action, adminUserId, details, metadata);

export const logSystem = (action: any, details?: any, metadata?: any) =>
  auditLogger.logSystem(action, details, metadata);
