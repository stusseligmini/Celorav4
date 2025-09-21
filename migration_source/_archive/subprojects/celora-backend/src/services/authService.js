const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const emailService = require('./emailService');
const { sentryUtils } = require('../config/sentry');

const prisma = new PrismaClient();

class AuthService {
  constructor() {
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  }
  
  // Generate secure random token
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Hash password
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.bcryptRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Password hashing failed', { error: error.message });
      throw new Error('Password processing failed');
    }
  }
  
  // Verify password
  async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Password verification failed', { error: error.message });
      return false;
    }
  }
  
  // Generate JWT tokens
  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user',
      emailVerified: user.emailVerified || false
    };
    
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'celora-backend',
      subject: user.id.toString()
    });
    
    const refreshToken = jwt.sign(
      { id: user.id, tokenVersion: user.tokenVersion || 0 },
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiresIn,
        issuer: 'celora-backend',
        subject: user.id.toString()
      }
    );
    
    return { accessToken, refreshToken };
  }
  
  // Verify JWT token
  verifyToken(token, secret = this.jwtSecret) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      logger.debug('Token verification failed', { error: error.message });
      return null;
    }
  }
  
  // Register new user
  async register(userData, req) {
    const { email, password, username } = userData;
    
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase() },
            { username: username }
          ]
        }
      });
      
      if (existingUser) {
        logger.audit.register(email, req.ip, false, { 
          reason: 'user_already_exists',
          existingField: existingUser.email === email.toLowerCase() ? 'email' : 'username'
        });
        
        throw new Error(
          existingUser.email === email.toLowerCase() 
            ? 'User with this email already exists' 
            : 'Username is already taken'
        );
      }
      
      // Hash password
      const hashedPassword = await this.hashPassword(password);
      
      // Generate email verification token
      const emailVerificationToken = this.generateSecureToken();
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Create user
      const newUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: email.toLowerCase(),
          username: username,
          password: hashedPassword,
          emailVerificationToken,
          emailVerificationExpires,
          role: 'user',
          settings: {
            notifications: {
              email: true,
              push: false,
              sms: false
            },
            security: {
              twoFactorEnabled: false,
              loginNotifications: true
            },
            preferences: {
              theme: 'light',
              language: 'en',
              currency: 'USD'
            }
          },
          metadata: {
            registrationIP: req.ip,
            userAgent: req.get('User-Agent'),
            registrationDate: new Date()
          }
        },
        select: {
          id: true,
          email: true,
          username: true,
          emailVerified: true,
          role: true,
          createdAt: true
        }
      });
      
      // Send welcome and verification emails
      try {
        await emailService.sendWelcomeEmail(newUser);
        await emailService.sendEmailVerification(newUser, emailVerificationToken);
      } catch (emailError) {
        logger.warn('Failed to send registration emails', { 
          userId: newUser.id, 
          error: emailError.message 
        });
        // Don't fail registration if emails fail
      }
      
      // Generate tokens
      const tokens = this.generateTokens(newUser);
      
      logger.audit.register(email, req.ip, true, { 
        userId: newUser.id,
        username: newUser.username
      });
      
      logger.info('User registered successfully', {
        userId: newUser.id,
        email: newUser.email,
        username: newUser.username,
        ip: req.ip
      });
      
      return {
        user: newUser,
        tokens,
        message: 'Registration successful. Please check your email to verify your account.'
      };
      
    } catch (error) {
      logger.error('User registration failed', {
        error: error.message,
        email,
        username,
        ip: req.ip
      });
      
      sentryUtils.auth.registrationFailure(error, email, req.ip);
      throw error;
    }
  }
  
  // Login user
  async login(credentials, req) {
    const { email, password } = credentials;
    
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          wallets: true
        }
      });
      
      if (!user) {
        logger.audit.login(email, req.ip, false, { 
          reason: 'user_not_found' 
        });
        throw new Error('Invalid email or password');
      }
      
      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        logger.audit.login(user.id, req.ip, false, { 
          reason: 'invalid_password',
          email: user.email
        });
        throw new Error('Invalid email or password');
      }
      
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          loginCount: { increment: 1 },
          lastLoginIP: req.ip
        }
      });
      
      // Generate tokens
      const tokens = this.generateTokens(user);
      
      // Remove sensitive data
      const { password: _, emailVerificationToken, passwordResetToken, ...safeUser } = user;
      
      logger.audit.login(user.id, req.ip, true, {
        email: user.email,
        loginCount: user.loginCount + 1
      });
      
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
      
      return {
        user: safeUser,
        tokens,
        message: 'Login successful'
      };
      
    } catch (error) {
      logger.error('User login failed', {
        error: error.message,
        email,
        ip: req.ip
      });
      
      sentryUtils.auth.loginFailure(error, email, req.ip);
      throw error;
    }
  }
  
  // Refresh access token
  async refreshToken(refreshToken, req) {
    try {
      const decoded = this.verifyToken(refreshToken, this.refreshTokenSecret);
      
      if (!decoded) {
        throw new Error('Invalid refresh token');
      }
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          username: true,
          emailVerified: true,
          role: true,
          tokenVersion: true,
          active: true
        }
      });
      
      if (!user || !user.active) {
        throw new Error('User not found or inactive');
      }
      
      // Check token version (for token invalidation)
      if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
        throw new Error('Token has been invalidated');
      }
      
      const tokens = this.generateTokens(user);
      
      logger.info('Token refreshed successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
      
      return {
        user,
        tokens,
        message: 'Token refreshed successfully'
      };
      
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        ip: req.ip
      });
      
      throw error;
    }
  }
  
  // Verify email
  async verifyEmail(token, req) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            gt: new Date()
          }
        }
      });
      
      if (!user) {
        throw new Error('Invalid or expired verification token');
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          verifiedAt: new Date()
        }
      });
      
      logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
      
      return { message: 'Email verified successfully' };
      
    } catch (error) {
      logger.error('Email verification failed', {
        error: error.message,
        token,
        ip: req.ip
      });
      
      throw error;
    }
  }
  
  // Request password reset
  async requestPasswordReset(email, req) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      
      if (!user) {
        // Don't reveal if email exists
        logger.audit.securityEvent(
          'password_reset_request_invalid_email',
          null,
          req.ip,
          'low',
          { email }
        );
        return { message: 'If the email exists, a reset link has been sent' };
      }
      
      const resetToken = this.generateSecureToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires
        }
      });
      
      await emailService.sendPasswordReset(user, resetToken);
      
      logger.audit.securityEvent(
        'password_reset_requested',
        user.id,
        req.ip,
        'medium',
        { email: user.email }
      );
      
      return { message: 'Password reset link has been sent to your email' };
      
    } catch (error) {
      logger.error('Password reset request failed', {
        error: error.message,
        email,
        ip: req.ip
      });
      
      throw error;
    }
  }
  
  // Reset password
  async resetPassword(token, newPassword, req) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gt: new Date()
          }
        }
      });
      
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }
      
      const hashedPassword = await this.hashPassword(newPassword);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          tokenVersion: { increment: 1 }, // Invalidate all existing tokens
          passwordChangedAt: new Date()
        }
      });
      
      // Send security notification
      await emailService.sendSecurityAlert(user, {
        type: 'Password Changed',
        description: 'Your account password has been successfully changed.',
        timestamp: new Date(),
        ip: req.ip
      });
      
      logger.audit.passwordChange(user.id, req.ip, true);
      
      return { message: 'Password has been reset successfully' };
      
    } catch (error) {
      logger.error('Password reset failed', {
        error: error.message,
        token,
        ip: req.ip
      });
      
      throw error;
    }
  }
  
  // Change password (authenticated user)
  async changePassword(userId, oldPassword, newPassword, req) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const isOldPasswordValid = await this.verifyPassword(oldPassword, user.password);
      
      if (!isOldPasswordValid) {
        logger.audit.passwordChange(userId, req.ip, false, { 
          reason: 'invalid_old_password' 
        });
        throw new Error('Current password is incorrect');
      }
      
      const hashedNewPassword = await this.hashPassword(newPassword);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          tokenVersion: { increment: 1 },
          passwordChangedAt: new Date()
        }
      });
      
      logger.audit.passwordChange(userId, req.ip, true);
      
      return { message: 'Password changed successfully' };
      
    } catch (error) {
      logger.error('Password change failed', {
        error: error.message,
        userId,
        ip: req.ip
      });
      
      throw error;
    }
  }
  
  // Logout (invalidate refresh token)
  async logout(userId, req) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 }
        }
      });
      
      logger.info('User logged out', {
        userId,
        ip: req.ip
      });
      
      return { message: 'Logged out successfully' };
      
    } catch (error) {
      logger.error('Logout failed', {
        error: error.message,
        userId,
        ip: req.ip
      });
      
      throw error;
    }
  }
  
  // Get user profile
  async getUserProfile(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          emailVerified: true,
          role: true,
          settings: true,
          createdAt: true,
          lastLogin: true,
          loginCount: true,
          wallets: {
            select: {
              id: true,
              address: true,
              network: true,
              type: true,
              isActive: true,
              createdAt: true
            }
          },
          virtualCards: {
            where: { isActive: true },
            select: {
              id: true,
              cardNumber: true,
              cardType: true,
              status: true,
              createdAt: true
            }
          }
        }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
      
    } catch (error) {
      logger.error('Get user profile failed', {
        error: error.message,
        userId
      });
      
      throw error;
    }
  }
  
  // Health check
  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { database: 'connected' };
    } catch (error) {
      return { database: 'disconnected', error: error.message };
    }
  }
}

module.exports = new AuthService();
