# Celora Cyberpunk Fintech Platform - Deployment Guide

## 🚀 Deploy to Vercel

### Quick Deploy (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fstusseligmini%2FCelorav4&project-name=celora-cyberpunk-fintech&repository-name=celora-production&demo-title=Celora%20Cyberpunk%20Fintech&demo-description=Advanced%20fintech%20platform%20with%20cyberpunk%20aesthetics&root-directory=apps%2Fweb&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=Supabase%20configuration%20for%20database%20and%20authentication)

### Manual Deployment Steps

1. **Go to [vercel.com](https://vercel.com) and login**

2. **Import Project from GitHub:**
   - Click "Add New" → "Project"
   - Select `stusseligmini/Celorav4` repository
   - Set **Root Directory** to `apps/web`

3. **Configure Environment Variables:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://zpcycakwdvymqhwvakrv.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjIyNzYsImV4cCI6MjA3NDAzODI3Nn0.tAzcxbTBV67ubzkZLTVlwBpZEqbLQoze6JbgYtYXFQI
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ2MjI3NiwiZXhwIjoyMDc0MDM4Mjc2fQ.cfMRjZMHfQ3Y6jlTVvYaP9GTnWq-WBwyoXWuFVcVwoQ
   ```

4. **Deploy!** 🚀

## 🎯 What's Being Deployed

### ✅ Complete Cyberpunk Fintech Platform:
- **Real-time Crypto Portfolio** with live prices
- **Advanced Analytics Dashboard** with spending insights  
- **2FA Security System** with TOTP and backup codes
- **Fraud Detection** with intelligent risk scoring
- **Solana Wallet Integration** with encrypted key storage
- **Live Notifications** with WebSocket real-time updates
- **Performance Monitoring** with Core Web Vitals tracking
- **Security Event Logging** for all critical actions

### 🛡️ Production-Ready Security:
- Row Level Security on all database tables
- Encrypted private keys for crypto wallets
- Real-time fraud detection and monitoring
- Security event logging and alerting
- 2FA with backup codes and recovery

### ⚡ Performance Optimized:
- Bundle splitting and code optimization
- Caching strategies for API responses
- Real-time performance metrics tracking
- Security headers and CSP configuration

## 🔗 API Endpoints Available:

- `/api/market/crypto` - Real-time crypto market data
- `/api/notifications` - Live notification system
- `/api/crypto/holdings` - Portfolio management
- `/api/crypto/solana` - Solana wallet operations
- `/api/analytics/spending` - Spending insights
- `/api/security/2fa` - Two-factor authentication
- `/api/security/events` - Security event logging
- `/api/security/fraud` - Fraud detection
- `/api/analytics/performance` - Performance metrics

## 🎨 UI Features:

- **NotificationCenter** - Real-time notification system
- **AnalyticsDashboard** - Comprehensive analytics with tabs
- **PerformanceMonitor** - Live Core Web Vitals tracking
- **Enhanced Auth** - 2FA setup and management
- **Cyberpunk Design** - Neon aesthetics throughout

## 🏁 After Deployment:

1. **Test Authentication** - Sign up and verify 2FA works
2. **Check Real-time Features** - Notifications and live updates
3. **Verify API Endpoints** - All 10+ endpoints functional
4. **Monitor Performance** - Core Web Vitals tracking active
5. **Test Security Features** - Fraud detection and event logging

**Your cyberpunk fintech platform is ready for production!** 🔥⚡🎮

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
