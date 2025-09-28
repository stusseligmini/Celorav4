# DNS Check Script for celora.net
# Run this periodically to check if DNS has propagated

Write-Host "Checking DNS propagation for celora.net..." -ForegroundColor Yellow
Write-Host ""

# Check main domain
Write-Host "Main domain (celora.net):" -ForegroundColor Green
nslookup celora.net

Write-Host ""
Write-Host "WWW subdomain (www.celora.net):" -ForegroundColor Green  
nslookup www.celora.net

Write-Host ""
Write-Host "Expected IP address: 46.249.254.46" -ForegroundColor Cyan
Write-Host "Expected CNAME for www: cname.vercel-dns.com" -ForegroundColor Cyan

Write-Host ""
Write-Host "If you see the expected values above, your DNS has propagated!" -ForegroundColor Green
Write-Host "If not, wait 30 minutes and run this script again." -ForegroundColor Yellow