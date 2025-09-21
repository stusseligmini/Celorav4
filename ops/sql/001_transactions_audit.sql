-- Migration: create transactions & audit_log tables
-- Idempotent style (checks) kept minimal; manage with proper migration tooling later.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id uuid not null references public.virtual_cards(id) on delete cascade,
  amount numeric not null,
  currency text not null,
  transaction_type text not null check (transaction_type in ('purchase','refund','fee','topup','withdrawal','adjustment')),
  status text not null default 'posted' check (status in ('pending','posted','reversed')),
  merchant_name text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_card_created_at on public.transactions(card_id, created_at desc);
create index if not exists idx_transactions_user_created_at on public.transactions(user_id, created_at desc);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_entity on public.audit_log(entity_type, entity_id, created_at desc);
create index if not exists idx_audit_actor on public.audit_log(actor_user_id, created_at desc);
