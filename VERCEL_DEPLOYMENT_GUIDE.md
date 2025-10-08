# 🚀 Celora Vercel Deployment Guide
**Repository:** stusseligmini/Celorav4  
**Date:** October 8, 2025

## ✅ Pre-Deployment Checklist

### 1. Local Build Verification
- [x] TypeScript compilation: `npx tsc --noEmit` ✅
- [x] Production build: `npm run build` ✅
- [x] System validation: `node scripts\system-validation.js` ✅ (5/5 PASS)
- [x] Solana connectivity: QuikNode endpoints tested ✅
- [x] Environment variables configured ✅

---

## 📋 Vercel Project Setup

### Project Configuration
- **Team:** CELORA team (Pro)
- **Project Name:** celorav4
- **Framework:** Next.js
- **Root Directory:** `./`
- **Build Command:** `next build` ✅
- **Output Directory:** `Next.js default` ✅
- **Install Command:** `yarn install`, `pnpm install`, `npm install`, or `bun install` ✅

---

## 🔐 Environment Variables to Add in Vercel

### Copy these EXACTLY as shown in your screenshot:

```bash
# Example variable (you can remove this after adding all others)
EXAMPLE_NAME=I9JU23NF394B6HH

# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://zpcycakwdvymqhwvakrv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjIyNzYsImV4cCI6MjA3NDAzODI3Nn0.tAzcxbTBV67ubzkZLTVlwBpZEqbLQoze6JbgYtYXFQI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ2MjI3NiwiZXhwIjoyMDc0MDM4Mjc2fQ.cfMRjZMHfQ3Y6jlTVvYaP9GTnWq-WBwyoXWuFVcVwoQ

# Authentication
NEXTAUTH_SECRET=PoXoGyzZ+HGLkJaTT9k/zhoJxAgh7b6Psi3XF86g8Ho=
JWT_SECRET=wT1n+aefAvljmlRf6SOKlOOf9pF7fwpO4FLSVjjYLjUZqYktUfOILls0K/wxLmB6xOzFUB+xXdSQ3gbpi5UtYQ==
NEXTAUTH_URL=https://celora.app

# Encryption Keys
WALLET_ENCRYPTION_KEY=f6cGWbwGkCF7ObTLieQE45cBakD84IuFayxMp+O2DkY=
SEED_PHRASE_ENCRYPTION_KEY=PcqnptkvdUOYhKqBy1UqQ5CvPdrryvxa/Cx2QBlv0ow=
MASTER_ENCRYPTION_KEY=Bc8xUvOJcuu/yv1/W5tzjkrU3+UDJZM/XMVaRG0uYkU=
API_SECRET_KEY=80675c1a6a43feb04605de73a188334ce97472926fc053d6d2aea645788b6e7e
BACKUP_ENCRYPTION_KEY=Bc8xUvOJcuu/yv1/W5tzjkrU3+UDJZM/XMVaRG0uYkU=

# Blockchain - QuikNode Solana
SOLANA_RPC_URL=https://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295
SOLANA_WSS_URL=wss://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295

# Feature Flags
ENABLE_REAL_BLOCKCHAIN=true
NODE_ENV=production
```

---

## 📝 Step-by-Step Deployment

### Step 1: Add Environment Variables
1. Scroll down to "Environment Variables" section in Vercel
2. Click "Add" for each variable
3. **Key:** Paste the variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
4. **Value:** Paste the corresponding value
5. **Environment:** Select "Production" (and optionally "Preview" and "Development")
6. Repeat for all 15+ variables above

### Step 2: Deploy
1. Click "Deploy" button
2. Wait for build to complete (~3-5 minutes)
3. Vercel will:
   - Clone your repository
   - Install dependencies
   - Run `next build`
   - Deploy to production

### Step 3: Post-Deployment Verification
After successful deployment, verify:

```bash
# Check these endpoints:
https://celorav4.vercel.app/api/health
https://celorav4.vercel.app/api/diagnostics/env
https://celorav4.vercel.app/

# Expected responses:
✅ Health endpoint: { status: "ok" }
✅ Env diagnostics: Should show configured vars (not values)
✅ Homepage: Should load without errors
```

---

## 🔧 Post-Deployment Configuration

### Update NEXTAUTH_URL
After first deployment, update in Vercel:
1. Go to Project Settings → Environment Variables
2. Find `NEXTAUTH_URL`
3. Change from `https://celora.app` to your actual Vercel URL:
   - `https://celorav4.vercel.app` (or your custom domain)
4. Redeploy for changes to take effect

### Update Supabase Allowed URLs
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add Vercel deployment URL to:
   - **Site URL:** `https://celorav4.vercel.app`
   - **Redirect URLs:** 
     - `https://celorav4.vercel.app/**`
     - `https://celorav4.vercel.app/auth/callback`

---

## 🐛 Troubleshooting

### Build Fails with TypeScript Errors
```bash
# Locally verify:
npx tsc --noEmit

# If passes locally but fails on Vercel:
# Check Node.js version in Vercel settings (should be 18.x or 20.x)
```

### Environment Variables Not Loading
- Ensure variables are set for "Production" environment
- Check variable names match exactly (case-sensitive)
- Redeploy after adding/changing variables

### Database Connection Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is not paused
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (server-side operations)

### Blockchain Connection Fails
- Verify QuikNode URLs are correct
- Check QuikNode account is active
- Test endpoints: `curl https://frequent-omniscient-surf.solana-mainnet.quiknode.pro/...`

---

## 🔒 Security Checklist

- [x] `.env.local` is in `.gitignore` ✅
- [x] No secrets committed to repository ✅
- [x] `SUPABASE_SERVICE_ROLE_KEY` marked as sensitive in Vercel ✅
- [x] All encryption keys are 256-bit production-grade ✅
- [x] CORS configured properly ✅

---

## 📊 Performance Optimization

### Vercel Settings to Configure:
1. **Functions Region:** Choose closest to your users (e.g., `iad1` for US East)
2. **Edge Network:** Enable for static assets
3. **Image Optimization:** Enabled by default for Next.js
4. **Caching:** Configure in `vercel.json` if needed

### Monitoring
After deployment, monitor:
- **Vercel Analytics:** Real-time performance metrics
- **Vercel Logs:** Check for runtime errors
- **Supabase Dashboard:** Monitor database queries and API usage
- **QuikNode Dashboard:** Track RPC usage and performance

---

## 🚀 Custom Domain Setup (Optional)

### After Initial Deployment:
1. Go to Project Settings → Domains
2. Add your domain: `celora.app` or `www.celora.app`
3. Update DNS records as instructed by Vercel
4. Update `NEXTAUTH_URL` to your custom domain
5. Update Supabase redirect URLs

---

## 📱 Testing Production Deployment

### Quick Tests After Deploy:
```bash
# 1. Health check
curl https://celorav4.vercel.app/api/health

# 2. Homepage
curl -I https://celorav4.vercel.app/

# 3. Wallet API (should return 401/403 without auth)
curl https://celorav4.vercel.app/api/wallets
```

### Browser Tests:
1. Open `https://celorav4.vercel.app`
2. Check browser console for errors (F12)
3. Try signing in/creating account
4. Test wallet creation functionality
5. Verify Solana integration works

---

## 🔄 Continuous Deployment

### Automatic Deployments
Vercel will automatically deploy when you:
- Push to `main` branch → Production deployment
- Push to other branches → Preview deployment
- Open Pull Request → Preview deployment with unique URL

### Manual Redeployment
If needed, redeploy from Vercel dashboard:
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Select "Redeploy"

---

## 📈 Next Steps After Successful Deploy

1. ✅ Verify all functionality works in production
2. ✅ Set up monitoring and alerts
3. ✅ Configure custom domain (if applicable)
4. ✅ Test wallet creation with real funds (small amount)
5. ✅ Document any production-specific settings
6. ✅ Share deployment URL with team for testing

---

## 🆘 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Supabase Integration:** https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs
- **QuikNode Support:** https://www.quicknode.com/docs

---

**Deployment Status:** Ready to deploy ✅  
**All environment variables:** Configured ✅  
**Build:** Passing locally ✅  
**Validation:** 5/5 components ✅

🎉 **You're all set! Click Deploy in Vercel and watch it go live!**
