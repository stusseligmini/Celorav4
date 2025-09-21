"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class NotificationService {
    constructor(io) {
        this.io = io;
    }
    async createNotification(userId, title, message, type = 'INFO', data) {
        try {
            console.log('Notification service disabled - Notification model not in schema');
            console.log('Would create notification:', { userId, title, message, type, data });
            this.io.to(userId).emit('notification', {
                title,
                message,
                type,
                data,
                createdAt: new Date(),
            });
            return { success: true, message: 'Notification sent via WebSocket' };
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
    async markAsRead(notificationId) {
        console.log('Notification service disabled - would mark as read:', notificationId);
        return { success: true };
    }
    async markAllAsRead(userId) {
        console.log('Notification service disabled - would mark all as read for user:', userId);
        return { success: true };
    }
    async getUserNotifications(userId, limit = 10, offset = 0) {
        console.log('Notification service disabled - would fetch notifications for user:', userId);
        return {
            notifications: [],
            total: 0,
            unread: 0,
        };
    }
    async getUnreadCount(userId) {
        console.log('Notification service disabled - would get unread count for user:', userId);
        return 0;
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.js.map