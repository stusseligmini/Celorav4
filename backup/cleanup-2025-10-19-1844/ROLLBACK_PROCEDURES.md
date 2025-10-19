# 🚨 ROLLBACK PROCEDURES - CELORA PRODUCTION REFACTORING
*Emergency rollback instructions - October 5, 2025*

## ⚡ IMMEDIATE EMERGENCY ROLLBACK

If the platform is broken or data is at risk:

### 🔴 CRITICAL: Full System Rollback (< 2 minutes)
```powershell
# Navigate to project directory
cd C:\Users\volde\Desktop\CeloraV2

# Immediate full rollback to working state
git stash  # Save any unsaved work
git checkout backup-original-20251005

# If database needs rollback (if you have existing data)
# Run the rollback SQL (create this in Phase 1)
```

### 🟡 PARTIAL: Rollback Specific Component (2-5 minutes)
```powershell
# Rollback database only
cp backup/20251005/database/* database/
# Then restart application

# Rollback API routes only  
git checkout backup-original-20251005 -- src/app/api/

# Rollback specific file
git checkout backup-original-20251005 -- path/to/specific/file.ts
```

---

## 📋 ROLLBACK DECISION TREE

### Issue Severity Assessment
```
Is the issue...?

🔴 CRITICAL (Site down, data loss risk, security breach)
├── Execute: Full System Rollback
├── Timeline: < 2 minutes
└── Escalate: Notify team immediately

🟡 MAJOR (Feature broken, API errors, service crashes)  
├── Execute: Component-specific rollback
├── Timeline: 2-5 minutes
└── Action: Fix forward or rollback specific component

🟢 MINOR (UI glitch, cosmetic issue, non-blocking)
├── Execute: Fix forward (no rollback needed)
├── Timeline: Fix in next deployment
└── Action: Document and schedule fix
```

---

## 🗂️ PHASE-SPECIFIC ROLLBACK PROCEDURES

### Phase 1: Database Schema Rollback

#### If Database Migration Fails
```sql
-- Emergency database rollback (run in Supabase SQL editor)
-- This will be created as database/rollback-to-original.sql

-- Step 1: Drop new tables if they exist
DROP TABLE IF EXISTS new_table_name;

-- Step 2: Restore original schema
-- (Full SQL will be generated in Phase 1)

-- Step 3: Verify rollback
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

#### If API Routes Break After Schema Change
```powershell
# Rollback just the database files
cp backup/20251005/database/schema.sql database/schema.sql
cp backup/20251005/supabase-schema.sql supabase-schema.sql

# Restart application
npm run dev
```

### Phase 2: Supabase Client Rollback

#### If API Routes Stop Working
```powershell
# Rollback Supabase client changes
git checkout backup-original-20251005 -- src/lib/supabaseSingleton.ts

# Rollback API route changes
git checkout backup-original-20251005 -- src/app/api/

# Remove new server client files
rm src/lib/supabase/server.ts
rm src/lib/supabase/client.ts
```

#### If Frontend Breaks
```powershell
# Rollback browser client only
git checkout backup-original-20251005 -- src/lib/supabase-browser.ts

# Keep API changes if they're working
```

### Phase 3: API Route Rollback

#### Individual Route Rollback
```powershell
# Rollback specific API route
cp backup/20251005/src/app/api/blockchain/wallets/route.ts src/app/api/blockchain/wallets/route.ts

# Test the route
curl http://localhost:3000/api/blockchain/wallets
```

#### All Routes Rollback
```powershell
# Rollback entire API directory
git checkout backup-original-20251005 -- src/app/api/
```

### Phase 4: Microservices Rollback

#### If Services Won't Start
```powershell
# Rollback specific service
cp backup/20251005/services/blockchain/src/index.ts services/blockchain/src/index.ts

# Rollback docker-compose if changed
cp backup/20251005/docker-compose.yml docker-compose.yml

# Restart services
docker-compose down
docker-compose up -d
```

### Phase 5: Environment Rollback

#### If Configuration Breaks App
```powershell
# Rollback environment files
cp backup/20251005/.env.local .env.local
cp backup/20251005/.env.example .env.example

# Restart application
npm run dev
```

---

## 🔍 ROLLBACK VALIDATION CHECKLIST

After any rollback, verify these work:

### ✅ Application Starts
```powershell
npm run dev
# Should start without errors on http://localhost:3000
```

### ✅ Database Connects
```powershell
# Test Supabase connection
curl http://localhost:3000/api/sb-health
# Should return 200 OK
```

### ✅ Basic API Works
```powershell
# Test authentication
curl http://localhost:3000/api/auth-test
# Should return auth status
```

### ✅ Wallet API Works
```powershell  
# Test wallet endpoint (may require auth)
curl http://localhost:3000/api/blockchain/wallets
# Should not return 500 error
```

### ✅ Frontend Loads
- Navigate to http://localhost:3000
- Check /wallets page loads
- Verify no console errors

---

## 🆘 RECOVERY SCENARIOS

### Scenario 1: "I broke the database and can't connect"
```powershell
# 1. Rollback all database files
cp backup/20251005/database/* database/
cp backup/20251005/supabase-*.sql .

# 2. If using local Supabase, reset it
supabase db reset

# 3. If using hosted Supabase, run rollback SQL in dashboard
# (Use the rollback script created in Phase 1)
```

### Scenario 2: "API routes are all returning 500 errors"
```powershell
# 1. Check if it's a Supabase client issue
git checkout backup-original-20251005 -- src/lib/supabaseSingleton.ts

# 2. Rollback all API routes
git checkout backup-original-20251005 -- src/app/api/

# 3. Restart dev server
npm run dev
```

### Scenario 3: "Services won't start, Docker is broken"
```powershell
# 1. Rollback docker config
cp backup/20251005/docker-compose.yml .

# 2. Rollback all service files
cp -r backup/20251005/services/* services/

# 3. Restart Docker
docker-compose down --volumes
docker-compose up -d
```

### Scenario 4: "Everything is broken, I need to start over"
```powershell
# Nuclear option - full rollback
git reset --hard backup-original-20251005

# Clean working directory
git clean -fd

# If that doesn't work, re-clone
cd ..
git clone [repository-url] CeloraV2-fresh
cd CeloraV2-fresh
git checkout backup-original-20251005
```

---

## 📞 ESCALATION PROCEDURES

### When to Escalate
- Rollback procedures don't work
- Data loss suspected
- Security breach detected
- System completely unreachable

### Escalation Steps
1. **Immediate**: Stop all changes, secure system
2. **Document**: Screenshot errors, save logs
3. **Notify**: Team/stakeholders of issue
4. **Restore**: Use most recent known-good backup
5. **Investigate**: Root cause after system stable

### Emergency Contacts
- Repository: https://github.com/stusseligmini/Celorav4
- Backup Branch: `backup-original-20251005`
- Documentation: `CURRENT_STATE_SNAPSHOT.md`, `MIGRATION_LOG.md`

---

## 🔐 DATA SAFETY

### Before Any Rollback
1. **Export current data** (if possible)
```sql
-- Export user data
COPY (SELECT * FROM user_profiles) TO '/tmp/users_backup.csv' CSV HEADER;
COPY (SELECT * FROM wallets) TO '/tmp/wallets_backup.csv' CSV HEADER;
```

2. **Document what broke** (for post-mortem)
3. **Screenshot error messages**
4. **Note exact time of failure**

### After Rollback
1. **Verify data integrity**
2. **Test core functions**  
3. **Monitor for 24 hours**
4. **Plan preventive measures**

---

## 📚 ROLLBACK TESTING

Before starting migration, test rollback procedures:

```powershell
# Test 1: Can we switch to backup branch?
git checkout backup-original-20251005
git checkout main

# Test 2: Can we restore individual files?
cp backup/20251005/database/schema.sql test-restore.sql
rm test-restore.sql

# Test 3: Can we identify what changed?
git diff backup-original-20251005 main --name-only
```

---

*Rollback procedures validated: October 5, 2025*
*Use only when necessary - prevention is better than recovery*
*When in doubt, choose full rollback over partial fixes*