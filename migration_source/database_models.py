"""
Database models and migrations for Celora wallet persistent storage.
Uses SQLAlchemy with async support for Neon/Postgres.
"""
import json
import time
from typing import Optional, List, Dict
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, DateTime, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.dialects.postgresql import UUID
import uuid

Base = declarative_base()

class WalletModel(Base):
    """Persistent wallet storage"""
    __tablename__ = "wallets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner = Column(String, unique=True, nullable=False, index=True)
    pincode_hash = Column(String, nullable=False)
    pincode_algo = Column(String, default="pbkdf2")
    sling_api_key_encrypted = Column(LargeBinary, nullable=False)
    
    # KMS key management
    encryption_key_id = Column(String, nullable=False)  # KID from KMS
    
    # Security settings
    max_attempts = Column(Integer, default=5)
    lockout_seconds = Column(Integer, default=300)
    failed_attempts = Column(Integer, default=0)
    lockout_until = Column(Float, default=0.0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class VirtualCardModel(Base):
    """Persistent virtual card storage"""
    __tablename__ = "virtual_cards"
    
    id = Column(String, primary_key=True)  # card_id from wallet logic
    wallet_owner = Column(String, nullable=False, index=True)
    
    # Encrypted card data (JSON blob)
    encrypted_payload = Column(LargeBinary, nullable=False)
    encryption_key_id = Column(String, nullable=False)  # KID from KMS
    
    # Card metadata (not sensitive)
    card_type = Column(String, default="virtual")
    status = Column(String, default="active")  # active, disabled, expired
    
    # Audit trail
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

class TransactionModel(Base):
    """Transaction audit log"""
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_owner = Column(String, nullable=False, index=True)
    card_id = Column(String, nullable=True)  # If card-related
    
    transaction_type = Column(String, nullable=False)  # deposit, withdraw, card_add, etc.
    amount = Column(Float, nullable=True)  # For financial transactions
    status = Column(String, nullable=False)  # success, failed, pending
    
    # API interaction details
    sling_transaction_id = Column(String, nullable=True)
    sling_status_code = Column(Integer, nullable=True)
    
    # Transaction metadata
    transaction_metadata = Column(Text, nullable=True)  # JSON string for additional data
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLogModel(Base):
    """Security audit log"""
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_owner = Column(String, nullable=False, index=True)
    
    event_type = Column(String, nullable=False)  # pin_verify, lockout, card_decrypt, etc.
    event_status = Column(String, nullable=False)  # success, failed, blocked
    
    # Request context
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    request_id = Column(String, nullable=True)
    
    # Event details
    details = Column(Text, nullable=True)  # JSON string for event-specific data
    created_at = Column(DateTime, default=datetime.utcnow)

# Database connection and session management
class DatabaseManager:
    """Async database manager for Neon/Postgres"""
    
    def __init__(self, database_url: str):
        self.engine = create_async_engine(
            database_url,
            echo=False,  # Set to True for SQL debugging
            pool_size=20,
            max_overflow=30,
            pool_timeout=30,
            pool_recycle=3600
        )
        self.session_factory = async_sessionmaker(
            self.engine, 
            expire_on_commit=False
        )
    
    async def create_tables(self):
        """Create database tables"""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    async def get_session(self) -> AsyncSession:
        """Get async database session"""
        return self.session_factory()
    
    async def close(self):
        """Close database connections"""
        await self.engine.dispose()

# Migration utilities
async def run_migrations(database_url: str):
    """Run database migrations"""
    db = DatabaseManager(database_url)
    
    print("Running database migrations...")
    await db.create_tables()
    print("Database tables created successfully!")
    
    await db.close()

# Sample migration script
MIGRATION_001 = """
-- Migration 001: Initial wallet tables
-- This would be managed by Alembic in production

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner VARCHAR UNIQUE NOT NULL,
    pincode_hash VARCHAR NOT NULL,
    pincode_algo VARCHAR DEFAULT 'pbkdf2',
    sling_api_key_encrypted BYTEA NOT NULL,
    encryption_key_id VARCHAR NOT NULL,
    max_attempts INTEGER DEFAULT 5,
    lockout_seconds INTEGER DEFAULT 300,
    failed_attempts INTEGER DEFAULT 0,
    lockout_until FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_wallets_owner ON wallets(owner);

CREATE TABLE IF NOT EXISTS virtual_cards (
    id VARCHAR PRIMARY KEY,
    wallet_owner VARCHAR NOT NULL,
    encrypted_payload BYTEA NOT NULL,
    encryption_key_id VARCHAR NOT NULL,
    card_type VARCHAR DEFAULT 'virtual',
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_virtual_cards_owner ON virtual_cards(wallet_owner);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_owner VARCHAR NOT NULL,
    card_id VARCHAR,
    transaction_type VARCHAR NOT NULL,
    amount FLOAT,
    status VARCHAR NOT NULL,
    sling_transaction_id VARCHAR,
    sling_status_code INTEGER,
    transaction_metadata TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_owner ON transactions(wallet_owner);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_owner VARCHAR NOT NULL,
    event_type VARCHAR NOT NULL,
    event_status VARCHAR NOT NULL,
    ip_address VARCHAR,
    user_agent VARCHAR,
    request_id VARCHAR,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_owner ON audit_logs(wallet_owner);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
"""

if __name__ == "__main__":
    import asyncio
    import os
    
    database_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/celora_wallet")
    
    if not database_url.startswith("postgresql+asyncpg://"):
        print("Warning: DATABASE_URL should use asyncpg driver for async support")
        print("Example: postgresql+asyncpg://user:pass@localhost/dbname")
    
    asyncio.run(run_migrations(database_url))
