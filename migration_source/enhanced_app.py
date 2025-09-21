from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Union, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr, Field
import os
import logging
import time
import json
import hashlib
import secrets
import string
import base64
from pathlib import Path
import uuid

# Add PyJWT explicitly
try:
    import jwt
except ImportError:
    import python_jwt as jwt

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("celora-api")

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

# Models
class User(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class TokenData(BaseModel):
    user_id: Optional[str] = None

class WalletBase(BaseModel):
    address: str
    blockchain: str
    
class Wallet(WalletBase):
    id: str
    user_id: str
    balance: float = 0
    created_at: datetime = Field(default_factory=datetime.now)

# Routes
@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to Celora API", "status": "online", "version": "2.0.0"}

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

# Simulated database
USERS_DB = {}
WALLETS_DB = {}

# Auth helpers
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = os.getenv("JWT_SECRET", "supersecretkeythatneedstobechanged")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except Exception:
        raise credentials_exception
    
    user = USERS_DB.get(token_data.user_id)
    if user is None:
        raise credentials_exception
    return user

# Auth routes
@app.post("/api/auth/register", response_model=User, tags=["Auth"])
async def register(email: str, password: str, name: Optional[str] = None):
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": email,
        "password_hash": hashlib.sha256(password.encode()).hexdigest(),
        "name": name,
        "created_at": datetime.now()
    }
    USERS_DB[user_id] = user
    return User(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"]
    )

@app.post("/api/auth/token", response_model=Token, tags=["Auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = None
    for u in USERS_DB.values():
        if u["email"] == form_data.username:
            user = u
            break
            
    if not user or hashlib.sha256(form_data.password.encode()).hexdigest() != user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user["id"]}
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Wallet routes
@app.post("/api/wallets", response_model=Wallet, tags=["Wallets"])
async def create_wallet(blockchain: str, current_user: dict = Depends(get_current_user)):
    wallet_id = str(uuid.uuid4())
    address = f"{blockchain}_{secrets.token_hex(20)}"
    
    wallet = {
        "id": wallet_id,
        "user_id": current_user["id"],
        "address": address,
        "blockchain": blockchain,
        "balance": 0.0,
        "created_at": datetime.now()
    }
    
    WALLETS_DB[wallet_id] = wallet
    return Wallet(**wallet)

@app.get("/api/wallets", response_model=List[Wallet], tags=["Wallets"])
async def get_wallets(current_user: dict = Depends(get_current_user)):
    return [
        Wallet(**wallet) 
        for wallet in WALLETS_DB.values() 
        if wallet["user_id"] == current_user["id"]
    ]

@app.get("/api/wallets/{wallet_id}", response_model=Wallet, tags=["Wallets"])
async def get_wallet(wallet_id: str, current_user: dict = Depends(get_current_user)):
    wallet = WALLETS_DB.get(wallet_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
        
    if wallet["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this wallet")
        
    return Wallet(**wallet)

# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} completed in {process_time:.4f}s - Status: {response.status_code}"
    )
    
    return response

# Exception handlers
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred"},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
