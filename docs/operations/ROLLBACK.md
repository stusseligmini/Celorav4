# 🔄 Rollback Procedures

## Database Rollback
```bash
# Emergency rollback to previous schema
psql -f backup/cleanup-2025-10-19-1844/production-deployment.sql
```

## Application Rollback
```bash
# Vercel rollback to previous deployment
vercel rollback [deployment-url]
```

## Monitoring Commands
```bash
# Check system health
npm run health-check

# Validate Solana integration
npm run test:solana

# Check database performance
psql -f database/monitor-performance.sql
```