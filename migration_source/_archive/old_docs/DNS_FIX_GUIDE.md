# Celora DNS Setup Instructions

## Nåværende status (11. september 2025)
- ✅ app.celora.net → Supabase Edge Functions (fungerer)
- ✅ api.celora.net → Supabase Edge Functions (fungerer) 
- ❌ celora.net → 75.2.60.5 (gammel Netlify, ikke Supabase)

## DNS-endringer som trengs

### 1. Fjern gammel A-record for celora.net
I DNS-panelet ditt:
- Slett A-record: `@` → `75.2.60.5`
- Slett eventuell CNAME: `www` → Netlify

### 2. Legg til ALIAS/ANAME for apex domain (anbefalt)
- Type: ALIAS eller ANAME (avhenger av DNS-leverandør)
- Host: `@` (eller blank for root)
- Target: `ofsfbmahiysfhkmazlzg.functions.supabase.co`
- TTL: 300 (5 min)

### 3. Alternativ: Redirect fra apex til app
Hvis DNS ikke støtter ALIAS:
- Sett opp HTTP redirect: `celora.net` → `https://app.celora.net`

### 4. Behold subdomain CNAME (allerede riktig)
- `app` CNAME → `ofsfbmahiysfhkmazlzg.functions.supabase.co` ✅
- `api` CNAME → `ofsfbmahiysfhkmazlzg.functions.supabase.co` ✅

## Supabase Custom Domains

I Supabase Dashboard:
1. Gå til Project Settings → Custom Domains
2. Legg til domener:
   - `celora.net`
   - `app.celora.net` 
   - `api.celora.net`
3. Vent på SSL-provisioning

## Test etter endringer

```bash
# DNS-oppslag
nslookup celora.net
# Skal vise: ofsfbmahiysfhkmazlzg.functions.supabase.co

# HTTP-test
curl -I https://celora.net
# Skal vise: 200 OK fra Supabase

# Funksjonalitet
curl https://celora.net
curl https://app.celora.net  
curl https://api.celora.net/health
```

## Forventet resultat
- 🏠 https://celora.net → Landing page (Supabase Edge Function)
- 🚀 https://app.celora.net → Full Celora app (React/Next.js) 
- 📡 https://api.celora.net → API endpoints

Alle domener serveres fra Supabase med SSL.

## Deploy-kommandoer (kjøres automatisk)

```bash
# Deploy Edge Functions
supabase functions deploy celora-hosting --project-ref ofsfbmahiysfhkmazlzg
supabase functions deploy celora-api --project-ref ofsfbmahiysfhkmazlzg

# Verifiser deployment
supabase functions list --project-ref ofsfbmahiysfhkmazlzg
```

Systemet er klart når DNS propagerer (15-60 minutter).
