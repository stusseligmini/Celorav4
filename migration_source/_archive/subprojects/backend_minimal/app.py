"""
Minimal Celora backend for deployment.
Contains a single FastAPI app with wallet functionality.
"""
import os
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from celora_wallet import Wallet, WalletLockedError

app = FastAPI(title="Celora Minimal Backend", version="0.1.0")

# In-memory wallet store for minimal deployment
wallets = {}

class CreateWallet(BaseModel):
    owner: str = Field(..., min_length=1)
    pincode: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    sling_api_key: Optional[str] = Field(None)

class AddCard(BaseModel):
    card_number: str = Field(..., min_length=13, max_length=19)
    expiry: str = Field(..., pattern=r"^\d{2}/\d{2,4}$")
    cvv: Optional[str] = Field(None, min_length=3, max_length=4)
    pincode: str = Field(..., min_length=6, max_length=6)

@app.get("/health")
async def health():
    return {"status": "healthy", "time": datetime.utcnow().isoformat()}

@app.post("/wallets")
async def create_wallet(req: CreateWallet):
    if req.owner in wallets:
        raise HTTPException(status_code=400, detail="Wallet exists")
    wallet = Wallet(owner=req.owner, pincode=req.pincode, sling_api_key=req.sling_api_key or "demo")
    wallets[req.owner] = wallet
    return {"success": True, "owner": req.owner}

@app.post("/wallets/{owner}/cards")
async def add_card(owner: str, req: AddCard):
    if owner not in wallets:
        raise HTTPException(status_code=404, detail="Wallet not found")
    wallet = wallets[owner]
    try:
        card_id = wallet.add_card(req.card_number, req.expiry, req.cvv, pincode=req.pincode)
        return {"success": True, "card_id": card_id}
    except WalletLockedError as e:
        raise HTTPException(status_code=423, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/wallets/{owner}/cards")
async def list_cards(owner: str):
    if owner not in wallets:
        raise HTTPException(status_code=404, detail="Wallet not found")
    wallet = wallets[owner]
    return {"cards": wallet.list_cards()}
