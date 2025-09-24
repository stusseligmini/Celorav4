-- ENKEL FIX FOR EKSISTERENDE DATABASE
-- Kjør denne istedenfor den forrige

-- Legg til missing felt for wallet-type support (hvis ikke eksisterer)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'wallet_type'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN wallet_type TEXT DEFAULT 'email';
    END IF;
END $$;

-- Opprett eller erstatt auto-setup funksjon for nye brukere
CREATE OR REPLACE FUNCTION setup_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert user profile automatisk (ignorer hvis eksisterer)
    INSERT INTO public.user_profiles (id, email, full_name, wallet_type, is_verified, kyc_status)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        COALESCE(NEW.raw_user_meta_data->>'wallet_type', 'email'),
        CASE WHEN NEW.raw_user_meta_data->>'wallet_type' = 'seed_phrase' THEN TRUE ELSE FALSE END,
        CASE WHEN NEW.raw_user_meta_data->>'wallet_type' = 'seed_phrase' THEN 'verified' ELSE 'pending' END
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Lag standard wallet for brukeren (ignorer hvis eksisterer)
    INSERT INTO public.wallets (user_id, name, currency, balance, is_primary)
    VALUES (NEW.id, 'Main Wallet', 'USD', 1000.00, TRUE)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Opprett trigger for auto-setup (dropp først hvis eksisterer)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION setup_new_user();

-- Success!
SELECT 'Setup completed successfully! Ready for wallet creation.' as status;