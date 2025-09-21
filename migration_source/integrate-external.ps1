# PowerShell-script for å integrere eksterne filer i Celora-prosjektet
# Dette scriptet flytter relaterte filer fra overordnet mappe inn i hovedprosjektet

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

# Hovedmappen (gjeldende mappe der scriptet kjøres fra)
$rootFolder = $PSScriptRoot
$parentFolder = (Get-Item $rootFolder).Parent.FullName
Write-Status "Starter integrasjon fra: $parentFolder til $rootFolder"

# Opprett arkivmapper om nødvendig
$archiveRoot = Join-Path -Path $rootFolder -ChildPath "_archive"
$subprojectsFolder = Join-Path -Path $archiveRoot -ChildPath "subprojects"
$oldDocsFolder = Join-Path -Path $archiveRoot -ChildPath "old_docs"

Ensure-Directory -Path $archiveRoot
Ensure-Directory -Path $subprojectsFolder
Ensure-Directory -Path $oldDocsFolder

# 1. Flytt WALLET_DEPLOYMENT.md til prosjektmappen (til old_docs hvis vi allerede har gjennomført opprydning)
$externalWalletDoc = Join-Path -Path $parentFolder -ChildPath "WALLET_DEPLOYMENT.md"
if (Test-Path -Path $externalWalletDoc) {
    if (Test-Path -Path $oldDocsFolder) {
        # Opprydning er allerede gjort, flytt til arkivet
        $targetPath = Join-Path -Path $oldDocsFolder -ChildPath "WALLET_DEPLOYMENT.md"
        Copy-Item -Path $externalWalletDoc -Destination $targetPath
        Write-Status "Kopiert: $externalWalletDoc -> $targetPath"
    } else {
        # Opprydning er ikke gjort, kopier til hovedmappen
        $targetPath = Join-Path -Path $rootFolder -ChildPath "WALLET_DEPLOYMENT.md"
        Copy-Item -Path $externalWalletDoc -Destination $targetPath
        Write-Status "Kopiert: $externalWalletDoc -> $targetPath"
    }
}

# 2. Flytt celora-backend/ til prosjektmappen (til subprojects hvis vi allerede har gjennomført opprydning)
$externalBackend = Join-Path -Path $parentFolder -ChildPath "celora-backend"
if (Test-Path -Path $externalBackend) {
    $backendInProject = Join-Path -Path $rootFolder -ChildPath "celora-backend"
    $backendInArchive = Join-Path -Path $subprojectsFolder -ChildPath "celora-backend"
    
    if (Test-Path -Path $backendInArchive) {
        # Opprydning er allerede gjort, ikke gjør noe
        Write-Status "celora-backend finnes allerede i arkivet: $backendInArchive"
    }
    elseif (Test-Path -Path $backendInProject) {
        # Mappen finnes allerede i prosjektet, sammenlign og kopier bare filer som mangler
        Write-Status "celora-backend finnes allerede i prosjektet: $backendInProject"
    }
    else {
        # Mappen finnes ikke i prosjektet, kopier hele mappen
        Ensure-Directory -Path $backendInProject
        Copy-Item -Path "$externalBackend\*" -Destination $backendInProject -Recurse
        Write-Status "Kopiert: $externalBackend -> $backendInProject"
    }
}

# 3. Flytt js/ til prosjektmappen
$externalJs = Join-Path -Path $parentFolder -ChildPath "js"
if (Test-Path -Path $externalJs) {
    $jsInProject = Join-Path -Path $rootFolder -ChildPath "js"
    
    if (-not (Test-Path -Path $jsInProject)) {
        # Kopier js-mappen inn i prosjektet hvis den ikke finnes
        Ensure-Directory -Path $jsInProject
        Copy-Item -Path "$externalJs\*" -Destination $jsInProject -Recurse
        Write-Status "Kopiert: $externalJs -> $jsInProject"
    } else {
        # Kopier bare filer som mangler
        $externalJsFiles = Get-ChildItem -Path $externalJs -File -Recurse
        foreach ($file in $externalJsFiles) {
            $relPath = $file.FullName.Substring($externalJs.Length)
            $targetPath = Join-Path -Path $jsInProject -ChildPath $relPath
            $targetDir = Split-Path -Path $targetPath -Parent
            
            if (-not (Test-Path -Path $targetDir)) {
                Ensure-Directory -Path $targetDir
            }
            
            if (-not (Test-Path -Path $targetPath)) {
                Copy-Item -Path $file.FullName -Destination $targetPath
                Write-Status "Kopiert: $($file.FullName) -> $targetPath"
            }
        }
    }
}

# 4. Sjekk for backup-fil og tilby å pakke den ut
$backupZip = Join-Path -Path $parentFolder -ChildPath "Celora_Project-backup.zip"
if (Test-Path -Path $backupZip) {
    Write-Host "`nBackup-fil funnet: $backupZip" -ForegroundColor Yellow
    Write-Host "Denne filen inneholder en backup av prosjektet." -ForegroundColor Yellow
    Write-Host "Hvis du ønsker å pakke ut denne til en separat mappe, kan du kjøre følgende kommando:" -ForegroundColor Yellow
    Write-Host "Expand-Archive -Path `"$backupZip`" -DestinationPath `"$parentFolder\Celora_Project_Backup`"" -ForegroundColor DarkYellow
}

#----------------------------------------------
# Oppsummering
#----------------------------------------------
Write-Host "`n===== INTEGRASJON FULLFØRT =====" -ForegroundColor Green
Write-Host "Filer fra overordnet mappe er nå kopiert inn i hovedprosjektet." -ForegroundColor White
Write-Host "For å unngå rot anbefales det å slette de opprinnelige filene" -ForegroundColor Yellow
Write-Host "når du har verifisert at alle filer er korrekt kopiert." -ForegroundColor Yellow
Write-Host "`nFor å slette de eksterne filene, kan du kjøre:" -ForegroundColor Yellow
Write-Host "Remove-Item -Path `"$parentFolder\js`" -Recurse" -ForegroundColor DarkYellow
Write-Host "Remove-Item -Path `"$parentFolder\celora-backend`" -Recurse" -ForegroundColor DarkYellow
Write-Host "Remove-Item -Path `"$parentFolder\WALLET_DEPLOYMENT.md`"" -ForegroundColor DarkYellow
Write-Host "`nMERK: Sletter ikke automatisk for å være på den sikre siden." -ForegroundColor Red
Write-Host "===============================" -ForegroundColor Green
