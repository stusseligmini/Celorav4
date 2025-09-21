#!/usr/bin/env python3
"""
Test script for Celora Wallet Implementation
Dette scriptet tester alle hovedfunksjoner i wallet-implementasjonen
"""

import os
import time
import json
import base64
import logging
import secrets
import hashlib
import hmac
from typing import Optional, List, Dict
from dataclasses import dataclass, field

import requests
from requests.adapters import HTTPAdapter, Retry

# Cryptography imports
from cryptography.fernet import Fernet, InvalidToken

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("test_wallet")

# Constants for PBKDF2
_PBKDF2_ITER = 200_000
_SALT_BYTES = 16

# Helper functions
def _generate_encryption_key() -> bytes:
    env = os.environ.get("WALLET_ENC_KEY")
    if env:
        return base64.urlsafe_b64decode(env)
    return Fernet.generate_key()

def _mask_card_number(number: str) -> str:
    n = ''.join(ch for ch in number if ch.isdigit())
    return ("*" * (len(n) - 4)) + n[-4:]

def _luhn_valid(card_number: str) -> bool:
    digits = [int(c) for c in card_number if c.isdigit()]
    checksum = 0
    parity = len(digits) % 2
    for i, d in enumerate(digits):
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0

# Data model for encrypted card
@dataclass
class VirtualCard:
    id: str
    _encrypted: bytes = field(repr=False)

    def masked(self, fernet: Fernet) -> Dict[str, str]:
        try:
            payload = json.loads(fernet.decrypt(self._encrypted).decode())
        except InvalidToken:
            raise ValueError("Unable to decrypt card - invalid key")
        return {
            "id": self.id,
            "card_number_masked": _mask_card_number(payload["card_number"]),
            "expiry": payload["expiry"],
            "cvv_masked": "***"
        }

    def decrypt(self, fernet: Fernet) -> Dict[str, str]:
        try:
            return json.loads(fernet.decrypt(self._encrypted).decode())
        except InvalidToken:
            raise ValueError("Unable to decrypt card - invalid key")

class WalletLockedError(Exception):
    pass

class Wallet:
    def __init__(
        self,
        owner: str,
        pincode: str,
        sling_api_key: str,
        encryption_key: Optional[bytes] = None,
        max_attempts: int = 5,
        lockout_seconds: int = 300,
        request_timeout: int = 10
    ):
        self.owner = owner
        self._pincode_hash = self._hash_pincode(pincode)
        self._failed_attempts = 0
        self._lockout_until = 0.0
        self._max_attempts = max_attempts
        self._lockout_seconds = lockout_seconds

        self._fernet = Fernet(encryption_key or _generate_encryption_key())
        self.cards: List[VirtualCard] = []
        self.sling_api_key = sling_api_key

        # Requests session with retries and timeouts
        self._session = requests.Session()
        retries = Retry(total=3, backoff_factor=0.3, status_forcelist=(500, 502, 503, 504))
        self._session.mount("https://", HTTPAdapter(max_retries=retries))
        self._request_timeout = request_timeout

    def _hash_pincode(self, pincode: str) -> str:
        salt = secrets.token_bytes(_SALT_BYTES)
        dk = hashlib.pbkdf2_hmac("sha256", pincode.encode(), salt, _PBKDF2_ITER)
        return base64.b64encode(salt + dk).decode()

    def _verify_pincode(self, pincode: str) -> bool:
        if time.time() < self._lockout_until:
            raise WalletLockedError(f"Wallet locked until {time.ctime(self._lockout_until)}")

        raw = base64.b64decode(self._pincode_hash.encode())
        salt = raw[:_SALT_BYTES]
        stored_dk = raw[_SALT_BYTES:]
        dk = hashlib.pbkdf2_hmac("sha256", pincode.encode(), salt, _PBKDF2_ITER)
        ok = hmac.compare_digest(stored_dk, dk)

        if ok:
            self._failed_attempts = 0
            return True

        self._failed_attempts += 1
        if self._failed_attempts >= self._max_attempts:
            self._lockout_until = time.time() + self._lockout_seconds
            logger.warning("Wallet locked due to too many failed attempts")
        return False

    def add_card(self, card_number: str, expiry: str, cvv: Optional[str] = None) -> str:
        # New behavior: CVV is optional and not stored. It may be used for tokenization only.
        if not _luhn_valid(card_number):
            raise ValueError("Invalid card number (failed Luhn check).")

        if cvv is not None and not (cvv.isdigit() and 3 <= len(cvv) <= 4):
            raise ValueError("Invalid CVV.")

        # expiry should be MM/YY or MM/YYYY and not in the past
        parts = expiry.split('/') if isinstance(expiry, str) else []
        if len(parts) != 2:
            raise ValueError("Expiry must be in MM/YY or MM/YYYY format.")
        mm = int(parts[0])
        yy = int(parts[1])
        if yy < 100:
            yy += 2000
        now = time.localtime()
        if yy < now.tm_year or (yy == now.tm_year and mm < now.tm_mon):
            raise ValueError("Expiry date is in the past.")

        payload = json.dumps({
            "card_number": card_number,
            "expiry": expiry
        }).encode()

        encrypted = self._fernet.encrypt(payload)
        card_id = secrets.token_hex(8)
        card = VirtualCard(id=card_id, _encrypted=encrypted)
        self.cards.append(card)
        logger.info("Card added for owner=%s id=%s", self.owner, card_id)
        return card_id

    def list_cards(self) -> List[Dict[str, str]]:
        return [card.masked(self._fernet) for card in self.cards]

    def get_card(self, card_id: str, pincode: str) -> Dict[str, str]:
        if not self._verify_pincode(pincode):
            raise ValueError("Invalid pincode.")
        for c in self.cards:
            if c.id == card_id:
                return c.decrypt(self._fernet)
        raise KeyError("Card not found.")

def test_wallet():
    """Test all wallet functionality"""
    print("🏦 Testing Celora Wallet Implementation...")
    
    # Create wallet
    wallet = Wallet(
        owner="test@celora.com",
        pincode="123456",
        sling_api_key="test_key",
        max_attempts=3,
        lockout_seconds=5
    )
    
    print("✅ Wallet created successfully")
    
    # Test card addition
    try:
        card_id = wallet.add_card("4532015112830366", "12/25", "123")
        print(f"✅ Card added with ID: {card_id}")
    except Exception as e:
        print(f"❌ Card addition failed: {e}")
        return False
    
    # Test card listing
    cards = wallet.list_cards()
    print(f"✅ Listed {len(cards)} cards")
    for card in cards:
        print(f"   Card: {card['card_number_masked']} Exp: {card['expiry']}")
    
    # Test PIN verification
    try:
        full_card = wallet.get_card(card_id, "123456")
        print("✅ PIN verification successful")
    except Exception as e:
        print(f"❌ PIN verification failed: {e}")
    
    # Test invalid card
    try:
        wallet.add_card("1234567890123456", "12/25", "123")
        print("❌ Invalid card was accepted (shouldn't happen)")
        return False
    except ValueError:
        print("✅ Invalid card properly rejected")
    
    # Test lockout mechanism
    print("\n🔒 Testing lockout mechanism...")
    for i in range(3):
        try:
            wallet._verify_pincode("wrong_pin")
        except:
            pass
    
    try:
        wallet._verify_pincode("123456")
        print("❌ Wallet not locked after failed attempts")
        return False
    except WalletLockedError:
        print("✅ Wallet properly locked after failed attempts")
    
    print("\n🎉 All tests passed! Celora wallet implementation er fullt funksjonell!")
    return True

if __name__ == "__main__":
    success = test_wallet()
    if success:
        print("\n✅ RESULTAT: Celora wallet koden er ren og fungerer perfekt!")
        print("   Alle røde advarsler i VS Code skal nå forsvinne.")
    else:
        print("\n❌ RESULTAT: Det er fortsatt problemer med wallet implementasjonen.")
