# 🚀 CELORA PLATFORM - KOMPLETT SETUP GUIDE

## 📋 OVERSIKT
Denne guiden setter opp hele Celora platformen fra bunnen av på Vercel og Supabase.

## 🎯 1. SUPABASE SETUP

### Steg 1: Opprett Supabase Prosjekt
1. Gå til [supabase.com](https://supabase.com)
2. Klikk "Start your project"
3. Opprett nytt prosjekt:
   - **Project name**: `celora-platform`
   - **Database password**: (generer sikker passord)
   - **Region**: `West Europe` (nærmest Norge)

### Steg 2: Sett opp Database
1. I Supabase dashboard, gå til **SQL Editor**
2. Kopier innholdet fra `database-setup.sql`
3. Lim inn og kjør scriptet
4. Verifiser at alle tabeller ble opprettet under **Database > Tables**

### Steg 3: Konfigurer Authentication
1. Gå til **Authentication > Settings**
2. Under **Site URL**, legg til:
   ```
   https://celora-platform.vercel.app
   ```
3. Under **Redirect URLs**, legg til:
   ```
   https://celora-platform.vercel.app/**
   http://localhost:3000/**
   ```
4. Under **Auth Providers**, aktiver:
   - ✅ **Email** (allerede aktivert)
   - Skru AV: **Confirm email** (for enklere testing)
   - Skru AV: **Enable CAPTCHA protection** (unngår captcha-problemer)

### Steg 4: Hent API-nøkler
1. Gå til **Settings > API**
2. Kopier disse verdiene:
   - **Project URL**: `https://[din-project-id].supabase.co`
   - **anon public**: `eyJ...`
   - **service_role**: `eyJ...` (KUN for server-side!)

## 🎯 2. VERCEL SETUP

### Steg 1: Koble GitHub Repository
1. Gå til [vercel.com](https://vercel.com)
2. Klikk **"New Project"**
3. Import fra GitHub: `stusseligmini/Celorav4`
4. **Project Name**: `celora-platform`
5. **Framework**: Next.js (auto-detect)

### Steg 2: Sett Environment Variables
I Vercel project settings > **Environment Variables**, legg til:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[din-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[din-anon-key]
SUPABASE_SERVICE_ROLE_KEY=eyJ[din-service-role-key]

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://celora-platform.vercel.app
NODE_ENV=production
```

### Steg 3: Deploy
1. Klikk **"Deploy"**
2. Vent på deployment (2-3 minutter)
3. Test på: `https://celora-platform-[random].vercel.app`

### Steg 4: Sett Custom Domain
1. I Vercel project > **Settings > Domains**
2. Legg til: `celora-platform.vercel.app`
3. Vent på DNS propagation (1-2 minutter)

## 🎯 3. TESTING & VERIFICATION

### Test 1: Seed Phrase Wallet Creation
1. Gå til `https://celora-platform.vercel.app`
2. Klikk **"Sign Up"**
3. Velg **"Seed Phrase Wallet"**
4. Fyll inn navn og generer seed phrase
5. Verifiser alle 12 ord
6. **Forventet resultat**: "Wallet created successfully! Logging you in..."

### Test 2: Sign In med Seed Phrase
1. Gå til **"Sign In"**
2. Velg **"Seed Phrase"** tab
3. Skriv inn de 12 ordene
4. **Forventet resultat**: Automatisk innlogging til dashboard

### Test 3: Email Registration (fallback)
1. Gå til **"Sign Up"**
2. Velg **"Email Account"**
3. Registrer med email/passord
4. **Forventet resultat**: Umiddelbar registrering uten email-bekreftelse

## 🎯 4. CAPTCHA-FRI KONFIGURASJON

### Hvorfor ingen captcha-problemer:
✅ **Admin API**: Bruker Supabase Admin API for wallet-opprettelse
✅ **Service Role**: Bypasser alle rate limits og captcha
✅ **Backup API Routes**: `/api/auth/create-wallet` og `/api/auth/verify-wallet`
✅ **Retry Logic**: Intelligent retry-system ved timing-issues
✅ **RLS Security**: Database-sikkerhet på rad-nivå istedenfor captcha

## 🎯 5. DATABASE STRUKTUR

### Tabeller (10 stk):
1. **profiles** - Brukerinfo og wallet-type
2. **wallets** - Crypto-wallets med balanse
3. **virtual_cards** - Celora kort med limits
4. **transactions** - Alle finansielle transaksjoner
5. **security_events** - Fraud detection og logging
6. **notifications** - Bruker-notifikasjoner
7. **crypto_holdings** - Crypto-portfolio
8. **api_keys** - Eksterne integrasjoner
9. **auth.users** - Supabase auth (auto-opprettet)
10. **auth.sessions** - Session management (auto-opprettet)

### Automatiske Triggers:
- **New User Setup**: Lager automatisk wallet og welcome-notifikasjon
- **Updated Timestamps**: Auto-oppdatering av `updated_at` felter
- **RLS Policies**: Sikrer at brukere kun ser egne data

## 🎯 6. ADMIN & MONITORING

### Supabase Dashboard Tilgang:
- **Database**: Se alle tabeller og data
- **Auth**: Administrer brukere og sessions
- **Storage**: File uploads (hvis nødvendig senere)
- **Edge Functions**: Serverless functions (hvis nødvendig)

### Vercel Dashboard Tilgang:
- **Deployments**: Se alle deployments og logs
- **Analytics**: Trafikk og performance
- **Functions**: API route monitoring
- **Domains**: DNS og SSL management

## 🎯 7. FEILSØKING

### Vanlige problemer:
1. **"Invalid API key"**: Sjekk at SUPABASE_SERVICE_ROLE_KEY er riktig
2. **"CORS error"**: Sjekk at Site URL er riktig i Supabase
3. **"Database error"**: Verifiser at database-script ble kjørt
4. **"Captcha verification failed"**: Systemet skal unngå dette automatisk

### Logg-tilgang:
- **Vercel Functions**: Se API route logs i Vercel dashboard
- **Supabase Logs**: Se database queries i Supabase dashboard
- **Browser Console**: Detaljerte debugging-meldinger

## 🎉 FERDIG!

Når alt er satt opp riktig, har du:
✅ **Komplett fintech platform** med crypto wallet-støtte
✅ **Captcha-fri registrering** via Admin API
✅ **Professional domain**: celora-platform.vercel.app  
✅ **Enterprise database** med 10 tabeller og automatiske triggere
✅ **Real-time dashboard** med transaksjoner og analytics
✅ **Skalerbar arkitektur** klar for produksjon

**Test URL**: https://celora-platform.vercel.app

Systemet er nå klart for registrering og testing! 🚀