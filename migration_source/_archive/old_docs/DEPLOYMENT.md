# 🚀 Celora Production Deployment Guide

## Overview

This guide covers the complete production deployment process for the Celora Crypto Banking Platform using the following architecture:

- **Frontend**: Netlify (Static hosting with PWA support)
- **Backend**: Render (Node.js API server)
- **Database**: Neon PostgreSQL (Netlify managed)
- **Automation**: GitHub Actions (CI/CD)

## 🏗️ Architecture Summary

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Netlify       │    │     Render      │    │  Neon Database  │
│   (Frontend)    │───▶│   (Backend)     │───▶│  (PostgreSQL)   │
│   - Static Site │    │   - Node.js API │    │   - Managed DB  │
│   - PWA Support │    │   - WebSocket   │    │   - Auto-backup │
│   - CDN         │    │   - Auto-scale  │    │   - SSL         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Pre-Deployment Requirements

### 1. Environment Variables

Create a `.env` file with the following variables:

```env
# Database (from Neon Console)
NETLIFY_DATABASE_URL=${NETLIFY_DATABASE_URL}

# Backend Configuration
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}

# Email Service (SendGrid)
SENDGRID_API_KEY=${SENDGRID_API_KEY}
FROM_EMAIL=noreply@celora.com

# External APIs
COINBASE_API_KEY=${COINBASE_API_KEY}
COINBASE_API_SECRET=${COINBASE_API_SECRET}

# Security & Monitoring
SENTRY_DSN=${SENTRY_DSN}
CORS_ORIGIN=https://celora.netlify.app

# Production Settings
NODE_ENV=production
PORT=10000
```

### 2. Required Accounts

- [x] **Netlify Account**: For frontend hosting
- [x] **Render Account**: For backend deployment
- [x] **Neon Account**: Database is already configured
- [ ] **SendGrid Account**: For email services
- [ ] **Sentry Account** (Optional): For error monitoring

## 🚀 Deployment Process

### Method 1: Automated Deployment Script

```bash
# Run the deployment script
node deploy.js deploy
```

This will:
1. Perform pre-deployment checks
2. Build the project
3. Generate deployment configurations
4. Prepare assets for deployment

### Method 2: Manual Deployment

#### Step 1: Deploy Backend to Render

1. **Create a new Web Service on Render**
   - Connect your GitHub repository
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Set environment: Node

2. **Configure Environment Variables**
   ```
   NETLIFY_DATABASE_URL=<your-database-url>
   JWT_SECRET=<your-jwt-secret>
   ENCRYPTION_KEY=<your-encryption-key>
   SENDGRID_API_KEY=<your-sendgrid-key>
   FROM_EMAIL=noreply@celora.com
   CORS_ORIGIN=https://celora.netlify.app
   NODE_ENV=production
   PORT=10000
   ```

3. **Deploy**
   - Render will automatically deploy from your repository
   - Monitor the deployment logs
   - Note the backend URL (e.g., `https://celora-backend.onrender.com`)

#### Step 2: Deploy Frontend to Netlify

1. **Build the Frontend**
   ```bash
   node deploy.js build
   ```

2. **Create a new Site on Netlify**
   - Drag and drop the `./dist` folder
   - Or connect your GitHub repository

3. **Configure Environment Variables** (if needed)
   ```
   REACT_APP_API_URL=https://celora-backend.onrender.com
   ```

4. **Configure Custom Domain** (Optional)
   - Add your custom domain in site settings
   - Configure SSL certificate
   - Update DNS records

## 🔐 Security Configuration

### Backend Security (Render)

The backend includes comprehensive security measures:

```javascript
// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// Rate Limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

### Frontend Security (Netlify)

Security headers are configured in `_headers` file:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 🗄️ Database Management

### Database Status
- **Provider**: Neon (Netlify managed)
- **Type**: PostgreSQL
- **Status**: Connected ✅
- **Expiration**: September 14, 2025 ⚠️ **REQUIRES CLAIMING**

### Important Database Actions Required

1. **Claim Your Database** (URGENT - 7 days remaining)
   ```bash
   # Log into Neon console and claim your database
   # Visit: https://neon.tech/
   ```

2. **Setup Automated Backups**
   - Enable automatic backups in Neon console
   - Configure backup retention policy
   - Test backup restoration process

3. **Database Monitoring**
   ```javascript
   // Monitor database health
   app.get('/health/database', async (req, res) => {
     try {
       await prisma.$queryRaw`SELECT 1`;
       res.json({ status: 'healthy', timestamp: new Date() });
     } catch (error) {
       res.status(500).json({ status: 'unhealthy', error: error.message });
     }
   });
   ```

## 📧 Email Service Setup

### SendGrid Configuration

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com
   - Verify your domain
   - Generate API key

2. **Configure Email Templates**
   ```javascript
   // Email templates are configured in celora-backend/src/email-setup.js
   const emailTemplates = {
     welcome: { templateId: 'd-xxx' },
     verification: { templateId: 'd-yyy' },
     passwordReset: { templateId: 'd-zzz' }
   };
   ```

3. **Test Email Functionality**
   ```bash
   # Send test email via API
   curl -X POST https://celora-backend.onrender.com/api/test/email \
     -H "Content-Type: application/json" \
     -d '{"to":"test@example.com","type":"welcome"}'
   ```

## 📱 Progressive Web App (PWA)

### PWA Features Included

- **Offline Support**: Service Worker caching
- **Install Prompt**: Native app-like installation
- **Push Notifications**: Real-time updates
- **Background Sync**: Offline transaction handling

### PWA Configuration

```json
// manifest.json
{
  "name": "Celora - Crypto Banking",
  "short_name": "Celora",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#10B981",
  "background_color": "#111827",
  "icons": [...]
}
```

## 🔄 CI/CD with GitHub Actions

### Automatic Deployment Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Celora Platform
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: node deploy.js check
      - run: node deploy.js build
      # Deploy to Netlify and Render
```

## 🔍 Health Checks & Monitoring

### Backend Health Endpoints

- `GET /health` - Overall system health
- `GET /health/database` - Database connectivity
- `GET /health/email` - Email service status
- `GET /api` - API status and documentation

### Frontend Monitoring

```javascript
// Performance monitoring
window.performanceOptimizer.measurePerformance();

// PWA status
console.log('PWA Status:', window.pwaInstaller.getInstallationStatus());
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check environment variables
   echo $NETLIFY_DATABASE_URL
   
   # Test connection
   node -e "require('./celora-backend/src/utils/validateEnvironment').validateEnvironment()"
   ```

2. **CORS Errors**
   ```javascript
   // Update CORS_ORIGIN environment variable
   CORS_ORIGIN=https://your-domain.netlify.app
   ```

3. **Email Service Not Working**
   ```bash
   # Check SendGrid API key
   curl -X GET https://api.sendgrid.com/v3/user/account \
     -H "Authorization: Bearer $SENDGRID_API_KEY"
   ```

4. **PWA Not Installing**
   - Check manifest.json validity
   - Ensure HTTPS is enabled
   - Verify service worker registration

### Debug Commands

```bash
# Check deployment status
node deploy.js check

# View performance metrics
node -e "console.log(JSON.parse(localStorage.getItem('performance_metrics') || '{}'))"

# Test API endpoints
curl -X GET https://celora-backend.onrender.com/health

# Check WebSocket connection
wscat -c wss://celora-backend.onrender.com/api/ws
```

## 📊 Performance Optimization

### Frontend Optimizations

- ✅ Lazy loading for images and components
- ✅ Service Worker caching
- ✅ CSS and JavaScript minification
- ✅ Progressive image loading
- ✅ Critical resource preloading

### Backend Optimizations

- ✅ Rate limiting and security middleware
- ✅ Database connection pooling
- ✅ Response compression
- ✅ Request/response caching
- ✅ WebSocket for real-time updates

## 🔐 Security Best Practices

### Implemented Security Measures

1. **Authentication & Authorization**
   - JWT tokens with refresh mechanism
   - Role-based access control
   - Email verification required

2. **Data Protection**
   - Environment variable encryption
   - HTTPS enforcement
   - SQL injection prevention
   - XSS protection

3. **Rate Limiting**
   - API endpoint rate limits
   - Brute force protection
   - DDoS mitigation

4. **Monitoring**
   - Error tracking with Sentry
   - Audit logging
   - Security event monitoring

## 📚 Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Render Documentation](https://render.com/docs)
- [Neon Database Docs](https://neon.tech/docs)
- [GitHub Actions Guide](https://docs.github.com/en/actions)
- [SendGrid API Docs](https://sendgrid.com/docs/api-reference/)

## 🆘 Support

For deployment issues or questions:

1. Check the troubleshooting section above
2. Review deployment logs in Render/Netlify dashboards
3. Test individual components using debug commands
4. Verify all environment variables are correctly set

---

**⚠️ URGENT REMINDER**: Database expires September 14, 2025 - **CLAIM IMMEDIATELY**

**🚀 Ready to Deploy?** Run `node deploy.js deploy` to start the automated deployment process.
