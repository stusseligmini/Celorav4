# Celora Platform - Credentials Setup Guide

## Essential Services (Required for Basic Functionality)

### 1. Railway PostgreSQL Database (REQUIRED)
**What:** Production-ready PostgreSQL database
**Cost:** Free tier available (500MB storage, 100MB RAM)
**URL:** https://railway.app

**Steps:**
1. Visit https://railway.app and sign in with GitHub
2. Click "Start a New Project"
3. Select "Deploy PostgreSQL"
4. Once deployed, click on the PostgreSQL service
5. Go to "Variables" tab
6. Copy the `DATABASE_URL` value
7. Update your `.env` file:
   ```
   DATABASE_URL="your_railway_connection_string_here"
   DATABASE_URL_DIRECT="your_railway_connection_string_here"
   ```

### 2. SendGrid Email Service (REQUIRED)
**What:** Transactional email service for user verification, password resets, etc.
**Cost:** 100 emails/day free forever
**URL:** https://sendgrid.com/free

**Steps:**
1. Sign up at https://sendgrid.com/free
2. Verify your account (check email)
3. Go to Settings → API Keys
4. Click "Create API Key"
5. Choose "Full Access" for development
6. Copy the API key
7. Go to Settings → Sender Authentication
8. Create a Single Sender Verification with your email
9. Update your `.env` file:
   ```
   SENDGRID_API_KEY="SG.your_actual_api_key_here"
   FROM_EMAIL="your_verified_email@domain.com"
   ADMIN_EMAIL="your_admin_email@domain.com"
   ```

## Recommended Services (For Production Quality)

### 3. Sentry Error Tracking (HIGHLY RECOMMENDED)
**What:** Real-time error monitoring and performance tracking
**Cost:** Free tier: 5K errors/month
**URL:** https://sentry.io

**Steps:**
1. Sign up at https://sentry.io
2. Create new project → Select "Node.js"
3. Copy the DSN from the setup instructions
4. Update your `.env` file:
   ```
   SENTRY_DSN="https://your_sentry_dsn@sentry.io/project_id"
   ```

### 4. Upstash Redis Cache (RECOMMENDED)
**What:** Redis cache for rate limiting, sessions, and performance
**Cost:** Free tier: 10K requests/day
**URL:** https://upstash.com

**Steps:**
1. Sign up at https://upstash.com
2. Create Database → Redis
3. Choose a region close to your Railway database
4. Copy the Redis URL from the database page
5. Update your `.env` file:
   ```
   REDIS_URL="redis://default:password@your-redis-url.upstash.io:port"
   ```

## Optional Services (Can Add Later)

### 5. Stripe Payment Processing
**What:** Payment processing for premium features
**Cost:** 2.9% + 30¢ per transaction
**URL:** https://stripe.com

**When to set up:** When you want to add paid features
**Steps:**
1. Create Stripe account
2. Get test API keys from Dashboard
3. Update `.env` with test keys initially

### 6. KYC/Compliance Services
**What:** Identity verification for regulatory compliance
**Options:** Jumio, Onfido, Persona
**When to set up:** When handling real money or meeting regulations

## Quick Start Commands

After setting up Railway and SendGrid:

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Run database migration
npx prisma migrate dev --name init_celora_db

# 3. Seed database with demo data
npx prisma db seed

# 4. Start development server
npm run dev
```

## Environment Variables Priority

**CRITICAL (App won't work without these):**
- DATABASE_URL
- SENDGRID_API_KEY
- FROM_EMAIL

**IMPORTANT (Security features disabled without these):**
- SENTRY_DSN
- REDIS_URL

**OPTIONAL (Can use defaults):**
- All other variables have sensible defaults

## Testing Your Setup

1. Start the server: `npm run dev`
2. Check health endpoint: http://localhost:10000/health
3. Test email by registering a new user
4. Check Sentry dashboard for any errors
5. Monitor Railway database for new user records

## Need Help?

If you encounter issues:
1. Check the logs: `npm run logs`
2. Verify .env file has no extra spaces
3. Ensure all URLs are properly formatted
4. Contact support if using third-party services

## Security Notes

- Never commit `.env` file to git
- Use different credentials for development/production
- Rotate credentials regularly
- Enable 2FA on all service accounts
