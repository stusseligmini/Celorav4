# 🛩️ Fly.io Deployment Guide for Celora

## 🚀 Step 1: Install Fly.io CLI

### For Windows (PowerShell):
```powershell
# Method 1: Direct download
iwr https://fly.io/install.ps1 -useb | iex

# Method 2: Using Scoop
scoop install flyctl

# Method 3: Manual download
# Download from https://github.com/superfly/flyctl/releases
```

## 🔐 Step 2: Login to Fly.io
```bash
# Login (will open browser)
flyctl auth login

# Or sign up if you don't have account
flyctl auth signup
```

## 🗄️ Step 3: Create PostgreSQL Database
```bash
# Create database
flyctl postgres create --name celora-db --region ams

# This will give you:
# - Database name: celora-db
# - Connection string: postgres://...
# - Admin URL for management
```

## 🐍 Step 4: Deploy Backend
```bash
# In your project directory
cd C:\Users\volde\Desktop\celora\Celora_Project

# Launch the app (interactive setup)
flyctl launch --name celora-backend --region ams

# During launch:
# - Choose "Yes" to copy configuration to fly.toml
# - Choose "Yes" to deploy now
# - Choose region: Amsterdam (ams) or closest to you
```

## 🔗 Step 5: Connect Database
```bash
# Attach database to your app
flyctl postgres attach --app celora-backend celora-db

# This automatically sets DATABASE_URL environment variable
```

## 🚀 Step 6: Deploy
```bash
# Deploy the application
flyctl deploy

# Monitor deployment
flyctl logs
```

## ✅ Step 7: Test Deployment
Your app will be available at:
```
https://celora-backend.fly.dev
```

Test endpoints:
```bash
# Health check
curl https://celora-backend.fly.dev/health

# Root endpoint  
curl https://celora-backend.fly.dev/

# Users API
curl https://celora-backend.fly.dev/api/users
```

## 📊 Expected Response:
```json
{
  "message": "Welcome to Celora API on Fly.io!",
  "status": "online",
  "version": "3.0.0",
  "platform": "Fly.io", 
  "region": "ams",
  "database": "PostgreSQL"
}
```

## 🔧 Useful Commands:
```bash
# Check app status
flyctl status

# View logs
flyctl logs

# Scale app
flyctl scale count 2

# Open app in browser
flyctl open

# SSH into app
flyctl ssh console
```

## ⚡ Quick Deploy Commands:
```bash
# All in one setup:
flyctl auth login
flyctl postgres create --name celora-db --region ams  
flyctl launch --name celora-backend --region ams
flyctl postgres attach --app celora-backend celora-db
flyctl deploy
```

---
**Total setup time: ~10-15 minutes**
**Cost: FREE (Fly.io free tier)**
