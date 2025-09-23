# 🗄️ CELORA DATABASE SETUP GUIDE

## 📋 QUICK SETUP INSTRUCTIONS

### 🔗 STEP 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your Celora project: `zpcycakwdvymqhwvakrv`
3. Navigate to **SQL Editor**

### 📊 STEP 2: Execute Main Schema
1. Open the **SQL Editor**
2. Copy the entire content from `supabase-schema.sql`
3. Paste it into the SQL Editor
4. Click **RUN** to execute
5. Wait for completion (may take 30-60 seconds)

### 🔒 STEP 3: Add Security Policies
1. Still in SQL Editor, clear the previous query
2. Copy the entire content from `supabase-policies-additions.sql`
3. Paste it into the SQL Editor
4. Click **RUN** to execute

### ✅ STEP 4: Verify Setup
Check that these tables exist in your **Table Editor**:
- ✅ `profiles`
- ✅ `virtual_cards`
- ✅ `wallets`
- ✅ `transactions`
- ✅ `notifications`
- ✅ `crypto_holdings`
- ✅ `market_data`
- ✅ `security_events`
- ✅ `spending_insights`

## 🚀 AUTOMATED SETUP (ALTERNATIVE)

If you prefer to use our setup script:

### Windows PowerShell:
```powershell
.\setup-database.ps1
```

### Linux/Mac:
```bash
chmod +x setup-database.sh
./setup-database.sh
```

### Node.js:
```bash
node setup-database.js
```

## 🎯 WHAT GETS CREATED

### 📊 **Database Tables**:
- **User Management**: `profiles` with KYC support
- **Financial**: `virtual_cards`, `wallets`, `transactions`
- **Analytics**: `spending_insights`, `market_data`
- **Security**: `security_events`, `notifications`
- **Crypto**: `crypto_holdings` with multi-chain support

### 🔒 **Security Features**:
- **Row Level Security (RLS)** on all tables
- **User-specific data isolation**
- **Automatic timestamping**
- **Audit logging**
- **Real-time subscriptions**

### 🎨 **Default Data**:
- **Transaction categories** (Shopping, Food, Transport, etc.)
- **Feature flags** for platform controls
- **Market data structure** for crypto prices

## 🧪 TESTING THE SETUP

After setup, test by:

1. **Visit**: https://celora-platform.vercel.app
2. **Create Account**: Use the seed phrase signup
3. **Login**: Test both email and seed phrase methods
4. **Dashboard**: Verify all components load correctly

## ⚠️ TROUBLESHOOTING

### Common Issues:
- **"Function not found"**: Normal, some warnings are expected
- **"Permission denied"**: Check your service role key
- **"Table already exists"**: Safe to ignore if re-running

### Manual Fix:
If automated setup fails, manually copy/paste the SQL files in Supabase Dashboard.

## 🎉 SUCCESS INDICATORS

✅ **Authentication**: Login/signup works
✅ **Dashboard**: All components render
✅ **API**: All 30 API routes respond
✅ **Database**: Tables visible in Supabase dashboard
✅ **RLS**: Users only see their own data

## 🔗 USEFUL LINKS

- **Live Platform**: https://celora-platform.vercel.app
- **Supabase Dashboard**: https://supabase.com/dashboard
- **GitHub Repo**: https://github.com/stusseligmini/Celorav4

---

Your Celora fintech platform will be fully operational after database setup! 🚀