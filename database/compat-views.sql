-- Backward compatibility views to ease migration from old names

-- wallet_transactions -> transactions
create or replace view public.wallet_transactions as
  select 
    id,
    wallet_id,
    amount,
    currency,
    transaction_type as type,
    status,
    description,
    metadata,
    reference_id,
    external_id,
    merchant_name,
    merchant_category,
    null::text as merchant_location,
    exchange_rate as conversion_rate,
    fee_amount,
    null::text as fee_currency,
    related_transaction_id,
    null::uuid as source_wallet_id,
    null::uuid as destination_wallet_id,
    created_at,
    updated_at
  from public.transactions;

-- audit_logs (old) -> audit_log (table)
create or replace view public.audit_logs as
  select * from public.audit_log;
