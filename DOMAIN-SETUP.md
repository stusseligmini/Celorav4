# Custom Domain Setup for Celora

This document provides instructions for setting up and using your custom domain (`celora.net`) with your Celora application.

## Domain Configuration

### 1. GoDaddy DNS Configuration

1. Log in to your GoDaddy account
2. Navigate to the DNS management page for `celora.net`
3. Add the following DNS records:

   | Type  | Name | Value               | TTL    |
   |-------|------|---------------------|--------|
   | A     | @    | Vercel IP (from CLI)| 1 hour |
   | CNAME | www  | cname.vercel-dns.com| 1 hour |

   If Vercel provides additional verification records (like TXT records), add those as well.

### 2. Vercel Configuration

1. Log in to your Vercel dashboard
2. Go to your Celora project
3. Navigate to Settings > Domains
4. Add `celora.net` as a custom domain
5. Follow the verification process
6. Ensure HTTPS is enabled

### 3. Supabase Configuration

1. Log in to your Supabase dashboard
2. Select your Celora project
3. Go to Settings > API
4. Add `https://celora.net` to the CORS origins list
5. Add `https://celora.net/auth/callback` as an authorized redirect URL

## Environment Variables

Make sure your environment files have the correct domain:

1. In `.env.production`:
   ```
   NEXT_PUBLIC_APP_URL=https://celora.net
   NEXTAUTH_URL=https://celora.net
   CORS_ORIGIN=https://celora.net
   ALLOWED_DOMAINS=celora.net,www.celora.net
   ```

2. In your Vercel project settings, update environment variables.

## Deployment

Run the `setup-domain.ps1` script to deploy with your custom domain.

## Verification

After DNS propagation (which can take 24-48 hours):

1. Visit `https://celora.net` to ensure the site loads properly
2. Test authentication to make sure Supabase integration works
3. Check that wallet functionality works correctly

## Troubleshooting

If you encounter issues:

1. Use `nslookup celora.net` to verify DNS resolution
2. Check Vercel deployment logs
3. Verify SSL certificate is active
4. Confirm Supabase CORS settings are correct
5. Test with a private/incognito browser window to avoid cached issues

Remember that DNS changes can take up to 48 hours to fully propagate globally.