# Celora V2 Deployment Script for Vercel (PowerShell)
# This script sets up environment variables and deploys to Vercel

Write-Host "🚀 Starting Celora V2 deployment to Vercel..." -ForegroundColor Green

# Check if Vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

Write-Host "📝 Setting up Vercel project..." -ForegroundColor Yellow

# Initialize Vercel project if not already done
if (-not (Test-Path ".vercel")) {
    Write-Host "Initializing Vercel project..." -ForegroundColor Yellow
    vercel link --yes
}

Write-Host "🔧 Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    
    Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment complete!" -ForegroundColor Green
        Write-Host "🌐 Your Celora V2 platform should now be live on Vercel" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Build failed! Please check the errors above." -ForegroundColor Red
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Set up environment variables in Vercel dashboard" -ForegroundColor White
Write-Host "2. Configure custom domain if needed" -ForegroundColor White
Write-Host "3. Test the production deployment" -ForegroundColor White