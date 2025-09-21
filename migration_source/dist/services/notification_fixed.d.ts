import { Server as SocketIOServer } from 'socket.io';
export declare class NotificationService {
    private io;
    constructor(io: SocketIOServer);
    createNotification(userId: string, title: string, message: string, type?: string, data?: any): Promise<{
        success: boolean;
        message: string;
    }>;
    markAsRead(notificationId: string): Promise<{
        success: boolean;
    }>;
    markAllAsRead(userId: string): Promise<{
        success: boolean;
    }>;
    getUserNotifications(userId: string, limit?: number, offset?: number): Promise<{
        notifications: never[];
        total: number;
        unread: number;
    }>;
    getUnreadCount(userId: string): Promise<number>;
}
//# sourceMappingURL=notification_fixed.d.ts.map