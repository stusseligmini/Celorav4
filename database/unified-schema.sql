-- Unified schema to align code and database naming and add atomic transfer procedure
-- Tables normalized: transactions (not wallet_transactions), audit_log (not audit_logs), user_profiles

-- Ensure extensions
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  is_verified boolean not null default false,
  kyc_status text not null default 'pending',
  two_factor_enabled boolean not null default false,
  preferred_currency text not null default 'USD',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Wallets
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_name text not null,
  wallet_type text not null,
  public_key text,
  encrypted_private_key text,
  encrypted_mnemonic text,
  network text,
  currency text not null default 'USD',
  balance numeric not null default 0,
  usd_balance numeric not null default 0,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  derivation_path text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete set null,
  card_id uuid,
  transaction_type text not null,
  amount numeric not null,
  currency text not null default 'USD',
  fee_amount numeric not null default 0,
  exchange_rate numeric,
  status text not null default 'pending',
  description text,
  merchant_name text,
  merchant_category text,
  tx_hash text,
  block_number bigint,
  confirmations int not null default 0,
  gas_used numeric,
  gas_price numeric,
  reference_id text,
  external_id text,
  related_transaction_id uuid references public.transactions(id),
  risk_score int not null default 0,
  location_data jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Audit log (table) and read-only view audit_logs
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  session_id text,
  created_at timestamptz not null default now()
);

create or replace view public.audit_logs as
  select * from public.audit_log;

-- Balance maintenance trigger: recompute wallet.balance from transactions
create or replace function public.recompute_wallet_balance(p_wallet_id uuid)
returns void language plpgsql as $$
declare total numeric;
begin
  select coalesce(sum(amount),0) into total from public.transactions
  where wallet_id = p_wallet_id and status in ('completed','processing');
  update public.wallets set balance = total, updated_at = now() where id = p_wallet_id;
end;$$;

create or replace function public.trg_transactions_balance()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.wallet_id is not null then
      perform public.recompute_wallet_balance(new.wallet_id);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.wallet_id is not null then
      perform public.recompute_wallet_balance(new.wallet_id);
    end if;
    if old.wallet_id is not null and old.wallet_id <> new.wallet_id then
      perform public.recompute_wallet_balance(old.wallet_id);
    end if;
  elsif tg_op = 'DELETE' then
    if old.wallet_id is not null then
      perform public.recompute_wallet_balance(old.wallet_id);
    end if;
  end if;
  return null;
end;$$;

drop trigger if exists transactions_balance_trg on public.transactions;
create trigger transactions_balance_trg
after insert or update or delete on public.transactions
for each row execute function public.trg_transactions_balance();

-- Atomic wallet transfer stored procedure
create or replace function public.wallet_transfer(
  p_source_wallet uuid,
  p_destination_wallet uuid,
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_description text default null
) returns table (source_tx uuid, destination_tx uuid) language plpgsql as $$
declare s_tx uuid; d_tx uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be > 0';
  end if;
  if p_source_wallet = p_destination_wallet then
    raise exception 'Source and destination must differ';
  end if;
  perform 1 from public.wallets w where w.id = p_source_wallet and w.user_id = p_user_id and w.is_active;
  if not found then raise exception 'Source wallet not found or inactive or not owned by user'; end if;
  perform 1 from public.wallets w where w.id = p_destination_wallet and w.is_active;
  if not found then raise exception 'Destination wallet not found or inactive'; end if;

  -- ensure sufficient funds based on current computed balance
  perform 1 from public.wallets w where w.id = p_source_wallet and w.balance >= p_amount;
  if not found then raise exception 'Insufficient funds'; end if;

  -- create paired transactions and mark completed
  insert into public.transactions (user_id, wallet_id, transaction_type, amount, currency, status, description, related_transaction_id)
  values (p_user_id, p_source_wallet, 'transfer', -p_amount, p_currency, 'completed', coalesce(p_description,'Transfer to wallet'), null)
  returning id into s_tx;

  insert into public.transactions (user_id, wallet_id, transaction_type, amount, currency, status, description, related_transaction_id)
  values (p_user_id, p_destination_wallet, 'transfer', p_amount, p_currency, 'completed', coalesce(p_description,'Transfer from wallet'), s_tx)
  returning id into d_tx;

  update public.transactions set related_transaction_id = d_tx where id = s_tx;

  -- balances updated by trigger
  return query select s_tx, d_tx;
end;$$;

-- RLS policies
alter table public.user_profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_log enable row level security;

do $$ begin
  -- profiles: users can see/update their own
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='own profile select') then
    create policy "own profile select" on public.user_profiles for select using (id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='own profile update') then
    create policy "own profile update" on public.user_profiles for update using (id = auth.uid());
  end if;

  -- wallets: user owns their rows
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='wallets' and policyname='wallets select') then
    create policy "wallets select" on public.wallets for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='wallets' and policyname='wallets insert') then
    create policy "wallets insert" on public.wallets for insert with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='wallets' and policyname='wallets update') then
    create policy "wallets update" on public.wallets for update using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='wallets' and policyname='wallets delete') then
    create policy "wallets delete" on public.wallets for delete using (user_id = auth.uid());
  end if;

  -- transactions: only see own via wallet ownership or user_id
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='transactions' and policyname='transactions select') then
    create policy "transactions select" on public.transactions for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='transactions' and policyname='transactions insert') then
    create policy "transactions insert" on public.transactions for insert with check (user_id = auth.uid());
  end if;
end $$;
