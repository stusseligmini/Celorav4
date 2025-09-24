-- CELORA PLATFORM - SAFE STEP-BY-STEP DATABASE SETUP
-- Run each section separately in Supabase SQL Editor

-- STEP 1: Enable extensions and create types
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE account_type AS ENUM ('email', 'seed_phrase');
CREATE TYPE card_status AS ENUM ('active', 'blocked', 'expired', 'pending');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer', 'payment', 'refund');