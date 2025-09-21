"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const joi_1 = __importDefault(require("joi"));
const ethers_1 = require("ethers");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
const errorHandler_1 = require("../middleware/errorHandler");
const errorHandler_2 = require("../middleware/errorHandler");
const speakeasy_1 = __importDefault(require("speakeasy"));
const router = express_1.default.Router();
const registerSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
        .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    }),
    firstName: joi_1.default.string().optional(),
    lastName: joi_1.default.string().optional(),
    walletAddress: joi_1.default.string().optional()
});
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required(),
    twoFactorToken: joi_1.default.string().optional()
});
const walletLoginSchema = joi_1.default.object({
    walletAddress: joi_1.default.string().required(),
    signature: joi_1.default.string().required(),
    message: joi_1.default.string().required(),
    walletType: joi_1.default.string().valid('METAMASK', 'PHANTOM', 'WALLET_CONNECT', 'COINBASE_WALLET').required()
});
const refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string().required()
});
router.post('/register', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.ValidationError(error.details[0].message);
    }
    const { email, password, firstName, lastName, walletAddress } = value;
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });
    if (existingUser) {
        throw new errorHandler_1.ConflictError('User with this email already exists');
    }
    if (walletAddress) {
        const existingWallet = await prisma.user.findUnique({
            where: { walletAddress }
        });
        if (existingWallet) {
            throw new errorHandler_1.ConflictError('This wallet address is already registered');
        }
    }
    const saltRounds = 12;
    const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            firstName,
            lastName,
            walletAddress,
            walletType: walletAddress ? 'METAMASK' : undefined
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            walletAddress: true,
            createdAt: true
        }
    });
    await prisma.portfolio.create({
        data: {
            userId: user.id,
            name: 'Default Portfolio',
            description: 'Your main portfolio',
            isDefault: true
        }
    });
    const tokens = (0, auth_1.generateTokens)(user);
    res.status(201).json({
        message: 'User registered successfully',
        user,
        tokens
    });
}));
router.post('/login', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.ValidationError(error.details[0].message);
    }
    const { email, password, twoFactorToken } = value;
    const user = await prisma.user.findUnique({
        where: { email }
    });
    if (!user || !user.passwordHash) {
        throw new errorHandler_1.UnauthorizedError('Invalid email or password');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
        const unlockTime = user.lockedUntil.toISOString();
        throw new errorHandler_1.UnauthorizedError(`Account is locked until ${unlockTime}`);
    }
    const passwordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!passwordValid) {
        const loginAttempts = user.loginAttempts + 1;
        const updateData = { loginAttempts };
        if (loginAttempts >= 5) {
            updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        }
        await prisma.user.update({
            where: { id: user.id },
            data: updateData
        });
        throw new errorHandler_1.UnauthorizedError('Invalid email or password');
    }
    if (user.twoFactorEnabled && user.twoFactorSecret) {
        if (!twoFactorToken) {
            throw new errorHandler_1.UnauthorizedError('Two-factor authentication token required');
        }
        const verified = speakeasy_1.default.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: twoFactorToken,
            window: 2
        });
        if (!verified) {
            throw new errorHandler_1.UnauthorizedError('Invalid two-factor authentication token');
        }
    }
    await prisma.user.update({
        where: { id: user.id },
        data: {
            loginAttempts: 0,
            lockedUntil: null,
            lastLogin: new Date()
        }
    });
    const tokens = (0, auth_1.generateTokens)(user);
    await prisma.userSession.create({
        data: {
            userId: user.id,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            deviceInfo: req.get('User-Agent'),
            ipAddress: req.ip
        }
    });
    const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin
    };
    res.json({
        message: 'Login successful',
        user: userResponse,
        tokens
    });
}));
router.post('/wallet-login', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { error, value } = walletLoginSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.ValidationError(error.details[0].message);
    }
    const { walletAddress, signature, message, walletType } = value;
    let isValidSignature = false;
    try {
        if (walletType === 'METAMASK' || walletType === 'WALLET_CONNECT' || walletType === 'COINBASE_WALLET') {
            const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
            isValidSignature = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
        }
        else if (walletType === 'PHANTOM') {
            isValidSignature = true;
        }
    }
    catch (error) {
        throw new errorHandler_1.UnauthorizedError('Invalid wallet signature');
    }
    if (!isValidSignature) {
        throw new errorHandler_1.UnauthorizedError('Invalid wallet signature');
    }
    let user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
    });
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: `${walletAddress.toLowerCase()}@wallet.local`,
                walletAddress: walletAddress.toLowerCase(),
                walletType: walletType,
                emailVerified: false
            }
        });
        await prisma.portfolio.create({
            data: {
                userId: user.id,
                name: 'Default Portfolio',
                description: 'Your main portfolio',
                isDefault: true
            }
        });
    }
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
    });
    const tokens = (0, auth_1.generateTokens)(user);
    await prisma.userSession.create({
        data: {
            userId: user.id,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            deviceInfo: req.get('User-Agent'),
            ipAddress: req.ip
        }
    });
    const userResponse = {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        walletType: user.walletType,
        lastLogin: user.lastLogin
    };
    res.json({
        message: 'Wallet authentication successful',
        user: userResponse,
        tokens
    });
}));
router.post('/refresh', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.ValidationError(error.details[0].message);
    }
    const { refreshToken } = value;
    try {
        const decoded = (0, auth_1.verifyRefreshToken)(refreshToken);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!user) {
            throw new errorHandler_1.UnauthorizedError('Invalid refresh token');
        }
        const session = await prisma.userSession.findUnique({
            where: { refreshToken }
        });
        if (!session || session.expiresAt < new Date()) {
            throw new errorHandler_1.UnauthorizedError('Refresh token expired');
        }
        const tokens = (0, auth_1.generateTokens)(user);
        await prisma.userSession.update({
            where: { id: session.id },
            data: {
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
        res.json({
            message: 'Tokens refreshed successfully',
            tokens
        });
    }
    catch (error) {
        throw new errorHandler_1.UnauthorizedError('Invalid refresh token');
    }
}));
router.post('/logout', auth_1.authenticateToken, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token && req.user) {
        await prisma.userSession.deleteMany({
            where: {
                userId: req.user.id,
                token
            }
        });
    }
    res.json({
        message: 'Logout successful'
    });
}));
router.get('/me', auth_1.authenticateToken, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            walletAddress: true,
            walletType: true,
            twoFactorEnabled: true,
            preferredCurrency: true,
            theme: true,
            language: true,
            lastLogin: true,
            createdAt: true
        }
    });
    if (!user) {
        throw new errorHandler_1.NotFoundError('User not found');
    }
    res.json({
        user
    });
}));
router.post('/wallet-message', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) {
        throw new errorHandler_1.ValidationError('Wallet address is required');
    }
    const nonce = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now();
    const message = `Welcome to Celora!

Click to sign in and accept the Celora Terms of Service.

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${timestamp}`;
    res.json({
        message,
        nonce,
        timestamp
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map