import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { logSecurityEvent } from '@/lib/security';

/**
 * API endpoint for initiating MFA recovery process
 * Handles the creation and tracking of MFA recovery requests
 */
export async function POST(req: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Parse request body
    const { email, caseNumber, personalInfo } = await req.json();
    
    if (!email || !caseNumber || !personalInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get user ID from email (without revealing if the email exists)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    // Create recovery request record whether user exists or not
    // This prevents timing attacks to determine if an email exists
    const { data: recoveryData, error: recoveryError } = await supabase
      .from('mfa_recovery_requests')
      .insert({
        case_number: caseNumber,
        email: email.toLowerCase(),
        user_id: userData?.id || null,
        request_data: {
          personalInfo: {
            fullName: personalInfo.fullName,
            dateOfBirth: personalInfo.dateOfBirth,
            lastFourDigits: personalInfo.lastFourDigits
          }
        },
        status: 'pending',
      })
      .select()
      .single();
    
    // If we found a user, log the security event
    if (userData?.id) {
      await logSecurityEvent({
        userId: userData.id,
        event: 'mfa_recovery_requested',
        details: { caseNumber },
        ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      });
    }
    
    // Notify security team about the recovery request (in production)
    // This would typically send an email or push notification to security personnel
    // For this implementation we'll just log it
    console.log(`MFA Recovery Request: ${caseNumber} for email: ${email}`);
    
    return NextResponse.json(
      { success: true, caseNumber },
      { status: 200 }
    );
  } catch (error) {
    console.error('MFA recovery request error:', error);
    return NextResponse.json(
      { error: 'Failed to process recovery request' },
      { status: 500 }
    );
  }
}

/**
 * API endpoint for checking the status of an MFA recovery request
 */
export async function GET(req: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get case number from URL
    const { searchParams } = new URL(req.url);
    const caseNumber = searchParams.get('caseNumber');
    
    if (!caseNumber) {
      return NextResponse.json(
        { error: 'Missing case number' },
        { status: 400 }
      );
    }
    
    // Get current user from session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Only allow authenticated requests or requests with matching email
    const email = searchParams.get('email');
    
    if (!session && !email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Query for the recovery request
    let query = supabase
      .from('mfa_recovery_requests')
      .select('status, created_at, updated_at')
      .eq('case_number', caseNumber);
    
    // Add additional filters based on authentication status
    if (!session && email) {
      // If not authenticated, only allow checking if email matches
      query = query.eq('email', email.toLowerCase());
    } else if (session && !session.user.app_metadata.admin) {
      // If authenticated but not admin, only allow checking own requests
      query = query.eq('email', session.user.email);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Recovery request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true,
        status: data.status,
        created: data.created_at,
        updated: data.updated_at
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('MFA recovery status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check recovery status' },
      { status: 500 }
    );
  }
}
