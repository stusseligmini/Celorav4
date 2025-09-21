# Railway Deployment Guide for Celora

## 🚂 Step 1: Create Railway Account
1. Go to railway.app
2. Sign up with GitHub account
3. Connect your Celora-platform repository

## 🗄️ Step 2: Add Database Service
```bash
# Railway will auto-generate these environment variables:
DATABASE_URL=postgresql://user:pass@host:port/db
DATABASE_PRIVATE_URL=postgresql://...
```

## 🐍 Step 3: Deploy Backend
Create `railway-backend.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn simple_app:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 300

[environment]
PYTHON_VERSION = "3.11"
```

## ⚛️ Step 4: Deploy Frontend  
Create `railway-frontend.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"

[environment]
NODE_VERSION = "20.18.0"
```

## 🔄 Step 5: Update Database Connection
Your `simple_app.py` will automatically use Railway's DATABASE_URL:
```python
DATABASE_URL = os.getenv("DATABASE_URL")  # Auto-provided by Railway
```

## 🎯 Advantages of Railway Full Stack:
- ✅ **Zero Config Database**: Auto-connection strings
- ✅ **One Platform**: Backend + Frontend + Database
- ✅ **Auto-Scaling**: Handles traffic automatically  
- ✅ **Better Logs**: Unified logging across all services
- ✅ **Faster Deployment**: No external service coordination

## 💡 Migration Strategy:
1. Deploy to Railway first (get everything working)
2. Later migrate to Neon if you need advanced database features
3. Just change DATABASE_URL environment variable
