# 🚀 Celora Platform Full-Stack Deployment Guide

Complete deployment instructions for Netlify (Frontend), Render (Backend), and Neon (Database).

## 📋 Pre-Deployment Checklist

### Required Accounts
- [ ] **Netlify Account** - https://app.netlify.com/
- [ ] **Render Account** - https://dashboard.render.com/
- [ ] **Neon Account** - https://console.neon.tech/
- [ ] **GitHub Account** (for CI/CD)

### Required Environment Variables
Create these before deployment:

```bash
# Database (from Neon)
DATABASE_URL=postgresql://username:password@hostname/database

# Security (generate strong values)
JWT_SECRET_KEY=your-super-secret-jwt-key-here
WALLET_ENC_KEY=base64-encoded-encryption-key

# External APIs
SLING_API_KEY=your-sling-api-key
NEON_API_KEY=your-neon-api-key

# Optional
REDIS_URL=redis://localhost:6379
LOG_LEVEL=INFO
ENVIRONMENT=production
```

## 🗄️ Step 1: Deploy Database (Neon)

### Option A: Automated Setup
```powershell
# Run with your Neon API key
./deploy-full-stack.ps1 -NeonApiKey "your-neon-api-key"
```

### Option B: Manual Setup
1. **Create Neon Project**
   - Go to https://console.neon.tech/
   - Click "Create a project"
   - Name: `celora-wallet`
   - Region: `US East (N. Virginia)`
   - PostgreSQL Version: 15+

2. **Set up Database Schema**
   ```bash
   # Connect to your Neon database
   psql "postgresql://username:password@hostname/database"
   
   # Run the schema file
   \i neon-schema.sql
   ```

3. **Save Connection String**
   - Copy the connection string from Neon dashboard
   - Format: `postgresql://username:password@hostname/database`

### Database Features Deployed
✅ User authentication with secure PIN hashing  
✅ Encrypted virtual card storage  
✅ Transaction logging with audit trail  
✅ Security event monitoring  
✅ Performance metrics collection  
✅ Row-level security policies  
✅ Automatic timestamps and triggers  

## 🖥️ Step 2: Deploy Backend (Render)

### Option A: Automated Deployment
```powershell
# Deploy backend automatically
./deploy-full-stack.ps1 -RenderToken "your-render-api-token"
```

### Option B: Manual Setup
1. **Create Render Service**
   - Go to https://dashboard.render.com/
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Or use "Deploy from Git URL"

2. **Configure Service**
   ```yaml
   # Use these settings
   Name: celora-backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn enhanced_app:app --host 0.0.0.0 --port $PORT
   ```

3. **Set Environment Variables**
   ```bash
   DATABASE_URL=postgresql://...  # From Neon
   JWT_SECRET_KEY=your-jwt-secret
   WALLET_ENC_KEY=your-encryption-key
   SLING_API_KEY=your-sling-key
   ENVIRONMENT=production
   LOG_LEVEL=INFO
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Test at: `https://your-service-name.onrender.com/health`

### Backend Features Deployed
✅ FastAPI with async/await support  
✅ JWT authentication with rate limiting  
✅ KMS key management integration  
✅ Database ORM with async SQLAlchemy  
✅ Prometheus metrics collection  
✅ Security middleware and CORS  
✅ Health checks and monitoring  

## 📱 Step 3: Deploy Frontend (Netlify)

### Option A: Automated Deployment
```powershell
# Deploy frontend automatically
./deploy-full-stack.ps1 -NetlifyToken "your-netlify-token"
```

### Option B: Manual Setup via Git
1. **Connect Repository**
   - Go to https://app.netlify.com/
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Select your repository

2. **Configure Build Settings**
   ```yaml
   Build command: echo 'Static site ready'
   Publish directory: .
   ```

3. **Environment Variables** (Optional)
   ```bash
   REACT_APP_API_URL=https://your-backend.onrender.com
   REACT_APP_ENVIRONMENT=production
   ```

### Option C: Manual Drag-and-Drop
1. **Prepare Files**
   ```bash
   # Ensure these files are in your root directory
   index.html
   netlify.toml
   js/celora-wallet.js
   _redirects
   _headers
   ```

2. **Deploy**
   - Go to https://app.netlify.com/
   - Drag your project folder to the deploy area
   - Wait for deployment

### Frontend Features Deployed
✅ Single Page Application (SPA)  
✅ Progressive Web App (PWA) capabilities  
✅ Secure HTTPS with custom domain  
✅ CDN distribution globally  
✅ Automatic HTTPS redirects  
✅ Security headers and CORS policies  

## 🔧 Step 4: Post-Deployment Configuration

### Database Initialization
```sql
-- Create first admin user (run in Neon SQL Editor)
INSERT INTO wallet.users (email, pin_hash, pin_algo) 
VALUES ('admin@celora.com', 'hashed-pin-here', 'pbkdf2');

-- Create sample wallet
INSERT INTO wallet.wallets (user_id, wallet_name, encryption_key_id) 
SELECT id, 'Primary Wallet', 'alias/celora-key' 
FROM wallet.users WHERE email = 'admin@celora.com';
```

### Backend Health Check
```bash
# Test all endpoints
curl https://your-backend.onrender.com/health
curl https://your-backend.onrender.com/api/docs  # API documentation
curl https://your-backend.onrender.com/metrics   # Prometheus metrics
```

### Frontend Testing
```javascript
// Test wallet integration (browser console)
const wallet = new CeloraWalletUI('https://your-backend.onrender.com');
await wallet.createWallet('test@celora.com', '123456');
```

## 📊 Step 5: Monitoring Setup

### Render Monitoring
1. **Built-in Metrics**
   - Go to Render dashboard → Your service → Metrics
   - Monitor CPU, Memory, Response time

2. **Custom Alerts**
   - Set up email notifications
   - Configure Slack webhooks

### Database Monitoring
```sql
-- Monitor database performance
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables 
ORDER BY n_tup_ins DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;
```

## 🔐 Security Configuration

### SSL/TLS Setup
- ✅ Netlify: Automatic HTTPS with Let's Encrypt
- ✅ Render: Automatic HTTPS certificates
- ✅ Neon: TLS 1.2+ encryption in transit

### Environment Security
```bash
# Verify environment variables (Render console)
echo $DATABASE_URL | grep -o "postgresql://[^@]*"  # Should show masked password
echo $JWT_SECRET_KEY | wc -c  # Should be 32+ characters
```

### Security Headers
Check at https://securityheaders.com/:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options

## 🧪 Step 6: Testing Deployment

### Automated Testing
```powershell
# Run the full test suite
./deploy-full-stack.ps1 -Production
```

### Manual Testing
1. **Frontend Access**
   - Visit: https://your-site.netlify.app
   - Test wallet creation flow
   - Verify responsive design

2. **API Endpoints**
   ```bash
   # Health check
   curl https://your-backend.onrender.com/health
   
   # Create user
   curl -X POST https://your-backend.onrender.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","pin":"123456"}'
   ```

3. **Database Queries**
   ```sql
   -- Check user creation
   SELECT email, created_at FROM wallet.users LIMIT 5;
   
   -- Verify wallet creation
   SELECT wallet_name, balance FROM wallet.wallets LIMIT 5;
   ```

## 🚨 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check logs in Render dashboard
# Common causes:
- Missing environment variables
- Database connection issues
- Port binding problems
```

#### Database Connection Failed
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT version();"

# Common fixes:
- Verify connection string format
- Check IP whitelist settings
- Confirm database exists
```

#### Frontend API Calls Failing
```javascript
// Check CORS configuration
// Verify API URLs
// Test in browser developer tools
```

### Performance Issues
1. **Slow Database Queries**
   ```sql
   -- Enable query logging
   SET log_statement = 'all';
   SET log_min_duration_statement = 1000;
   ```

2. **High Memory Usage**
   - Check connection pooling
   - Monitor async task queues
   - Review caching strategies

## 📈 Scaling Recommendations

### Database (Neon)
- Upgrade to Pro plan for better performance
- Enable connection pooling
- Set up read replicas

### Backend (Render)
- Upgrade to larger instance types
- Implement horizontal scaling
- Add Redis caching layer

### Frontend (Netlify)
- Enable asset optimization
- Configure CDN caching
- Implement lazy loading

## 📝 Maintenance Tasks

### Weekly
- [ ] Review application logs
- [ ] Monitor error rates
- [ ] Check security alerts

### Monthly
- [ ] Update dependencies
- [ ] Review performance metrics
- [ ] Backup database
- [ ] Security audit

### Quarterly
- [ ] Load testing
- [ ] Disaster recovery testing
- [ ] Cost optimization review
- [ ] Security penetration testing

## 🎉 Deployment Complete!

Your Celora platform is now live at:
- 🌐 **Frontend**: https://your-site.netlify.app
- 🔧 **Backend**: https://your-backend.onrender.com
- 🗄️ **Database**: Neon PostgreSQL cluster
- 📊 **Monitoring**: Built-in dashboards and metrics

### Next Steps
1. Configure custom domain names
2. Set up monitoring alerts
3. Implement backup strategies
4. Plan for scaling

---

## 📞 Support Resources

- **Netlify Docs**: https://docs.netlify.com/
- **Render Docs**: https://render.com/docs
- **Neon Docs**: https://neon.tech/docs/
- **Celora Support**: Create GitHub issue

---

*Last updated: $(Get-Date -Format "yyyy-MM-dd")*
