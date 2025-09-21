# Deployment script for optimized Lambda package
Write-Host "Creating optimized deployment package..."

# Clean up previous deployment
if (Test-Path "deploy-temp") { Remove-Item "deploy-temp" -Recurse -Force }
New-Item -ItemType Directory -Name "deploy-temp"

# Copy essential files
Copy-Item "dist" "deploy-temp/dist" -Recurse
Copy-Item "package.json" "deploy-temp/"
Copy-Item "prisma" "deploy-temp/prisma" -Recurse

# Copy only essential node_modules
Write-Host "Copying essential dependencies..."
$essentialPackages = @(
    "@prisma/client",
    "serverless-http", 
    "express",
    "cors",
    "helmet",
    "express-rate-limit",
    "dotenv"
)

New-Item -ItemType Directory -Path "deploy-temp/node_modules" -Force

foreach ($package in $essentialPackages) {
    if (Test-Path "node_modules/$package") {
        $destPath = "deploy-temp/node_modules/$package"
        New-Item -ItemType Directory -Path (Split-Path $destPath) -Force -ErrorAction SilentlyContinue
        Copy-Item "node_modules/$package" $destPath -Recurse -Force
    }
}

# Copy package dependencies
$dependencies = @(
    "mime-types",
    "mime-db", 
    "cookie-signature",
    "cookie",
    "accepts",
    "negotiator",
    "range-parser",
    "content-type",
    "content-disposition",
    "depd",
    "destroy",
    "ee-first",
    "encodeurl",
    "escape-html",
    "etag",
    "finalhandler",
    "forwarded",
    "fresh",
    "http-errors",
    "inherits",
    "ipaddr.js",
    "media-typer",
    "merge-descriptors",
    "methods",
    "on-finished",
    "parseurl",
    "path-to-regexp",
    "proxy-addr",
    "qs",
    "safe-buffer",
    "send",
    "serve-static",
    "setprototypeof",
    "statuses",
    "type-is",
    "utils-merge",
    "vary"
)

foreach ($dep in $dependencies) {
    if (Test-Path "node_modules/$dep") {
        Copy-Item "node_modules/$dep" "deploy-temp/node_modules/$dep" -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Create compressed package
Write-Host "Creating compressed package..."
Set-Location "deploy-temp"
Compress-Archive -Path "*" -DestinationPath "../backend-deploy-optimized.zip" -Force
Set-Location ".."

# Clean up
Remove-Item "deploy-temp" -Recurse -Force

# Check size
$size = (Get-Item "backend-deploy-optimized.zip").Length / 1MB
Write-Host "Optimized package size: $([math]::Round($size, 2)) MB"
