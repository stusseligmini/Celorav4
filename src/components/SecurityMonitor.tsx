'use client';

import { useEffect } from 'react';
import { logSecurity } from '../lib/logger';
import { getCorrelationId } from '../lib/logger';

/**
 * Types of security events to monitor
 */
export enum SecurityEventType {
  PASTE_PASSWORD = 'paste_password',
  MULTIPLE_FAILED_AUTH = 'multiple_failed_auth',
  RAPID_NAVIGATION = 'rapid_navigation',
  SUSPICIOUS_INPUT = 'suspicious_input',
  DOM_TAMPERING = 'dom_tampering',
  STORAGE_TAMPERING = 'storage_tampering',
  CONSOLE_ABUSE = 'console_abuse',
}

interface SecurityMonitorProps {
  userId?: string;
  monitorPaste?: boolean;
  monitorConsole?: boolean;
  monitorStorage?: boolean;
  monitorNavigation?: boolean;
  monitorDOM?: boolean;
  threshold?: number; // Threshold for suspicious activity detection
}

/**
 * React hook to monitor for suspicious user behavior
 * Provides early warning for potential security incidents
 */
export function useSecurityMonitor({
  userId,
  monitorPaste = true,
  monitorConsole = true,
  monitorStorage = true,
  monitorNavigation = true,
  monitorDOM = true,
  threshold = 3,
}: SecurityMonitorProps = {}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const securityState = {
      failedAuthCount: 0,
      navigationEvents: [] as number[],
      suspiciousActivities: 0,
      lastCheck: Date.now(),
    };
    
    const correlationId = getCorrelationId();
    
    const logSecurityEvent = (eventType: SecurityEventType, details: any) => {
      logSecurity(`Security monitor detected: ${eventType}`, {
        correlationId,
        userId,
        action: eventType,
        componentName: 'SecurityMonitor'
      }, details);
      
      securityState.suspiciousActivities++;
      
      // If we exceed the threshold, take protective measures
      if (securityState.suspiciousActivities >= threshold) {
        logSecurity(`Suspicious activity threshold exceeded`, {
          correlationId,
          userId,
          action: 'threshold_exceeded',
          componentName: 'SecurityMonitor'
        }, { suspiciousActivities: securityState.suspiciousActivities });
        
        // Consider additional protective actions here
        // For example, prompt for re-authentication or additional verification
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('security_verification_required', 'true');
        }
      }
    };
    
    // 1. Monitor for password pasting (could be credential stuffing)
    const handlePaste = (e: ClipboardEvent) => {
      if (!monitorPaste) return;
      
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        const input = target as HTMLInputElement;
        if (input.type === 'password') {
          logSecurityEvent(SecurityEventType.PASTE_PASSWORD, {
            inputId: input.id || 'unknown',
            inputName: input.name || 'unknown',
          });
        }
      }
    };
    
    // 2. Monitor for rapid navigation (could be automated attacks)
    const handleNavigation = () => {
      if (!monitorNavigation) return;
      
      const now = Date.now();
      securityState.navigationEvents.push(now);
      
      // Only keep navigation events from the last 10 seconds
      securityState.navigationEvents = securityState.navigationEvents.filter(
        time => now - time < 10000
      );
      
      // If there are too many navigation events in a short period, log it
      if (securityState.navigationEvents.length >= 10) {
        logSecurityEvent(SecurityEventType.RAPID_NAVIGATION, {
          count: securityState.navigationEvents.length,
          timeWindow: '10 seconds',
        });
      }
    };
    
    // 3. Monitor for DOM tampering
    const setupDOMObserver = () => {
      if (!monitorDOM) return;
      
      // Watch for suspicious DOM modifications
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          // Check for suspicious additions (like script tags)
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (const node of Array.from(mutation.addedNodes)) {
              if (node instanceof HTMLElement) {
                if (
                  node.tagName === 'SCRIPT' || 
                  node.tagName === 'IFRAME' || 
                  node.hasAttribute('onclick') ||
                  node.hasAttribute('onerror')
                ) {
                  logSecurityEvent(SecurityEventType.DOM_TAMPERING, {
                    element: node.tagName,
                    attributes: Array.from(node.attributes).map(attr => `${attr.name}="${attr.value}"`),
                  });
                }
              }
            }
          }
          
          // Check for suspicious attribute modifications
          if (mutation.type === 'attributes') {
            const target = mutation.target as HTMLElement;
            const attributeName = mutation.attributeName || '';
            
            if (
              attributeName.startsWith('on') || // Event handlers
              (attributeName === 'src' && target.tagName === 'IFRAME') || // Iframe sources
              (attributeName === 'href' && target.getAttribute(attributeName)?.startsWith('javascript:')) // JavaScript URLs
            ) {
              logSecurityEvent(SecurityEventType.DOM_TAMPERING, {
                element: target.tagName,
                attribute: attributeName,
                value: target.getAttribute(attributeName),
              });
            }
          }
        }
      });
      
      // Start observing the document
      observer.observe(document.documentElement, {
        childList: true,
        attributes: true,
        subtree: true,
      });
      
      return observer;
    };
    
    // 4. Monitor for storage tampering
    const setupStorageMonitoring = () => {
      if (!monitorStorage) return;
      
      const originalSetItem = Storage.prototype.setItem;
      const sensitiveKeys = ['token', 'auth', 'session', 'jwt', 'key', 'secret'];
      
      Storage.prototype.setItem = function(key: string, value: string) {
        // Check for attempts to overwrite security-sensitive items
        if (
          sensitiveKeys.some(k => key.toLowerCase().includes(k)) &&
          this.getItem(key) !== null &&
          this.getItem(key) !== value
        ) {
          logSecurityEvent(SecurityEventType.STORAGE_TAMPERING, {
            storageType: this === localStorage ? 'localStorage' : 'sessionStorage',
            key,
          });
        }
        
        originalSetItem.apply(this, [key, value]);
      };
      
      return () => {
        Storage.prototype.setItem = originalSetItem;
      };
    };
    
    // 5. Monitor for console abuse
    const setupConsoleMonitoring = () => {
      if (!monitorConsole) return;
      
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      const suspiciousPatterns = [
        /fetch\s*\(/i,
        /localStorage/i,
        /sessionStorage/i,
        /document\.cookie/i,
        /eval\s*\(/i,
        /atob\s*\(/i,
        /btoa\s*\(/i,
        /XMLHttpRequest/i,
        /new\s+Function/i,
        /debugger/i
      ];
      
      // Override console methods to detect suspicious usage
      console.log = function(...args) {
        const input = args.join(' ');
        
        if (suspiciousPatterns.some(pattern => pattern.test(input))) {
          logSecurityEvent(SecurityEventType.CONSOLE_ABUSE, {
            method: 'log',
            content: input.substring(0, 100),
          });
        }
        
        originalConsoleLog.apply(this, args);
      };
      
      console.error = function(...args) {
        const input = args.join(' ');
        
        if (suspiciousPatterns.some(pattern => pattern.test(input))) {
          logSecurityEvent(SecurityEventType.CONSOLE_ABUSE, {
            method: 'error',
            content: input.substring(0, 100),
          });
        }
        
        originalConsoleError.apply(this, args);
      };
      
      console.warn = function(...args) {
        const input = args.join(' ');
        
        if (suspiciousPatterns.some(pattern => pattern.test(input))) {
          logSecurityEvent(SecurityEventType.CONSOLE_ABUSE, {
            method: 'warn',
            content: input.substring(0, 100),
          });
        }
        
        originalConsoleWarn.apply(this, args);
      };
      
      return () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      };
    };
    
    // Set up all monitors
    document.addEventListener('paste', handlePaste);
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('pushstate', handleNavigation);
    window.addEventListener('replacestate', handleNavigation);
    
    const domObserver = setupDOMObserver();
    const restoreStorage = setupStorageMonitoring();
    const restoreConsole = setupConsoleMonitoring();
    
    // Periodically check for failed auth attempts
    const authCheckInterval = setInterval(() => {
      const failedAuthCount = parseInt(sessionStorage.getItem('failed_auth_count') || '0', 10);
      
      if (failedAuthCount >= 3 && failedAuthCount > securityState.failedAuthCount) {
        logSecurityEvent(SecurityEventType.MULTIPLE_FAILED_AUTH, {
          count: failedAuthCount,
          timeSinceLastCheck: Date.now() - securityState.lastCheck,
        });
      }
      
      securityState.failedAuthCount = failedAuthCount;
      securityState.lastCheck = Date.now();
    }, 10000);
    
    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('pushstate', handleNavigation);
      window.removeEventListener('replacestate', handleNavigation);
      
      if (domObserver) domObserver.disconnect();
      if (restoreStorage) restoreStorage();
      if (restoreConsole) restoreConsole();
      
      clearInterval(authCheckInterval);
    };
  }, [userId, monitorPaste, monitorConsole, monitorStorage, monitorNavigation, monitorDOM, threshold]);
}

/**
 * Component wrapper to easily add security monitoring to any page or component
 */
export default function SecurityMonitor({
  children,
  userId,
  ...monitoringOptions
}: SecurityMonitorProps & { children: React.ReactNode }) {
  useSecurityMonitor({ userId, ...monitoringOptions });
  return <>{children}</>;
}
