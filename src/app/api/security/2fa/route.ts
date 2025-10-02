import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import * as crypto from 'crypto';

// Simple 2FA implementation
function generateSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

function generateTOTP(secret: string, window = 0): string {
  const epoch = Math.round(new Date().getTime() / 1000.0);
  const time = Math.floor(epoch / 30) + window;
  
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(time.toString());
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) |
               ((hash[offset + 1] & 0xff) << 16) |
               ((hash[offset + 2] & 0xff) << 8) |
               (hash[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

function verifyTOTP(token: string, secret: string): boolean {
  // Check current window and ±1 window for clock drift
  for (let window = -1; window <= 1; window++) {
    if (generateTOTP(secret, window) === token) {
      return true;
    }
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, token, backup_codes } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    switch (action) {
      case 'setup':
        // Generate new 2FA secret
        const secret = generateSecret();
        const backupCodes = Array.from({ length: 10 }, () => 
          crypto.randomBytes(4).toString('hex').toUpperCase()
        );

        // Update user profile with 2FA settings
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            two_factor_secret: secret,
            two_factor_backup_codes: backupCodes,
            two_factor_enabled: false // Not enabled until verified
          })
          .eq('id', user.id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Generate QR code URL (in production, use a QR code library)
        const issuer = 'Celora';
        const accountName = user.email || 'user';
        const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

        return NextResponse.json({
          success: true,
          secret,
          qr_code_url: qrCodeUrl,
          backup_codes: backupCodes,
          message: '2FA setup initiated. Please verify with your authenticator app.'
        });

      case 'verify':
        if (!token) {
          return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        // Get user's 2FA secret
        const { data: profile } = await supabase
          .from('profiles')
          .select('two_factor_secret, two_factor_backup_codes')
          .eq('id', user.id)
          .single();

        if (!profile?.two_factor_secret) {
          return NextResponse.json({ error: '2FA not set up' }, { status: 400 });
        }

        // Verify TOTP token or backup code
        let isValid = false;
        let usedBackupCode = null;

        if (token.length === 6 && /^\d+$/.test(token)) {
          // TOTP token
          isValid = verifyTOTP(token, profile.two_factor_secret);
        } else if (token.length === 8 && /^[A-F0-9]+$/i.test(token)) {
          // Backup code
          const backupCodes = profile.two_factor_backup_codes || [];
          const codeIndex = backupCodes.indexOf(token.toUpperCase());
          if (codeIndex !== -1) {
            isValid = true;
            usedBackupCode = token.toUpperCase();
            // Remove used backup code
            backupCodes.splice(codeIndex, 1);
            
            await supabase
              .from('profiles')
              .update({ two_factor_backup_codes: backupCodes })
              .eq('id', user.id);
          }
        }

        if (isValid) {
          // Enable 2FA
          await supabase
            .from('profiles')
            .update({ two_factor_enabled: true })
            .eq('id', user.id);

          // Log security event
          await supabase
            .from('security_events')
            .insert({
              user_id: user.id,
              event_type: '2fa_enabled',
              description: usedBackupCode 
                ? `2FA enabled using backup code ${usedBackupCode}`
                : '2FA enabled using authenticator app',
              ip_address: request.headers.get('x-forwarded-for') || 'unknown',
              user_agent: request.headers.get('user-agent') || 'unknown'
            });

          return NextResponse.json({
            success: true,
            message: '2FA successfully enabled',
            used_backup_code: usedBackupCode
          });
        } else {
          // Log failed attempt
          await supabase
            .from('security_events')
            .insert({
              user_id: user.id,
              event_type: '2fa_verification_failed',
              description: 'Failed 2FA verification attempt',
              ip_address: request.headers.get('x-forwarded-for') || 'unknown',
              user_agent: request.headers.get('user-agent') || 'unknown'
            });

          return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

      case 'disable':
        if (!token) {
          return NextResponse.json({ error: 'Token required to disable 2FA' }, { status: 400 });
        }

        // Get user's 2FA secret
        const { data: disableProfile } = await supabase
          .from('profiles')
          .select('two_factor_secret, two_factor_enabled')
          .eq('id', user.id)
          .single();

        if (!disableProfile?.two_factor_enabled) {
          return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
        }

        // Verify token before disabling
        const isValidDisable = verifyTOTP(token, disableProfile.two_factor_secret);
        if (!isValidDisable) {
          return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        // Disable 2FA
        await supabase
          .from('profiles')
          .update({
            two_factor_enabled: false,
            two_factor_secret: null,
            two_factor_backup_codes: null
          })
          .eq('id', user.id);

        // Log security event
        await supabase
          .from('security_events')
          .insert({
            user_id: user.id,
            event_type: '2fa_disabled',
            description: '2FA disabled by user',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown'
          });

        return NextResponse.json({
          success: true,
          message: '2FA successfully disabled'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('2FA error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's 2FA status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('two_factor_enabled, two_factor_backup_codes')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const backupCodesCount = profile?.two_factor_backup_codes?.length || 0;

    return NextResponse.json({
      success: true,
      enabled: profile?.two_factor_enabled || false,
      backup_codes_remaining: backupCodesCount
    });

  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
