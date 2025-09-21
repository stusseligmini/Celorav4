declare const router: import("express-serve-static-core").Router;
interface Alert {
    id: string;
    userId: string;
    type: 'PRICE' | 'BALANCE' | 'TRANSACTION' | 'SYSTEM';
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    createdAt: Date;
}
export declare const createSystemAlert: (userId: string, title: string, message: string, data?: any) => Alert;
export default router;
//# sourceMappingURL=alerts.d.ts.map