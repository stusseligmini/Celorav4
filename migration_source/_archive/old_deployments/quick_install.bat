@echo off
REM =============================
REM Celora Quick Install
REM =============================

echo Starting Celora Supabase installation...
echo.
echo This will:
echo 1. Download and install Supabase CLI
echo 2. Login to Supabase
echo 3. Deploy Edge Functions
echo 4. Show setup instructions for DNS and GitHub
echo.

powershell -ExecutionPolicy Bypass -File install_supabase_direct.ps1

pause
