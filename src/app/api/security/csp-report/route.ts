import { NextRequest, NextResponse } from 'next/server';
import { logSecurity } from '@/lib/logger';

/**
 * API endpoint for receiving Content Security Policy violation reports
 * This endpoint is specified in the CSP report-uri directive
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Get the CSP report data
    const cspReportData = await req.json();
    
    // Extract useful information from the report
    const { 
      'csp-report': {
        'document-uri': documentUri,
        'violated-directive': violatedDirective,
        'blocked-uri': blockedUri,
        'source-file': sourceFile,
        'line-number': lineNumber,
        'column-number': columnNumber,
        'script-sample': scriptSample
      } = {}
    } = cspReportData;
    
    // Get correlation ID from headers
    const correlationId = req.headers.get('x-correlation-id') || 'unknown';
    
    // Log the CSP violation for security monitoring
    logSecurity('Content Security Policy violation', {
      correlationId,
      action: 'csp_violation_report',
      componentName: 'CSP',
    }, {
      documentUri,
      violatedDirective,
      blockedUri,
      sourceFile,
      lineNumber,
      columnNumber,
      scriptSample,
      userAgent: req.headers.get('user-agent'),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });
    
    // Return empty 204 response (no content)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return NextResponse.json({ error: 'Invalid CSP report format' }, { status: 400 });
  }
}

export const dynamic = 'force-dynamic';
