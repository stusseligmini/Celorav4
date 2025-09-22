#!/bin/bash

# Celora V2 Deployment Script for Vercel
# This script sets up environment variables and deploys to Vercel

echo "🚀 Starting Celora V2 deployment to Vercel..."

# Set environment variables in Vercel (replace with your actual values)
echo "📝 Setting up environment variables..."

vercel env add NEXT_PUBLIC_SUPABASE_URL production << EOF
https://zpcycakwdvymqhwvakrv.supabase.co
EOF

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production << EOF
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjIyNzYsImV4cCI6MjA3NDAzODI3Nn0.tAzcxbTBV67ubzkZLTVlwBpZEqbLQoze6JbgYtYXFQI
EOF

vercel env add SUPABASE_SERVICE_ROLE_KEY production << EOF
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ2MjI3NiwiZXhwIjoyMDc0MDM4Mjc2fQ.cfMRjZMHfQ3Y6jlTVvYaP9GTnWq-WBwyoXWuFVcVwoQ
EOF

echo "🔧 Building project..."
npm run build

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your Celora V2 platform should now be live on Vercel"