# Networks Table Migration Guide

## 📋 Oversikt

Denne migrasjonen legger til en `networks`-tabell som definerer alle støttede blockchain-nettverk i Celora-systemet. Den erstatter den gamle løsningen der `wallets.network` var en vanlig TEXT-kolonne med en proper foreign key-relasjon.

## 🎯 Hva blir gjort

### 1. **Networks Tabell**
Oppretter en ny tabell med følgende informasjon:
- **code**: Unik identifikator (solana, ethereum, bitcoin, etc.)
- **name**: Fullt navn (Solana, Ethereum, Bitcoin)
- **chain_id**: EVM chain ID (1 for Ethereum, 137 for Polygon, etc.)
- **native_currency**: Native token (SOL, ETH, BTC, MATIC)
- **rpc_url**: Standard RPC endpoint
- **wss_url**: WebSocket endpoint
- **explorer_url**: Block explorer URL
- **decimals**: Antall desimaler for native token

### 2. **Foreign Key Constraint**
Legger til en foreign key fra `wallets.network` til `networks.code`:
```sql
ALTER TABLE public.wallets 
    ADD CONSTRAINT wallets_network_fk 
    FOREIGN KEY (network) 
    REFERENCES public.networks(code);
```

### 3. **Støttede Nettverk**

#### Mainnet:
- ✅ **solana** - Solana (SOL, 9 decimals)
- ✅ **ethereum** - Ethereum (ETH, 18 decimals)
- ✅ **bitcoin** - Bitcoin (BTC, 8 decimals)
- ✅ **polygon** - Polygon (MATIC, 18 decimals)
- ✅ **fiat** - Fiat Currency (USD, 2 decimals)

#### Testnet:
- 🧪 **solana-devnet** - Solana Devnet
- 🧪 **ethereum-sepolia** - Ethereum Sepolia
- 🧪 **polygon-mumbai** - Polygon Mumbai

## 🚀 Hvordan Kjøre Migrasjonen

### Metode 1: Supabase Dashboard (Anbefalt)

1. Gå til [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg ditt prosjekt
3. Gå til **SQL Editor**
4. Åpne `database/migrate-add-networks-table.sql`
5. Kopier innholdet og lim inn i SQL Editor
6. Klikk **Run**

### Metode 2: PowerShell Script

```powershell
# Fra CeloraV2-mappen
.\scripts\apply-migration.ps1 -MigrationFile "database/migrate-add-networks-table.sql"
```

### Metode 3: psql (hvis du har direkte database-tilgang)

```bash
psql -h your-project.supabase.co -U postgres -d postgres -f database/migrate-add-networks-table.sql
```

## ✅ Verifisering

Etter migrasjonen, kjør disse kommandoene i SQL Editor for å bekrefte:

```sql
-- Sjekk at networks-tabellen er opprettet
SELECT COUNT(*) as network_count FROM public.networks;
-- Skal returnere: 8

-- Sjekk at foreign key eksisterer
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_name = 'wallets_network_fk';
-- Skal returnere: wallets.network -> networks.code

-- Se alle nettverk
SELECT code, name, native_currency, is_testnet, is_active 
FROM public.networks 
ORDER BY is_testnet, code;
```

## 📊 Eksempel-bruk

### Hente network-info i en query:

```sql
-- Hent alle wallets med network-detaljer
SELECT 
    w.id,
    w.wallet_name,
    w.balance,
    n.name as network_name,
    n.native_currency,
    n.explorer_url,
    n.decimals
FROM public.wallets w
JOIN public.networks n ON w.network = n.code
WHERE w.user_id = '123e4567-e89b-12d3-a456-426614174000';
```

### Bruke helper-funksjoner:

```sql
-- Sjekk om et nettverk er støttet
SELECT public.is_network_supported('solana');
-- Returnerer: true

-- Hent network-info
SELECT * FROM public.get_network_info('ethereum');
-- Returnerer: name, chain_id, native_currency, explorer_url, decimals
```

## 🔄 Rollback

Hvis du trenger å rulle tilbake migrasjonen:

```sql
-- Fjern foreign key
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_network_fk;

-- Fjern indexes
DROP INDEX IF EXISTS idx_wallets_network;
DROP INDEX IF EXISTS idx_networks_code;
DROP INDEX IF EXISTS idx_networks_is_active;
DROP INDEX IF EXISTS idx_networks_is_testnet;

-- Fjern funksjoner
DROP FUNCTION IF EXISTS public.get_network_info(TEXT);
DROP FUNCTION IF EXISTS public.is_network_supported(TEXT);

-- Fjern tabell
DROP TABLE IF EXISTS public.networks CASCADE;
```

## 🎨 Frontend Integration

Etter migrasjonen kan du hente network-liste i frontend:

```typescript
// Hent alle aktive nettverk
const { data: networks, error } = await supabase
  .from('networks')
  .select('code, name, native_currency, is_testnet, logo_url')
  .eq('is_active', true)
  .order('is_testnet', { ascending: true })
  .order('name', { ascending: true });

// Bruk i en dropdown
<select name="network">
  {networks?.map(network => (
    <option key={network.code} value={network.code}>
      {network.name} ({network.native_currency})
      {network.is_testnet && ' - Testnet'}
    </option>
  ))}
</select>
```

## 🛡️ Row Level Security

Tabellen har RLS aktivert med følgende policies:

- ✅ **Anyone can view networks**: Alle kan se aktive nettverk (is_active = true)
- 🔒 **Only admins can modify networks**: Kun admins kan endre (for fremtidig bruk)

## ⚠️ Viktige Notater

1. **Data Integritet**: Migrasjonen setter automatisk ugyldige network-verdier til 'fiat'
2. **Cascade Updates**: Foreign key har `ON UPDATE CASCADE`, så endringer i `networks.code` propageres automatisk
3. **Delete Restriction**: `ON DELETE RESTRICT` forhindrer sletting av nettverk som er i bruk
4. **Zero Downtime**: Migrasjonen kan kjøres på en live database uten nedetid

## 📝 Fremtidige Forbedringer

Mulige utvidelser:
- Logo URLs for hvert nettverk
- Gas price estimates
- Network status (mainnet, healthy, degraded)
- Automatisk RPC endpoint failover
- Historical performance metrics

## 🤝 Support

Hvis du opplever problemer med migrasjonen:
1. Sjekk Supabase logs i Dashboard
2. Kjør verifikasjon-queries ovenfor
3. Sjekk at wallets-tabellen har riktig struktur først
4. Se etter konflikter med eksisterende constraints

---

**Status**: ✅ Klar for produksjon  
**Testing**: ✅ Testet mot development database  
**Rollback**: ✅ Rollback-script tilgjengelig  
**Dokumentasjon**: ✅ Komplett  

