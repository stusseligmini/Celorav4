@echo off
REM =============================
REM Celora Supabase Setup Script
REM =============================

echo Starting Celora Supabase setup...
echo.

REM 1. Sjekk om Supabase CLI er installert
echo Checking if Supabase CLI is installed...
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Supabase CLI not found. Please install it first:
    echo.
    echo Option 1 - Chocolatey:
    echo   choco install supabase
    echo.
    echo Option 2 - Scoop:
    echo   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    echo   scoop install supabase
    echo.
    echo Option 3 - Download binary from: https://github.com/supabase/cli/releases
    echo.
    echo After installation, run this script again.
    pause
    exit /b 1
)

echo Supabase CLI found!
echo.

REM 2. Logg inn på Supabase CLI
echo Logging into Supabase CLI...
supabase login

REM 3. Initialiser Supabase-prosjekt (hvis ikke gjort)
echo Initializing Supabase project...
if not exist "supabase\config.toml" (
    supabase init
) else (
    echo Supabase project already initialized.
)

REM 4. Deploy Edge Functions
echo Deploy celora-hosting...
supabase functions deploy celora-hosting
echo Deploy celora-api...
supabase functions deploy celora-api

REM 5. Instruks for domene (GoDaddy)
echo.
echo =============================
echo DOMENESETUP (GoDaddy -> Supabase)
echo =============================
echo 1. Logg inn på GoDaddy.com

echo 2. Gå til DNS-innstillinger for celora.net

echo 3. Slett ALIAS/ANAME/CNAME som peker til Netlify

echo 4. Legg til ny ALIAS/ANAME/CNAME:
echo   - Type: CNAME
   - Name: @
   - Value: edge.supabase.co
   - TTL: 1 hour

echo 5. Lagre endringer

echo 6. Gå til Supabase dashboard -> Project -> Custom Domains
   - Legg til celora.net
   - Følg eventuelle ekstra instruksjoner

echo.
echo =============================
echo GITHUB SECRETS FOR CI/CD
=============================
echo 1. Gå til GitHub repo: stusseligmini/Celora-platform

echo 2. Settings -> Secrets -> Actions

echo 3. Legg til:
echo   - SUPABASE_ACCESS_TOKEN: [Din Supabase access token]
   - PROJECT_REF: [Din Supabase project ref]

echo 4. Push til main branch for auto-deploy

echo.
echo =============================
echo FERDIG! Sjekk DNS_FIX_GUIDE.md for mer info
=============================
pause
