-- 000_registry.sql
-- Table for tracking applied migrations
CREATE TABLE IF NOT EXISTS _celora_migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
