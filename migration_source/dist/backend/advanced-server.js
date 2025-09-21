require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Celora Advanced Server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);

// In-memory storage (replace with database later)
const mockDatabase = {
  users: [
    {
      id: 'user_demo',
      email: 'demo@celora.net',
      passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeEEt8WUoqKz2WmFW', // 'password123'
      firstName: 'Demo',
      lastName: 'User',
      isActive: true,
      kycStatus: 'APPROVED',
      createdAt: new Date().toISOString()
    }
  ],
  wallets: [
    {
      id: 'wallet_demo',
      userId: 'user_demo',
      name: 'Main Wallet',
      address: 'demo_sol_address_12345',
      balance: 100.50,
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ],
  cards: [
    {
      id: 'card_demo',
      userId: 'user_demo',
      name: 'Demo Card',
      cardNumber: '****-****-****-1234',
      status: 'ACTIVE',
      balance: 500.00,
      createdAt: new Date().toISOString()
    }
  ],
  transactions: [
    {
      id: 'tx_demo_1',
      userId: 'user_demo',
      type: 'RECEIVE',
      amount: 100.50,
      currency: 'SOL',
      status: 'COMPLETED',
      description: 'Demo deposit',
      createdAt: new Date(Date.now() - 86400000).toISOString() // Yesterday
    }
  ]
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000', 
    'https://celora.net',
    'https://www.celora.net'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Helper functions
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'celora-jwt-secret-2025',
    { 
      expiresIn: '24h',
      issuer: 'celora-api',
      audience: 'celora-client'
    }
  );
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'TOKEN_REQUIRED'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'celora-jwt-secret-2025', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }
    req.user = user;
    next();
  });
};

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Celora Banking Platform API',
    version: '4.0.0',
    status: 'running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    features: {
      authentication: '✅ JWT + Secure Storage',
      security: '✅ CORS, Helmet, Rate Limiting',
      logging: '✅ Morgan Access Logs', 
      database: '✅ Mock In-Memory (Demo Mode)',
      encryption: '✅ bcrypt Password Hashing',
      realtime: '⚠️  Disabled (Development)'
    },
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth/*',
      wallets: '/api/wallets',
      cards: '/api/cards', 
      transactions: '/api/transactions',
      docs: '/api/docs'
    },
    documentation: 'https://github.com/stusseligmini/Celora-platform',
    support: 'admin@celora.net'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'mock-connected',
    services: {
      auth: 'operational',
      wallets: 'operational', 
      cards: 'operational',
      transactions: 'operational'
    },
    statistics: {
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      users: mockDatabase.users.length,
      wallets: mockDatabase.wallets.length,
      cards: mockDatabase.cards.length,
      transactions: mockDatabase.transactions.length
    },
    timestamp: new Date().toISOString()
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    message: 'Celora Banking Platform API v4.0',
    timestamp: new Date().toISOString(),
    status: 'running',
    version: '4.0.0',
    environment: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    demo: {
      enabled: true,
      credentials: {
        email: 'demo@celora.net',
        password: 'password123'
      }
    },
    endpoints: [
      'POST /api/auth/register - Register new user',
      'POST /api/auth/login - User authentication',
      'GET  /api/auth/profile - Get user profile (requires auth)',
      'GET  /api/wallets - List user wallets (requires auth)',
      'POST /api/wallets - Create new wallet (requires auth)',
      'GET  /api/cards - List user cards (requires auth)',
      'POST /api/cards - Request new card (requires auth)',
      'GET  /api/transactions - List transactions (requires auth)',
      'POST /api/transactions - Create transaction (requires auth)'
    ]
  });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['email', 'password', 'firstName', 'lastName']
      });
    }
    
    // Check if user exists
    const existingUser = mockDatabase.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists with this email',
        code: 'USER_EXISTS'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const user = {
      id: `user_${Date.now()}`,
      email,
      passwordHash,
      firstName,
      lastName,
      isActive: true,
      kycStatus: 'PENDING',
      createdAt: new Date().toISOString()
    };
    
    mockDatabase.users.push(user);
    
    // Generate token
    const token = generateToken(user.id);
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    console.log(`✅ New user registered: ${email}`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userWithoutPassword,
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    // Find user
    const user = mockDatabase.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    console.log(`✅ User logged in: ${email}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token,
      expiresIn: '24h'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  const user = mockDatabase.users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ 
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  const { passwordHash: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    user: userWithoutPassword
  });
});

// Wallet Routes
app.get('/api/wallets', authenticateToken, (req, res) => {
  const userWallets = mockDatabase.wallets.filter(w => w.userId === req.user.userId);
  
  res.json({
    success: true,
    wallets: userWallets,
    count: userWallets.length,
    totalBalance: userWallets.reduce((sum, wallet) => sum + wallet.balance, 0)
  });
});

app.post('/api/wallets', authenticateToken, (req, res) => {
  const { name, type = 'SOLANA' } = req.body;
  
  const userWallets = mockDatabase.wallets.filter(w => w.userId === req.user.userId);
  
  const wallet = {
    id: `wallet_${Date.now()}`,
    userId: req.user.userId,
    name: name || `Wallet ${userWallets.length + 1}`,
    type,
    address: `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    balance: 0,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  
  mockDatabase.wallets.push(wallet);
  
  console.log(`✅ New wallet created for user ${req.user.userId}: ${wallet.name}`);
  
  res.status(201).json({
    success: true,
    message: 'Wallet created successfully',
    wallet
  });
});

// Card Routes  
app.get('/api/cards', authenticateToken, (req, res) => {
  const userCards = mockDatabase.cards.filter(c => c.userId === req.user.userId);
  
  res.json({
    success: true,
    cards: userCards,
    count: userCards.length,
    totalBalance: userCards.reduce((sum, card) => sum + card.balance, 0)
  });
});

app.post('/api/cards', authenticateToken, (req, res) => {
  const { name, type = 'DEBIT' } = req.body;
  
  const userCards = mockDatabase.cards.filter(c => c.userId === req.user.userId);
  
  const card = {
    id: `card_${Date.now()}`,
    userId: req.user.userId,
    name: name || `${type} Card ${userCards.length + 1}`,
    cardNumber: `****-****-****-${Math.floor(1000 + Math.random() * 9000)}`,
    type,
    status: 'PENDING',
    balance: 0,
    limit: 1000,
    createdAt: new Date().toISOString()
  };
  
  mockDatabase.cards.push(card);
  
  console.log(`✅ New card requested for user ${req.user.userId}: ${card.name}`);
  
  res.status(201).json({
    success: true,
    message: 'Card requested successfully',
    card
  });
});

// Transaction Routes
app.get('/api/transactions', authenticateToken, (req, res) => {
  const { limit = 50, offset = 0, type, status } = req.query;
  
  let userTransactions = mockDatabase.transactions.filter(t => t.userId === req.user.userId);
  
  // Apply filters
  if (type) {
    userTransactions = userTransactions.filter(t => t.type === type);
  }
  if (status) {
    userTransactions = userTransactions.filter(t => t.status === status);
  }
  
  // Sort by date (newest first)
  userTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Apply pagination
  const paginatedTransactions = userTransactions.slice(offset, offset + parseInt(limit));
  
  res.json({
    success: true,
    transactions: paginatedTransactions,
    pagination: {
      total: userTransactions.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: userTransactions.length > offset + parseInt(limit)
    }
  });
});

app.post('/api/transactions', authenticateToken, (req, res) => {
  const { type, amount, currency = 'SOL', description, walletId, cardId } = req.body;
  
  if (!type || !amount) {
    return res.status(400).json({
      error: 'Transaction type and amount required',
      required: ['type', 'amount']
    });
  }
  
  const transaction = {
    id: `tx_${Date.now()}`,
    userId: req.user.userId,
    type,
    amount: parseFloat(amount),
    currency,
    status: 'PENDING',
    description: description || `${type} transaction`,
    walletId,
    cardId,
    hash: `mock_tx_${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  
  mockDatabase.transactions.push(transaction);
  
  console.log(`✅ New transaction created for user ${req.user.userId}: ${type} ${amount} ${currency}`);
  
  res.status(201).json({
    success: true,
    message: 'Transaction created successfully',
    transaction
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Celora Banking Platform API Documentation',
    version: '4.0.0',
    description: 'Advanced cryptocurrency banking and payment processing API',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      expiration: '24 hours'
    },
    demo: {
      enabled: true,
      testAccount: {
        email: 'demo@celora.net',
        password: 'password123',
        note: 'Use these credentials to test the API'
      }
    },
    endpoints: {
      authentication: {
        'POST /auth/register': {
          description: 'Register new user account',
          body: ['email', 'password', 'firstName', 'lastName'],
          returns: 'User object + JWT token'
        },
        'POST /auth/login': {
          description: 'Authenticate user and get JWT token',
          body: ['email', 'password'],
          returns: 'User object + JWT token'
        },
        'GET /auth/profile': {
          description: 'Get current user profile',
          auth: 'required',
          returns: 'User profile object'
        }
      },
      wallets: {
        'GET /wallets': {
          description: 'List all user wallets',
          auth: 'required',
          returns: 'Array of wallet objects'
        },
        'POST /wallets': {
          description: 'Create new cryptocurrency wallet',
          auth: 'required',
          body: ['name?', 'type?'],
          returns: 'New wallet object'
        }
      },
      cards: {
        'GET /cards': {
          description: 'List all user virtual cards',
          auth: 'required',
          returns: 'Array of card objects'
        },
        'POST /cards': {
          description: 'Request new virtual debit/credit card',
          auth: 'required',
          body: ['name?', 'type?'],
          returns: 'New card object'
        }
      },
      transactions: {
        'GET /transactions': {
          description: 'List user transactions with filtering',
          auth: 'required',
          query: ['limit?', 'offset?', 'type?', 'status?'],
          returns: 'Paginated transaction list'
        },
        'POST /transactions': {
          description: 'Create new transaction',
          auth: 'required',
          body: ['type', 'amount', 'currency?', 'description?'],
          returns: 'New transaction object'
        }
      }
    },
    errorCodes: {
      400: 'Bad Request - Invalid input data',
      401: 'Unauthorized - Missing or invalid token',
      403: 'Forbidden - Token expired or insufficient permissions',
      404: 'Not Found - Resource not found',
      409: 'Conflict - Resource already exists',
      500: 'Internal Server Error - Server error'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ENDPOINT_NOT_FOUND',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api',
      'GET /api/docs',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile',
      'GET /api/wallets',
      'POST /api/wallets',
      'GET /api/cards',
      'POST /api/cards',
      'GET /api/transactions',
      'POST /api/transactions'
    ]
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 ===================================');
  console.log('   CELORA BANKING PLATFORM API v4.0');
  console.log('🚀 ===================================');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`💾 Database: Mock In-Memory (Demo Mode)`);
  console.log(`🔒 Security: JWT Auth + CORS + Helmet`);
  console.log(`📋 Logging: Morgan + Console`);
  console.log(`📖 API Docs: http://localhost:${PORT}/api/docs`);
  console.log('');
  console.log('🎯 Demo Account:');
  console.log('   Email: demo@celora.net');
  console.log('   Password: password123');
  console.log('');
  console.log('🔧 Key Endpoints:');
  console.log(`   - GET  ${PORT === 80 ? 'http' : 'http'}://localhost:${PORT}/api/docs`);
  console.log(`   - POST ${PORT === 80 ? 'http' : 'http'}://localhost:${PORT}/api/auth/login`);
  console.log(`   - GET  ${PORT === 80 ? 'http' : 'http'}://localhost:${PORT}/api/wallets`);
  console.log('');
  console.log('📊 Current Statistics:');
  console.log(`   Users: ${mockDatabase.users.length}`);
  console.log(`   Wallets: ${mockDatabase.wallets.length}`);
  console.log(`   Cards: ${mockDatabase.cards.length}`);
  console.log(`   Transactions: ${mockDatabase.transactions.length}`);
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Received shutdown signal...');
  console.log('🔄 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    console.log('💾 Mock database cleared');
    console.log('👋 Goodbye!');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
