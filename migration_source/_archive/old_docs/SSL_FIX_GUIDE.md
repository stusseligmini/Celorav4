# SSL/HTTPS Fix for celora.net

## Problem
Browser shows "Ikke sikker" (Not Secure) warning for celora.net due to SSL certificate issues.

## Quick Fix Steps

### 1. Netlify Dashboard SSL Configuration
1. Gå til [Netlify Dashboard](https://app.netlify.com)
2. Velg Celora-prosjektet
3. Gå til **Domain settings**
4. Under **HTTPS** seksjonen:
   - Sjekk at "Force HTTPS" er aktivert
   - Verifiser at SSL-sertifikatet er provisionert
   - Hvis ikke, klikk "Provision certificate"

### 2. Domain Configuration
Hvis du bruker eget domene (celora.net):
1. I Netlify Dashboard → **Domain settings**
2. Legg til primary domain: `celora.net`
3. Sett opp redirect fra `www.celora.net` til `celora.net`
4. Vent på SSL-sertifikat provisjonering (kan ta 5-10 minutter)

### 3. DNS Settings
Sørg for at DNS-innstillingene peker riktig:
```
A record: @ → Netlify IP (f.eks. 75.2.60.5)
CNAME: www → your-site.netlify.app
```

## Files Updated

### netlify.toml
- Lagt til HTTPS force redirect
- Lagt til HSTS header for sikkerhetsheader
- Forbedret SSL-konfigurasjon

### _redirects
- HTTP til HTTPS redirects
- WWW til non-WWW redirect
- API proxy konfigurert

## Testing

Etter deployment (2-3 minutter):
1. Test: https://celora.net
2. Sjekk at grønn lås-ikon vises i browser
3. Verifiser at HTTP redirecter til HTTPS

## Troubleshooting

Hvis fortsatt problemer:
1. Vent 10-15 minutter på SSL-provisjonering
2. Sjekk Netlify deploy logs
3. Test med incognito/private browsing
4. Clear browser cache

## Command to Deploy
```bash
git add -A
git commit -m "Fix SSL/HTTPS configuration"
git push origin main
```
