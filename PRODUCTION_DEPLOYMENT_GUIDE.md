# CELORA PRODUCTION DEPLOYMENT GUIDE
*No Demo Content - Real Production Setup*

## 🚀 PRODUCTION DEPLOYMENT STEPS

### 1. Environment Configuration
Copy `.env.production` and configure with **REAL VALUES ONLY**:

#### Required Supabase Setup
```bash
# Get from https://app.supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-actual-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-actual-service-role-key]
```

#### Generate Security Keys
```bash
# Generate strong encryption keys
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for NEXTAUTH_SECRET  
openssl rand -base64 32  # Use for WALLET_ENCRYPTION_KEY
openssl rand -base64 32  # Use for SEED_PHRASE_ENCRYPTION_KEY
openssl rand -hex 32     # Use for API_SECRET_KEY
```

#### Blockchain Provider Setup
- **Ethereum:** Get API key from [Infura.io](https://infura.io) or [Alchemy.com](https://alchemy.com)
- **Solana:** Use `https://api.mainnet-beta.solana.com` (free) or premium RPC provider
- **Bitcoin:** Configure with actual Bitcoin RPC provider

### 2. Database Deployment
```bash
# Deploy unified schema to production Supabase
psql -h [supabase-host] -U postgres -d postgres < database/unified-schema-v2.sql
```

### 3. Domain & SSL
- Configure production domain (celora.app)
- Enable HTTPS/SSL certificates
- Update all environment URLs to production domain

### 4. Security Checklist
- [ ] All encryption keys are unique 256-bit values
- [ ] No development/demo values in production environment
- [ ] CORS origins restricted to production domains
- [ ] Database RLS policies active
- [ ] Service role key secured and not exposed to client

### 5. Blockchain Integration
- [ ] Ethereum mainnet RPC configured with actual Infura/Alchemy key
- [ ] Solana mainnet RPC operational
- [ ] Bitcoin RPC configured if Bitcoin support needed
- [ ] All private keys are real and secured

### 6. Deployment Validation
```bash
# Validate production environment
NODE_ENV=production node scripts/validate-environment.js

# Run complete system validation
NODE_ENV=production node scripts/system-validation.js
```

### 7. Post-Deployment
- Monitor error rates via configured logging
- Test all critical user flows
- Verify blockchain connectivity in production
- Confirm all API endpoints respond correctly

## 🔒 SECURITY REQUIREMENTS

### Mandatory Security Measures
1. **Unique Encryption Keys:** All encryption keys must be unique, 256-bit generated values
2. **Secure Key Storage:** Store all private keys and secrets securely (never in code)
3. **Network Security:** Use HTTPS everywhere, configure proper CORS
4. **Database Security:** Enable RLS, use service role key only on server-side
5. **API Security:** Implement rate limiting, validate all inputs

### Production-Only Configuration
- Remove all development/localhost references
- Use production blockchain networks (mainnet)
- Configure real monitoring and alerting
- Enable audit logging for compliance

## ⚡ PERFORMANCE OPTIMIZATION

### Database
- Configure connection pooling (20+ connections)
- Enable query optimization
- Set up read replicas if needed

### API
- Configure rate limiting (100 req/min baseline)
- Enable response caching where appropriate
- Use CDN for static assets

### Blockchain
- Use premium RPC providers for reliability
- Implement RPC failover/redundancy
- Monitor blockchain connectivity

## 📊 MONITORING SETUP

### Required Monitoring
- **Error Tracking:** Configure Sentry with real DSN
- **Performance:** Monitor API response times
- **Blockchain:** Track RPC endpoint health
- **Database:** Monitor connection pool and query performance

### Alerting
- Set up alerts for API errors
- Monitor blockchain connectivity failures
- Alert on failed transactions
- Track unusual user activity patterns

---

**PRODUCTION READY:** No demo content, no placeholder values, real production configuration only.