import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handler() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Optionally run migrations programmatically here
    // For now, we'll just test the connection
    
    await prisma.$disconnect();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Database connection successful'
      })
    };
  } catch (error) {
    console.error('Database connection failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Database connection failed',
        error: error.message
      })
    };
  }
}
