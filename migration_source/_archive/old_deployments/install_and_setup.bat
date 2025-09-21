@echo off
REM =============================
REM Celora One-Click Setup
REM =============================

echo Installing Chocolatey package manager...
powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"

echo.
echo Installing Supabase CLI...
choco install supabase -y

echo.
echo Running main setup script...
powershell -ExecutionPolicy Bypass -File setup_celora.ps1

pause
