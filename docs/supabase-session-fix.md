# Supabase Session Stabilisering

## Problembeskrivelse

Vi har identifisert en frontend-session/storage-feil i applikasjonen som forårsaker ustabile Supabase-sesjoner. 
Dette er *ikke* et databaseproblem, men et problem med hvordan Supabase-klienten håndteres i nettleserkonteksten.

### Kjerneproblem

1. **Flere Supabase-klienter** blir initialisert i samme browser-kontekst med samme `storageKey`.
2. En **custom storage/cookie driver** lagrer base64-strenger, men Supabase Auth v2 forventer ren JSON i storage.
3. Dette fører til at `JSON.parse` feiler og sesjonen "flapper", som igjen knekker Realtime-tilkoblinger og kan krasje UI.

## Løsning

Problemet er løst ved å implementere en pålitelig singleton-pattern for Supabase-klienten i nettleseren.

### 1. Opprettelse av singleton browser-klient

Vi har opprettet `src/lib/supabase-browser.ts` som sørger for at det kun eksisterer én Supabase-klientinstans 
på tvers av hele applikasjonen:

```typescript
// lib/supabase-browser.ts
import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient<any>> | null = null;

export function getBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    browserClient = createClient(url, anon, {
      auth: {
        storageKey: "sb-zpcycakwdvymqhwvakrv-auth",
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: { params: { eventsPerSecond: 3 } },
    });
  }
  return browserClient;
}
```

### 2. Fjernet custom cookie storage

Vi har midlertidig fjernet all custom storage (cookies) under feilsøking, siden Supabase Auth v2 
forventer at storage inneholder JSON-serialisert session.

### 3. Opprydding av korrupte tokens

Ved hver oppstart rydder vi opp i potensielt korrupte tokens i nettleseren:

- LocalStorage: sletter alle nøkler som starter med `sb-` eller "sb-zpcycakwdvymqhwvakrv-auth".
- Cookies: fjerner eventuelle supabase-auth-relaterte cookies.

### 4. Sentralisert klientinitialisering

Vi har sikret at klienten kun initialiseres ett sted:

- Alle tidligere direkte kall til `createClient` er erstattet med `getBrowserClient()`
- Både i `SupabaseProvider` og i hooks brukes nå kun singleton-instansen

### 5. Database-tilgangsrettigheter

Vi har også lagt til nødvendige rettigheter for å lese `schema_migrations` tabellen:

```sql
-- Grant SELECT permissions på schema_migrations til authenticated rollen
GRANT SELECT ON public.schema_migrations TO authenticated;
```

## Slik bekrefter du at feilen er løst

1. Åpne applikasjonen i inkognitovindu
2. Sjekk at konsollen ikke viser:
   - "Multiple GoTrueClient instances"
   - "Failed to parse cookie string"
3. Påse at følgende API-kall fungerer uten feil:
   ```javascript
   const { data, error } = await supabase.from('schema_migrations').select('version').limit(1);
   ```

## Implementeringsdetaljer

- **Frontend-stack**: Next.js (App Router)
- **Opprinnelige problemer**: Multiple client instances, cookie parsing error
- **Løsning**: Singleton pattern, fjern korrupt storage, fiks database grants