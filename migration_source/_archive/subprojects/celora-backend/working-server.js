// Working minimal server v2
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Basic security
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Health check route
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1 as test`;
        
        res.json({
            status: 'OK',
            service: 'Celora Backend API',
            version: '4.0',
            timestamp: new Date().toISOString(),
            database: 'Connected',
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            service: 'Celora Backend API',
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Basic API info
app.get('/api', (req, res) => {
    res.json({
        name: 'Celora Backend API',
        version: '4.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        endpoints: [
            'GET /api/health - Health check',
            'GET /api - API information'
        ]
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Celora Backend API v4.0',
        status: 'operational',
        documentation: '/api'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Celora Backend API running on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📄 API info: http://localhost:${PORT}/api`);
    console.log(`⚡ Server ready and accepting connections!`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;
