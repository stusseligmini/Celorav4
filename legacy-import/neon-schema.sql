-- Celora Platform Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    address VARCHAR(255) NOT NULL UNIQUE,
    blockchain VARCHAR(50) NOT NULL,
    balance DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (id, username, email, created_at) VALUES
('1', 'john', 'john@example.com', CURRENT_TIMESTAMP),
('2', 'jane', 'jane@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (id, user_id, address, blockchain, balance, created_at) VALUES
('1', '1', '0x123...abc', 'solana', 10.5, CURRENT_TIMESTAMP),
('2', '2', '0x456...def', 'ethereum', 5.2, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
