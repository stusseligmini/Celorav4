import time
import json
import base64
import logging
import secrets
import hashlib
import hmac
import threading
from typing import Optional, List, Dict
from dataclasses import dataclass, field

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("secure_wallet")
logger.addHandler(logging.NullHandler())

_PBKDF2_ITER = 200_000
_SALT_BYTES = 16


def _generate_encryption_key() -> bytes:
    env = None
    try:
        import os
        env = os.environ.get("WALLET_ENC_KEY")
    except Exception:
        env = None
    if env:
        try:
            return base64.urlsafe_b64decode(env)
        except Exception:
            logger.warning("WALLET_ENC_KEY provided but invalid base64, falling back to ephemeral key for now")
    return Fernet.generate_key()


def _mask_card_number(number: str) -> str:
    n = ''.join(ch for ch in number if ch.isdigit())
    if len(n) <= 4:
        return n
    return ("*" * (len(n) - 4)) + n[-4:]


def _luhn_valid(card_number: str) -> bool:
    digits = [int(c) for c in card_number if c.isdigit()]
    if not digits:
        return False
    checksum = 0
    parity = len(digits) % 2
    for i, d in enumerate(digits):
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0


def _validate_expiry(expiry: str) -> bool:
    try:
        parts = expiry.split("/")
        if len(parts) != 2:
            return False
        mm = int(parts[0])
        yy = int(parts[1])
        if not (1 <= mm <= 12):
            return False
        if yy < 100:
            yy += 2000
        now = time.localtime()
        this_year = now.tm_year
        this_month = now.tm_mon
        if yy < this_year:
            return False
        if yy == this_year and mm < this_month:
            return False
        return True
    except Exception:
        return False


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
            "card_number_masked": _mask_card_number(payload.get("card_number", "")),
            "expiry": payload.get("expiry", ""),
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
        request_timeout: int = 10,
    ):
        self.owner = owner
        self._lock = threading.RLock()
        self._pincode_hash = self._hash_pincode(pincode)
        self._pincode_algo = "pbkdf2"
        self._failed_attempts = 0
        self._lockout_until = 0.0
        self._max_attempts = max_attempts
        self._lockout_seconds = lockout_seconds
        self._fernet = Fernet(encryption_key or _generate_encryption_key())
        self.cards: List[VirtualCard] = []
        self.sling_api_key = sling_api_key

    def _hash_pincode(self, pincode: str) -> str:
        salt = secrets.token_bytes(_SALT_BYTES)
        dk = hashlib.pbkdf2_hmac("sha256", pincode.encode(), salt, _PBKDF2_ITER)
        return base64.b64encode(salt + dk).decode()

    def _verify_pincode(self, pincode: str) -> bool:
        with self._lock:
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

    def add_card(self, card_number: str, expiry: str, cvv: Optional[str] = None, pincode: Optional[str] = None) -> str:
        # Verify PIN if provided
        if pincode is not None:
            if not self._verify_pincode(pincode):
                raise ValueError("Invalid pincode.")
        
        if not _luhn_valid(card_number):
            raise ValueError("Invalid card number (failed Luhn check).")
        if cvv is not None and not (cvv.isdigit() and 3 <= len(cvv) <= 4):
            raise ValueError("Invalid CVV.")
        if not _validate_expiry(expiry):
            raise ValueError("Expiry must be in MM/YY or MM/YYYY format and not be in the past.")
        payload = json.dumps({"card_number": card_number, "expiry": expiry}).encode()
        encrypted = self._fernet.encrypt(payload)
        card_id = secrets.token_hex(8)
        card = VirtualCard(id=card_id, _encrypted=encrypted)
        with self._lock:
            self.cards.append(card)
        logger.info("Card added for owner=%s id=%s", self.owner, card_id)
        return card_id

    def list_cards(self) -> List[Dict[str, str]]:
        with self._lock:
            return [card.masked(self._fernet) for card in self.cards]

    def get_card(self, card_id: str, pincode: str) -> Dict[str, str]:
        if not self._verify_pincode(pincode):
            raise ValueError("Invalid pincode.")
        with self._lock:
            for c in self.cards:
                if c.id == card_id:
                    return c.decrypt(self._fernet)
        raise KeyError("Card not found.")
