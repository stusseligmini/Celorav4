const { PrismaClient } = require('@prisma/client');

// Global Prisma client
let prisma;

// Initialize Prisma client with connection pooling
const initPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
};

exports.handler = async (event, context) => {
  // Set context to reuse connection
  context.callbackWaitsForEmptyEventLoop = false;
  
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const path = event.rawPath || event.path || '/';
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    
    // Initialize Prisma
    const db = initPrisma();
    
    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    // Handle OPTIONS requests
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    // Route handling
    if (path === '/prod/' || path === '/') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Celora Backend API v2.0',
          timestamp: new Date().toISOString(),
          status: 'running',
          environment: process.env.NODE_ENV
        })
      };
    }
    
    if (path === '/prod/health' || path === '/health') {
      try {
        await db.$connect();
        const userCount = await db.user.count();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'healthy',
            database: 'connected',
            userCount,
            timestamp: new Date().toISOString()
          })
        };
      } catch (dbError) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'healthy',
            database: 'error',
            databaseError: dbError.message,
            timestamp: new Date().toISOString()
          })
        };
      }
    }
    
    if (path.startsWith('/prod/api/') || path.startsWith('/api/')) {
      const apiPath = path.replace('/prod/api/', '').replace('/api/', '');
      
      // Pre-launch signup
      if (apiPath === 'signup' && method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const { email, name } = body;
        
        if (!email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Email is required' })
          };
        }
        
        try {
          // Check if user already exists
          const existingUser = await db.user.findUnique({
            where: { email }
          });
          
          if (existingUser) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                message: 'Already signed up!',
                status: 'existing'
              })
            };
          }
          
          // Create new user for pre-launch
          const user = await db.user.create({
            data: {
              email,
              passwordHash: 'prelaunch-signup',
              isActive: false // Pre-launch users are inactive
            }
          });
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: 'Successfully signed up for pre-launch!',
              status: 'success',
              userId: user.id
            })
          };
          
        } catch (error) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Signup failed',
              message: error.message
            })
          };
        }
      }
      
      // Admin endpoints (for you)
      if (apiPath === 'admin/users' && method === 'GET') {
        try {
          const users = await db.user.findMany({
            select: {
              id: true,
              email: true,
              createdAt: true,
              isActive: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              users,
              total: users.length
            })
          };
        } catch (error) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Failed to fetch users',
              message: error.message
            })
          };
        }
      }
      
      // Admin stats
      if (apiPath === 'admin/stats' && method === 'GET') {
        try {
          const totalUsers = await db.user.count();
          const activeUsers = await db.user.count({
            where: { isActive: true }
          });
          const prelaunchSignups = await db.user.count({
            where: { isActive: false }
          });
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              totalUsers,
              activeUsers,
              prelaunchSignups,
              timestamp: new Date().toISOString()
            })
          };
        } catch (error) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Failed to fetch stats',
              message: error.message
            })
          };
        }
      }
    }
    
    // Default 404
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Route not found',
        path,
        method
      })
    };
    
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  } finally {
    // Don't disconnect in serverless environment
    // await prisma?.$disconnect();
  }
};
