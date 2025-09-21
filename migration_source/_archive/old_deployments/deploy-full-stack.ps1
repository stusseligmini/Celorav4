#!/usr/bin/env pwsh
# Comprehensive deployment script for Celora Platform
# Deploys to Netlify (Frontend), Render (Backend), and sets up Neon (Database)

param(
    [switch]$Production,
    [switch]$SkipBuild,
    [string]$NetlifyToken = $env:NETLIFY_AUTH_TOKEN,
    [string]$RenderToken = $env:RENDER_API_KEY,
    [string]$NeonApiKey = $env:NEON_API_KEY
)

Write-Host "🚀 Starting Full-Stack Deployment for Celora Platform" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check prerequisites
function Test-Prerequisites {
    Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
    
    $missing = @()
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        $missing += "Node.js"
    }
    
    # Check Python
    try {
        $pythonVersion = python --version 2>$null
        Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
    } catch {
        $missing += "Python"
    }
    
    # Check Git
    try {
        $gitVersion = git --version 2>$null
        Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
    } catch {
        $missing += "Git"
    }
    
    # Check required CLI tools
    $cliTools = @("netlify", "render")
    foreach ($tool in $cliTools) {
        try {
            & $tool --version 2>$null | Out-Null
            Write-Host "✅ $tool CLI installed" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  $tool CLI not installed - will use API" -ForegroundColor Yellow
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "❌ Missing requirements: $($missing -join ', ')" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ All prerequisites met!" -ForegroundColor Green
}

# Deploy to Netlify (Frontend)
function Deploy-Frontend {
    Write-Host "`n📱 Deploying Frontend to Netlify..." -ForegroundColor Cyan
    
    # Build frontend if not skipped
    if (-not $SkipBuild) {
        Write-Host "🔨 Building frontend assets..." -ForegroundColor Yellow
        
        # Install dependencies
        if (Test-Path "package.json") {
            npm install
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
                return $false
            }
        }
        
        # Copy wallet implementation
        if (-not (Test-Path "js")) { New-Item -ItemType Directory -Path "js" }
        Copy-Item "celora_wallet.py" "js/celora_wallet.py" -Force
        
        Write-Host "✅ Frontend build complete" -ForegroundColor Green
    }
    
    # Deploy to Netlify
    try {
        if (Get-Command netlify -ErrorAction SilentlyContinue) {
            Write-Host "🚀 Deploying to Netlify via CLI..." -ForegroundColor Yellow
            
            $deployArgs = @("deploy", "--prod", "--dir", ".")
            if ($Production) {
                $deployArgs += @("--message", "Production deployment $(Get-Date)")
            }
            
            & netlify $deployArgs
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Netlify deployment successful!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ Netlify deployment failed" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "⚠️  Netlify CLI not available, manual deployment required" -ForegroundColor Yellow
            Write-Host "   1. Go to https://app.netlify.com/sites/celora/deploys" -ForegroundColor Cyan
            Write-Host "   2. Drag and drop your project folder" -ForegroundColor Cyan
            Write-Host "   3. Or connect your GitHub repository" -ForegroundColor Cyan
            return $true
        }
    } catch {
        Write-Host "❌ Netlify deployment error: $_" -ForegroundColor Red
        return $false
    }
}

# Set up Neon Database
function Setup-Database {
    Write-Host "`n🗄️  Setting up Neon Database..." -ForegroundColor Cyan
    
    $neonConfig = @{
        project_name = "celora-wallet"
        database_name = "celora_production"
        region = "us-east-1"
    }
    
    # Create Neon project if API key is available
    if ($NeonApiKey) {
        Write-Host "🔧 Creating Neon project via API..." -ForegroundColor Yellow
        
        $headers = @{
            "Authorization" = "Bearer $NeonApiKey"
            "Content-Type" = "application/json"
        }
        
        $body = @{
            project = @{
                name = $neonConfig.project_name
                region_id = $neonConfig.region
            }
        } | ConvertTo-Json -Depth 3
        
        try {
            $response = Invoke-RestMethod -Uri "https://console.neon.tech/api/v2/projects" -Method POST -Headers $headers -Body $body
            $connectionString = $response.connection_uri
            
            Write-Host "✅ Neon database created successfully!" -ForegroundColor Green
            Write-Host "🔗 Connection string: $connectionString" -ForegroundColor Cyan
            
            # Save connection string to .env file
            Add-Content -Path ".env" -Value "DATABASE_URL=$connectionString"
            
        } catch {
            Write-Host "❌ Neon database creation failed: $_" -ForegroundColor Red
            Write-Host "📝 Manual setup required:" -ForegroundColor Yellow
            Write-Host "   1. Go to https://console.neon.tech/" -ForegroundColor Cyan
            Write-Host "   2. Create new project: '$($neonConfig.project_name)'" -ForegroundColor Cyan
            Write-Host "   3. Copy connection string to .env file" -ForegroundColor Cyan
        }
    } else {
        Write-Host "📝 Manual Neon database setup required:" -ForegroundColor Yellow
        Write-Host "   1. Go to https://console.neon.tech/" -ForegroundColor Cyan
        Write-Host "   2. Create new project: '$($neonConfig.project_name)'" -ForegroundColor Cyan
        Write-Host "   3. Create database: '$($neonConfig.database_name)'" -ForegroundColor Cyan
        Write-Host "   4. Copy connection string to Render environment variables" -ForegroundColor Cyan
    }
    
    return $true
}

# Deploy to Render (Backend)
function Deploy-Backend {
    Write-Host "`n🖥️  Deploying Backend to Render..." -ForegroundColor Cyan
    
    # Validate render.yaml
    if (-not (Test-Path "render.yaml")) {
        Write-Host "❌ render.yaml not found!" -ForegroundColor Red
        return $false
    }
    
    # Check if we can use Render CLI
    if (Get-Command render -ErrorAction SilentlyContinue) {
        Write-Host "🚀 Deploying to Render via CLI..." -ForegroundColor Yellow
        
        try {
            & render services create --from-yaml render.yaml
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Render deployment initiated!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ Render deployment failed" -ForegroundColor Red
                return $false
            }
        } catch {
            Write-Host "❌ Render CLI error: $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "📝 Manual Render deployment required:" -ForegroundColor Yellow
        Write-Host "   1. Go to https://dashboard.render.com/" -ForegroundColor Cyan
        Write-Host "   2. Create new service from Git repository" -ForegroundColor Cyan
        Write-Host "   3. Use render.yaml for configuration" -ForegroundColor Cyan
        Write-Host "   4. Set environment variables:" -ForegroundColor Cyan
        Write-Host "      - DATABASE_URL (from Neon)" -ForegroundColor Cyan
        Write-Host "      - JWT_SECRET_KEY (generate strong key)" -ForegroundColor Cyan
        Write-Host "      - SLING_API_KEY (from Sling)" -ForegroundColor Cyan
        return $true
    }
}

# Validate deployment
function Test-Deployment {
    Write-Host "`n🧪 Testing Deployment..." -ForegroundColor Cyan
    
    $endpoints = @{
        "Frontend" = "https://celora.netlify.app"
        "Backend" = "https://celora-backend.onrender.com"
        "Health Check" = "https://celora-backend.onrender.com/health"
    }
    
    foreach ($service in $endpoints.GetEnumerator()) {
        try {
            Write-Host "🔍 Testing $($service.Key)..." -ForegroundColor Yellow
            $response = Invoke-WebRequest -Uri $service.Value -Method GET -TimeoutSec 10
            
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $($service.Key) is responding" -ForegroundColor Green
            } else {
                Write-Host "⚠️  $($service.Key) returned status $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ $($service.Key) is not responding: $_" -ForegroundColor Red
        }
    }
}

# Main deployment flow
function Start-Deployment {
    $startTime = Get-Date
    
    try {
        Test-Prerequisites
        
        # Deploy each component
        $frontendSuccess = Deploy-Frontend
        $databaseSuccess = Setup-Database
        $backendSuccess = Deploy-Backend
        
        # Summary
        Write-Host "`n📊 Deployment Summary" -ForegroundColor Green
        Write-Host "===================" -ForegroundColor Green
        Write-Host "Frontend (Netlify): $(if ($frontendSuccess) { '✅ Success' } else { '❌ Failed' })" -ForegroundColor $(if ($frontendSuccess) { 'Green' } else { 'Red' })
        Write-Host "Database (Neon): $(if ($databaseSuccess) { '✅ Success' } else { '❌ Failed' })" -ForegroundColor $(if ($databaseSuccess) { 'Green' } else { 'Red' })
        Write-Host "Backend (Render): $(if ($backendSuccess) { '✅ Success' } else { '❌ Failed' })" -ForegroundColor $(if ($backendSuccess) { 'Green' } else { 'Red' })
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        Write-Host "⏱️  Total time: $($duration.TotalMinutes.ToString('F2')) minutes" -ForegroundColor Cyan
        
        if ($frontendSuccess -and $databaseSuccess -and $backendSuccess) {
            Write-Host "`n🎉 Full deployment completed successfully!" -ForegroundColor Green
            Write-Host "🌐 Your Celora platform is now live!" -ForegroundColor Green
            
            # Wait a moment then test
            Start-Sleep -Seconds 30
            Test-Deployment
        } else {
            Write-Host "`n⚠️  Deployment completed with some issues" -ForegroundColor Yellow
            Write-Host "Check the errors above and deploy missing components manually" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "`n💥 Deployment failed with error: $_" -ForegroundColor Red
        exit 1
    }
}

# Run deployment
Start-Deployment

Write-Host "`n🏁 Deployment script complete!" -ForegroundColor Green
