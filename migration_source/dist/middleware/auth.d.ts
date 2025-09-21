import { Request, Response, NextFunction } from 'express';
interface JwtPayload {
    userId: string;
    email: string;
    walletAddress?: string;
    iat: number;
    exp: number;
}
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        walletAddress?: string;
    };
}
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const generateTokens: (user: {
    id: string;
    email: string;
    walletAddress?: string | null;
}) => {
    accessToken: string;
    refreshToken: string;
};
export declare const verifyRefreshToken: (refreshToken: string) => JwtPayload;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateApiKey: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=auth.d.ts.map