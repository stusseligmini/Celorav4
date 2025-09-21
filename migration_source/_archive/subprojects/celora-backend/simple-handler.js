// Simple Express handler without VPC dependencies
const express = require('express');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Celora Backend API is running!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    api: 'online',
    database: 'pending-connection',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Database health check endpoint
app.get('/api/db-health', (req, res) => {
  res.json({
    message: 'Database health check',
    database_url_configured: !!process.env.DATABASE_URL,
    jwt_secret_configured: !!process.env.JWT_SECRET,
    environment_variables: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]',
      JWT_SECRET: process.env.JWT_SECRET ? '[CONFIGURED]' : '[NOT SET]'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

exports.handler = serverless(app);
