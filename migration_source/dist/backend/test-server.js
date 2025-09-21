require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Celora Test Server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('combined'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Celora Test API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    message: '🚀 Celora is LIVE and working!'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    message: 'Celora Test API v1.0',
    endpoints: {
      root: '/',
      health: '/health',
      api: '/api'
    },
    features: [
      'Express Server',
      'CORS Enabled',
      'Security Headers',
      'Request Compression',
      'Request Logging'
    ]
  });
});

// Test wallet endpoint (no database)
app.get('/api/wallets', (req, res) => {
  res.json({
    message: 'Wallet endpoint working',
    wallets: [
      {
        id: '1',
        name: 'Test Wallet',
        address: 'test123...abc',
        balance: 0,
        currency: 'SOL'
      }
    ]
  });
});

// Test auth endpoint (no database)
app.post('/api/auth/login', (req, res) => {
  res.json({
    message: 'Login endpoint working',
    token: 'test-jwt-token',
    user: {
      id: '1',
      email: 'test@celora.net',
      name: 'Test User'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Celora Test API running on port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('🔧 Test endpoints:');
  console.log('   - GET  /');
  console.log('   - GET  /health');
  console.log('   - GET  /api');
  console.log('   - GET  /api/wallets');
  console.log('   - POST /api/auth/login');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
