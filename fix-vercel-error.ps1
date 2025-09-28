# Fix Vercel Environment Variables and Deployment Issues
# Run this script to fix the client-side exception error

Write-Host "🔧 Fixing Vercel Environment Variables and Deployment Issues" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check current Vercel deployment
Write-Host "1. Checking current Vercel project status..." -ForegroundColor Green
vercel env ls

# Step 2: Set required environment variables
Write-Host ""
Write-Host "2. Setting required environment variables..." -ForegroundColor Green

# Set Supabase environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# When prompted, enter: https://zpcycakwdvymqhwvakrv.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# When prompted, enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjIyNzYsImV4cCI6MjA3NDAzODI3Nn0.tAzcxbTBV67ubzkZLTVlwBpZEqbLQoze6JbgYtYXFQI

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# When prompted, enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ2MjI3NiwiZXhwIjoyMDc0MDM4Mjc2fQ.cfMRjZMHfQ3Y6jlTVvYaP9GTnWq-WBwyoXWuFVcVwoQ

# Step 3: Redeploy with correct environment
Write-Host ""
Write-Host "3. Redeploying with correct environment..." -ForegroundColor Green
vercel --prod

Write-Host ""
Write-Host "4. Alternative: Use Vercel dashboard to set environment variables:" -ForegroundColor Cyan
Write-Host "   - Go to https://vercel.com/dashboard" -ForegroundColor White
Write-Host "   - Select your Celora project" -ForegroundColor White
Write-Host "   - Go to Settings → Environment Variables" -ForegroundColor White
Write-Host "   - Add the following variables for Production:" -ForegroundColor White
Write-Host ""
Write-Host "   NEXT_PUBLIC_SUPABASE_URL = https://zpcycakwdvymqhwvakrv.supabase.co" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjIyNzYsImV4cCI6MjA3NDAzODI3Nn0.tAzcxbTBV67ubzkZLTVlwBpZEqbLQoze6JbgYtYXFQI" -ForegroundColor White
Write-Host "   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ2MjI3NiwiZXhwIjoyMDc0MDM4Mjc2fQ.cfMRjZMHfQ3Y6jlTVvYaP9GTnWq-WBwyoXWuFVcVwoQ" -ForegroundColor White

Write-Host ""
Write-Host "5. If the problem persists, check Supabase CORS settings:" -ForegroundColor Cyan
Write-Host "   - Go to https://app.supabase.com" -ForegroundColor White
Write-Host "   - Select your project -> Settings -> API" -ForegroundColor White
Write-Host "   - Add your Vercel URL to CORS origins" -ForegroundColor White