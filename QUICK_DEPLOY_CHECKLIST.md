# 🎯 Quick Vercel Deploy Checklist

## Before You Click Deploy

### ✅ Pre-Flight Checks
- [x] Local build passes: `npm run build` ✅
- [x] TypeScript clean: `npx tsc --noEmit` ✅
- [x] System validation: 5/5 PASS ✅
- [x] Git pushed to main branch ✅

---

## 📋 Environment Variables (Copy-Paste Ready)

### Copy this entire block and paste into Vercel Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://zpcycakwdvymqhwvakrv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjIyNzYsImV4cCI6MjA3NDAzODI3Nn0.tAzcxbTBV67ubzkZLTVlwBpZEqbLQoze6JbgYtYXFQI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ2MjI3NiwiZXhwIjoyMDc0MDM4Mjc2fQ.cfMRjZMHfQ3Y6jlTVvYaP9GTnWq-WBwyoXWuFVcVwoQ
NEXTAUTH_SECRET=PoXoGyzZ+HGLkJaTT9k/zhoJxAgh7b6Psi3XF86g8Ho=
JWT_SECRET=wT1n+aefAvljmlRf6SOKlOOf9pF7fwpO4FLSVjjYLjUZqYktUfOILls0K/wxLmB6xOzFUB+xXdSQ3gbpi5UtYQ==
NEXTAUTH_URL=https://celora.app
WALLET_ENCRYPTION_KEY=f6cGWbwGkCF7ObTLieQE45cBakD84IuFayxMp+O2DkY=
SEED_PHRASE_ENCRYPTION_KEY=PcqnptkvdUOYhKqBy1UqQ5CvPdrryvxa/Cx2QBlv0ow=
MASTER_ENCRYPTION_KEY=Bc8xUvOJcuu/yv1/W5tzjkrU3+UDJZM/XMVaRG0uYkU=
API_SECRET_KEY=80675c1a6a43feb04605de73a188334ce97472926fc053d6d2aea645788b6e7e
BACKUP_ENCRYPTION_KEY=Bc8xUvOJcuu/yv1/W5tzjkrU3+UDJZM/XMVaRG0uYkU=
SOLANA_RPC_URL=https://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295
SOLANA_WSS_URL=wss://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295
ENABLE_REAL_BLOCKCHAIN=true
NODE_ENV=production
```

---

## 🚀 Deployment Steps

### 1. In Vercel (as shown in your screenshot):
- ✅ Team: CELORA team (Pro)
- ✅ Project Name: celorav4
- ✅ Framework: Next.js
- ✅ Root Directory: ./
- ✅ Build Command: `next build`
- ✅ Output Directory: Next.js default
- ✅ Install Command: (auto-detected)

### 2. Scroll down to "Environment Variables"
1. For each variable above:
   - Click "Add New"
   - Paste variable name in "Key" field
   - Paste value in "Value" field
   - Select "Production" (check "Preview" and "Development" if needed)
2. Repeat for all 14 variables

### 3. Click "Deploy" Button
- Build time: ~3-5 minutes
- Watch logs for any errors

---

## ✅ Post-Deploy Actions

### Immediately After Deploy:

1. **Update NEXTAUTH_URL:**
   ```
   Old: https://celora.app
   New: https://celorav4.vercel.app (or your assigned URL)
   ```
   - Go to Settings → Environment Variables → Edit NEXTAUTH_URL
   - Redeploy after change

2. **Update Supabase URLs:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Add: `https://celorav4.vercel.app/**`
   - Add: `https://celorav4.vercel.app/auth/callback`

3. **Test Deployment:**
   ```bash
   # Visit these URLs:
   https://celorav4.vercel.app/
   https://celorav4.vercel.app/api/health
   ```

---

## 🐛 If Build Fails

### Common Issues:

**TypeScript Errors:**
- Check: Node version in Vercel (should be 18.x or 20.x)
- Verify: `npx tsc --noEmit` passes locally

**Missing Environment Variables:**
- Double-check: All 14 variables are added
- Verify: No typos in variable names (case-sensitive)

**Database Connection:**
- Ensure: Supabase project is active (not paused)
- Check: URLs are correct

---

## 📱 Quick Test URLs

After successful deployment:

```
Homepage:       https://celorav4.vercel.app/
Health Check:   https://celorav4.vercel.app/api/health
Environment:    https://celorav4.vercel.app/api/diagnostics/env
Sign In:        https://celorav4.vercel.app/signin
Dashboard:      https://celorav4.vercel.app/
```

---

## 🎉 Success Indicators

You'll know it worked when:
- ✅ Build completes without errors
- ✅ Deployment shows "Ready"
- ✅ Homepage loads correctly
- ✅ No console errors in browser (F12)
- ✅ Health endpoint returns `{ status: "ok" }`
- ✅ Can access sign-in page

---

**Current Status:** Ready to deploy! 🚀  
**Time to Deploy:** ~5 minutes  
**Confidence Level:** High ✅

💡 **Tip:** Keep this checklist open while deploying for quick reference!
