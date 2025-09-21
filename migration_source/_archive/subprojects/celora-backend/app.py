from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import time

# Lightweight wrapper to reuse the Wallet class defined in the notebook.
# For now we import by path; in a fuller repo we'd refactor wallet into a proper package.
try:
    from celora_wallet_implementation import Wallet
except Exception:
    # If the notebook isn't importable as a module, provide a small fallback stub for dev.
    Wallet = None

app = FastAPI(title="Celora Wallet (dev)")

class CreateWalletRequest(BaseModel):
    owner: str
    pincode: str
    sling_api_key: str

class AddCardRequest(BaseModel):
    card_number: str
    expiry: str
    cvv: Optional[str] = None
    pincode: str

# In-memory store
_WALLETS = {}


@app.post("/api/wallets")
def create_wallet(req: CreateWalletRequest):
    if Wallet is None:
        raise HTTPException(status_code=500, detail="Wallet implementation not available in this environment")
    wallet = Wallet(owner=req.owner, pincode=req.pincode, sling_api_key=req.sling_api_key)
    _WALLETS[req.owner] = wallet
    return {"success": True, "owner": req.owner, "created_at": time.time()}


@app.post("/api/wallets/{owner}/cards")
def add_card(owner: str, req: AddCardRequest):
    wallet = _WALLETS.get(owner)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    try:
        card_id = wallet.add_card(req.card_number, req.expiry, req.cvv)
        return {"success": True, "card_id": card_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/wallets/{owner}/cards")
def list_cards(owner: str):
    wallet = _WALLETS.get(owner)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return {"cards": wallet.list_cards()}
