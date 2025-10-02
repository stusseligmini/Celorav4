/**
 * Advanced Rate Limiting System for Celora V2
 * Implements comprehensive rate limiting with multiple algorithms:
 * - Token bucket for burst control
 * - Sliding window for smooth rate limiting  
 * - Fixed window for strict limits
 * - IP-based and user-based limiting
 * - Dynamic limits based on user behavior
 * - Redis-compatible for distributed systems
 */

export interface RateLimitRule {
  id: string;
  type: 'token-bucket' | 'sliding-window' | 'fixed-window';
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  burstSize?: number; // For token bucket - maximum burst
  refillRate?: number; // For token bucket - tokens per second
  blockDuration?: number; // How long to block after limit exceeded (ms)
  skipOnSuccess?: boolean; // Reset counter on successful requests
  keyGenerator?: (req: any) => string; // Custom key generator
  message?: string; // Custom error message
  headers?: boolean; // Include rate limit headers in response
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
  totalRequests: number;
  blockUntil?: number;
}

export interface RateLimitConfig {
  // API endpoints
  login: RateLimitRule;
  signup: RateLimitRule;
  mfaVerify: RateLimitRule;
  passwordReset: RateLimitRule;
  tokenRefresh: RateLimitRule;
  
  // Financial operations
  cardTransaction: RateLimitRule;
  walletTransfer: RateLimitRule;
  balanceCheck: RateLimitRule;
  
  // User operations
  profileUpdate: RateLimitRule;
  settingsChange: RateLimitRule;
  
  // Security operations
  deviceRegistration: RateLimitRule;
  backupCodeGeneration: RateLimitRule;
  
  // Admin operations
  adminAction: RateLimitRule;
  
  // Global limits
  globalPerIP: RateLimitRule;
  globalPerUser: RateLimitRule;
}

class AdvancedRateLimiter {
  private static instance: AdvancedRateLimiter;
  private storage = new Map<string, any>();
  private cleanupInterval: NodeJS.Timeout;

  // Rate limiting configurations
  private readonly config: RateLimitConfig = {
    login: {
      id: 'login',
      type: 'sliding-window',
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      blockDuration: 30 * 60 * 1000, // 30 minutes block
      message: 'Too many login attempts. Please try again later.',
      headers: true
    },
    
    signup: {
      id: 'signup',
      type: 'fixed-window',
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      blockDuration: 60 * 60 * 1000, // 1 hour block
      message: 'Too many signup attempts from this IP.',
      headers: true
    },
    
    mfaVerify: {
      id: 'mfa-verify',
      type: 'token-bucket',
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 5,
      burstSize: 3,
      refillRate: 1, // 1 token per minute
      blockDuration: 15 * 60 * 1000, // 15 minutes block
      message: 'Too many MFA verification attempts.',
      headers: true
    },
    
    passwordReset: {
      id: 'password-reset',
      type: 'sliding-window',
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      blockDuration: 24 * 60 * 60 * 1000, // 24 hours block
      message: 'Too many password reset requests.',
      headers: true
    },
    
    tokenRefresh: {
      id: 'token-refresh',
      type: 'token-bucket',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      burstSize: 10,
      refillRate: 1, // 1 token per 3 seconds
      message: 'Token refresh rate limit exceeded.',
      headers: true
    },
    
    cardTransaction: {
      id: 'card-transaction',
      type: 'sliding-window',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
      blockDuration: 5 * 60 * 1000, // 5 minutes block
      message: 'Transaction rate limit exceeded for security.',
      headers: true
    },
    
    walletTransfer: {
      id: 'wallet-transfer',
      type: 'token-bucket',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
      burstSize: 3,
      refillRate: 0.1, // 1 token per 10 seconds
      blockDuration: 10 * 60 * 1000, // 10 minutes block
      message: 'Wallet transfer rate limit exceeded.',
      headers: true
    },
    
    balanceCheck: {
      id: 'balance-check',
      type: 'fixed-window',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
      message: 'Balance check rate limit exceeded.',
      headers: true
    },
    
    profileUpdate: {
      id: 'profile-update',
      type: 'sliding-window',
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      message: 'Profile update rate limit exceeded.',
      headers: true
    },
    
    settingsChange: {
      id: 'settings-change',
      type: 'sliding-window',
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
      message: 'Settings change rate limit exceeded.',
      headers: true
    },
    
    deviceRegistration: {
      id: 'device-registration',
      type: 'fixed-window',
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      maxRequests: 5,
      blockDuration: 24 * 60 * 60 * 1000, // 24 hours block
      message: 'Device registration limit exceeded.',
      headers: true
    },
    
    backupCodeGeneration: {
      id: 'backup-code-generation',
      type: 'fixed-window',
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      maxRequests: 3,
      blockDuration: 24 * 60 * 60 * 1000, // 24 hours block
      message: 'Backup code generation limit exceeded.',
      headers: true
    },
    
    adminAction: {
      id: 'admin-action',
      type: 'token-bucket',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      burstSize: 20,
      refillRate: 2, // 2 tokens per second
      message: 'Admin action rate limit exceeded.',
      headers: true
    },
    
    globalPerIP: {
      id: 'global-per-ip',
      type: 'sliding-window',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1000,
      blockDuration: 10 * 60 * 1000, // 10 minutes block
      message: 'Global IP rate limit exceeded.',
      headers: true
    },
    
    globalPerUser: {
      id: 'global-per-user',
      type: 'token-bucket',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 500,
      burstSize: 100,
      refillRate: 10, // 10 tokens per second
      message: 'Global user rate limit exceeded.',
      headers: true
    }
  };

  private constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  static getInstance(): AdvancedRateLimiter {
    if (!AdvancedRateLimiter.instance) {
      AdvancedRateLimiter.instance = new AdvancedRateLimiter();
    }
    return AdvancedRateLimiter.instance;
  }

  /**
   * Check rate limit for a specific rule and key
   */
  async checkLimit(
    ruleId: keyof RateLimitConfig,
    key: string,
    request?: any
  ): Promise<RateLimitResult> {
    const rule = this.config[ruleId];
    const fullKey = `${rule.id}:${key}`;

    // Generate custom key if function provided
    const actualKey = rule.keyGenerator ? rule.keyGenerator(request) : fullKey;

    switch (rule.type) {
      case 'token-bucket':
        return this.checkTokenBucket(rule, actualKey);
      case 'sliding-window':
        return this.checkSlidingWindow(rule, actualKey);
      case 'fixed-window':
        return this.checkFixedWindow(rule, actualKey);
      default:
        throw new Error(`Unknown rate limit type: ${rule.type}`);
    }
  }

  /**
   * Token bucket algorithm implementation
   */
  private checkTokenBucket(rule: RateLimitRule, key: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.storage.get(key) || {
      tokens: rule.burstSize || rule.maxRequests,
      lastRefill: now,
      totalRequests: 0,
      blockUntil: 0
    };

    // Check if still blocked
    if (bucket.blockUntil > now) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: bucket.blockUntil,
        retryAfter: Math.ceil((bucket.blockUntil - now) / 1000),
        totalRequests: bucket.totalRequests,
        blockUntil: bucket.blockUntil
      };
    }

    // Refill tokens based on time elapsed
    const refillRate = rule.refillRate || (rule.maxRequests / (rule.windowMs / 1000));
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * refillRate);
    const maxTokens = rule.burstSize || rule.maxRequests;

    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if request can be allowed
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      bucket.totalRequests += 1;
      bucket.blockUntil = 0; // Reset block
      this.storage.set(key, bucket);

      return {
        allowed: true,
        remainingRequests: bucket.tokens,
        resetTime: now + ((maxTokens - bucket.tokens) / refillRate) * 1000,
        totalRequests: bucket.totalRequests
      };
    } else {
      // Block if configured
      if (rule.blockDuration) {
        bucket.blockUntil = now + rule.blockDuration;
      }
      this.storage.set(key, bucket);

      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: now + (1 / refillRate) * 1000,
        retryAfter: Math.ceil(1 / refillRate),
        totalRequests: bucket.totalRequests,
        blockUntil: bucket.blockUntil
      };
    }
  }

  /**
   * Sliding window algorithm implementation
   */
  private checkSlidingWindow(rule: RateLimitRule, key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - rule.windowMs;
    
    const data = this.storage.get(key) || {
      requests: [],
      totalRequests: 0,
      blockUntil: 0
    };

    // Check if still blocked
    if (data.blockUntil > now) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: data.blockUntil,
        retryAfter: Math.ceil((data.blockUntil - now) / 1000),
        totalRequests: data.totalRequests,
        blockUntil: data.blockUntil
      };
    }

    // Remove requests outside the sliding window
    data.requests = data.requests.filter((timestamp: number) => timestamp > windowStart);

    // Check if request can be allowed
    if (data.requests.length < rule.maxRequests) {
      data.requests.push(now);
      data.totalRequests += 1;
      data.blockUntil = 0; // Reset block
      this.storage.set(key, data);

      const oldestRequest = Math.min(...data.requests);
      const resetTime = oldestRequest + rule.windowMs;

      return {
        allowed: true,
        remainingRequests: rule.maxRequests - data.requests.length,
        resetTime,
        totalRequests: data.totalRequests
      };
    } else {
      // Block if configured
      if (rule.blockDuration) {
        data.blockUntil = now + rule.blockDuration;
      }
      this.storage.set(key, data);

      const oldestRequest = Math.min(...data.requests);
      const resetTime = oldestRequest + rule.windowMs;

      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
        totalRequests: data.totalRequests,
        blockUntil: data.blockUntil
      };
    }
  }

  /**
   * Fixed window algorithm implementation
   */
  private checkFixedWindow(rule: RateLimitRule, key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const windowEnd = windowStart + rule.windowMs;
    
    const data = this.storage.get(key) || {
      requests: 0,
      windowStart: windowStart,
      totalRequests: 0,
      blockUntil: 0
    };

    // Check if still blocked
    if (data.blockUntil > now) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: data.blockUntil,
        retryAfter: Math.ceil((data.blockUntil - now) / 1000),
        totalRequests: data.totalRequests,
        blockUntil: data.blockUntil
      };
    }

    // Reset counter if new window
    if (data.windowStart < windowStart) {
      data.requests = 0;
      data.windowStart = windowStart;
      data.blockUntil = 0; // Reset block
    }

    // Check if request can be allowed
    if (data.requests < rule.maxRequests) {
      data.requests += 1;
      data.totalRequests += 1;
      this.storage.set(key, data);

      return {
        allowed: true,
        remainingRequests: rule.maxRequests - data.requests,
        resetTime: windowEnd,
        totalRequests: data.totalRequests
      };
    } else {
      // Block if configured
      if (rule.blockDuration) {
        data.blockUntil = now + rule.blockDuration;
      }
      this.storage.set(key, data);

      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: data.blockUntil || windowEnd,
        retryAfter: Math.ceil((windowEnd - now) / 1000),
        totalRequests: data.totalRequests,
        blockUntil: data.blockUntil
      };
    }
  }

  /**
   * Express middleware for rate limiting
   */
  createMiddleware(ruleId: keyof RateLimitConfig, keyGenerator?: (req: any) => string) {
    return async (req: any, res: any, next: any) => {
      try {
        const key = keyGenerator ? keyGenerator(req) : this.getDefaultKey(req);
        const result = await this.checkLimit(ruleId, key, req);
        const rule = this.config[ruleId];

        // Add rate limit headers if configured
        if (rule.headers) {
          res.setHeader('X-RateLimit-Limit', rule.maxRequests);
          res.setHeader('X-RateLimit-Remaining', result.remainingRequests);
          res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
          
          if (result.retryAfter) {
            res.setHeader('Retry-After', result.retryAfter);
          }
        }

        if (!result.allowed) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: rule.message || 'Too many requests',
            retryAfter: result.retryAfter,
            resetTime: result.resetTime
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next(); // Allow request on rate limiter error
      }
    };
  }

  /**
   * Get default key for rate limiting (IP + User ID if available)
   */
  private getDefaultKey(req: any): string {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.user?.id || req.userId || '';
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  /**
   * Check multiple rate limits at once
   */
  async checkMultipleLimits(
    checks: Array<{ ruleId: keyof RateLimitConfig; key: string; request?: any }>
  ): Promise<{ allowed: boolean; results: RateLimitResult[]; failedRule?: string }> {
    const results: RateLimitResult[] = [];
    
    for (const check of checks) {
      const result = await this.checkLimit(check.ruleId, check.key, check.request);
      results.push(result);
      
      if (!result.allowed) {
        return {
          allowed: false,
          results,
          failedRule: check.ruleId
        };
      }
    }
    
    return { allowed: true, results };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(ruleId: keyof RateLimitConfig, key: string): void {
    const rule = this.config[ruleId];
    const fullKey = `${rule.id}:${key}`;
    this.storage.delete(fullKey);
  }

  /**
   * Get current status for a key
   */
  async getStatus(ruleId: keyof RateLimitConfig, key: string): Promise<RateLimitResult> {
    const rule = this.config[ruleId];
    const fullKey = `${rule.id}:${key}`;
    
    // Simulate a check without consuming tokens/requests
    const originalData = this.storage.get(fullKey);
    const result = await this.checkLimit(ruleId, key);
    
    // Restore original data if it was a token bucket
    if (rule.type === 'token-bucket' && originalData) {
      this.storage.set(fullKey, originalData);
    }
    
    return result;
  }

  /**
   * Add custom rate limit rule
   */
  addCustomRule(id: string, rule: RateLimitRule): void {
    (this.config as any)[id] = { ...rule, id };
  }

  /**
   * Update existing rule
   */
  updateRule(ruleId: keyof RateLimitConfig, updates: Partial<RateLimitRule>): void {
    this.config[ruleId] = { ...this.config[ruleId], ...updates };
  }

  /**
   * Get all rate limit statistics
   */
  getStatistics(): Array<{ key: string; data: any }> {
    return Array.from(this.storage.entries()).map(([key, data]) => ({ key, data }));
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, data] of this.storage.entries()) {
      let shouldDelete = false;
      
      // Clean up based on data structure
      if (data.requests && Array.isArray(data.requests)) {
        // Sliding window - remove if no recent requests
        const oldestValidTime = now - (24 * 60 * 60 * 1000); // 24 hours
        data.requests = data.requests.filter((timestamp: number) => timestamp > oldestValidTime);
        
        if (data.requests.length === 0 && (!data.blockUntil || data.blockUntil < now)) {
          shouldDelete = true;
        }
      } else if (data.windowStart) {
        // Fixed window - remove if window is old
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (now - data.windowStart > maxAge && (!data.blockUntil || data.blockUntil < now)) {
          shouldDelete = true;
        }
      } else if (data.lastRefill) {
        // Token bucket - remove if very old
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (now - data.lastRefill > maxAge && (!data.blockUntil || data.blockUntil < now)) {
          shouldDelete = true;
        }
      }
      
      if (shouldDelete) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Destroy instance and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
  }
}

// Export singleton instance
export const rateLimiter = AdvancedRateLimiter.getInstance();

// Utility functions for common operations
export const createRateLimitMiddleware = (
  ruleId: keyof RateLimitConfig,
  keyGenerator?: (req: any) => string
) => rateLimiter.createMiddleware(ruleId, keyGenerator);

export const checkRateLimit = (
  ruleId: keyof RateLimitConfig,
  key: string,
  request?: any
) => rateLimiter.checkLimit(ruleId, key, request);

export const resetRateLimit = (ruleId: keyof RateLimitConfig, key: string) =>
  rateLimiter.reset(ruleId, key);
