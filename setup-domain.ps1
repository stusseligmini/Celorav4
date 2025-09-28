# Domain Configuration Script for Celora.net
# Use this script to set up your custom domain with Vercel and Supabase

# Step 1: Install Vercel CLI if needed
Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
npm install -g vercel

# Step 2: Login to Vercel (if not logged in)
Write-Host "Logging into Vercel..." -ForegroundColor Yellow
vercel login

# Step 3: Add domain to Vercel project
Write-Host "Adding celora.net domain to Vercel project..." -ForegroundColor Yellow
vercel domains add celora.net --yes

# Step 4: Deploy to production with custom domain
Write-Host "Deploying to production with custom domain..." -ForegroundColor Yellow
vercel --prod

# Step 5: DNS Configuration Instructions
Write-Host "`nDomain Configuration Instructions:" -ForegroundColor Green
Write-Host "1. Log in to your GoDaddy account" -ForegroundColor White
Write-Host "2. Go to your domain (celora.net) DNS settings" -ForegroundColor White
Write-Host "3. Add the following DNS records:" -ForegroundColor White
Write-Host "   Type: A" -ForegroundColor White
Write-Host "   Name: @" -ForegroundColor White
Write-Host "   Value: (Vercel IP address from output above)" -ForegroundColor White
Write-Host "   TTL: 3600" -ForegroundColor White
Write-Host "`n   Type: CNAME" -ForegroundColor White
Write-Host "   Name: www" -ForegroundColor White
Write-Host "   Value: cname.vercel-dns.com." -ForegroundColor White
Write-Host "   TTL: 3600" -ForegroundColor White

# Step 6: Set up Supabase with custom domain
Write-Host "`nSupabase Configuration:" -ForegroundColor Green
Write-Host "1. Log into Supabase Dashboard: https://app.supabase.com" -ForegroundColor White
Write-Host "2. Select your Celora project" -ForegroundColor White
Write-Host "3. Go to Settings -> API" -ForegroundColor White
Write-Host "4. Add celora.net to the CORS origins list" -ForegroundColor White
Write-Host "5. Add https://celora.net as an authorized redirect URL" -ForegroundColor White

# Step 7: Verify setup
Write-Host "`nVerification Steps:" -ForegroundColor Green
Write-Host "1. Run: nslookup celora.net" -ForegroundColor White
Write-Host "2. Check that it resolves to the Vercel IP address" -ForegroundColor White
Write-Host "3. Wait for DNS propagation (may take 24-48 hours)" -ForegroundColor White
Write-Host "4. Test your site at https://celora.net" -ForegroundColor White

Write-Host "`nReminder: DNS changes can take 24-48 hours to fully propagate!" -ForegroundColor Yellow