# 🚂 Railway Deployment Instructions for Celora

## Prerequisites
- GitHub account connected to https://github.com/stusseligmini/Celora-platform
- Railway account (free tier available)

## 🗄️ Step 1: Create Railway Project
1. Go to https://railway.app
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose `stusseligmini/Celora-platform`

## 💾 Step 2: Add PostgreSQL Database
1. In your Railway project dashboard
2. Click "+ New Service"
3. Select "Database" → "PostgreSQL"
4. Railway will automatically create DATABASE_URL environment variable

## 🐍 Step 3: Deploy Backend Service
1. Click "+ New Service" 
2. Select "GitHub Repo" → "Celora-platform"
3. Railway will detect Python and use our configuration files:
   - `railway.toml` (Railway-specific config)
   - `Procfile` (start command)
   - `requirements_simple.txt` (dependencies)

## ⚙️ Step 4: Configure Environment Variables
Railway auto-configures most variables, but verify:
- `DATABASE_URL` → Automatically set by PostgreSQL service
- `PORT` → Automatically set by Railway
- `ENVIRONMENT` → Set to "production"

## 🌐 Step 5: Get Your URL
After deployment, Railway provides:
- Backend: `https://your-app-name.up.railway.app`
- Database: Internal connection (auto-configured)

## 📊 Step 6: Verify Deployment
Test endpoints:
- `GET /` → Welcome message with Railway info
- `GET /health` → Database connection status
- `GET /api/users` → Sample user data
- `GET /api/database-test` → Database connectivity test

## 🎯 Expected Results
```json
{
  "message": "Welcome to Celora API on Railway!",
  "status": "online",
  "version": "2.1.0",
  "deployment_date": "2025-09-09",
  "platform": "Railway",
  "database": "PostgreSQL"
}
```

## ⚛️ Frontend Deployment (Next Step)
After backend is working:
1. Deploy celora-wallet frontend as separate Railway service
2. Configure API_URL to point to backend service
3. Enable custom domain if needed

## 🔧 Troubleshooting
- **Build fails**: Check `requirements_simple.txt` dependencies
- **App won't start**: Verify `Procfile` and `railway.toml`
- **Database connection**: Ensure PostgreSQL service is running
- **Port issues**: Railway handles PORT automatically

---
**Total setup time**: ~15-20 minutes
**Cost**: FREE (Railway free tier includes PostgreSQL)
