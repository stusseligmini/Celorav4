/**
 * Content Security Policy (CSP) configuration
 * 
 * This module configures CSP headers to protect against XSS and other injection attacks
 * by controlling which resources can be loaded and executed in the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorrelationId, logSecurity } from './logger';

/**
 * CSP configuration settings - customize these based on application requirements
 */
const cspConfig = {
  // Default sources - deny by default
  'default-src': ["'self'"],
  
  // Script sources
  'script-src': [
    "'self'", // Allow scripts from same origin
    "'strict-dynamic'", // Enable strict dynamic script loading
    // Add your script hashes here (auto-generated in dev mode)
  ],
  
  // Style sources
  'style-src': [
    "'self'", 
    "'unsafe-inline'", // Next.js requires unsafe-inline for styles
  ],
  
  // Image sources
  'img-src': [
    "'self'", 
    "data:", // Allow data: URIs for images
    "blob:", // Allow blob: URIs for images
    "https:", // Allow images from https sources
  ],
  
  // Font sources
  'font-src': [
    "'self'", 
    "https:", // Allow fonts from https sources
    "data:", // Allow data: URIs for fonts
  ],
  
  // Connect sources (fetch, XHR, WebSocket)
  'connect-src': [
    "'self'", 
    "https://api.celora.app", // Replace with your API domain
    "wss://api.celora.app", // Replace with your WebSocket domain
  ],
  
  // Object sources (like <object>, <embed>)
  'object-src': ["'none'"], // Block <object>, <embed>, and <applet> tags
  
  // Form action targets
  'form-action': ["'self'"], // Only allow forms to submit to same origin
  
  // Frame sources
  'frame-src': ["'self'"], // Only allow frames from same origin
  
  // Frame ancestors (who can embed this site)
  'frame-ancestors': ["'self'"], // Only allow this site to be framed by itself
  
  // Worker sources
  'worker-src': ["'self'", "blob:"], // Allow workers from same origin and blob URLs
  
  // Manifest sources
  'manifest-src': ["'self'"], // Allow manifest from same origin
  
  // Media sources
  'media-src': ["'self'"], // Allow media from same origin
  
  // Report violations to this endpoint
  'report-uri': ["/api/security/csp-report"], // Endpoint to receive CSP violation reports
  
  // Report-only mode (set to false to enforce CSP)
  reportOnly: process.env.NODE_ENV === 'development' ? true : false,
  
  // Additional security headers
  additionalHeaders: {
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Disable MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Control frame embedding
    'X-Frame-Options': 'SAMEORIGIN',
    
    // HSTS - enforce HTTPS
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  }
};

/**
 * Generates a nonce for CSP 'unsafe-inline' scripts
 * This should be added to script tags as nonce="..."
 */
export function generateCspNonce() {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Buffer.from(buffer).toString('base64');
}

/**
 * Builds the Content-Security-Policy header value
 */
export function buildCspHeader(nonce?: string): string {
  // Clone the config to avoid modifying the original
  const config = JSON.parse(JSON.stringify(cspConfig));
  
  // Add nonce to script-src if provided
  if (nonce) {
    config['script-src'].push(`'nonce-${nonce}'`);
  }
  
  // Build the CSP header string
  return Object.entries(config)
    .filter(([key]) => key !== 'reportOnly' && key !== 'additionalHeaders')
    .map(([key, values]) => `${key} ${(values as string[]).join(' ')}`)
    .join('; ');
}

/**
 * Adds CSP headers to a NextResponse
 */
export function addCspHeaders(res: NextResponse, nonce?: string): NextResponse {
  const cspValue = buildCspHeader(nonce);
  const headerName = cspConfig.reportOnly ? 
    'Content-Security-Policy-Report-Only' : 
    'Content-Security-Policy';
  
  // Set the CSP header
  res.headers.set(headerName, cspValue);
  
  // Set additional security headers
  Object.entries(cspConfig.additionalHeaders).forEach(([header, value]) => {
    res.headers.set(header, value as string);
  });
  
  return res;
}

/**
 * Middleware to handle CSP violations reporting
 */
export async function handleCspViolation(req: NextRequest): Promise<NextResponse> {
  try {
    const data = await req.json();
    const correlationId = getCorrelationId();
    
    logSecurity('CSP violation occurred', {
      correlationId,
      action: 'csp_violation',
      componentName: 'CSP'
    }, data);
    
    return NextResponse.json({ received: true }, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid CSP report' }, { status: 400 });
  }
}

/**
 * Updates CSP configuration - useful for adjusting CSP settings at runtime
 */
export function updateCspConfig(updates: Partial<typeof cspConfig>): void {
  Object.entries(updates).forEach(([key, value]) => {
    if (key in cspConfig) {
      // @ts-ignore - Dynamic key access
      cspConfig[key] = value;
    }
  });
}
