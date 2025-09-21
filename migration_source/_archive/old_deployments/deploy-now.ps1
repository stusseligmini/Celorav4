# Celora Platform - Modern Deployment Script
# PowerShell 5.1 compatible deployment helper

param(
    [string]$Environment = "production",
    [switch]$SkipBuild,
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$RunMigrations,
    [switch]$Help
)

if ($Help) {
    Write-Host "
CELORA PLATFORM DEPLOYMENT HELPER
================================

Usage:
  .\deploy-now.ps1 [OPTIONS]

Options:
  -Environment <env>     Set environment (default: production)
  -SkipBuild            Skip building projects
  -SkipFrontend         Skip frontend deployment
  -SkipBackend          Skip backend deployment  
  -RunMigrations        Run database migrations
  -Help                 Show this help

Examples:
  .\deploy-now.ps1                              # Full deployment
  .\deploy-now.ps1 -SkipFrontend                # Deploy only backend
  .\deploy-now.ps1 -RunMigrations               # Run with migrations
"
    exit 0
}

function Write-Section($title) {
    Write-Host "`n=== $title ===" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "⚠ $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

function Test-Command($command) {
    try {
        & $command --version | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Generate-Secret([int]$Length = 64) {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Minimum 0 -Maximum $chars.Length)] })
}

# Main deployment script
Write-Host @"
🚀 CELORA PLATFORM DEPLOYMENT
==============================
Environment: $Environment
Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@ -ForegroundColor Cyan

Write-Section "SYSTEM CHECK"

# Check Node.js
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Success "Node.js: $nodeVersion"
} else {
    Write-Error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
}

# Check npm
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Success "npm: $npmVersion"
} else {
    Write-Error "npm not found"
    exit 1
}

Write-Section "PROJECT STRUCTURE CHECK"

# Check directories
$frontendDir = "celora-wallet"
$backendDir = "celora-backend"

if (Test-Path $frontendDir) {
    Write-Success "Frontend directory found: $frontendDir"
} else {
    Write-Warning "Frontend directory not found: $frontendDir"
    $SkipFrontend = $true
}

if (Test-Path $backendDir) {
    Write-Success "Backend directory found: $backendDir"
} else {
    Write-Warning "Backend directory not found: $backendDir"
    $SkipBackend = $true
}

if (-not $SkipBuild) {
    Write-Section "DEPENDENCIES INSTALLATION"
    
    Write-Host "Installing root dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install root dependencies"
        exit 1
    }
    Write-Success "Root dependencies installed"

    if (-not $SkipBackend -and (Test-Path $backendDir)) {
        Write-Host "Installing backend dependencies..."
        Push-Location $backendDir
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install backend dependencies"
            Pop-Location
            exit 1
        }
        
        Write-Host "Generating Prisma client..."
        npm run prisma:generate
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to generate Prisma client (database might not be configured)"
        } else {
            Write-Success "Prisma client generated"
        }
        
        Pop-Location
        Write-Success "Backend dependencies installed"
    }

    if (-not $SkipFrontend -and (Test-Path $frontendDir)) {
        Write-Host "Installing frontend dependencies..."
        Push-Location $frontendDir
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install frontend dependencies"
            Pop-Location
            exit 1
        }
        Pop-Location
        Write-Success "Frontend dependencies installed"
    }
}

Write-Section "BUILD PROCESS"

if (-not $SkipBuild) {
    if (-not $SkipBackend -and (Test-Path $backendDir)) {
        Write-Host "Building backend..."
        Push-Location $backendDir
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Backend build completed"
        } else {
            Write-Warning "Backend build had issues (might be expected if no build script)"
        }
        Pop-Location
    }

    if (-not $SkipFrontend -and (Test-Path $frontendDir)) {
        Write-Host "Building frontend..."
        Push-Location $frontendDir
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Frontend build completed"
        } else {
            Write-Error "Frontend build failed"
            Pop-Location
            exit 1
        }
        Pop-Location
    }
}

if ($RunMigrations -and (Test-Path $backendDir)) {
    Write-Section "DATABASE MIGRATIONS"
    Write-Host "Running database migrations..."
    Push-Location $backendDir
    
    if (Test-Path ".env") {
        npm run prisma:migrate
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database migrations completed"
        } else {
            Write-Error "Database migrations failed"
        }
    } else {
        Write-Warning "No .env file found. Skipping migrations."
        Write-Host "Create .env file with DATABASE_URL to run migrations"
    }
    Pop-Location
}

Write-Section "DEPLOYMENT INSTRUCTIONS"

Write-Host @"
🎯 FRONTEND DEPLOYMENT (Netlify):
1. Visit: https://app.netlify.com/
2. Drag & drop: celora-wallet/out/ folder
3. Or connect GitHub repo with build settings:
   - Build command: cd celora-wallet && npm run build
   - Publish directory: celora-wallet/out
   - Node version: 18+

🎯 BACKEND DEPLOYMENT (Render):
1. Visit: https://dashboard.render.com/
2. New Web Service -> Connect GitHub repository
3. Settings:
   - Root directory: celora-backend
   - Build command: npm install && npx prisma generate
   - Start command: npm start
   - Environment: Add variables below

🎯 DATABASE SETUP (Neon):
1. Visit: https://console.neon.tech/
2. Create new project: celora-platform
3. Copy connection string for Render environment

"@ -ForegroundColor Yellow

Write-Section "ENVIRONMENT VARIABLES"

# Generate secrets
$jwtSecret = Generate-Secret 64
$refreshSecret = Generate-Secret 64

Write-Host @"
Copy these environment variables to your hosting platform:

NODE_ENV=$Environment
PORT=10000
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=$jwtSecret
JWT_REFRESH_SECRET=$refreshSecret
CORS_ORIGIN=https://celora.net
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@celora.net
LOG_LEVEL=info
"@ -ForegroundColor Green

Write-Section "HEALTH CHECK"

# Check if services are running locally
Write-Host "Checking local services..."

try {
    $backendHealth = Invoke-WebRequest -Uri "http://localhost:10000/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Success "Backend running locally: http://localhost:10000"
} catch {
    Write-Warning "Backend not running locally"
}

try {
    $frontendHealth = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -ErrorAction Stop  
    Write-Success "Frontend running locally: http://localhost:3000"
} catch {
    Write-Warning "Frontend not running locally"
}

Write-Section "QUICK COMMANDS"

Write-Host @"
Development:
  npm run dev              # Start both frontend and backend
  npm run dev:backend      # Start only backend
  npm run dev:wallet       # Start only frontend

Production:
  npm run build            # Build both projects
  npm run start            # Start production backend
  
Database:
  npm run prisma:generate  # Generate Prisma client
  npm run prisma:migrate   # Run database migrations
"@ -ForegroundColor Cyan

Write-Section "COMPLETION"

Write-Success @"
Deployment preparation completed!

Next steps:
1. Set up Neon PostgreSQL database
2. Deploy backend to Render with environment variables
3. Deploy frontend to Netlify from celora-wallet/out/
4. Run database migrations on production
5. Test the deployed application

Live URLs (when deployed):
- Frontend: https://celora.net
- Backend: https://your-backend-url.onrender.com
- API Docs: https://your-backend-url.onrender.com/api/docs
"@

Write-Host "`n🎉 Ready for production deployment!" -ForegroundColor Green
