# =============================
# Celora Supabase Direct Install
# =============================

Write-Host "Installing Supabase CLI directly from GitHub..." -ForegroundColor Green
Write-Host ""

# Create temp directory
$tempDir = "$env:TEMP\supabase-install"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Download Supabase CLI
Write-Host "Downloading Supabase CLI..." -ForegroundColor Yellow
$url = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz"
$downloadPath = "$tempDir\supabase.tar.gz"

try {
    Invoke-WebRequest -Uri $url -OutFile $downloadPath -UseBasicParsing
    Write-Host "Download completed!" -ForegroundColor Green
} catch {
    Write-Host "Download failed: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Extract using PowerShell (Windows 10/11 has built-in tar support)
Write-Host "Extracting Supabase CLI..." -ForegroundColor Yellow
Set-Location $tempDir
tar -xzf "supabase.tar.gz"

# Create installation directory
$installDir = "$env:LOCALAPPDATA\supabase"
if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}

# Copy executable
Copy-Item "supabase.exe" "$installDir\supabase.exe" -Force

# Add to PATH (current session)
$env:PATH += ";$installDir"

# Add to PATH permanently for current user
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$userPath;$installDir", "User")
    Write-Host "Added Supabase CLI to PATH" -ForegroundColor Green
}

# Clean up
Set-Location $PSScriptRoot
Remove-Item $tempDir -Recurse -Force

# Test installation
Write-Host "Testing Supabase CLI installation..." -ForegroundColor Yellow
try {
    $version = & "$installDir\supabase.exe" --version 2>$null
    Write-Host "Supabase CLI installed successfully: $version" -ForegroundColor Green
} catch {
    Write-Host "Installation test failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "=============================" -ForegroundColor Green
Write-Host "SUPABASE SETUP" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

# Login to Supabase
Write-Host "Opening Supabase login..." -ForegroundColor Yellow
Write-Host "This will open a browser window for authentication." -ForegroundColor Cyan
& "$installDir\supabase.exe" login

# Deploy functions
Write-Host ""
Write-Host "Deploying Edge Functions..." -ForegroundColor Yellow

Write-Host "Deploying celora-hosting..." -ForegroundColor Cyan
& "$installDir\supabase.exe" functions deploy celora-hosting

Write-Host "Deploying celora-api..." -ForegroundColor Cyan
& "$installDir\supabase.exe" functions deploy celora-api

# Instructions
Write-Host ""
Write-Host "=============================" -ForegroundColor Green
Write-Host "DOMENE SETUP (GoDaddy)" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "1. Gå til https://dcc.godaddy.com/manage/celora.net/dns" -ForegroundColor White
Write-Host ""
Write-Host "2. Slett eksisterende CNAME som peker til Netlify" -ForegroundColor White
Write-Host ""
Write-Host "3. Legg til ny CNAME record:" -ForegroundColor White
Write-Host "   Type: CNAME" -ForegroundColor Cyan
Write-Host "   Name: @" -ForegroundColor Cyan
Write-Host "   Value: edge.supabase.co" -ForegroundColor Cyan
Write-Host "   TTL: 600 (10 minutes)" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Lagre endringene" -ForegroundColor White
Write-Host ""
Write-Host "5. Gå til Supabase dashboard -> Custom Domains" -ForegroundColor White
Write-Host "   og legg til celora.net" -ForegroundColor Cyan

Write-Host ""
Write-Host "=============================" -ForegroundColor Green
Write-Host "GITHUB SECRETS" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "1. Gå til: https://github.com/stusseligmini/Celora-platform/settings/secrets/actions" -ForegroundColor White
Write-Host ""
Write-Host "2. Legg til disse secrets:" -ForegroundColor White
Write-Host "   SUPABASE_ACCESS_TOKEN" -ForegroundColor Cyan
Write-Host "   PROJECT_REF" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Få token fra: https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
Write-Host "   Få PROJECT_REF fra: Supabase dashboard -> Settings -> General" -ForegroundColor Yellow

Write-Host ""
Write-Host "=============================" -ForegroundColor Green
Write-Host "FERDIG!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "Supabase CLI er nå installert og Edge Functions er deployet!" -ForegroundColor White
Write-Host "Oppdater DNS på GoDaddy og legg til GitHub secrets for full deployment." -ForegroundColor White

Read-Host "Press Enter to exit"
