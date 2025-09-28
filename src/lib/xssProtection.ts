/**
 * XSS (Cross-Site Scripting) Protection Utilities
 * 
 * This module provides comprehensive tools for sanitizing user input
 * and preventing XSS attacks across the application.
 */

/**
 * Sanitizes HTML content using native browser APIs or regex fallback
 * 
 * @param html The HTML string to sanitize
 * @param options Additional configuration options
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string, options: any = {}): string {
  if (typeof window === 'undefined') {
    // Server-side: Just remove all HTML tags as a fallback
    return html.replace(/<[^>]*>/g, '');
  }
  
  // Client-side: Use native browser sanitization
  const allowedTags = options.allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'];
  const allowedAttributes = options.allowedAttributes || ['title'];
  
  // Create a temporary element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove all script tags and their content
  const scripts = tempDiv.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove event handlers and dangerous attributes
  const allElements = tempDiv.querySelectorAll('*');
  allElements.forEach(element => {
    // Remove dangerous attributes
    const attributes = Array.from(element.attributes);
    attributes.forEach(attr => {
      if (attr.name.startsWith('on') || // Event handlers
          ['javascript:', 'vbscript:', 'data:', 'blob:'].some(proto => attr.value.toLowerCase().includes(proto)) ||
          !allowedAttributes.includes(attr.name.toLowerCase())) {
        element.removeAttribute(attr.name);
      }
    });
    
    // Remove tags not in allowed list
    if (!allowedTags.includes(element.tagName.toLowerCase())) {
      element.replaceWith(...element.childNodes);
    }
  });
  
  const sanitized = tempDiv.innerHTML;
  
  // Log potential XSS attacks if the content was modified significantly
  const contentLengthDiff = html.length - sanitized.length;
  if (contentLengthDiff > 50 || (html.includes('<script') && contentLengthDiff > 0)) {
    console.warn('Potential XSS attempt detected and blocked', {
      componentName: 'XSSProtection',
      action: 'sanitize-html',
      contentLengthDiff,
      contentSample: html.substring(0, 100) + (html.length > 100 ? '...' : ''),
    });
  }
  
  return sanitized;
}

/**
 * Sanitizes plain text input to prevent XSS in text contexts
 * 
 * @param text Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes a URL to prevent javascript: protocol exploitation
 * 
 * @param url URL to sanitize
 * @returns Sanitized URL or empty string if dangerous
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  // Only allow http:, https:, mailto:, tel: protocols
  const pattern = /^(?:(?:https?|mailto|tel|ftp):)/i;
  
  try {
    const sanitized = url.trim();
    
    // Check if it's a valid URL with allowed protocol
    if (pattern.test(sanitized)) {
      return sanitized;
    }
    
    // If no protocol is specified, assume http
    if (!sanitized.includes(':')) {
      return `http://${sanitized}`;
    }
    
    // Log potential attacks with dangerous protocols like javascript:
    if (/^(?:javascript|data|vbscript|file):/i.test(sanitized)) {
      console.warn('Dangerous URL protocol detected and blocked', {
        componentName: 'XSSProtection',
        action: 'sanitize-url',
        originalUrl: url 
      });
    }
    
    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Sanitizes JSON to prevent prototype pollution
 * 
 * @param json JSON object to sanitize
 * @returns Sanitized JSON object
 */
export function sanitizeJson(json: any): any {
  if (!json || typeof json !== 'object') return json;
  
  // Function to check for dangerous property names
  const isDangerousProperty = (key: string): boolean => {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
  };
  
  // Helper function to recursively sanitize objects
  const sanitizeObject = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    
    // Handle objects
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip dangerous properties
      if (isDangerousProperty(key)) {
        console.warn('Prototype pollution attempt detected and blocked', {
          componentName: 'XSSProtection',
          action: 'sanitize-json',
          dangerousProperty: key 
        });
        continue;
      }
      
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value);
    }
    
    return sanitized;
  };
  
  return sanitizeObject(json);
}

/**
 * Sanitizes content for use in CSS context
 * 
 * @param css CSS content to sanitize
 * @returns Sanitized CSS string
 */
export function sanitizeCss(css: string): string {
  if (!css) return '';
  
  // Remove potentially malicious CSS constructs
  return css
    .replace(/expression\s*\(.*\)/gi, '') // Remove expressions
    .replace(/@import/gi, '')            // Remove imports
    .replace(/<\/style>/gi, '');         // Prevent style tag closing
}

/**
 * Creates a safe style object by sanitizing CSS properties
 * 
 * @param styles Style object to sanitize
 * @returns Sanitized style object
 */
export function createSafeStyles(styles: Record<string, string>): Record<string, string> {
  const safeStyles: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(styles)) {
    // Skip potentially dangerous properties
    if (
      key.includes('expression') ||
      key === 'behavior' ||
      key === 'pointer-events' ||
      value.includes('expression') ||
      value.includes('url(') ||
      value.includes('import')
    ) {
      continue;
    }
    
    safeStyles[key] = sanitizeCss(value);
  }
  
  return safeStyles;
}

/**
 * Sanitizes user input for React components
 * 
 * @param input User input to sanitize
 * @param type Type of content being sanitized
 * @returns Sanitized input
 */
export function sanitizeUserInput(input: string, type: 'text' | 'html' | 'url' = 'text'): string {
  switch (type) {
    case 'html':
      return sanitizeHtml(input);
    case 'url':
      return sanitizeUrl(input);
    case 'text':
    default:
      return sanitizeText(input);
  }
}

/**
 * React hook for sanitizing user input values
 * 
 * @param initialValue Initial value to sanitize
 * @param type Type of content
 * @returns Sanitized value
 */
export function useSanitizedValue(initialValue: string, type: 'text' | 'html' | 'url' = 'text'): string {
  if (typeof initialValue !== 'string') {
    return '';
  }
  
  return sanitizeUserInput(initialValue, type);
}