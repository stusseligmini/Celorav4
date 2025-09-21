// Minimal backend server without heavy logging
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Celora Backend',
        version: '4.0',
        timestamp: new Date().toISOString()
    });
});

// Basic routes
app.get('/', (req, res) => {
    res.json({
        message: 'Celora Backend API v4.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Celora Backend running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`API Root: http://localhost:${PORT}/`);
    console.log('Server ready!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server closed');
    });
});

module.exports = app;
