# 🔐 Supabase Client Configuration

This directory contains the proper separation of Supabase clients for server and browser environments, replacing the problematic singleton pattern.

## 📁 File Structure

```
src/lib/supabase/
├── server.ts      # Server-side client (API routes, middleware)
├── client.ts      # Browser-side client (React components)
├── types.ts       # Database type definitions
└── README.md      # This documentation
```

## 🎯 Usage Guide

### Server-Side Operations (API Routes, Middleware)

```typescript
// In API routes (src/app/api/*/route.ts)
import { supabaseServer } from '@/lib/supabase/server'

export async function GET() {
  // ✅ Safe server-side usage
  const { data, error } = await supabaseServer
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
  
  return Response.json({ data })
}
```

### Browser-Side Operations (React Components)

```typescript
// In React components
'use client'
import { supabase } from '@/lib/supabase/client'

function WalletList() {
  const [wallets, setWallets] = useState([])
  
  useEffect(() => {
    // ✅ Safe browser usage
    supabase
      .from('wallets')
      .select('*')
      .then(({ data }) => setWallets(data || []))
  }, [])
}
```

## 🔒 Security Features

### Server Client (`server.ts`)
- **Service Role Key**: Full database access, bypasses RLS
- **Admin Operations**: User management, system operations
- **Server-Only**: Environment validation prevents browser usage
- **No Session Persistence**: Stateless operations

### Browser Client (`client.ts`)
- **Anonymous Key**: Respects RLS policies
- **Session Management**: Automatic auth handling
- **Real-time**: Subscriptions and live updates
- **Browser-Only**: Safe for frontend usage

## 🚨 Critical Security Rules

### ❌ DON'T DO THIS

```typescript
// WRONG: Using server client in browser
'use client'
import { supabaseServer } from '@/lib/supabase/server' // Server-only usage ✅

// WRONG: Using browser client in API route
import { supabase } from '@/lib/supabase/client'
export async function GET() {
  // ❌ Won't work properly in server context
  const { data } = await supabase.from('wallets').select('*')
}
```

### ✅ CORRECT PATTERNS

```typescript
// ✅ Server operations in API routes
import { supabaseServer } from '@/lib/supabase/server'

// ✅ Browser operations in components
'use client'
import { supabase } from '@/lib/supabase/client'
```

## 🔄 Migration from Singleton

The old `supabaseSingleton.ts` has been replaced. Update imports:

```typescript
// OLD (problematic)
import { supabase } from '@/lib/supabaseSingleton'

// NEW (server-side)
import { supabaseServer } from '@/lib/supabase/server'

// NEW (browser-side)
import { supabase } from '@/lib/supabase/client'
```

## 🌍 Environment Variables Required

```env
# Public (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Private (server-only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## 📋 Database Types

All database types are auto-generated from the unified schema:

```typescript
import type { 
  UserProfile, 
  Wallet, 
  Transaction,
  Database 
} from '@/lib/supabase/types'
```

## 🛠 Helper Functions

### Server Helpers
- `ensureServerEnvironment()` - Validates server context
- `getUserFromToken(token)` - Extract user from JWT
- `createServerClientForUser(token)` - User-scoped server client

### Browser Helpers  
- `getCurrentUser()` - Get authenticated user
- `getCurrentSession()` - Get current session
- `signOut()` - Sign out user
- `ensureBrowserEnvironment()` - Validates browser context

## ✅ Migration Checklist

- [x] Server client created with service role key
- [x] Browser client created with anon key  
- [x] Database types generated from unified schema
- [x] Environment validation added
- [x] Helper functions provided
- [ ] Update all API routes to use server client
- [ ] Update all components to use browser client
- [ ] Deprecate old singleton file
- [ ] Test authentication flows
- [ ] Verify RLS policies work correctly

## 🔍 Testing

Test server client:
```bash
# Test API route
curl http://localhost:3000/api/blockchain/wallets
```

Test browser client:
```bash
# Check browser console for auth state
# Navigate to app and check network tab
```

---

**⚠️ IMPORTANT**: Never mix server and browser clients. The environment validation will throw errors if used incorrectly.