-- Additional RLS hardening & indexes

-- Restrict direct status changes on virtual_cards unless owned by user (already enforced) and prevent setting negative balance
CREATE OR REPLACE FUNCTION prevent_negative_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.balance < 0 THEN
    RAISE EXCEPTION 'Balance cannot be negative';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_negative_balance ON public.virtual_cards;
CREATE TRIGGER trg_prevent_negative_balance
  BEFORE UPDATE ON public.virtual_cards
  FOR EACH ROW EXECUTE FUNCTION prevent_negative_balance();

-- Disallow deleting other users' transactions (redundant with policies) and add explicit delete policy
CREATE POLICY "Users can delete own pending transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_status_created ON public.transactions(user_id, status, created_at DESC);
