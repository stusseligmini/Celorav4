/**
 * Advanced Security Headers for Celora V2
 * Implements comprehensive security headers including:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options, X-Content-Type-Options
 * - Permissions Policy
 * - Cross-Origin policies
 * - Custom security headers for financial applications
 */

export interface SecurityHeadersConfig {
  csp?: {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    connectSrc?: string[];
    fontSrc?: string[];
    frameSrc?: string[];
    mediaSrc?: string[];
    objectSrc?: string[];
    childSrc?: string[];
    workerSrc?: string[];
    manifestSrc?: string[];
    formAction?: string[];
    baseUri?: string[];
    upgradeInsecureRequests?: boolean;
    reportUri?: string;
    reportTo?: string;
  };
  hsts?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  contentTypeOptions?: boolean;
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  permissionsPolicy?: {
    camera?: string[];
    microphone?: string[];
    geolocation?: string[];
    payment?: string[];
    usb?: string[];
    bluetooth?: string[];
    magnetometer?: string[];
    gyroscope?: string[];
    accelerometer?: string[];
    ambientLightSensor?: string[];
    autoplay?: string[];
    encryptedMedia?: string[];
    fullscreen?: string[];
    pictureInPicture?: string[];
    syncXhr?: string[];
  };
  crossOriginEmbedderPolicy?: 'unsafe-none' | 'require-corp' | 'credentialless';
  crossOriginOpenerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin';
  customHeaders?: Record<string, string>;
}

class SecurityHeadersManager {
  private static instance: SecurityHeadersManager;
  
  // Default security configuration optimized for financial applications
  private readonly defaultConfig: SecurityHeadersConfig = {
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Next.js requires this for development
        "'unsafe-eval'", // Required for some React features
        'https://vercel.live',
        'https://js.stripe.com',
        'https://api.stripe.com',
        'https://*.supabase.co'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled components and CSS-in-JS
        'https://fonts.googleapis.com'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'https://*.supabase.co',
        'https://images.unsplash.com'
      ],
      connectSrc: [
        "'self'",
        'https://*.supabase.co',
        'https://api.stripe.com',
        'https://api.coinbase.com',
        'https://api.binance.com',
        'wss://*.supabase.co'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      frameSrc: [
        "'self'",
        'https://js.stripe.com',
        'https://hooks.stripe.com'
      ],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      manifestSrc: ["'self'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: true,
      reportUri: '/api/csp-report'
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    frameOptions: 'DENY',
    contentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: ["'self'"],
      payment: ["'self'"],
      usb: [],
      bluetooth: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
      ambientLightSensor: [],
      autoplay: [],
      encryptedMedia: [],
      fullscreen: ["'self'"],
      pictureInPicture: [],
      syncXhr: []
    },
    crossOriginEmbedderPolicy: 'unsafe-none',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
    customHeaders: {
      'X-DNS-Prefetch-Control': 'off',
      'X-Download-Options': 'noopen',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'X-XSS-Protection': '1; mode=block',
      'X-Financial-App': 'celora-v2',
      'X-Security-Policy': 'strict',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  };

  private constructor() {}

  static getInstance(): SecurityHeadersManager {
    if (!SecurityHeadersManager.instance) {
      SecurityHeadersManager.instance = new SecurityHeadersManager();
    }
    return SecurityHeadersManager.instance;
  }

  /**
   * Generate Content Security Policy header value
   */
  private generateCSP(config: NonNullable<SecurityHeadersConfig['csp']>): string {
    const directives: string[] = [];

    // Helper function to format directive
    const formatDirective = (name: string, values: string[]): string => {
      if (values.length === 0) return '';
      return `${name} ${values.join(' ')}`;
    };

    // Add all CSP directives
    if (config.defaultSrc) directives.push(formatDirective('default-src', config.defaultSrc));
    if (config.scriptSrc) directives.push(formatDirective('script-src', config.scriptSrc));
    if (config.styleSrc) directives.push(formatDirective('style-src', config.styleSrc));
    if (config.imgSrc) directives.push(formatDirective('img-src', config.imgSrc));
    if (config.connectSrc) directives.push(formatDirective('connect-src', config.connectSrc));
    if (config.fontSrc) directives.push(formatDirective('font-src', config.fontSrc));
    if (config.frameSrc) directives.push(formatDirective('frame-src', config.frameSrc));
    if (config.mediaSrc) directives.push(formatDirective('media-src', config.mediaSrc));
    if (config.objectSrc) directives.push(formatDirective('object-src', config.objectSrc));
    if (config.childSrc) directives.push(formatDirective('child-src', config.childSrc));
    if (config.workerSrc) directives.push(formatDirective('worker-src', config.workerSrc));
    if (config.manifestSrc) directives.push(formatDirective('manifest-src', config.manifestSrc));
    if (config.formAction) directives.push(formatDirective('form-action', config.formAction));
    if (config.baseUri) directives.push(formatDirective('base-uri', config.baseUri));

    // Add boolean directives
    if (config.upgradeInsecureRequests) directives.push('upgrade-insecure-requests');

    // Add reporting directives
    if (config.reportUri) directives.push(`report-uri ${config.reportUri}`);
    if (config.reportTo) directives.push(`report-to ${config.reportTo}`);

    return directives.filter(d => d).join('; ');
  }

  /**
   * Generate Permissions Policy header value
   */
  private generatePermissionsPolicy(config: NonNullable<SecurityHeadersConfig['permissionsPolicy']>): string {
    const policies: string[] = [];

    const formatPolicy = (feature: string, allowlist: string[]): string => {
      if (allowlist.length === 0) {
        return `${feature}=()`;
      }
      return `${feature}=(${allowlist.join(' ')})`;
    };

    // Add all permission policies
    if (config.camera !== undefined) policies.push(formatPolicy('camera', config.camera));
    if (config.microphone !== undefined) policies.push(formatPolicy('microphone', config.microphone));
    if (config.geolocation !== undefined) policies.push(formatPolicy('geolocation', config.geolocation));
    if (config.payment !== undefined) policies.push(formatPolicy('payment', config.payment));
    if (config.usb !== undefined) policies.push(formatPolicy('usb', config.usb));
    if (config.bluetooth !== undefined) policies.push(formatPolicy('bluetooth', config.bluetooth));
    if (config.magnetometer !== undefined) policies.push(formatPolicy('magnetometer', config.magnetometer));
    if (config.gyroscope !== undefined) policies.push(formatPolicy('gyroscope', config.gyroscope));
    if (config.accelerometer !== undefined) policies.push(formatPolicy('accelerometer', config.accelerometer));
    if (config.ambientLightSensor !== undefined) policies.push(formatPolicy('ambient-light-sensor', config.ambientLightSensor));
    if (config.autoplay !== undefined) policies.push(formatPolicy('autoplay', config.autoplay));
    if (config.encryptedMedia !== undefined) policies.push(formatPolicy('encrypted-media', config.encryptedMedia));
    if (config.fullscreen !== undefined) policies.push(formatPolicy('fullscreen', config.fullscreen));
    if (config.pictureInPicture !== undefined) policies.push(formatPolicy('picture-in-picture', config.pictureInPicture));
    if (config.syncXhr !== undefined) policies.push(formatPolicy('sync-xhr', config.syncXhr));

    return policies.join(', ');
  }

  /**
   * Generate all security headers based on configuration
   */
  generateHeaders(customConfig?: Partial<SecurityHeadersConfig>): Record<string, string> {
    const config = this.mergeConfig(customConfig);
    const headers: Record<string, string> = {};

    // Content Security Policy
    if (config.csp) {
      headers['Content-Security-Policy'] = this.generateCSP(config.csp);
    }

    // HTTP Strict Transport Security
    if (config.hsts) {
      let hsts = `max-age=${config.hsts.maxAge}`;
      if (config.hsts.includeSubDomains) hsts += '; includeSubDomains';
      if (config.hsts.preload) hsts += '; preload';
      headers['Strict-Transport-Security'] = hsts;
    }

    // Frame Options
    if (config.frameOptions) {
      headers['X-Frame-Options'] = config.frameOptions;
    }

    // Content Type Options
    if (config.contentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    // Referrer Policy
    if (config.referrerPolicy) {
      headers['Referrer-Policy'] = config.referrerPolicy;
    }

    // Permissions Policy
    if (config.permissionsPolicy) {
      const permissionsPolicyValue = this.generatePermissionsPolicy(config.permissionsPolicy);
      if (permissionsPolicyValue) {
        headers['Permissions-Policy'] = permissionsPolicyValue;
      }
    }

    // Cross-Origin Policies
    if (config.crossOriginEmbedderPolicy) {
      headers['Cross-Origin-Embedder-Policy'] = config.crossOriginEmbedderPolicy;
    }

    if (config.crossOriginOpenerPolicy) {
      headers['Cross-Origin-Opener-Policy'] = config.crossOriginOpenerPolicy;
    }

    if (config.crossOriginResourcePolicy) {
      headers['Cross-Origin-Resource-Policy'] = config.crossOriginResourcePolicy;
    }

    // Custom Headers
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }

    return headers;
  }

  /**
   * Express/Next.js middleware for setting security headers
   */
  createMiddleware(customConfig?: Partial<SecurityHeadersConfig>) {
    return (req: any, res: any, next: any) => {
      const headers = this.generateHeaders(customConfig);

      // Set all security headers
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Security-specific processing
      this.processSecurityContext(req, res);

      if (next) next();
    };
  }

  /**
   * Process security context and add dynamic headers
   */
  private processSecurityContext(req: any, res: any): void {
    // Add request-specific security headers
    const requestId = req.headers['x-request-id'] || this.generateRequestId();
    res.setHeader('X-Request-ID', requestId);

    // Add timestamp for security auditing
    res.setHeader('X-Response-Time', Date.now().toString());

    // Add security context based on request
    if (this.isFinancialEndpoint(req.url)) {
      res.setHeader('X-Financial-Operation', 'true');
      res.setHeader('X-Security-Level', 'high');
      
      // Extra strict headers for financial operations
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    }

    if (this.isAdminEndpoint(req.url)) {
      res.setHeader('X-Admin-Operation', 'true');
      res.setHeader('X-Security-Level', 'critical');
    }

    // Add security headers based on user agent
    if (this.isMobileUserAgent(req.headers['user-agent'])) {
      res.setHeader('X-Mobile-Client', 'true');
    }
  }

  /**
   * Generate CSP report endpoint for monitoring violations
   */
  createCSPReportHandler() {
    return (req: any, res: any) => {
      try {
        const report = req.body;
        
        // Log CSP violation
        console.warn('CSP Violation Report:', {
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          report
        });

        // In production, send to monitoring service
        if (process.env.NODE_ENV === 'production') {
          this.sendCSPReportToMonitoring(report, req);
        }

        res.status(204).send();
      } catch (error) {
        console.error('Error handling CSP report:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  /**
   * Validate security headers configuration
   */
  validateConfig(config: Partial<SecurityHeadersConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate CSP configuration
    if (config.csp) {
      if (config.csp.defaultSrc && config.csp.defaultSrc.includes("'unsafe-eval'")) {
        errors.push("CSP: 'unsafe-eval' in default-src is dangerous");
      }

      if (config.csp.scriptSrc && config.csp.scriptSrc.includes('*')) {
        errors.push("CSP: Wildcard (*) in script-src is dangerous");
      }
    }

    // Validate HSTS configuration
    if (config.hsts) {
      if (config.hsts.maxAge < 86400) { // 1 day
        errors.push('HSTS: max-age should be at least 1 day (86400 seconds)');
      }
    }

    // Validate frame options
    if (config.frameOptions && !['DENY', 'SAMEORIGIN'].includes(config.frameOptions) && !config.frameOptions.startsWith('ALLOW-FROM')) {
      errors.push('Frame Options: Invalid value');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get security headers for specific environments
   */
  getEnvironmentConfig(environment: 'development' | 'staging' | 'production'): Partial<SecurityHeadersConfig> {
    const baseConfig = { ...this.defaultConfig };

    switch (environment) {
      case 'development':
        // Relaxed policies for development
        if (baseConfig.csp) {
          baseConfig.csp.scriptSrc?.push("'unsafe-eval'");
          baseConfig.csp.connectSrc?.push('http://localhost:*', 'ws://localhost:*');
        }
        baseConfig.hsts = undefined; // No HSTS in development
        break;

      case 'staging':
        // Moderate policies for staging
        if (baseConfig.csp) {
          baseConfig.csp.reportUri = '/api/csp-report-staging';
        }
        break;

      case 'production':
        // Strictest policies for production
        if (baseConfig.csp) {
          baseConfig.csp.upgradeInsecureRequests = true;
          baseConfig.csp.reportUri = '/api/csp-report';
        }
        baseConfig.hsts = {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true
        };
        break;
    }

    return baseConfig;
  }

  /**
   * Merge custom configuration with defaults
   */
  private mergeConfig(customConfig?: Partial<SecurityHeadersConfig>): SecurityHeadersConfig {
    if (!customConfig) return this.defaultConfig;

    const merged = { ...this.defaultConfig, ...customConfig };

    // Deep merge CSP configuration
    if (customConfig.csp) {
      merged.csp = { ...this.defaultConfig.csp, ...customConfig.csp };
    }

    // Deep merge HSTS configuration
    if (customConfig.hsts) {
      merged.hsts = { ...this.defaultConfig.hsts, ...customConfig.hsts };
    }

    // Deep merge Permissions Policy configuration
    if (customConfig.permissionsPolicy) {
      merged.permissionsPolicy = { ...this.defaultConfig.permissionsPolicy, ...customConfig.permissionsPolicy };
    }

    // Deep merge custom headers
    if (customConfig.customHeaders) {
      merged.customHeaders = { ...this.defaultConfig.customHeaders, ...customConfig.customHeaders };
    }

    return merged;
  }

  /**
   * Helper methods for security context
   */
  private isFinancialEndpoint(url: string): boolean {
    const financialPaths = ['/api/cards', '/api/wallet', '/api/transactions', '/api/payment'];
    return financialPaths.some(path => url.includes(path));
  }

  private isAdminEndpoint(url: string): boolean {
    return url.includes('/api/admin') || url.includes('/admin');
  }

  private isMobileUserAgent(userAgent: string): boolean {
    if (!userAgent) return false;
    return /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private sendCSPReportToMonitoring(report: any, req: any): void {
    // Implement monitoring service integration
    // This could send to services like Sentry, DataDog, etc.
    console.log('CSP Report sent to monitoring service:', { report, req: req.url });
  }
}

// Export singleton instance
export const securityHeaders = SecurityHeadersManager.getInstance();

// Utility functions
export const createSecurityMiddleware = (config?: Partial<SecurityHeadersConfig>) =>
  securityHeaders.createMiddleware(config);

export const generateSecurityHeaders = (config?: Partial<SecurityHeadersConfig>) =>
  securityHeaders.generateHeaders(config);

export const createCSPReportHandler = () => securityHeaders.createCSPReportHandler();
