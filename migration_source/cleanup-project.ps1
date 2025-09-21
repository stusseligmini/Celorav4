# PowerShell-script for å rydde opp i Celora-prosjektet
# Dette scriptet oppretter en _archive-struktur og flytter utdaterte filer
# u#----------------------------------------------
# 4. Flytt utdaterte GitHub Workflows
#----------------------------------------------
Write-Status "Flytter utdaterte GitHub workflows..."

$workflowsFolder = Join-Path -Path $rootFolder -ChildPath ".github\workflows"

if (Test-Path -Path $workflowsFolder) {
    $workflowsToMove = @(
        "database_monitoring.yml",
        "render-deploy.yml",
        "deploy.yml",
        "neon_workflow.yml"
    )
    
    # Behold disse workflows
    $workflowsToKeep = @(
        "deploy-supabase.yml",
        "ci-cd.yml"  # CI/CD pipeline som ser ut til å være aktiv
    )
    
    Move-FilesToArchive -SourceFolder $workflowsFolder -TargetFolder $oldWorkflowsFolder -FilePatterns $workflowsToMove
}
else {
    Write-Status "GitHub workflows-mappe ikke funnet, hopper over..."
}ik at du kan beholde historikken

# Funksjon for å vise status meldinger
function Write-Status {
    param (
        [string]$Message
    )
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] $Message" -ForegroundColor Cyan
}

# Funksjon for å opprette mappe hvis den ikke eksisterer
function Ensure-Directory {
    param (
        [string]$Path
    )
    if (-not (Test-Path -Path $Path)) {
        New-Item -Path $Path -ItemType Directory | Out-Null
        Write-Status "Opprettet mappe: $Path"
    }
}

# Funksjon for å flytte filer til en målmappe
function Move-FilesToArchive {
    param (
        [string]$SourceFolder,
        [string]$TargetFolder,
        [string[]]$FilePatterns
    )
    
    # Opprett målmappe hvis den ikke eksisterer
    Ensure-Directory -Path $TargetFolder
    
    foreach ($pattern in $FilePatterns) {
        $files = Get-ChildItem -Path $SourceFolder -Filter $pattern -File
        
        foreach ($file in $files) {
            $targetPath = Join-Path -Path $TargetFolder -ChildPath $file.Name
            
            # Sjekk om målfil allerede eksisterer
            if (Test-Path -Path $targetPath) {
                $newName = $file.BaseName + "_" + (Get-Date -Format "yyyyMMdd_HHmmss") + $file.Extension
                $targetPath = Join-Path -Path $TargetFolder -ChildPath $newName
            }
            
            # Flytt fil
            Move-Item -Path $file.FullName -Destination $targetPath
            Write-Status "Flyttet: $($file.Name) -> $targetPath"
        }
    }
}

# Hovedmappen (gjeldende mappe der scriptet kjøres fra)
$rootFolder = $PSScriptRoot
Write-Status "Starter opprydning i: $rootFolder"

# Opprett hovedarkivmapper
$archiveRoot = Join-Path -Path $rootFolder -ChildPath "_archive"
Ensure-Directory -Path $archiveRoot

$oldAppsFolder = Join-Path -Path $archiveRoot -ChildPath "old_apps"
$oldDeploymentsFolder = Join-Path -Path $archiveRoot -ChildPath "old_deployments"
$oldWorkflowsFolder = Join-Path -Path $archiveRoot -ChildPath "old_workflows"
$oldDocsFolder = Join-Path -Path $archiveRoot -ChildPath "old_docs"
$oldConfigsFolder = Join-Path -Path $archiveRoot -ChildPath "old_configs"
$archiveLogsFolder = Join-Path -Path $archiveRoot -ChildPath "logs"
$subprojectsFolder = Join-Path -Path $archiveRoot -ChildPath "subprojects"

Ensure-Directory -Path $oldAppsFolder
Ensure-Directory -Path $oldDeploymentsFolder
Ensure-Directory -Path $oldWorkflowsFolder
Ensure-Directory -Path $oldDocsFolder
Ensure-Directory -Path $oldConfigsFolder
Ensure-Directory -Path $archiveLogsFolder
Ensure-Directory -Path $subprojectsFolder

#----------------------------------------------
# 1. Flytt utdaterte app-filer
#----------------------------------------------
Write-Status "Flytter utdaterte app-filer..."

$appFilesToMove = @(
    "app_simple.py",
    "simple_app.py",
    "minimal_app.py",
    "monitor-deployment.py",
    "monitoring.py",
    "validate-deployment.py",
    "test_integration.py",
    "check_env.py",
    "celora_wallet_implementation.ipynb",
    "celora-api.js",
    "celora-wallet-modern.html",
    "index.html",
    "sw.js"
)

# Behold disse app-filene
$appFilesToKeep = @(
    "enhanced_app.py",
    "celora_wallet.py",
    "database_models.py",
    "kms_key_manager.py",
    "test_wallet.py"
)

Move-FilesToArchive -SourceFolder $rootFolder -TargetFolder $oldAppsFolder -FilePatterns $appFilesToMove

#----------------------------------------------
# 2. Flytt utdaterte deployment scripts
#----------------------------------------------
Write-Status "Flytter utdaterte deployment scripts..."

# Sjekk om vi har deploy-supabase.ps1
$hasSupabaseDeployScript = Test-Path (Join-Path -Path $rootFolder -ChildPath "deploy-supabase.ps1")

$deployScriptsToMove = @(
    "deploy.ps1",
    "deploy.sh",
    "deploy.js",
    "deploy-simple.ps1",
    "deploy-now.ps1",
    "deploy-full-stack.ps1",
    "deploy-to-netlify.ps1",
    "deploy-to-netlify.bat",
    "test-domain.ps1",
    "check-dns.ps1",
    "setup_celora.ps1",
    "setup_celora.bat",
    "quick_install.bat",
    "install_and_setup.bat",
    "install_supabase_direct.ps1",
    "start-backend.bat"
)

# Hvis deploy-supabase.ps1 ikke finnes, oppdater opprydningsnotatet
if (-not $hasSupabaseDeployScript) {
    Write-Status "MERK: deploy-supabase.ps1 finnes ikke. Beholder deploy.ps1 som hovedscript."
    $deployScriptsToMove = $deployScriptsToMove | Where-Object { $_ -ne "deploy.ps1" }
}

Move-FilesToArchive -SourceFolder $rootFolder -TargetFolder $oldDeploymentsFolder -FilePatterns $deployScriptsToMove

#----------------------------------------------
# 3. Flytt utdaterte GitHub Workflows
#----------------------------------------------
Write-Status "Flytter utdaterte GitHub workflows..."

$workflowsFolder = Join-Path -Path $rootFolder -ChildPath ".github\workflows"

if (Test-Path -Path $workflowsFolder) {
    $workflowsToMove = @(
        "database_monitoring.yml",
        "render-deploy.yml",
        "deploy.yml",
        "neon_workflow.yml"
    )
    
    Move-FilesToArchive -SourceFolder $workflowsFolder -TargetFolder $oldWorkflowsFolder -FilePatterns $workflowsToMove
}
else {
    Write-Status "GitHub workflows-mappe ikke funnet, hopper over..."
}

#----------------------------------------------
# 4. Flytt utdaterte dokumentasjonsfiler
#----------------------------------------------
Write-Status "Flytter utdaterte dokumentasjonsfiler..."

$docsToMove = @(
    "NEON_DATABASE_SETUP.md",
    "RAILWAY_DEPLOYMENT_GUIDE.md",
    "RAILWAY_SETUP_INSTRUCTIONS.md",
    "RAILWAY_VS_NEON_COMPARISON.md",
    "RENDER_SETUP.md",
    "FLY_DEPLOYMENT_READY.md",
    "FLY_IO_DEPLOYMENT_GUIDE.md",
    "FLY_IO_FULL_STACK.md",
    "BACKEND_COMPLETE.md",
    "BACKEND_FIXES.md",
    "DEPLOYMENT_READY.md",
    "DEPLOYMENT_READY_RAILWAY.md",
    "DEPLOYMENT_COMPLETE.md",
    "DEPLOYMENT_SUCCESS_REPORT.md",
    "DEPLOYMENT_SUCCESS.md",
    "DEPLOYMENT.md",
    "DNS_FIX_GUIDE.md",
    "SSL_FIX_GUIDE.md",
    "DEVELOPMENT_SUMMARY.md",
    "CELORA_DOMAIN_SETUP.md",
    "DEPLOY_FRONTEND.md",
    "DATABASE_FIX.md",
    "CREDENTIALS_SETUP_GUIDE.md",
    "COMPLETE_CELORA_PROMPT.md",
    "STRUCTURE_ANALYSIS_COMPLETE.md",
    "AI_HANDOFF.md",
    "GIT_DEPLOYMENT_SUCCESS.md"
)

# Behold disse dokumentasjonsfilene
$docsToKeep = @(
    "README.md",
    "LICENSE",
    "CLEANUP_PLAN.md",
    "CLEANUP_REPORT.md"
)

Move-FilesToArchive -SourceFolder $rootFolder -TargetFolder $oldDocsFolder -FilePatterns $docsToMove

#----------------------------------------------
# 5. Flytt utdaterte konfigurasjonsfiler
#----------------------------------------------
Write-Status "Flytter utdaterte konfigurasjonsfiler..."

$configsToMove = @(
    "netlify.toml",
    "render.yaml",
    "fly.toml",
    "railway.toml",
    "Procfile",
    "docker-compose.yml",
    "Dockerfile",
    "backend-package.json",
    "requirements_simple.txt",
    "requirements_minimal.txt",
    "_headers",
    "_redirects",
    "jest.config.json",
    "neon-schema.sql",
    "manifest.json"
)

# Behold disse konfigurasjonene
$configsToKeep = @(
    "tsconfig.json",    # Kan fortsatt være viktig for Supabase TypeScript funksjoner
    "package.json",     # Hovedpakke-fil
    "requirements.txt", # Hovedkrav-fil
    "requirements_wallet.txt", # Spesifikke krav for wallet
    ".env",             # Miljøvariabler
    ".env.template"     # Miljøvariabel-mal
)

Move-FilesToArchive -SourceFolder $rootFolder -TargetFolder $oldConfigsFolder -FilePatterns $configsToMove

#----------------------------------------------
# 6. Organiser underprosjektmapper
#----------------------------------------------
Write-Status "Organiserer underprosjektmapper..."

# Oppretter en struktur for organisering av underprosjekter
$subprojectsFolder = Join-Path -Path $archiveRoot -ChildPath "subprojects"
Ensure-Directory -Path $subprojectsFolder

# Beholdes i rot-mappen (viktige for Supabase stack)
$foldersToKeep = @(
    "supabase",     # Supabase konfigurasjoner og funksjoner
    "celora-supabase", # Supabase-relatert kode
    ".github",      # GitHub workflows
    "src",          # Kildekode
    "tests",        # Tester
    "_archive"      # Denne mappen vi oppretter
)

# Sjekk om vi har viktige Supabase-mapper som må beholdes
$hasSupabaseFolder = Test-Path (Join-Path -Path $rootFolder -ChildPath "supabase")
$hasCeloraSupabase = Test-Path (Join-Path -Path $rootFolder -ChildPath "celora-supabase")

if (-not $hasSupabaseFolder -and -not $hasCeloraSupabase) {
    Write-Status "ADVARSEL: Hverken 'supabase' eller 'celora-supabase' mapper funnet. Er du sikker på at dette er et Supabase-prosjekt?"
}

# Sjekk for dist-mappe, som inneholder bygget frontend
$hasDistFolder = Test-Path (Join-Path -Path $rootFolder -ChildPath "dist")
if ($hasDistFolder) {
    Write-Status "dist-mappe funnet (bygget frontend). Denne beholdes for referanse."
}

# Håndtere loggfiler
$logsFolder = Join-Path -Path $rootFolder -ChildPath "logs"
if (Test-Path -Path $logsFolder) {
    $archiveLogsFolder = Join-Path -Path $archiveRoot -ChildPath "logs"
    Ensure-Directory -Path $archiveLogsFolder
    
    # Flytt gamle loggfiler til arkiv, men behold mappen
    $logFiles = Get-ChildItem -Path $logsFolder -Filter "*.log" -File
    foreach ($logFile in $logFiles) {
        if ((Get-Date).Subtract($logFile.LastWriteTime).Days -gt 7) {
            $targetPath = Join-Path -Path $archiveLogsFolder -ChildPath $logFile.Name
            Move-Item -Path $logFile.FullName -Destination $targetPath
            Write-Status "Flyttet gammel loggfil: $($logFile.Name) -> $targetPath"
        }
    }
}

# Sjekk for utdaterte prosjektmapper som kan flyttes
$potentialFoldersToMove = @(
    "celora-backend",  # Erstatt med Supabase
    "celora-moralis",  # Eldre blockchain integrasjon
    "frontend-coming-soon",  # Midlertidige filer
    "infrastructure",  # Gamle infrastrukturmal
    "backend_minimal"  # Minimal backend versjon
)

foreach ($folder in $potentialFoldersToMove) {
    $folderPath = Join-Path -Path $rootFolder -ChildPath $folder
    if (Test-Path -Path $folderPath -PathType Container) {
        $targetPath = Join-Path -Path $subprojectsFolder -ChildPath $folder
        
        # Flytter mappen
        Ensure-Directory -Path (Split-Path -Path $targetPath -Parent)
        Move-Item -Path $folderPath -Destination $targetPath -Force
        Write-Status "Flyttet mappe: $folder -> $targetPath"
    }
}

#----------------------------------------------
# Oppsummering
#----------------------------------------------
$filesTotalBeforeCleanup = (Get-ChildItem -Path $rootFolder -File -Recurse).Count
$filesInArchive = (Get-ChildItem -Path $archiveRoot -File -Recurse).Count
$filesRemainingInRoot = (Get-ChildItem -Path $rootFolder -File -Recurse -Exclude "_archive").Count

Write-Host "`n===== OPPRYDNING FULLFØRT =====" -ForegroundColor Green
Write-Host "Totalt antall filer før opprydning: $filesTotalBeforeCleanup" -ForegroundColor White
Write-Host "Filer flyttet til arkiv: $filesInArchive" -ForegroundColor Yellow
Write-Host "Gjenværende filer i prosjektet: $filesRemainingInRoot" -ForegroundColor Green
Write-Host "`nFølgende mapper ble opprettet:" -ForegroundColor Cyan
Write-Host "- _archive/old_apps/" -ForegroundColor Cyan
Write-Host "- _archive/old_deployments/" -ForegroundColor Cyan
Write-Host "- _archive/old_workflows/" -ForegroundColor Cyan
Write-Host "- _archive/old_docs/" -ForegroundColor Cyan
Write-Host "- _archive/old_configs/" -ForegroundColor Cyan
Write-Host "- _archive/logs/" -ForegroundColor Cyan
Write-Host "- _archive/subprojects/" -ForegroundColor Cyan
Write-Host "`nHusk å oppdatere README.md med aktuell prosjektstruktur og instruksjoner." -ForegroundColor Yellow
Write-Host "MERK: Alle filer er bare flyttet, ikke slettet. Du kan gjenopprette dem fra _archive-mappen hvis nødvendig." -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Green
