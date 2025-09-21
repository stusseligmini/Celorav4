const crypto = require('crypto');
const nodemailer = require('nodemailer');
const logger = require('./logger');

// In-memory store for verification codes (in production, use Redis)
const verificationCodes = new Map();

// Email transporter configuration
const createEmailTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production email service (SendGrid, SES, etc.)
    return nodemailer.createTransporter({
      service: 'SendGrid', // or your preferred service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Development - use console logging
    return {
      sendMail: async (options) => {
        logger.info('📧 Email would be sent:', {
          to: options.to,
          subject: options.subject,
          text: options.text
        });
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }
};

/**
 * Generates a 6-digit verification code
 * @returns {string} - 6-digit numeric code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends a verification code via email
 * @param {string} email - Recipient email
 * @param {string} purpose - Purpose of verification (login, registration, etc.)
 * @param {string} firstName - User's first name for personalization
 * @returns {Object} - Result with success status and code ID
 */
async function sendVerificationCode(email, purpose = 'login', firstName = 'User') {
  try {
    const code = generateVerificationCode();
    const codeId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store code with expiration
    verificationCodes.set(codeId, {
      email,
      code,
      purpose,
      expiresAt,
      attempts: 0,
      maxAttempts: 3
    });
    
    // Email content
    const subject = `Celora Security Code - ${purpose.charAt(0).toUpperCase() + purpose.slice(1)}`;
    const text = `
Hello ${firstName},

Your Celora security verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email and ensure your account is secure.

Best regards,
The Celora Team
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Celora Security Code</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px; border-radius: 16px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .code-box { background: #10b981; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 4px; margin: 20px 0; }
    .footer { text-align: center; font-size: 14px; color: #94a3b8; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1 style="color: #10b981; margin: 0;">🚀 Celora</h1>
    </div>
    <h2>Security Verification Code</h2>
    <p>Hello ${firstName},</p>
    <p>Your Celora security verification code for <strong>${purpose}</strong> is:</p>
    <div class="code-box">${code}</div>
    <p><strong>Important:</strong> This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, please ignore this email and ensure your account is secure.</p>
    <div class="footer">
      <p>Best regards,<br>The Celora Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    // Send email
    const transporter = createEmailTransporter();
    const result = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@celora.net',
      to: email,
      subject,
      text,
      html
    });
    
    logger.info(`Verification code sent to ${email} for ${purpose}`);
    
    return {
      success: true,
      codeId,
      expiresAt,
      messageId: result.messageId
    };
    
  } catch (error) {
    logger.error('Failed to send verification code:', error);
    return {
      success: false,
      error: 'Failed to send verification code'
    };
  }
}

/**
 * Verifies a submitted code against stored codes
 * @param {string} codeId - Code ID from sendVerificationCode
 * @param {string} submittedCode - Code submitted by user
 * @returns {Object} - Verification result
 */
function verifyCode(codeId, submittedCode) {
  try {
    const storedData = verificationCodes.get(codeId);
    
    if (!storedData) {
      return {
        success: false,
        error: 'Invalid or expired verification code',
        code: 'INVALID_CODE'
      };
    }
    
    // Check expiration
    if (new Date() > storedData.expiresAt) {
      verificationCodes.delete(codeId);
      return {
        success: false,
        error: 'Verification code has expired',
        code: 'EXPIRED_CODE'
      };
    }
    
    // Check attempts
    if (storedData.attempts >= storedData.maxAttempts) {
      verificationCodes.delete(codeId);
      return {
        success: false,
        error: 'Too many failed attempts',
        code: 'MAX_ATTEMPTS_REACHED'
      };
    }
    
    // Verify code
    if (storedData.code !== submittedCode.toString()) {
      storedData.attempts += 1;
      verificationCodes.set(codeId, storedData);
      
      return {
        success: false,
        error: 'Incorrect verification code',
        code: 'INCORRECT_CODE',
        attemptsRemaining: storedData.maxAttempts - storedData.attempts
      };
    }
    
    // Success - remove code
    verificationCodes.delete(codeId);
    
    logger.info(`Verification code verified successfully for ${storedData.email}`);
    
    return {
      success: true,
      email: storedData.email,
      purpose: storedData.purpose
    };
    
  } catch (error) {
    logger.error('Code verification error:', error);
    return {
      success: false,
      error: 'Verification failed',
      code: 'VERIFICATION_ERROR'
    };
  }
}

/**
 * Cleans up expired verification codes
 */
function cleanupExpiredCodes() {
  const now = new Date();
  for (const [codeId, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(codeId);
    }
  }
}

// Cleanup expired codes every 5 minutes
setInterval(cleanupExpiredCodes, 5 * 60 * 1000);

module.exports = {
  sendVerificationCode,
  verifyCode,
  cleanupExpiredCodes
};
