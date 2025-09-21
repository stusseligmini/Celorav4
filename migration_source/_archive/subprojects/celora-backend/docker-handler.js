const awsLambdaFastify = require('@fastify/aws-lambda');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

// Simple Fastify app for Lambda
const fastify = require('fastify')({ logger: true });

// Health check
fastify.get('/', async (request, reply) => {
  return {
    message: 'Celora Backend API is running with Docker!',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  };
});

fastify.get('/health', async (request, reply) => {
  try {
    // Database connection health check
    await prisma.$connect();
    return {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    reply.code(500);
    return {
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

// API routes
fastify.get('/api/users', async (request, reply) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        isActive: true
      }
    });
    return users;
  } catch (error) {
    reply.code(500);
    return { error: error.message };
  }
});

// Graceful shutdown
fastify.addHook('onClose', async () => {
  await prisma.$disconnect();
});

// Export Lambda handler
exports.handler = awsLambdaFastify(fastify, { binaryMimeTypes: ['*/*'] });
