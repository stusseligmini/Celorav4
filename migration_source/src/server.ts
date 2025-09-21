import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import routes
import simpleAuthRoutes from './routes/simple-auth';
// import authRoutes from './routes/auth'; // Temporarily disabled - needs schema fixes
// import userRoutes from './routes/user'; // Temporarily disabled - needs schema fixes
// import portfolioRoutes from './routes/portfolio'; // Temporarily disabled for deployment
import transactionRoutes from './routes/transaction';
import tradeRoutes from './routes/trade';
import marketRoutes from './routes/market';
import walletRoutes from './routes/wallet';
import analyticsRoutes from './routes/analytics';
import alertsRoutes from './routes/alerts';

// Import middleware
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';

// Import services
import { MarketDataService } from './services/marketData';
import { NotificationService } from './services/notification';

const app: Application = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize Prisma
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

// Initialize services
const marketDataService = new MarketDataService();
const notificationService = new NotificationService(io);

// Security middleware
app.use(helmet({
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

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://celora-platform.netlify.app',
      'https://www.celora.io'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Custom middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api', (req: Request, res: Response) => {
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

// API routes
app.use('/api/auth', simpleAuthRoutes); // Simple auth without complex schema dependencies
// app.use('/api/auth', authRoutes); // Temporarily disabled - needs schema fixes
// app.use('/api/users', authenticateToken, userRoutes); // Temporarily disabled - needs schema fixes
// app.use('/api/portfolios', authenticateToken, portfolioRoutes); // Temporarily disabled for deployment
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/trades', authenticateToken, tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/wallet', authenticateToken, walletRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/alerts', authenticateToken, alertsRoutes);

// WebSocket connection handling
io.use((socket, next) => {
  // Authenticate WebSocket connections
  const token = socket.handshake.auth.token;
  // TODO: Implement WebSocket authentication
  next();
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe_portfolio', (portfolioId) => {
    socket.join(`portfolio_${portfolioId}`);
  });
  
  socket.on('subscribe_market_data', (symbols) => {
    symbols.forEach((symbol: string) => {
      socket.join(`market_${symbol}`);
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 404 handler - catch all routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  await prisma.$disconnect();
  console.log('Database connection closed');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  await prisma.$disconnect();
  console.log('Database connection closed');
  
  process.exit(0);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Celora API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/api`);
  
  // Start market data service
  marketDataService.start();
  console.log('📈 Market data service started');
});

export { app, io };
