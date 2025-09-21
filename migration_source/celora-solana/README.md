# Celora Platform

En DeFi-plattform bygget på Solana blockchain med fokus på enkel og intuitiv kryptovaluta-håndtering.

## Funksjoner

- Tilkobling til Phantom wallet
- Dashboardvisning med portfolio-oversikt
- Crypto-swap funksjonalitet
- Token-balanseoversikt
- Transaksjonshistorikk
- Supabase-integrasjon for database og brukerautentisering

## Teknologier

- Next.js 15.5.2
- Solana Web3.js
- TailwindCSS med custom cyan-grønn fargepalett
- Typescript
- Supabase for database, auth og hosting

## Kom i gang

### Forutsetninger
- Node.js 18+ installert
- Phantom wallet-utvidelse i nettleseren

### Installasjon

1. Klone repoet
   ```
   git clone https://github.com/stusseligmini/Celora-platform.git
   cd Celora-platform
   ```

2. Installer avhengigheter
   ```
   npm install
   # eller
   yarn
   ```

3. Start utviklingsserveren
   ```
   npm run dev
   # eller
   yarn dev
   ```

4. Åpne [http://localhost:3000](http://localhost:3000) i nettleseren

## Design

Plattformen bruker en cyan-grønn fargepalett med en mørk blågrønn bakgrunn for å skape et profesjonelt og moderne utseende.

## Supabase Deployment

### Forutsetninger

1. Opprett en konto på [Supabase](https://supabase.com)
2. Opprett et nytt prosjekt
3. Finn og noter deg følgende informasjon fra ditt Supabase-prosjekt:
   - Project URL
   - API Keys (anon key)
   - Project reference ID
   - Database password

### Konfigurasjon

1. Kopier `.env.local.example` til `.env.local` og fyll inn Supabase-informasjonen:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Installer Supabase CLI:
   ```
   npm install -g supabase
   ```

3. Logg inn på Supabase CLI:
   ```
   supabase login
   ```

4. Koble CLI til ditt prosjekt:
   ```
   supabase link --project-ref your-project-ref
   ```

5. Push database-skjema til Supabase:
   ```
   supabase db push
   ```

### GitHub Actions Deployment

For automatisk deployment via GitHub Actions, legg til følgende secrets i GitHub repository settings:

- SUPABASE_ACCESS_TOKEN
- SUPABASE_PROJECT_REF
- SUPABASE_DB_PASSWORD
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SOLANA_RPC_URL