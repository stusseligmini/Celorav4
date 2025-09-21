// Minimal server test
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Test database connection
async function testDB() {
    try {
        await prisma.$connect();
        console.log('Database connected successfully');
        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return false;
    }
}

const server = app.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}`);
    
    const dbConnected = await testDB();
    console.log(`Database status: ${dbConnected ? 'Connected' : 'Failed'}`);
    
    console.log('Server startup complete!');
    
    // Auto-shutdown after 5 seconds for testing
    setTimeout(() => {
        console.log('Shutting down test server...');
        server.close();
        prisma.$disconnect();
    }, 5000);
});
