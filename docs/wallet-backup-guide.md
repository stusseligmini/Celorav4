# 🔐 Celora Wallet Backup System - Dokumentasjon

## 📋 Oversikt

Celora Wallet Backup System tilbyr en sikker og automatisert løsning for å ta backup av brukerens wallets og transaksjonshistorikk. Systemet er designet for å sikre at brukerne aldri mister tilgang til sine digitale eiendeler, selv ved tap av enheter eller andre problemer.

## 🔑 Nøkkelfunksjoner

- **Krypterte backuper**: All backupdata er end-to-end kryptert
- **Fleksible backup-alternativer**: Manuell eller automatisk (daglig, ukentlig, månedlig)
- **Transaksjonshistorikk**: Valgfri inkludering av transaksjonshistorikk
- **Selektive backuper**: Mulighet for å velge spesifikke wallets
- **Gjenopprettelsesfunksjonalitet**: Enkel gjenoppretting fra backup
- **Automatisk scheduling**: Konfigurer regelmessige backups

## 🚀 Hvordan bruke backup-systemet

### Manuell Backup

1. Gå til **Wallet**-seksjonen i Celora-appen
2. Klikk på **Backup**-knappen
3. Velg wallets som skal inkluderes (eller velg alle)
4. Velg om transaksjonshistorikk skal inkluderes
5. Klikk på **Create Backup**
6. Din backup vil bli kryptert og lagret sikkert

### Automatiske Backups

1. Gå til **Settings** > **Backup Configuration**
2. Aktiver **Auto Backup**
3. Velg ønsket frekvens (daglig, ukentlig eller månedlig)
4. Konfigurer andre alternativer (inkluder transaksjoner, etc.)
5. Klikk **Save**

### Gjenoppretting fra Backup

1. Gå til **Wallet** > **Restore**
2. Velg backup fra listen over tilgjengelige backups
3. Angi om eksisterende wallets skal overskrives
4. Velg om transaksjoner skal gjenopprettes
5. Klikk **Restore**

## ⚙️ Teknisk Implementasjon

Backup-systemet består av flere komponenter:

### Database-tabeller

- `wallet_backups`: Lagrer selve backup-dataene
- `wallet_backup_schedules`: Håndterer automatiske backup-planer

### API-endepunkter

- `POST /api/wallet/backup`: Oppretter en ny backup
- `GET /api/wallet/backup`: Henter alle backups for brukeren
- `GET /api/wallet/backup/:id`: Henter en spesifikk backup
- `POST /api/wallet/backup/:id`: Gjenoppretter fra backup
- `POST /api/wallet/backup/schedule`: Konfigurerer automatiske backups

### Frontend-komponenter

- `useWalletBackup`: React hook for backup-funksjonalitet
- `WalletBackupPanel`: UI-komponent for backup-håndtering

## 🔒 Sikkerhet

- All backup-data er kryptert med AES-256 før lagring
- Krypteringsnøkler lagres aldri i databasen
- Row Level Security (RLS) sikrer at brukere bare kan se sine egne backups
- Alle backup-operasjoner logges i audit-systemet

## 🛠️ Feilsøking

### Vanlige problemer

1. **Backup feiler med krypteringsfeil**
   - Sjekk at `WALLET_ENCRYPTION_KEY` er korrekt satt i miljøvariabler

2. **Kan ikke se tidligere backups**
   - Verifiser at du er logget inn med samme konto som opprettet backupene

3. **Automatiske backups kjøres ikke**
   - Sjekk at cron-jobben er korrekt konfigurert
   - Verifiser at `wallet_backup_schedules`-tabellen har aktive oppføringer

## 📊 Administrasjon

For administratorer:

- Backups eldre enn 30 dager blir automatisk slettet hvis antallet overstiger brukerens kvote
- Standard er å beholde de 5 nyeste backupene
- Backup-størrelse teller ikke mot brukerens lagringskvote

---

Dokumentert av Celora Development Team
Sist oppdatert: Oktober 1, 2025