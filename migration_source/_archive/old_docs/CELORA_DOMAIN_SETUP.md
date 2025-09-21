# 🌐 CELORA.NET DOMAIN SETUP GUIDE

## 🎯 DOMAIN STRUCTURE
- **Main Site**: https://celora.net → Landing page & marketing
- **Web App**: https://app.celora.net → Full Celora platform 
- **API**: https://api.celora.net → All API endpoints

## 📡 DNS RECORDS (Add these to your domain registrar)

### Record 1 - Root Domain
```
Type: CNAME
Name: @ (or leave blank)
Value: ofsfbmahiysfhkmazlzg.supabase.co
TTL: 300 (or Auto)
```

### Record 2 - Web App Subdomain
```
Type: CNAME
Name: app
Value: ofsfbmahiysfhkmazlzg.functions.supabase.co
TTL: 300 (or Auto)
```

### Record 3 - API Subdomain
```
Type: CNAME
Name: api
Value: ofsfbmahiysfhkmazlzg.functions.supabase.co
TTL: 300 (or Auto)
```

## 🔧 SUPABASE CONFIGURATION

### In Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/ofsfbmahiysfhkmazlzg/settings/general
2. Navigate to "Custom domains" section
3. Add these domains:
   - `celora.net`
   - `app.celora.net`
   - `api.celora.net`

### SSL Certificate:
- Supabase will automatically provision SSL certificates
- Wait 10-30 minutes after DNS propagation

## 🚀 DEPLOYMENT TARGETS

### Edge Functions:
- **celora-hosting** → https://app.celora.net
- **celora-api** → https://api.celora.net

### Main Domain:
- Custom landing page or redirect to app.celora.net

## ⏰ TIMELINE
1. **Add DNS records**: 0-5 minutes
2. **DNS propagation**: 2-48 hours (usually 2-6 hours)
3. **SSL certificate**: 10-30 minutes after DNS
4. **Fully live**: Within 24 hours

## ✅ VERIFICATION
Check if setup is working:
```bash
nslookup app.celora.net
nslookup api.celora.net
```

## 🌟 RESULT
Once complete, Celora will be live at:
- 🏠 **https://celora.net** - Professional domain
- 🚀 **https://app.celora.net** - Full platform access  
- 📡 **https://api.celora.net** - API endpoints

**VERDENS STØRSTE KRYPTO-PLATFORM PÅ EGET DOMENE! 🎉**
