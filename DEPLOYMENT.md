# Deployment Guide

## Prerequisites
- Supabase project (URL, anon key, service role key)
- Vercel account (or alternative hosting for Next.js)

## Environment Variables (Vercel)
Set the following in Project Settings > Environment Variables:

| Name | Value | Scope |
|------|-------|-------|
| NEXT_PUBLIC_SUPABASE_URL | https://YOUR-PROJECT.supabase.co | All |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | <anon-key> | All |
| SUPABASE_URL | https://YOUR-PROJECT.supabase.co | All |
| SUPABASE_SERVICE_ROLE_KEY | <service-role-key> | Server only |
| LOG_LEVEL | info | All |

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser—only server runtime.

## Database Setup
1. Run `supabase-schema.sql` in Supabase SQL editor.
2. Run `supabase-policies-additions.sql` for extra RLS & constraints.
3. (Optional) Regenerate types:
```
supabase gen types typescript --project-id <project-id> --schema public > packages/domain/src/generated/supabase.types.ts
```

## Build & Deploy
Local test:
```
npm install
npm run build
npm run dev
```

Vercel:
1. Import repository.
2. Set env vars.
3. Deploy. Turbo + Next.js build pipeline will output optimized production bundle.

## Post-Deployment Checks
- Auth: create user, sign in/out.
- Create virtual card, top-up via `/api/cards/fund`.
- Create purchase: POST `/api/transactions/create`.
- Confirm real-time UI updates (cards & transactions update without refresh).
- Inspect logs (if attached to external aggregator) using `x-correlation-id`.

## Future Enhancements
- Replace multi-step balance & transaction updates with Postgres function using `SECURITY DEFINER` for atomicity.
- OpenTelemetry tracing export.
- Production WAF rules (block large auth brute force attempts).
