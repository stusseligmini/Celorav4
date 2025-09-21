const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');
const { sentryUtils } = require('../config/sentry');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email templates
const templates = {
  // Welcome email for new users
  welcome: (user) => ({
    to: user.email,
    from: process.env.FROM_EMAIL,
    subject: 'Welcome to Celora - Your Digital Banking Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to Celora!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your digital banking journey starts here</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin-top: 0;">Hello ${user.username || 'there'}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Thank you for joining Celora, the next generation digital banking platform. 
            You now have access to secure cryptocurrency transactions, virtual cards, and much more.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">What you can do now:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>✅ Connect your Solana wallet (Phantom, Sollet, etc.)</li>
              <li>🔐 Secure two-factor authentication setup</li>
              <li>💳 Request virtual debit cards</li>
              <li>📊 Track your transaction history</li>
              <li>🌍 Send and receive cryptocurrency globally</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://celora.net/dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 25px; display: inline-block; font-weight: bold;">
              Get Started Now
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #999; font-size: 14px; text-align: center;">
              Need help? Contact us at <a href="mailto:support@celora.net">support@celora.net</a>
            </p>
          </div>
        </div>
      </div>
    `
  }),
  
  // Email verification
  emailVerification: (user, token) => ({
    to: user.email,
    from: process.env.FROM_EMAIL,
    subject: 'Verify Your Celora Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">Verify Your Email</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333;">Hello ${user.username || user.email}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Please verify your email address to complete your Celora account setup and enable all features.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://celora.net/verify-email?token=${token}" 
               style="background: #4f46e5; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
            <br>
            <a href="https://celora.net/verify-email?token=${token}">https://celora.net/verify-email?token=${token}</a>
          </p>
          
          <p style="color: #999; font-size: 14px;">
            This verification link will expire in 24 hours for security reasons.
          </p>
        </div>
      </div>
    `
  }),
  
  // Password reset
  passwordReset: (user, token) => ({
    to: user.email,
    from: process.env.FROM_EMAIL,
    subject: 'Reset Your Celora Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">Password Reset Request</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333;">Reset Your Password</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            We received a request to reset the password for your Celora account. 
            Click the button below to create a new password.
          </p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-size: 14px;">
              ⚠️ If you didn't request this password reset, please ignore this email and contact our support team.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://celora.net/reset-password?token=${token}" 
               style="background: #dc2626; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px;">
            This reset link will expire in 1 hour for security reasons.
          </p>
        </div>
      </div>
    `
  }),
  
  // Transaction notification
  transactionNotification: (user, transaction) => ({
    to: user.email,
    from: process.env.FROM_EMAIL,
    subject: `Transaction ${transaction.type === 'send' ? 'Sent' : 'Received'} - Celora`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${transaction.type === 'send' ? '#f59e0b' : '#10b981'}; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">Transaction ${transaction.type === 'send' ? 'Sent' : 'Received'}</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333;">Transaction Details</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #666;">Amount:</td>
                <td style="padding: 8px; color: #333;">${transaction.amount} ${transaction.currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #666;">Type:</td>
                <td style="padding: 8px; color: #333;">${transaction.type === 'send' ? 'Sent' : 'Received'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #666;">Date:</td>
                <td style="padding: 8px; color: #333;">${new Date(transaction.createdAt).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #666;">Status:</td>
                <td style="padding: 8px; color: ${transaction.status === 'completed' ? '#10b981' : '#f59e0b'}; font-weight: bold;">
                  ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </td>
              </tr>
              ${transaction.txHash ? `
                <tr>
                  <td style="padding: 8px; font-weight: bold; color: #666;">Transaction Hash:</td>
                  <td style="padding: 8px; color: #333; word-break: break-all; font-family: monospace; font-size: 12px;">
                    ${transaction.txHash}
                  </td>
                </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://celora.net/transactions" 
               style="background: #4f46e5; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              View Transaction History
            </a>
          </div>
        </div>
      </div>
    `
  }),
  
  // Security alert
  securityAlert: (user, alert) => ({
    to: user.email,
    from: process.env.FROM_EMAIL,
    subject: `Security Alert - ${alert.type}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">🚨 Security Alert</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #dc2626;">Security Event Detected</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            We detected a security event on your Celora account:
          </p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin-top: 0;">${alert.type}</h3>
            <p style="color: #991b1b; margin-bottom: 0;">${alert.description}</p>
            <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
              Time: ${new Date(alert.timestamp).toLocaleString()}<br>
              IP Address: ${alert.ip || 'Unknown'}<br>
              Location: ${alert.location || 'Unknown'}
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            If this was you, you can ignore this message. If you don't recognize this activity, 
            please secure your account immediately.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://celora.net/security" 
               style="background: #dc2626; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Review Security Settings
            </a>
          </div>
        </div>
      </div>
    `
  })
};

// Email service class
class EmailService {
  constructor() {
    this.isConfigured = !!process.env.SENDGRID_API_KEY;
    
    if (!this.isConfigured) {
      logger.warn('SendGrid API key not configured. Email functionality will be disabled.');
    }
  }
  
  async sendEmail(emailData) {
    if (!this.isConfigured) {
      logger.warn('Attempted to send email but SendGrid is not configured', { to: emailData.to });
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      logger.info('Sending email', { 
        to: emailData.to, 
        subject: emailData.subject,
        from: emailData.from 
      });
      
      const result = await sgMail.send(emailData);
      
      logger.info('Email sent successfully', { 
        to: emailData.to, 
        messageId: result[0].headers['x-message-id'] 
      });
      
      return { 
        success: true, 
        messageId: result[0].headers['x-message-id'] 
      };
      
    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        to: emailData.to,
        subject: emailData.subject,
        code: error.code,
        response: error.response?.body
      });
      
      sentryUtils.captureException(error, {
        tags: { operation: 'email_send' },
        extra: {
          to: emailData.to,
          subject: emailData.subject,
          errorCode: error.code
        }
      });
      
      return { success: false, error: error.message };
    }
  }
  
  async sendWelcomeEmail(user) {
    const emailData = templates.welcome(user);
    return await this.sendEmail(emailData);
  }
  
  async sendEmailVerification(user, token) {
    const emailData = templates.emailVerification(user, token);
    return await this.sendEmail(emailData);
  }
  
  async sendPasswordReset(user, token) {
    const emailData = templates.passwordReset(user, token);
    return await this.sendEmail(emailData);
  }
  
  async sendTransactionNotification(user, transaction) {
    const emailData = templates.transactionNotification(user, transaction);
    return await this.sendEmail(emailData);
  }
  
  async sendSecurityAlert(user, alert) {
    const emailData = templates.securityAlert(user, alert);
    return await this.sendEmail(emailData);
  }
  
  // Bulk email sending with rate limiting
  async sendBulkEmails(emails, options = {}) {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }
    
    const { batchSize = 10, delayBetweenBatches = 1000 } = options;
    const results = [];
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (emailData) => {
        try {
          return await this.sendEmail(emailData);
        } catch (error) {
          return { success: false, error: error.message, email: emailData.to };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches to respect rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
  
  // Email template testing
  async testEmailTemplate(templateName, user, additionalData = {}) {
    if (!templates[templateName]) {
      throw new Error(`Template '${templateName}' not found`);
    }
    
    // Create test email data
    let emailData;
    switch (templateName) {
      case 'welcome':
        emailData = templates.welcome(user);
        break;
      case 'emailVerification':
        emailData = templates.emailVerification(user, 'test-token-123');
        break;
      case 'passwordReset':
        emailData = templates.passwordReset(user, 'test-reset-token-456');
        break;
      case 'transactionNotification':
        emailData = templates.transactionNotification(user, {
          amount: 100,
          currency: 'SOL',
          type: 'send',
          status: 'completed',
          createdAt: new Date(),
          txHash: 'test-tx-hash-789',
          ...additionalData
        });
        break;
      case 'securityAlert':
        emailData = templates.securityAlert(user, {
          type: 'Suspicious Login',
          description: 'A login was attempted from an unrecognized device.',
          timestamp: new Date(),
          ip: '192.168.1.1',
          location: 'New York, USA',
          ...additionalData
        });
        break;
      default:
        throw new Error(`Unknown template: ${templateName}`);
    }
    
    // Send to admin email for testing
    emailData.to = process.env.ADMIN_EMAIL;
    emailData.subject = `[TEST] ${emailData.subject}`;
    
    return await this.sendEmail(emailData);
  }
  
  // Health check
  getStatus() {
    return {
      configured: this.isConfigured,
      apiKey: this.isConfigured ? 'Present' : 'Missing',
      fromEmail: process.env.FROM_EMAIL || 'Not configured'
    };
  }
}

// Export singleton instance
const emailService = new EmailService();

module.exports = emailService;
