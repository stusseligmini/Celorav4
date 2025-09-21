import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Note: This service is temporarily disabled since Notification model doesn't exist in schema
export class NotificationService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  async createNotification(userId: string, title: string, message: string, type: string = 'INFO', data?: any) {
    try {
      console.log('Notification service disabled - Notification model not in schema');
      console.log('Would create notification:', { userId, title, message, type, data });
      
      // Emit to WebSocket instead
      this.io.to(userId).emit('notification', {
        title,
        message,
        type,
        data,
        createdAt: new Date(),
      });

      return { success: true, message: 'Notification sent via WebSocket' };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string) {
    console.log('Notification service disabled - would mark as read:', notificationId);
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    console.log('Notification service disabled - would mark all as read for user:', userId);
    return { success: true };
  }

  async getUserNotifications(userId: string, limit: number = 10, offset: number = 0) {
    console.log('Notification service disabled - would fetch notifications for user:', userId);
    return {
      notifications: [],
      total: 0,
      unread: 0,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    console.log('Notification service disabled - would get unread count for user:', userId);
    return 0;
  }
}
