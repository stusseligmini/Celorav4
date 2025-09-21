/**
 * Email Service Configuration and Setup Guide
 * 
 * CRITICAL: Your platform needs email functionality for:
 * - User registration verification
 * - Password reset emails
 * - Security alerts
 * - Database monitoring notifications
 */

// SENDGRID SETUP (Recommended)
// 1. Create SendGrid account: https://sendgrid.com/
// 2. Create API key with full access
// 3. Add to Render environment variables:
//    SENDGRID_API_KEY=your_actual_api_key_here

// ALTERNATIVE: SMTP Configuration
// For other email providers (Gmail, Mailgun, etc.)
const emailConfig = {
    smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    },
    
    // Email templates
    templates: {
        welcome: {
            subject: 'Welcome to Celora - Verify Your Email',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #10B981;">Welcome to Celora!</h1>
                    <p>Thanks for joining our crypto banking platform. Please verify your email:</p>
                    <a href="{{verificationLink}}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a>
                    <p>Or use code: <strong>{{verificationCode}}</strong></p>
                </div>
            `
        },
        
        passwordReset: {
            subject: 'Celora - Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #EF4444;">Password Reset</h1>
                    <p>Click the link below to reset your password:</p>
                    <a href="{{resetLink}}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
                    <p>This link expires in 1 hour.</p>
                </div>
            `
        },
        
        databaseAlert: {
            subject: 'Celora - Database Alert',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #F59E0B;">Database Alert</h1>
                    <p>{{alertMessage}}</p>
                    <p><strong>Action Required:</strong> {{actionRequired}}</p>
                    <a href="https://console.neon.tech" style="background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Open Database Console</a>
                </div>
            `
        }
    }
};

// EMAIL SERVICE STATUS CHECK
async function checkEmailService() {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'SG.test_key_for_now') {
        console.warn('⚠️  WARNING: Email service not configured! Users cannot verify accounts.');
        return false;
    }
    return true;
}

module.exports = {
    emailConfig,
    checkEmailService
};
