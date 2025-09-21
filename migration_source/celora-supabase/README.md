# Celora Wallet - Supabase Version

## 🚀 Modern Crypto Wallet med Supabase Backend

### ✨ Features:
- Modern glassmorphism design
- Original Celora grønn/cyan farger
- 4 konsoliderte tabs (Wallet, Assets & Card, Earn & Borrow, Send & API)
- 3D virtual card med flip-animasjon
- Supabase authentication og database
- Real-time updates
- Responsive design

### 🛠️ Setup:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Supabase Setup:**
   - Gå til [supabase.com](https://supabase.com)
   - Opprett nytt prosjekt
   - Kopier Project URL og anon key
   - Opprett `.env.local` fil med:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database Tables:**
   ```sql
   -- Users table
   create table users (
     id uuid references auth.users on delete cascade,
     username text unique,
     email text,
     created_at timestamp with time zone default timezone('utc'::text, now()) not null,
     primary key (id)
   );

   -- Wallets table
   create table wallets (
     id uuid default gen_random_uuid() primary key,
     user_id uuid references users(id) on delete cascade,
     address text not null,
     blockchain text not null,
     balance decimal default 0,
     created_at timestamp with time zone default timezone('utc'::text, now()) not null
   );
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

### 🌐 Deploy:
```bash
npm run build
# Deploy til Vercel, Netlify eller annen platform
```

### 🎯 Supabase Features:
- ✅ Authentication (Email/Password, OAuth)
- ✅ Real-time database
- ✅ Row Level Security
- ✅ Edge Functions
- ✅ Storage for avatars/documents
- ✅ Auto-generated APIs
