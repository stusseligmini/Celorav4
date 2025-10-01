# Celora Wallet Backup - Deployment Guide

Denne guiden beskriver hvordan du setter opp og deployerer wallet backup-systemet for Celora plattformen.

## Forutsetninger

Før du starter, sørg for at:

1. Hovedskjema for Celora er allerede installert i Supabase
2. Du har tilgang til Supabase-prosjektet med passende rettigheter
3. Du har satt opp miljøvariabel `WALLET_ENCRYPTION_KEY` i dine app-innstillinger

## Installasjonstrinn

### 1. Database Setup

1. Logg inn på [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg ditt Celora prosjekt
3. Gå til **SQL Editor**
4. Last opp eller kopier innholdet fra `supabase-wallet-backup-setup.sql`
5. Klikk på **Run** for å kjøre skriptet
6. Verifiser at operasjonen ble gjennomført med suksessmelding

### 2. Miljøvariabler

For å aktivere kryptering av backup data, legg til følgende i dine miljøvariabler:

```
WALLET_ENCRYPTION_KEY=<din_sikre_krypteringsnøkkel>
```

- I Vercel: Project Settings > Environment Variables
- Lokalt: Legg til i `.env.local` filen

### 3. API-integrasjon

Bekreft at API-endepunktene er riktig konfigurert:

- `/api/wallet/backup` - Håndterer oppretting og henting av backups
- `/api/wallet/backup/[id]` - Håndterer gjenoppretting fra backup
- `/api/wallet/backup/schedule` - Håndterer backup-scheduling

### 4. Frontend-testing

Etter deployment, test følgende flyt for å verifisere at alt fungerer:

1. Logg inn på applikasjonen
2. Gå til Wallet-seksjonen
3. Test manuell backup ved å klikke "Backup Now"
4. Test automatisk backup ved å sette opp en backup-schedule
5. Verifiser at backupene blir synlige i backup-historikken

## Feilsøking

### Kjente problemer

1. **SQL Feil ved installasjon**

   Hvis du ser SQL-feil relatert til eksisterende objekter, kan det hende at deler av skjemaet allerede er installert. Vurder å kjøre skriptet i mindre deler.

2. **ON CONFLICT feil**

   Hvis du ser ON CONFLICT feil, verifiser at det er UNIQUE constraints på de aktuelle kolonnene.

3. **Krypteringsproblemer**

   Hvis du opplever krypteringsfeil, sjekk at `WALLET_ENCRYPTION_KEY` er satt korrekt på både backend og frontend.

### Logikk for å oppdatere fra tidligere versjoner

Hvis du oppdaterer fra en tidligere versjon av wallet backup-systemet:

1. Ta backup av eksisterende data
2. Kjør migrasjonen med `-v2` funksjonsnavn
3. Oppdater API-kall for å bruke de nye funksjonene

## Verifisering

Etter installasjon, verifiser at:

1. Tabellene `wallet_backups` og `wallet_backup_schedules` eksisterer
2. Dine eksisterende wallets har fått de nye kolonnene for backup-støtte
3. Du kan opprette nye backups gjennom API-endepunktene
4. Row Level Security fungerer korrekt (brukere kan bare se sine egne backups)

## Teknisk støtte

Ved problemer med installasjon eller bruk, kontakt:

- Tech support: support@celora.io
- Utviklingsteamet: dev@celora.io