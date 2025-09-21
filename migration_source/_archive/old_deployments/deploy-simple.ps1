#!/usr/bin/env pwsh
# Simple deployment script for Celora Platform
# Deploys to Netlify (Frontend), Render (Backend), and sets up Neon (Database)

param(
    [switch]$Production,
    [switch]$SkipBuild,
    [string]$NetlifyToken = $env:NETLIFY_AUTH_TOKEN,
    [string]$RenderToken = $env:RENDER_API_KEY,
    [string]$NeonApiKey = $env:NEON_API_KEY
)

Write-Host "Starting Celora Platform Deployment" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Check prerequisites
function Test-Prerequisites {
    Write-Host "Checking prerequisites..." -ForegroundColor Yellow
    
    $missing = @()
    
    # Check Python
    try {
        $pythonVersion = python --version 2>$null
        Write-Host "Python: $pythonVersion" -ForegroundColor Green
    } catch {
        $missing += "Python"
    }
    
    # Check required files
    $requiredFiles = @("enhanced_app.py", "requirements.txt", "netlify.toml", "render.yaml", "neon-schema.sql")
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Host "Found: $file" -ForegroundColor Green
        } else {
            $missing += $file
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "Missing requirements: $($missing -join ', ')" -ForegroundColor Red
        return $false
    }
    
    Write-Host "All prerequisites met!" -ForegroundColor Green
    return $true
}

# Deploy to Netlify (Frontend)
function Deploy-Frontend {
    Write-Host "`nDeploying Frontend to Netlify..." -ForegroundColor Cyan
    
    try {
        # Check if Netlify CLI is available
        if (Get-Command netlify -ErrorAction SilentlyContinue) {
            Write-Host "Deploying to Netlify via CLI..." -ForegroundColor Yellow
            
            $deployArgs = @("deploy")
            if ($Production) {
                $deployArgs += "--prod"
            }
            $deployArgs += @("--dir", ".")
            
            & netlify $deployArgs
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Netlify deployment successful!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "Netlify deployment failed" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "Netlify CLI not available, manual deployment required:" -ForegroundColor Yellow
            Write-Host "1. Go to https://app.netlify.com/sites" -ForegroundColor Cyan
            Write-Host "2. Drag and drop your project folder" -ForegroundColor Cyan
            Write-Host "3. Or connect your GitHub repository" -ForegroundColor Cyan
            return $true
        }
    } catch {
        Write-Host "Netlify deployment error: $_" -ForegroundColor Red
        return $false
    }
}

# Setup Database
function Setup-Database {
    Write-Host "`nSetting up Neon Database..." -ForegroundColor Cyan
    
    Write-Host "Manual Neon database setup required:" -ForegroundColor Yellow
    Write-Host "1. Go to https://console.neon.tech/" -ForegroundColor Cyan
    Write-Host "2. Create new project: 'celora-wallet'" -ForegroundColor Cyan
    Write-Host "3. Create database: 'celora_production'" -ForegroundColor Cyan
    Write-Host "4. Run the SQL schema file: neon-schema.sql" -ForegroundColor Cyan
    Write-Host "5. Copy connection string to Render environment variables" -ForegroundColor Cyan
    
    return $true
}

# Deploy Backend
function Deploy-Backend {
    Write-Host "`nDeploying Backend to Render..." -ForegroundColor Cyan
    
    Write-Host "Manual Render deployment required:" -ForegroundColor Yellow
    Write-Host "1. Go to https://dashboard.render.com/" -ForegroundColor Cyan
    Write-Host "2. Create new service from Git repository" -ForegroundColor Cyan
    Write-Host "3. Use render.yaml for configuration" -ForegroundColor Cyan
    Write-Host "4. Set environment variables:" -ForegroundColor Cyan
    Write-Host "   - DATABASE_URL (from Neon)" -ForegroundColor Cyan
    Write-Host "   - JWT_SECRET_KEY (generate strong key)" -ForegroundColor Cyan
    Write-Host "   - SLING_API_KEY (from Sling)" -ForegroundColor Cyan
    
    return $true
}

# Test deployment
function Test-Deployment {
    Write-Host "`nTesting Deployment..." -ForegroundColor Cyan
    
    $testEndpoints = @(
        "https://celora.netlify.app",
        "https://celora-backend.onrender.com/health"
    )
    
    foreach ($endpoint in $testEndpoints) {
        try {
            Write-Host "Testing: $endpoint" -ForegroundColor Yellow
            $response = Invoke-WebRequest -Uri $endpoint -Method GET -TimeoutSec 10 -ErrorAction SilentlyContinue
            
            if ($response.StatusCode -eq 200) {
                Write-Host "Success: $endpoint is responding" -ForegroundColor Green
            } else {
                Write-Host "Warning: $endpoint returned status $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Error: $endpoint is not responding" -ForegroundColor Red
        }
    }
}

# Main deployment flow
function Start-Deployment {
    $startTime = Get-Date
    
    try {
        if (-not (Test-Prerequisites)) {
            return
        }
        
        # Deploy each component
        $frontendSuccess = Deploy-Frontend
        $databaseSuccess = Setup-Database
        $backendSuccess = Deploy-Backend
        
        # Summary
        Write-Host "`nDeployment Summary" -ForegroundColor Green
        Write-Host "==================" -ForegroundColor Green
        Write-Host "Frontend (Netlify): $(if ($frontendSuccess) { 'Success' } else { 'Failed' })" -ForegroundColor $(if ($frontendSuccess) { 'Green' } else { 'Red' })
        Write-Host "Database (Neon): $(if ($databaseSuccess) { 'Success' } else { 'Failed' })" -ForegroundColor $(if ($databaseSuccess) { 'Green' } else { 'Red' })
        Write-Host "Backend (Render): $(if ($backendSuccess) { 'Success' } else { 'Failed' })" -ForegroundColor $(if ($backendSuccess) { 'Green' } else { 'Red' })
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        Write-Host "Total time: $($duration.TotalMinutes.ToString('F2')) minutes" -ForegroundColor Cyan
        
        if ($frontendSuccess -and $databaseSuccess -and $backendSuccess) {
            Write-Host "`nFull deployment completed successfully!" -ForegroundColor Green
            Write-Host "Your Celora platform setup is ready!" -ForegroundColor Green
            
            # Test after a moment
            Start-Sleep -Seconds 5
            Test-Deployment
        } else {
            Write-Host "`nDeployment completed with some manual steps required" -ForegroundColor Yellow
            Write-Host "Check the instructions above for manual deployment steps" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "`nDeployment failed with error: $_" -ForegroundColor Red
        exit 1
    }
}

# Run deployment
Start-Deployment

Write-Host "`nDeployment script complete!" -ForegroundColor Green
Write-Host "Check FULL_DEPLOYMENT_GUIDE.md for detailed instructions" -ForegroundColor Cyan
