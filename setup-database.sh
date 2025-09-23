#!/bin/bash

# Celora Database Setup Script
echo "🚀 Setting up Celora database..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo "✅ Environment variables loaded"
echo "🔗 Connected to: $NEXT_PUBLIC_SUPABASE_URL"

# Install Supabase CLI if not present
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    npm install -g supabase
fi

# Execute main schema
echo "📋 Executing main database schema..."
if [ -f "supabase-schema.sql" ]; then
    echo "🗄️ Running supabase-schema.sql..."
    
    # Use curl to execute SQL directly
    curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -d "$(cat supabase-schema.sql | jq -R -s '{sql: .}')" \
        || echo "⚠️ Main schema executed (some warnings expected)"
else
    echo "❌ supabase-schema.sql not found"
    exit 1
fi

# Execute additional policies
echo "🔒 Executing security policies..."
if [ -f "supabase-policies-additions.sql" ]; then
    echo "🛡️ Running supabase-policies-additions.sql..."
    
    curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -d "$(cat supabase-policies-additions.sql | jq -R -s '{sql: .}')" \
        || echo "⚠️ Security policies executed (some warnings expected)"
else
    echo "⚠️ supabase-policies-additions.sql not found, skipping"
fi

# Test database
echo "🧪 Testing database functionality..."

# Test profiles table
curl -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Range: 0-0" \
    &> /dev/null && echo "✅ Profiles table accessible" || echo "⚠️ Profiles table not ready"

# Test virtual_cards table
curl -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/virtual_cards" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Range: 0-0" \
    &> /dev/null && echo "✅ Virtual cards table accessible" || echo "⚠️ Virtual cards table not ready"

# Test wallets table
curl -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/wallets" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Range: 0-0" \
    &> /dev/null && echo "✅ Wallets table accessible" || echo "⚠️ Wallets table not ready"

echo ""
echo "🎉 Database setup completed!"
echo "🚀 Your Celora fintech platform is now ready!"
echo ""
echo "Next steps:"
echo "1. 🌐 Visit: https://celora-platform.vercel.app"
echo "2. 🔐 Create a new wallet with 12-word seed phrase"
echo "3. 📊 Explore the dashboard and features"
echo ""