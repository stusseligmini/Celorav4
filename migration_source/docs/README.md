# 📚 Celora Platform Documentation

## Table of Contents
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Deployment Guide](#deployment-guide)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)

## Getting Started

### Live Demo
Visit [celora.net](https://celora.net) to try the platform immediately.

### Quick Registration Test
1. Go to [celora.net](https://celora.net)
2. Click "Sign up"
3. Fill the registration form
4. Get automatically logged in to dashboard

### Test Credentials
- Email: `test@example.com`
- Password: `TestPassword123`

## API Documentation

### Base URL
```
Production: https://celora-platform.onrender.com
Development: http://localhost:3002
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2025-09-05T19:24:05.528Z",
    "kycStatus": "PENDING"
  },
  "token": "jwt-token"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2025-09-05T19:24:05.528Z",
    "kycStatus": "PENDING"
  },
  "token": "jwt-token"
}
```

### System Endpoints

#### Health Check
```http
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-05T19:23:53.972Z",
  "version": "3.0.0",
  "environment": "production"
}
```

#### Auth System Test
```http
GET /api/auth/test
```

**Response (200):**
```json
{
  "message": "Auth API is working",
  "userCount": 1,
  "timestamp": "2025-09-05T19:24:05.528Z"
}
```

## Deployment Guide

### Frontend (Netlify)

#### Automatic Deployment
The frontend auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Update frontend"
git push origin main
# Netlify automatically deploys to celora.net
```

#### Manual Deployment
```bash
npx netlify deploy --prod --dir . --site ded937ad-5dae-454c-8b24-50ed4255d185
```

### Backend (Render)

#### Automatic Deployment
Backend auto-deploys from GitHub commits to `celora-backend/` directory.

#### Manual Deployment
```bash
# Trigger deployment via API
curl -X POST https://api.render.com/v1/services/srv-d2srsm75r7bs73aqbieg/deploys \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (for backend development)
- Git

### Backend Development
```bash
cd celora-backend
npm install
cp .env.example .env
# Configure DATABASE_URL and JWT_SECRET in .env
npm run dev
```

### Frontend Development
```bash
# Serve with any static server
python -m http.server 3000
# or
npx serve .
# or
npx live-server .
```

### Environment Variables

**Backend (.env):**
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/celora
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
PORT=3002
```

**Frontend (automatic detection):**
The frontend automatically detects the environment:
- `localhost` → `http://localhost:3002/api`
- `celora.net` → `https://celora-platform.onrender.com/api`

## Architecture Overview

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│   (Netlify)     │────│   (Render)       │────│  (PostgreSQL)   │
│   celora.net    │    │  Express/Node.js │    │   (Render)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- HTML5/CSS3 (Vanilla)
- Tailwind CSS
- Chart.js for analytics
- PWA capabilities

**Backend:**
- Node.js/Express
- JWT authentication
- BCrypt password hashing
- CORS enabled
- Error handling middleware

**Database:**
- PostgreSQL
- Prisma ORM (ready for integration)
- Connection pooling

**Deployment:**
- Frontend: Netlify (CDN, SSL, auto-deploy)
- Backend: Render (auto-scaling, SSL, auto-deploy)
- Database: Render PostgreSQL

### Security Features

- **Authentication**: JWT tokens with expiration
- **Password Security**: BCrypt hashing (salt rounds: 10)
- **HTTPS**: End-to-end encryption
- **CORS**: Properly configured for cross-origin requests
- **Input Validation**: Server-side validation
- **Error Handling**: No sensitive data in error messages

### Performance Optimizations

- **Frontend**: Static assets, CDN delivery
- **Backend**: Auto-scaling, efficient routing
- **Database**: Optimized queries, connection pooling
- **Caching**: Browser caching, CDN caching

## Troubleshooting

### Common Issues

#### Frontend Not Loading
1. Check [celora.net](https://celora.net) is accessible
2. Clear browser cache and cookies
3. Check browser console for errors (F12)

#### Registration/Login Not Working
1. Check backend health: [API Health](https://celora-platform.onrender.com/health)
2. Open browser console to see API requests
3. Verify network connectivity

#### Backend API Errors
1. Check [Render Dashboard](https://dashboard.render.com) for service status
2. Review backend logs for error details
3. Verify environment variables are set

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/stusseligmini/Celora-platform/issues)
- **Live Demo**: [celora.net](https://celora.net)
- **API Status**: [Health Check](https://celora-platform.onrender.com/health)

---

**Last Updated**: September 5, 2025  
**Version**: 3.0.0  
**Status**: ✅ Production Ready
