import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user (optional for performance metrics)
    const { data: { user } } = await supabase.auth.getUser();

    const { 
      fcp, 
      lcp, 
      fid, 
      cls, 
      ttfb, 
      url, 
      userAgent, 
      connection 
    } = await request.json();

    // Basic validation
    if (typeof fcp !== 'number' || typeof lcp !== 'number') {
      return NextResponse.json({ error: 'Invalid metrics data' }, { status: 400 });
    }

    // Store performance metrics (in production, consider using a dedicated analytics service)
    const performanceData = {
      user_id: user?.id || null,
      page_url: url,
      first_contentful_paint: fcp,
      largest_contentful_paint: lcp,
      first_input_delay: fid,
      cumulative_layout_shift: cls,
      time_to_first_byte: ttfb,
      user_agent: userAgent,
      connection_type: connection,
      timestamp: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    };

    // In a real application, you'd store this in a performance analytics table
    // For now, we'll just log it
    console.log('Performance Metrics:', performanceData);

    // Calculate performance score (0-100)
    let score = 100;
    
    // FCP scoring (target: < 1.8s)
    if (fcp > 3000) score -= 25;
    else if (fcp > 1800) score -= 15;
    
    // LCP scoring (target: < 2.5s)
    if (lcp > 4000) score -= 25;
    else if (lcp > 2500) score -= 15;
    
    // FID scoring (target: < 100ms)
    if (fid > 300) score -= 20;
    else if (fid > 100) score -= 10;
    
    // CLS scoring (target: < 0.1)
    if (cls > 0.25) score -= 20;
    else if (cls > 0.1) score -= 10;
    
    // TTFB scoring (target: < 800ms)
    if (ttfb > 1800) score -= 10;
    else if (ttfb > 800) score -= 5;

    const performanceGrade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    // Create recommendations based on metrics
    const recommendations = [];
    
    if (fcp > 1800) {
      recommendations.push({
        metric: 'FCP',
        issue: 'Slow First Contentful Paint',
        suggestion: 'Optimize CSS delivery, reduce render-blocking resources, use font-display: swap'
      });
    }
    
    if (lcp > 2500) {
      recommendations.push({
        metric: 'LCP',
        issue: 'Slow Largest Contentful Paint',
        suggestion: 'Optimize images, preload critical resources, reduce server response times'
      });
    }
    
    if (fid > 100) {
      recommendations.push({
        metric: 'FID',
        issue: 'High First Input Delay',
        suggestion: 'Reduce JavaScript execution time, code splitting, defer non-critical scripts'
      });
    }
    
    if (cls > 0.1) {
      recommendations.push({
        metric: 'CLS',
        issue: 'High Cumulative Layout Shift',
        suggestion: 'Set dimensions for images/videos, reserve space for ads, avoid inserting content above existing content'
      });
    }
    
    if (ttfb > 800) {
      recommendations.push({
        metric: 'TTFB',
        issue: 'Slow Time to First Byte',
        suggestion: 'Optimize server response time, use CDN, enable compression, optimize database queries'
      });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        score: Math.max(0, score),
        grade: performanceGrade,
        metrics: {
          fcp: { value: fcp, status: fcp < 1800 ? 'good' : fcp < 3000 ? 'needs-improvement' : 'poor' },
          lcp: { value: lcp, status: lcp < 2500 ? 'good' : lcp < 4000 ? 'needs-improvement' : 'poor' },
          fid: { value: fid, status: fid < 100 ? 'good' : fid < 300 ? 'needs-improvement' : 'poor' },
          cls: { value: cls, status: cls < 0.1 ? 'good' : cls < 0.25 ? 'needs-improvement' : 'poor' },
          ttfb: { value: ttfb, status: ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor' }
        },
        recommendations
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Performance analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return performance optimization tips
    return NextResponse.json({
      success: true,
      optimization_tips: [
        {
          category: 'Images',
          tips: [
            'Use Next.js Image component with optimization',
            'Implement lazy loading for below-fold images',
            'Use modern formats like WebP/AVIF',
            'Properly size images for different viewports'
          ]
        },
        {
          category: 'JavaScript',
          tips: [
            'Implement code splitting with dynamic imports',
            'Use React.memo() for expensive components',
            'Minimize third-party script impact',
            'Enable tree shaking for unused code elimination'
          ]
        },
        {
          category: 'CSS',
          tips: [
            'Remove unused CSS with PurgeCSS',
            'Inline critical CSS',
            'Use CSS containment where possible',
            'Optimize font loading with font-display'
          ]
        },
        {
          category: 'Network',
          tips: [
            'Enable compression (gzip/brotli)',
            'Use HTTP/2 server push for critical resources',
            'Implement proper caching strategies',
            'Minimize request waterfalls'
          ]
        },
        {
          category: 'Core Web Vitals',
          tips: [
            'FCP < 1.8s: Optimize CSS delivery and reduce render-blocking',
            'LCP < 2.5s: Optimize images and preload critical resources',
            'FID < 100ms: Reduce JavaScript execution time',
            'CLS < 0.1: Set explicit dimensions and avoid layout shifts'
          ]
        }
      ]
    });

  } catch (error) {
    console.error('Performance tips error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}