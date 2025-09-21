# 🚀 Celora Platform Deployment Guide

## ✅ STRUCTURAL ISSUES FIXED

**All critical deployment-blocking issues have been resolved:**

✅ **Prisma Import Issues** - All files now correctly import from `@prisma/client`  
✅ **Circular Dependencies** - Eliminated between server.ts and middleware/routes  
✅ **Database Schema** - Updated with missing models (Portfolio, PortfolioAsset, UserSession)  
✅ **Build Process** - TypeScript compilation working  
✅ **Server Startup** - Confirmed working locally on port 5000  

---

## 🌐 DEPLOYMENT STATUS

### 1. Frontend (Netlify) ✅ DEPLOYED
- **URL**: https://celora.net
- **Status**: ✅ Live and updated
- **Last Deploy**: Latest commit with structural fixes

### 2. Backend (Render) ⚠️ NEEDS SETUP
- **Target URL**: Will be assigned by Render
- **Status**: ⚠️ Needs manual deployment setup
- **Configuration**: `render.yaml` ready

### 3. Database (Neon) ⚠️ NEEDS SETUP
- **Status**: ⚠️ Needs manual setup
- **Schema**: `neon-schema.sql` ready for PostgreSQL
- **Prisma**: Ready to migrate

---

## 📋 DEPLOYMENT STEPS

### Step 1: Set up Neon Database

1. **Go to Neon Console**
   ```
   https://console.neon.tech/
   ```

2. **Create New Project**
   - Project Name: `celora-platform`
   - Database Name: `celora_production`
   - Region: Choose closest to your users

3. **Get Connection String**
   - Copy the PostgreSQL connection string
   - Format: `postgresql://username:password@hostname/database?sslmode=require`

4. **Update Environment Variables**
   - Update `DATABASE_URL` in Render (Step 2)

### Step 2: Deploy Backend to Render

1. **Go to Render Dashboard**
   ```
   https://dashboard.render.com/
   ```

2. **Create New Web Service**
   - Connect Repository: `https://github.com/stusseligmini/Celora-platform`
   - Branch: `main`
   - Runtime: `Node`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`

3. **Set Environment Variables**
   ```bash
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=[NEON CONNECTION STRING FROM STEP 1]
   JWT_SECRET=[GENERATE STRONG SECRET]
   JWT_REFRESH_SECRET=[GENERATE STRONG SECRET]  
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   FRONTEND_URL=https://celora.net
   LOG_LEVEL=info
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Note the assigned URL (e.g., `https://celora-api.onrender.com`)

### Step 3: Update Frontend API URLs

1. **Update Frontend Configuration**
   - Find API endpoint configurations in frontend code
   - Update to point to your Render backend URL
   - Commit and push changes

2. **Redeploy Frontend**
   ```bash
   netlify deploy --prod --dir .
   ```

### Step 4: Database Migration

1. **Run Prisma Migration**
   ```bash
   # This will happen automatically on first deploy
   # Or manually via Render console:
   npx prisma db push
   ```

### Step 5: Test Deployment

1. **Backend Health Check**
   ```bash
   curl https://YOUR-RENDER-URL/health
   ```

2. **Frontend Test**
   ```bash
   curl https://celora.net
   ```

3. **API Integration Test**
   - Test registration/login endpoints
   - Verify database connectivity

---

## 🔧 MANUAL DEPLOYMENT ALTERNATIVE

If automated deployment fails, use these manual commands:

### Build Locally
```bash
# Build project
npm run build

# Test build
npm run dev  # Should start on port 5000

# Generate Prisma client
npx prisma generate
```

### Deploy to Render Manually
```bash
# In Render console or via CLI
npm install
npx prisma generate  
npx prisma db push
npm start
```

---

## 🚨 TROUBLESHOOTING

### Common Issues

1. **Build Fails on Render**
   - Check Node.js version (should be 18+)
   - Verify `package.json` scripts
   - Check build logs for specific errors

2. **Database Connection Fails**
   - Verify DATABASE_URL format
   - Check Neon database status
   - Ensure SSL is enabled

3. **JWT Issues**
   - Generate strong JWT secrets (64+ characters)
   - Don't use default development secrets

4. **CORS Issues**
   - Update FRONTEND_URL in Render environment
   - Verify domain matches exactly

### Useful Commands

```bash
# Check Render logs
curl https://YOUR-RENDER-URL/health

# Test database connection locally
npx prisma db push --preview-feature

# Verify build
npm run build && npm start
```

---

## 📊 POST-DEPLOYMENT

### Monitor Application
- Render provides logs and metrics
- Neon provides database monitoring
- Netlify provides CDN analytics

### Performance Optimization
- Enable Render auto-scaling
- Configure Neon connection pooling
- Setup CDN caching on Netlify

### Security
- Rotate JWT secrets regularly
- Monitor failed authentication attempts
- Setup SSL certificates (automatic on Render/Netlify)

---

## 🎉 DEPLOYMENT COMPLETE!

Once all steps are complete, your Celora platform will be fully deployed:

- **Frontend**: https://celora.net
- **Backend**: https://YOUR-RENDER-URL
- **Database**: Neon PostgreSQL
- **Health Check**: https://YOUR-RENDER-URL/health

**The platform is now ready for production use!**

---

*For any deployment issues, check the logs in Render dashboard and Netlify deploy logs.*
