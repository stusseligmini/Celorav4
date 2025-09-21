console.log('Starting Celora API...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);
console.log('Database:', process.env.DATABASE_URL ? 'Configured' : 'Not configured');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log(`Setting up server on port ${PORT}...`);

app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.json({ 
    message: '🚀 Celora is LIVE!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('Health endpoint hit');
  res.json({ 
    status: 'healthy',
    uptime: process.uptime()
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Celora API successfully running on port ${PORT}`);
  console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

process.on('SIGINT', () => {
  console.log('👋 Shutting down gracefully');
  server.close(() => {
    console.log('🛑 Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
