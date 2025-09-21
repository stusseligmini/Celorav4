"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateApiKey = exports.optionalAuth = exports.verifyRefreshToken = exports.generateTokens = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                error: 'Access token required',
                message: 'Please provide a valid access token'
            });
            return;
        }
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            res.status(500).json({
                error: 'Server configuration error',
                message: 'Authentication service unavailable'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                walletAddress: true,
                isActive: true,
            }
        });
        if (!user) {
            res.status(401).json({
                error: 'Invalid token',
                message: 'User not found'
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                error: 'Account deactivated',
                message: 'Your account has been deactivated'
            });
            return;
        }
        req.user = {
            id: user.id,
            email: user.email,
            walletAddress: user.walletAddress || undefined
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                error: 'Token expired',
                message: 'Your session has expired. Please log in again.'
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                error: 'Invalid token',
                message: 'Please provide a valid access token'
            });
            return;
        }
        console.error('Authentication error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            message: 'Unable to authenticate request'
        });
    }
};
exports.authenticateToken = authenticateToken;
const generateTokens = (user) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
        throw new Error('JWT secrets not configured');
    }
    const payload = {
        userId: user.id,
        email: user.email,
        walletAddress: user.walletAddress
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });
    const refreshToken = jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
const verifyRefreshToken = (refreshToken) => {
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    if (!JWT_REFRESH_SECRET) {
        throw new Error('JWT refresh secret not configured');
    }
    return jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            await (0, exports.authenticateToken)(req, res, next);
            return;
        }
        catch (error) {
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
const authenticateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            res.status(401).json({
                error: 'API key required',
                message: 'Please provide a valid API key'
            });
            return;
        }
        res.status(501).json({
            error: 'API key authentication not implemented',
            message: 'API key authentication requires ApiKey model in database schema'
        });
        return;
    }
    catch (error) {
        console.error('API key authentication error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            message: 'Unable to authenticate API key'
        });
    }
};
exports.authenticateApiKey = authenticateApiKey;
//# sourceMappingURL=auth.js.map