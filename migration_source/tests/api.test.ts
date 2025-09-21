import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/server';

// Test database setup
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up test data
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Authentication Endpoints', () => {
  let authToken: string;
  let refreshToken: string;
  const testUser = {
    email: 'test@celora.io',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      authToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });

    it('should not register user with existing email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should not register user with invalid email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email'
        })
        .expect(400);
    });

    it('should not register user with weak password', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@celora.io',
          password: '123'
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.tokens).toHaveProperty('accessToken');
    });

    it('should not login with invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should not login with non-existent email', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@celora.io',
          password: testUser.password
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Tokens refreshed successfully');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should not refresh with invalid token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).toHaveProperty('id');
    });

    it('should not get user without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should not get user with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });
  });
});

describe('Market Data Endpoints', () => {
  describe('GET /api/market', () => {
    it('should get market data', async () => {
      const response = await request(app)
        .get('/api/market')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/market?limit=5')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should filter by symbols', async () => {
      const response = await request(app)
        .get('/api/market?symbols=BTC,ETH')
        .expect(200);

      response.body.data.forEach((item: any) => {
        expect(['BTC', 'ETH']).toContain(item.symbol);
      });
    });
  });

  describe('GET /api/market/:symbol', () => {
    it('should get specific symbol data', async () => {
      const response = await request(app)
        .get('/api/market/BTC')
        .expect(200);

      expect(response.body.data.symbol).toBe('BTC');
      expect(response.body.data).toHaveProperty('price');
      expect(response.body.data).toHaveProperty('change24h');
    });

    it('should return 404 for non-existent symbol', async () => {
      await request(app)
        .get('/api/market/INVALID')
        .expect(404);
    });
  });

  describe('GET /api/market/summary/overview', () => {
    it('should get market summary', async () => {
      const response = await request(app)
        .get('/api/market/summary/overview')
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('topPerformers');
      expect(response.body).toHaveProperty('topByMarketCap');
    });
  });
});

describe('User Endpoints', () => {
  let userToken: string;
  const userData = {
    email: 'usertest@celora.io',
    password: 'UserPassword123!',
    firstName: 'User',
    lastName: 'Test'
  };

  beforeAll(async () => {
    // Create test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    userToken = registerResponse.body.tokens.accessToken;
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).toHaveProperty('id');
    });

    it('should not get profile without authentication', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        preferredCurrency: 'EUR'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.firstName).toBe(updateData.firstName);
      expect(response.body.user.preferredCurrency).toBe(updateData.preferredCurrency);
    });
  });

  describe('PUT /api/users/password', () => {
    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: userData.password,
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should not change password with invalid current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewPassword123!'
      };

      await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(400);
    });
  });
});

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
  });
});

describe('API Documentation', () => {
  it('should return API documentation', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);

    expect(response.body.name).toBe('Celora API');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body.status).toBe('operational');
  });
});

describe('Error Handling', () => {
  it('should return 404 for non-existent endpoints', async () => {
    const response = await request(app)
      .get('/non-existent-endpoint')
      .expect(404);

    expect(response.body.error).toBe('Endpoint not found');
  });

  it('should handle validation errors', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: '123'
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('Rate Limiting', () => {
  it('should apply rate limiting to auth endpoints', async () => {
    // Make multiple requests to exceed rate limit
    const requests = Array(10).fill(null).map(() => 
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        })
    );

    const responses = await Promise.all(requests);
    
    // Some requests should be rate limited
    const rateLimitedResponses = responses.filter(res => res.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  }, 10000);
});
