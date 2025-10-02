import { NextRequest, NextResponse } from 'next/server';
import { logSecurity } from '@/lib/logger';
import { getCorrelationId } from '@/lib/logger';
import { createServerClient } from '@supabase/ssr';

/**
 * API endpoint that runs a comprehensive health check
 * of all security systems and components
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const correlationId = getCorrelationId();
  
  const results: Record<string, { status: string; message?: string }> = {
    api: { status: 'operational' },
    headers: { status: 'pending' },
    csp: { status: 'pending' },
    database: { status: 'pending' },
    cookies: { status: 'pending' },
    authentication: { status: 'pending' },
    logging: { status: 'pending' }
  };
  
  // Check CSP headers
  if (req.headers.get('sec-fetch-site')) {
    results.headers.status = 'operational';
  } else {
    results.headers.status = 'warning';
    results.headers.message = 'Sec-Fetch headers not detected';
  }
  
  // Check CSP enforcement
  const cspHeader = req.headers.get('content-security-policy-report-only') || 
                    req.headers.get('content-security-policy');
  
  if (cspHeader) {
    results.csp.status = 'operational';
  } else {
    results.csp.status = 'warning';
    results.csp.message = 'CSP headers not detected';
  }
  
  // Check database connection
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set() {}, // No-op
          remove() {}, // No-op
        },
      }
    );
    
    // Simple health check query
    const { data, error } = await supabase.from('health_checks').select('count').limit(1);
    
    if (!error) {
      results.database.status = 'operational';
    } else {
      results.database.status = 'error';
      results.database.message = 'Database connection failed';
    }
    
    // Check authentication service
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (!authError) {
      results.authentication.status = 'operational';
    } else {
      results.authentication.status = 'error';
      results.authentication.message = 'Authentication service unavailable';
    }
  } catch (error) {
    results.database.status = 'error';
    results.database.message = 'Database connection exception';
  }
  
  // Check cookies
  if (req.cookies.size > 0) {
    results.cookies.status = 'operational';
  } else {
    results.cookies.status = 'warning';
    results.cookies.message = 'No cookies detected';
  }
  
  // Test logging system
  try {
    logSecurity('Health check completed', {
      correlationId,
      action: 'health_check',
      componentName: 'API'
    });
    results.logging.status = 'operational';
  } catch (error) {
    results.logging.status = 'error';
    results.logging.message = 'Logging system error';
  }
  
  // Calculate overall status
  const hasErrors = Object.values(results).some(r => r.status === 'error');
  const hasWarnings = Object.values(results).some(r => r.status === 'warning');
  
  const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'operational';
  
  // Calculate response time
  const responseTime = Date.now() - startTime;
  
  // Return health check results
  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    correlationId,
    responseTime: `${responseTime}ms`,
    components: results
  });
}

export const dynamic = 'force-dynamic';
