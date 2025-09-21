"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
const users = [];
users.push({
    id: 'demo-user',
    email: 'demo@celora.io',
    password: bcryptjs_1.default.hashSync('Demo123!', 10),
    firstName: 'Demo',
    lastName: 'User',
    createdAt: new Date()
});
router.post('/register', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        res.status(400).json({
            success: false,
            message: 'User already exists with this email'
        });
        return;
    }
    if (!password || password.length < 8) {
        res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long'
        });
        return;
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const newUser = {
        id: `user-${Date.now()}`,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        createdAt: new Date()
    };
    users.push(newUser);
    const token = jsonwebtoken_1.default.sign({
        userId: newUser.id,
        email: newUser.email
    }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    res.json({
        success: true,
        message: 'Registration successful',
        data: {
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            },
            token
        }
    });
}));
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
        return;
    }
    const user = users.find(u => u.email === email);
    if (!user) {
        res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
        return;
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
        return;
    }
    const token = jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email
    }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            },
            token
        }
    });
}));
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Access token is required'
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'dev-secret');
        const user = users.find(u => u.id === decoded.userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    createdAt: user.createdAt
                }
            }
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
        return;
    }
}));
exports.default = router;
//# sourceMappingURL=simple-auth.js.map