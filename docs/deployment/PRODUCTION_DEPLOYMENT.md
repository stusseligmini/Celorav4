# 🚀 Production Deployment Guide

## Quick Deploy Checklist
- [ ] Environment variables configured in Vercel
- [ ] Database schema deployed via `database/production-deployment.sql`
- [ ] Supabase Edge Functions deployed
- [ ] Domain and SSL configured
- [ ] Monitoring and logging enabled

## Database Deployment
```bash
# Deploy complete production schema
psql -f database/production-deployment.sql

# Verify deployment
psql -f database/quick-health-check.sql
```

## Vercel Deployment
```bash
# Deploy to production
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... (add all required vars)
```

## Post-Deployment Validation
- [ ] Health check endpoints responding
- [ ] Solana integration working
- [ ] Push notifications functional
- [ ] Auto-link system operational

## Rollback Procedures
See `docs/operations/ROLLBACK.md` for detailed rollback steps.