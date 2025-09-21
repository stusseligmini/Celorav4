# 🚀 Celora Platform - Oppryddet versjon

## Om prosjektet
Celora Platform er en kryptovaluta-lommebok og DeFi-bankplattform bygget med Supabase, FastAPI og moderne webutvikling.

## 🏗️ Ny prosjektstruktur

```
celora-platform/
├── enhanced_app.py          # Hovedapplikasjon (FastAPI)
├── celora_wallet.py         # Lommebok-implementasjon
├── database_models.py       # Database modeller
├── kms_key_manager.py       # Nøkkelhåndtering for kryptering
├── test_wallet.py           # Enhetstester for wallet
├── supabase/                # Supabase-spesifikke filer
│   ├── functions/          # Edge Functions
│   │   ├── celora-api/     # API-endepunkter
│   │   └── celora-hosting/ # Frontend-hosting
│   └── ...
├── celora-supabase/         # Supabase-relatert applikasjonskode
├── celora-solana/           # Solana programmeringskode (hvis relevant)
├── celora-wallet/           # Frontend-wallet-implementasjon
├── dist/                    # Bygget frontend (for referanse)
├── .github/workflows/      
│   ├── deploy-supabase.yml # Supabase deployment workflow
│   └── ci-cd.yml           # Testing og byggeprosess
├── package.json             # Hovedpakke-konfigurasjon
├── requirements.txt         # Python-avhengigheter
├── README.md                # Denne filen
├── CLEANUP_PLAN.md          # Dokumentasjon om opprydningen
├── CLEANUP_REPORT.md        # Status før opprydning
└── _archive/                # Arkiverte eldre filer (for historikk)
    ├── old_apps/            # Eldre app-versjoner
    ├── old_deployments/     # Utdaterte deployment scripts
    ├── old_workflows/       # Utdaterte GitHub workflows
    ├── old_docs/            # Utdaterte dokumentasjonsfiler
    ├── old_configs/         # Utdaterte konfigurasjonsfiler
    └── subprojects/         # Utdaterte underprosjekter
```

## ✨ Hovedfunksjoner

### 🎯 Frontend
- Multi-chain støtte (Solana, Ethereum)
- Responsivt design
- Progressive Web App (PWA)
- Send/motta/bytte/stake funksjonalitet

### ⚡ Backend (Supabase Edge Functions)
- JWT autentisering med sikkerhetsbegrensninger
- PostgreSQL-database via Supabase
- Sanntids WebSocket-oppdateringer
- KMS nøkkelhåndtering for kryptering
- Strukturert logging og overvåking

## 🚀 Kom i gang

### Forutsetninger
- Node.js 18+ 
- npm 8+
- Supabase-konto

### Installasjon

```bash
# Klon repository
git clone https://github.com/stusseligmini/Celora-platform.git
cd Celora-platform

# Sett opp Supabase-miljøvariabler
cp .env.template .env
# Rediger .env med din konfigurasjon

# Start utviklingsservere
npm run dev
```

## 🛠️ Utvikling

### Frontend-utvikling
```bash
cd celora-wallet
npm run dev
```

### Backend-utvikling
```bash
# Start FastAPI lokalt
uvicorn enhanced_app:app --reload
```

### Supabase-utvikling
```bash
# Installer Supabase CLI hvis ikke allerede installert
npm install -g supabase

# Start lokal Supabase
supabase start

# Deploy funksjoner
supabase functions deploy
```

## 🚀 Produksjonsdeployment

### Deployment-steg:

1. **Supabase Edge Functions**:
   ```bash
   # Deploy via GitHub Actions
   # Eller manuelt:
   supabase functions deploy
   ```

2. **Frontend**:
   ```bash
   # Bygget distribueres automatisk via Supabase hosting
   ```

3. **Database**: 
   - Administreres gjennom Supabase UI

## 📝 Notater

- **Viktig**: Dette prosjektet har gjennomgått en omfattende opprydning. Eldre filer er flyttet til `_archive/`-mappen for referanse.
- **GitHub Actions**: Kun `deploy-supabase.yml` er aktiv. Andre workflows er arkivert.
- **Tilgang**: Domenene er konfigurert gjennom Supabase Custom Domains.

---

**Oppryddet og oppdatert: 2025-09-11**
