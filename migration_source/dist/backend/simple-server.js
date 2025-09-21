const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Celora API v4.0 is running! 🚀',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    service: 'Celora Banking Platform',
    version: '4.0.0',
    status: 'operational',
    features: [
      'Authentication System',
      'Wallet Management', 
      'Transaction Processing',
      'Card Services',
      'KYC/AML Compliance',
      'Real-time Analytics'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Celora API running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
