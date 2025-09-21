"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const compression_1 = __importDefault(require("compression"));
const client_1 = require("@prisma/client");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const simple_auth_1 = __importDefault(require("./routes/simple-auth"));
const transaction_1 = __importDefault(require("./routes/transaction"));
const trade_1 = __importDefault(require("./routes/trade"));
const market_1 = __importDefault(require("./routes/market"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const auth_1 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./middleware/logger");
const marketData_1 = require("./services/marketData");
const notification_1 = require("./services/notification");
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
exports.io = io;
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});
const marketDataService = new marketData_1.MarketDataService();
const notificationService = new notification_1.NotificationService(io);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https:"],
        },
    },
}));
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Too many authentication attempts, please try again later.',
    },
});
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'https://celora-platform.netlify.app',
            'https://www.celora.io'
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, compression_1.default)());
app.use(logger_1.requestLogger);
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});
app.get('/api', (req, res) => {
    res.json({
        name: 'Celora API',
        version: '1.0.0',
        description: 'Cryptocurrency portfolio and trading platform API',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            portfolios: '/api/portfolios',
            transactions: '/api/transactions',
            trades: '/api/trades',
            market: '/api/market',
            wallet: '/api/wallet'
        },
        documentation: 'https://docs.celora.io',
        status: 'operational'
    });
});
app.use('/api/auth', simple_auth_1.default);
app.use('/api/transactions', auth_1.authenticateToken, transaction_1.default);
app.use('/api/trades', auth_1.authenticateToken, trade_1.default);
app.use('/api/market', market_1.default);
app.use('/api/wallet', auth_1.authenticateToken, wallet_1.default);
app.use('/api/analytics', auth_1.authenticateToken, analytics_1.default);
app.use('/api/alerts', auth_1.authenticateToken, alerts_1.default);
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    next();
});
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('subscribe_portfolio', (portfolioId) => {
        socket.join(`portfolio_${portfolioId}`);
    });
    socket.on('subscribe_market_data', (symbols) => {
        symbols.forEach((symbol) => {
            socket.join(`market_${symbol}`);
        });
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});
app.use(errorHandler_1.errorHandler);
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('HTTP server closed');
    });
    await exports.prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('HTTP server closed');
    });
    await exports.prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Celora API server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📖 API docs: http://localhost:${PORT}/api`);
    marketDataService.start();
    console.log('📈 Market data service started');
});
//# sourceMappingURL=server.js.map