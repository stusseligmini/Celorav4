# Celora Production Deployment Guide

## Quick Start

### 1. Supabase Setup
1. Create project at [supabase.com](https://supabase.com)
2. Run `database/schema.sql` in SQL Editor
3. Configure Auth settings
4. Get project URL and keys

### 2. Vercel Deployment
```bash
# Deploy to production
npm run build
vercel --prod
```

### 3. Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXTAUTH_SECRET=random_secret_string
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 4. Post-Deploy Checklist
- [ ] Database schema applied
- [ ] Authentication working
- [ ] Cards/wallets creation
- [ ] Real-time updates
- [ ] Security headers active

## Production Health Check
- `/api/health` - App status
- Authentication flow
- Card/wallet operations
- Transaction processing

Ready for user testing! 🚀