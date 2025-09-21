from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os

# Initialize FastAPI app
app = FastAPI(
    title="Celora Wallet",
    description="Modern Celora Wallet Interface",
    version="1.0.0",
)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the modern wallet
@app.get("/")
async def serve_wallet():
    """Serve the modern Celora wallet"""
    return FileResponse('celora-wallet-modern.html')

@app.get("/health")
async def health_check():
    """Health check for deployment"""
    return {
        "status": "healthy",
        "message": "Celora Wallet is running",
        "version": "1.0.0"
    }

# API info endpoint
@app.get("/api")
async def api_info():
    return {
        "message": "Celora Wallet API",
        "status": "online",
        "version": "1.0.0"
    }
