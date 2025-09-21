# =============================
# Celora Supabase Setup Script
# =============================

Write-Host "Starting Celora Supabase setup..." -ForegroundColor Green
Write-Host ""

# 1. Sjekk om Supabase CLI er installert
Write-Host "Checking if Supabase CLI is installed..." -ForegroundColor Yellow
try {
    $version = supabase --version 2>$null
    Write-Host "Supabase CLI found: $version" -ForegroundColor Green
} catch {
    Write-Host "Supabase CLI not found. Installing via Chocolatey..." -ForegroundColor Red
    
    # Sjekk om Chocolatey er installert
    try {
        choco --version | Out-Null
        Write-Host "Installing Supabase CLI via Chocolatey..." -ForegroundColor Yellow
        choco install supabase -y
    } catch {
        Write-Host "Chocolatey not found. Please install Supabase CLI manually:" -ForegroundColor Red
        Write-Host ""
        Write-Host "Option 1 - Install Chocolatey first, then run this script again:" -ForegroundColor Cyan
        Write-Host "  Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Option 2 - Download binary from:" -ForegroundColor Cyan
        Write-Host "  https://github.com/supabase/cli/releases" -ForegroundColor Gray
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""

# 2. Logg inn på Supabase CLI
Write-Host "Logging into Supabase CLI..." -ForegroundColor Yellow
supabase login

# 3. Initialiser Supabase-prosjekt (hvis ikke gjort)
Write-Host "Initializing Supabase project..." -ForegroundColor Yellow
if (!(Test-Path "supabase\config.toml")) {
    supabase init
} else {
    Write-Host "Supabase project already initialized." -ForegroundColor Green
}

# 4. Deploy Edge Functions
Write-Host ""
Write-Host "Deploying Edge Functions..." -ForegroundColor Yellow
Write-Host "Deploying celora-hosting..." -ForegroundColor Cyan
supabase functions deploy celora-hosting

Write-Host "Deploying celora-api..." -ForegroundColor Cyan
supabase functions deploy celora-api

# 5. Instruks for domene (GoDaddy)
Write-Host ""
Write-Host "=============================" -ForegroundColor Green
Write-Host "DOMENESETUP (GoDaddy -> Supabase)" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "1. Logg inn på GoDaddy.com" -ForegroundColor White
Write-Host ""
Write-Host "2. Gå til DNS-innstillinger for celora.net" -ForegroundColor White
Write-Host ""
Write-Host "3. Slett ALIAS/ANAME/CNAME som peker til Netlify" -ForegroundColor White
Write-Host ""
Write-Host "4. Legg til ny CNAME:" -ForegroundColor White
Write-Host "   - Type: CNAME" -ForegroundColor Cyan
Write-Host "   - Name: @" -ForegroundColor Cyan
Write-Host "   - Value: edge.supabase.co" -ForegroundColor Cyan
Write-Host "   - TTL: 1 hour" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Lagre endringer" -ForegroundColor White
Write-Host ""
Write-Host "6. Gå til Supabase dashboard -> Project -> Custom Domains" -ForegroundColor White
Write-Host "   - Legg til celora.net" -ForegroundColor Cyan
Write-Host "   - Følg eventuelle ekstra instruksjoner" -ForegroundColor Cyan
Write-Host ""

# 6. Instruks for GitHub Secrets
Write-Host "=============================" -ForegroundColor Green
Write-Host "GITHUB SECRETS FOR CI/CD" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "1. Gå til GitHub repo: stusseligmini/Celora-platform" -ForegroundColor White
Write-Host ""
Write-Host "2. Settings -> Secrets -> Actions" -ForegroundColor White
Write-Host ""
Write-Host "3. Legg til disse secrets:" -ForegroundColor White
Write-Host "   - SUPABASE_ACCESS_TOKEN: [Din Supabase access token]" -ForegroundColor Cyan
Write-Host "   - PROJECT_REF: [Din Supabase project ref]" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Push til main branch for auto-deploy" -ForegroundColor White
Write-Host ""

Write-Host "=============================" -ForegroundColor Green
Write-Host "FERDIG! Sjekk DNS_FIX_GUIDE.md for mer info" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

Read-Host "Press Enter to exit"
