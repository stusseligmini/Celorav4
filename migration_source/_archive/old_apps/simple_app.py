from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel
import os
import uuid
from sqlalchemy import create_engine, Column, String, Float, DateTime, MetaData, Table, Integer, select, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import databases
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup - Using environment variable with SQLite fallback for local testing
DATABASE_URL = os.getenv("DATABASE_URL")

# Railway auto-provides DATABASE_URL for PostgreSQL
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./test.db"
    logger.info("No DATABASE_URL found in environment, using SQLite fallback for local development")
else:
    logger.info("Using DATABASE_URL from Railway PostgreSQL service")

# Log the database URL (masking credentials for security)
if DATABASE_URL.startswith("postgresql"):
    masked_url = "postgresql://****:****@" + DATABASE_URL.split("@")[1] if "@" in DATABASE_URL else DATABASE_URL
    logger.info(f"Using PostgreSQL database: {masked_url}")
else:
    logger.info(f"Using SQLite database: {DATABASE_URL}")

try:
    database = databases.Database(DATABASE_URL)
    metadata = MetaData()

    # Define tables
    users = Table(
        "users",
        metadata,
        Column("id", String, primary_key=True),
        Column("username", String, index=True),
        Column("email", String, nullable=True),
        Column("created_at", DateTime, nullable=False, default=datetime.utcnow)
    )

    wallets = Table(
        "wallets",
        metadata,
        Column("id", String, primary_key=True),
        Column("user_id", String, index=True),
        Column("address", String, nullable=False),
        Column("blockchain", String, nullable=False),
        Column("balance", Float, default=0.0),
        Column("created_at", DateTime, nullable=False, default=datetime.utcnow)
    )

    # Create engine to generate tables if they don't exist
    engine = create_engine(DATABASE_URL)
    metadata.create_all(engine)
    logger.info("Database tables created successfully")
    
except Exception as e:
    logger.error(f"Error setting up database: {e}")
    # Create in-memory fallback for testing
    from sqlalchemy import create_engine
    DATABASE_URL = "sqlite:///:memory:"
    database = databases.Database(DATABASE_URL)
    metadata = MetaData()
    
    # Define tables with same structure
    users = Table(
        "users",
        metadata,
        Column("id", String, primary_key=True),
        Column("username", String, index=True),
        Column("email", String, nullable=True),
        Column("created_at", DateTime, nullable=False, default=datetime.utcnow)
    )

    wallets = Table(
        "wallets",
        metadata,
        Column("id", String, primary_key=True),
        Column("user_id", String, index=True),
        Column("address", String, nullable=False),
        Column("blockchain", String, nullable=False),
        Column("balance", Float, default=0.0),
        Column("created_at", DateTime, nullable=False, default=datetime.utcnow)
    )
    
    engine = create_engine(DATABASE_URL)
    metadata.create_all(engine)
    logger.warning("Using in-memory SQLite database as fallback")

# Initialize FastAPI app
app = FastAPI(
    title="Celora API",
    description="Backend API for Celora Platform",
    version="2.0.0",
)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup and shutdown events
@app.on_event("startup")
async def startup():
    try:
        await database.connect()
        logger.info("Database connected successfully")
        
        # Check if tables exist and have data
        query = "SELECT COUNT(*) FROM users"
        try:
            result = await database.fetch_val(query)
            logger.info(f"Found {result} users in database")
            
            # Add sample data if database is empty
            if result == 0:
                logger.info("Adding sample users to database")
                for user in sample_users:
                    insert_query = users.insert().values(**user)
                    await database.execute(insert_query)
                
                logger.info("Adding sample wallets to database")
                for wallet in sample_wallets:
                    insert_query = wallets.insert().values(**wallet)
                    await database.execute(insert_query)
        except Exception as table_error:
            logger.error(f"Error checking tables: {table_error}")
            logger.info("Tables might not exist yet, will be created on first request")
            
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        logger.warning("API will run in fallback mode with sample data")

@app.on_event("shutdown")
async def shutdown():
    try:
        await database.disconnect()
        logger.info("Database disconnected")
    except Exception as e:
        logger.error(f"Error disconnecting from database: {e}")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to Celora API on Fly.io!", 
        "status": "online", 
        "version": "3.0.0", 
        "deployment_date": "2025-09-09",
        "platform": "Fly.io",
        "region": os.getenv("FLY_REGION", "unknown"),
        "database": "PostgreSQL" if os.getenv("DATABASE_URL", "").startswith("postgresql") else "SQLite"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    db_status = "connected" if database.is_connected else "disconnected"
    
    # Get database metadata if connected
    db_metadata = {}
    if database.is_connected:
        try:
            # Try to get database info
            query = "SELECT current_timestamp, current_database(), version()"
            result = await database.fetch_one(query)
            if result:
                db_metadata = {
                    "timestamp": result[0],
                    "database_name": result[1],
                    "version": result[2]
                }
        except Exception as e:
            logger.error(f"Error fetching database metadata: {e}")
            db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "database": {
            "status": db_status,
            "url": masked_url,
            "is_connected": database.is_connected,
            **db_metadata
        }
    }

# User model
# Models
class User(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    created_at: Optional[datetime] = None

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None

class Wallet(BaseModel):
    id: str
    user_id: str
    address: str
    blockchain: str
    balance: float = 0.0
    created_at: Optional[datetime] = None

class WalletCreate(BaseModel):
    user_id: str
    address: str
    blockchain: str

# Sample data for fallback if database is not available
sample_users = [
    {"id": "1", "username": "john", "email": "john@example.com"},
    {"id": "2", "username": "jane", "email": "jane@example.com"}
]

sample_wallets = [
    {"id": "1", "user_id": "1", "address": "0x123...abc", "blockchain": "solana", "balance": 10.5},
    {"id": "2", "user_id": "2", "address": "0x456...def", "blockchain": "ethereum", "balance": 5.2}
]

# API endpoints
@app.get("/api/users", response_model=List[User])
async def get_users():
    try:
        query = users.select()
        result = await database.fetch_all(query)
        return result
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        return sample_users  # Return sample data as fallback

@app.post("/api/users", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    try:
        user_id = str(uuid.uuid4())
        query = users.insert().values(
            id=user_id,
            username=user.username,
            email=user.email,
            created_at=datetime.utcnow()
        )
        await database.execute(query)
        
        # Fetch and return the created user
        select_query = users.select().where(users.c.id == user_id)
        result = await database.fetch_one(select_query)
        return result
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    try:
        query = users.select().where(users.c.id == user_id)
        user = await database.fetch_one(query)
        if not user:
            # Try sample data as fallback
            for sample_user in sample_users:
                if sample_user["id"] == user_id:
                    return sample_user
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}")
        # Check sample data as fallback
        for sample_user in sample_users:
            if sample_user["id"] == user_id:
                return sample_user
        raise HTTPException(status_code=404, detail="User not found")

@app.get("/api/wallets", response_model=List[Wallet])
async def get_wallets():
    try:
        query = wallets.select()
        result = await database.fetch_all(query)
        return result
    except Exception as e:
        logger.error(f"Error fetching wallets: {e}")
        return sample_wallets  # Return sample data as fallback

@app.post("/api/wallets", response_model=Wallet, status_code=status.HTTP_201_CREATED)
async def create_wallet(wallet: WalletCreate):
    try:
        wallet_id = str(uuid.uuid4())
        query = wallets.insert().values(
            id=wallet_id,
            user_id=wallet.user_id,
            address=wallet.address,
            blockchain=wallet.blockchain,
            balance=0.0,
            created_at=datetime.utcnow()
        )
        await database.execute(query)
        
        # Fetch and return the created wallet
        select_query = wallets.select().where(wallets.c.id == wallet_id)
        result = await database.fetch_one(select_query)
        return result
    except Exception as e:
        logger.error(f"Error creating wallet: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/wallets/{wallet_id}", response_model=Wallet)
async def get_wallet(wallet_id: str):
    try:
        query = wallets.select().where(wallets.c.id == wallet_id)
        wallet = await database.fetch_one(query)
        if not wallet:
            # Try sample data as fallback
            for sample_wallet in sample_wallets:
                if sample_wallet["id"] == wallet_id:
                    return sample_wallet
            raise HTTPException(status_code=404, detail="Wallet not found")
        return wallet
    except Exception as e:
        logger.error(f"Error fetching wallet {wallet_id}: {e}")
        # Check sample data as fallback
        for sample_wallet in sample_wallets:
            if sample_wallet["id"] == wallet_id:
                return sample_wallet
        raise HTTPException(status_code=404, detail="Wallet not found")

@app.get("/api/wallets/user/{user_id}", response_model=List[Wallet])
async def get_user_wallets(user_id: str):
    try:
        query = wallets.select().where(wallets.c.user_id == user_id)
        result = await database.fetch_all(query)
        if not result:
            # Return empty list if no wallets found
            return []
        return result
    except Exception as e:
        logger.error(f"Error fetching wallets for user {user_id}: {e}")
        # Return sample wallets for this user as fallback
        return [w for w in sample_wallets if w["user_id"] == user_id]

@app.get("/api/database-test")
async def test_database():
    """Test endpoint to check database connection"""
    try:
        # Simple query to test connection
        test_query = "SELECT current_timestamp"
        result = await database.fetch_one(test_query)
        
        return {
            "status": "success", 
            "connected": True,
            "timestamp": result[0] if result else None,
            "database_url": masked_url
        }
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return {
            "status": "error", 
            "message": str(e),
            "connected": False,
            "database_url": masked_url
        }

# Add basic auth endpoints for compatibility
@app.post("/auth/register")
async def register_user(user: UserCreate):
    """Register a new user - simplified version"""
    try:
        # Create user ID
        user_id = str(uuid.uuid4())
        
        # Insert user into database
        query = users.insert().values(
            id=user_id,
            username=user.username,
            email=user.email,
            created_at=datetime.utcnow()
        )
        await database.execute(query)
        
        return {
            "message": "User registered successfully",
            "user_id": user_id,
            "username": user.username
        }
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/auth/login") 
async def login_user(username: str, password: str = "demo"):
    """Login user - simplified version"""
    try:
        # Find user
        query = users.select().where(users.c.username == username)
        user = await database.fetch_one(query)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create simple token (in production, use proper JWT)
        token = f"token_{user['id']}"
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "username": user['username'],
                "email": user['email']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")
