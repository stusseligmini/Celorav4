"""
Celora Wallet Service
Backend integration for secure wallet operations
"""

import os
import time
import json
import base64
import logging
import secrets
import hashlib
import hmac
from typing import Optional, List, Dict, Tuple, Any, Union
from dataclasses import dataclass, field

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("celora_wallet")

# Constants for PBKDF2
_PBKDF2_ITER = 200_000
_SALT_BYTES = 16

class WalletLockedError(Exception):
    """Raised when wallet is locked due to too many failed PIN attempts"""
    pass

class CardValidationError(Exception):
    """Raised when card validation fails"""
    pass

@dataclass
class EncryptedCard:
    """Encrypted virtual card with secure storage"""
    id: str
    owner_id: str
    _encrypted_data: bytes = field(repr=False)
    created_at: float = field(default_factory=time.time)
    status: str = "active"

    def decrypt(self, fernet: Fernet) -> Dict[str, str]:
        """Decrypt and return full card data"""
        try:
            return json.loads(fernet.decrypt(self._encrypted_data).decode())
        except InvalidToken:
            raise ValueError("Unable to decrypt card - invalid key")

    def get_masked_data(self, fernet: Fernet) -> Dict[str, Union[str, float]]:
        """Get masked card data for display"""
        try:
            full_data = self.decrypt(fernet)
            return {
                "id": self.id,
                "card_number_masked": self._mask_card_number(full_data["card_number"]),
                "expiry": full_data["expiry"],
                "cvv_masked": "***",
                "status": self.status,
                "created_at": self.created_at
            }
        except Exception as e:
            logger.error(f"Failed to get masked card data: {e}")
            return {"error": "Failed to decrypt card data"}

    @staticmethod
    def _mask_card_number(number: str) -> str:
        """Mask card number showing only last 4 digits"""
        clean_number = ''.join(ch for ch in number if ch.isdigit())
        if len(clean_number) < 4:
            return "*" * len(clean_number)
        return "*" * (len(clean_number) - 4) + clean_number[-4:]

class CeloraWalletService:
    """
    Secure wallet service for Celora platform
    Handles PIN authentication, card encryption, and secure operations
    """

    def __init__(self, encryption_key: Optional[bytes] = None):
        # Initialize encryption
        if encryption_key:
            self.fernet = Fernet(encryption_key)
        else:
            # Generate or load from environment
            env_key = os.environ.get("CELORA_WALLET_ENCRYPTION_KEY")
            if env_key:
                self.fernet = Fernet(base64.urlsafe_b64decode(env_key))
            else:
                # Generate new key (store this securely!)
                key = Fernet.generate_key()
                self.fernet = Fernet(key)
                logger.warning("Generated new encryption key - store securely!")
                logger.info(f"Encryption key: {base64.urlsafe_b64encode(key).decode()}")

        # In-memory storage (replace with database in production)
        self.wallets: Dict[str, dict] = {}
        self.cards: Dict[str, EncryptedCard] = {}

    def create_wallet(self, user_id: str, owner_email: str, pin: str) -> Dict[str, Any]:
        """Create a new secure wallet for user"""
        try:
            # Validate PIN
            if not self._validate_pin(pin):
                raise ValueError("PIN must be 6 digits")

            # Hash PIN securely
            pin_hash = self._hash_pin(pin)

            # Create wallet configuration
            wallet_data = {
                "user_id": user_id,
                "owner": owner_email,
                "pin_hash": pin_hash,
                "created_at": time.time(),
                "failed_attempts": 0,
                "locked_until": 0.0,
                "max_attempts": 5,
                "lockout_seconds": 300,
                "security_features": [
                    "pin_protection",
                    "card_encryption",
                    "request_signing",
                    "lockout_protection",
                    "luhn_validation"
                ],
                "cards": []
            }

            self.wallets[user_id] = wallet_data
            
            logger.info(f"Wallet created for user: {user_id}, owner: {owner_email}")
            
            return {
                "success": True,
                "wallet_id": user_id,
                "owner": owner_email,
                "features": wallet_data["security_features"],
                "created_at": wallet_data["created_at"]
            }

        except Exception as e:
            logger.error(f"Wallet creation failed: {e}")
            return {"success": False, "error": str(e)}

    def verify_pin(self, user_id: str, pin: str) -> bool:
        """Verify PIN with lockout protection"""
        if user_id not in self.wallets:
            raise ValueError("Wallet not found")

        wallet = self.wallets[user_id]
        
        # Check if locked
        if time.time() < wallet["locked_until"]:
            raise WalletLockedError(f"Wallet locked until {time.ctime(wallet['locked_until'])}")

        # Verify PIN
        is_valid = self._verify_pin_hash(pin, wallet["pin_hash"])

        if is_valid:
            # Reset failed attempts on success
            wallet["failed_attempts"] = 0
            logger.info(f"PIN verified successfully for user: {user_id}")
            return True
        else:
            # Increment failed attempts
            wallet["failed_attempts"] += 1
            logger.warning(f"Failed PIN attempt for user: {user_id}, attempts: {wallet['failed_attempts']}")

            # Lock wallet if too many attempts
            if wallet["failed_attempts"] >= wallet["max_attempts"]:
                wallet["locked_until"] = time.time() + wallet["lockout_seconds"]
                logger.warning(f"Wallet locked for user: {user_id} until {time.ctime(wallet['locked_until'])}")
                raise WalletLockedError("Too many failed attempts - wallet locked")

            return False

    def add_card(self, user_id: str, card_data: Dict[str, str], pin: str) -> Dict[str, Any]:
        """Add encrypted virtual card to wallet"""
        try:
            # Verify PIN first
            if not self.verify_pin(user_id, pin):
                raise ValueError("Invalid PIN")

            # Validate card data
            self._validate_card_data(card_data)

            # Encrypt card data
            card_payload = json.dumps({
                "card_number": card_data["card_number"],
                "expiry": card_data["expiry"],
                "cvv": card_data["cvv"],
                "cardholder_name": card_data.get("cardholder_name", "")
            }).encode()

            encrypted_data = self.fernet.encrypt(card_payload)

            # Create encrypted card
            card_id = f"card_{secrets.token_hex(8)}"
            encrypted_card = EncryptedCard(
                id=card_id,
                owner_id=user_id,
                _encrypted_data=encrypted_data
            )

            # Store card
            self.cards[card_id] = encrypted_card
            self.wallets[user_id]["cards"].append(card_id)

            logger.info(f"Card added for user: {user_id}, card_id: {card_id}")

            return {
                "success": True,
                "card_id": card_id,
                "masked_data": encrypted_card.get_masked_data(self.fernet)
            }

        except Exception as e:
            logger.error(f"Card addition failed for user {user_id}: {e}")
            return {"success": False, "error": str(e)}

    def get_cards(self, user_id: str, pin: str) -> Dict[str, Any]:
        """Get all cards for user (masked data)"""
        try:
            # Verify PIN
            if not self.verify_pin(user_id, pin):
                raise ValueError("Invalid PIN")

            if user_id not in self.wallets:
                raise ValueError("Wallet not found")

            wallet = self.wallets[user_id]
            cards_data = []

            for card_id in wallet["cards"]:
                if card_id in self.cards:
                    card = self.cards[card_id]
                    cards_data.append(card.get_masked_data(self.fernet))

            return {
                "success": True,
                "cards": cards_data,
                "count": len(cards_data)
            }

        except Exception as e:
            logger.error(f"Failed to get cards for user {user_id}: {e}")
            return {"success": False, "error": str(e)}

    def get_card_details(self, user_id: str, card_id: str, pin: str) -> Dict[str, Any]:
        """Get full card details (requires PIN verification)"""
        try:
            # Verify PIN
            if not self.verify_pin(user_id, pin):
                raise ValueError("Invalid PIN")

            if card_id not in self.cards:
                raise ValueError("Card not found")

            card = self.cards[card_id]
            
            # Verify ownership
            if card.owner_id != user_id:
                raise ValueError("Access denied - not card owner")

            return {
                "success": True,
                "card_data": card.decrypt(self.fernet)
            }

        except Exception as e:
            logger.error(f"Failed to get card details: {e}")
            return {"success": False, "error": str(e)}

    def delete_card(self, user_id: str, card_id: str, pin: str) -> Dict[str, Any]:
        """Delete a card from wallet"""
        try:
            # Verify PIN
            if not self.verify_pin(user_id, pin):
                raise ValueError("Invalid PIN")

            if card_id not in self.cards:
                raise ValueError("Card not found")

            card = self.cards[card_id]
            
            # Verify ownership
            if card.owner_id != user_id:
                raise ValueError("Access denied - not card owner")

            # Remove from storage
            del self.cards[card_id]
            
            # Remove from wallet
            if user_id in self.wallets:
                self.wallets[user_id]["cards"] = [
                    cid for cid in self.wallets[user_id]["cards"] 
                    if cid != card_id
                ]

            logger.info(f"Card deleted: {card_id} for user: {user_id}")

            return {"success": True, "message": "Card deleted successfully"}

        except Exception as e:
            logger.error(f"Failed to delete card: {e}")
            return {"success": False, "error": str(e)}

    def get_wallet_status(self, user_id: str) -> Dict[str, Any]:
        """Get wallet status and security info"""
        if user_id not in self.wallets:
            return {"success": False, "error": "Wallet not found"}

        wallet = self.wallets[user_id]
        
        return {
            "success": True,
            "status": {
                "owner": wallet["owner"],
                "created_at": wallet["created_at"],
                "cards_count": len(wallet["cards"]),
                "failed_attempts": wallet["failed_attempts"],
                "is_locked": time.time() < wallet["locked_until"],
                "locked_until": wallet["locked_until"] if wallet["locked_until"] > time.time() else None,
                "security_features": wallet["security_features"]
            }
        }

    # Private helper methods
    def _validate_pin(self, pin: str) -> bool:
        """Validate PIN format"""
        return pin.isdigit() and len(pin) == 6

    def _hash_pin(self, pin: str) -> str:
        """Hash PIN using PBKDF2 with salt"""
        salt = secrets.token_bytes(_SALT_BYTES)
        dk = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, _PBKDF2_ITER)
        return base64.b64encode(salt + dk).decode()

    def _verify_pin_hash(self, pin: str, pin_hash: str) -> bool:
        """Verify PIN against hash using constant-time comparison"""
        try:
            raw = base64.b64decode(pin_hash.encode())
            salt = raw[:_SALT_BYTES]
            stored_dk = raw[_SALT_BYTES:]
            dk = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, _PBKDF2_ITER)
            return hmac.compare_digest(stored_dk, dk)
        except Exception:
            return False

    def _validate_card_data(self, card_data: Dict[str, str]) -> None:
        """Validate card data"""
        required_fields = ["card_number", "expiry", "cvv"]
        
        for field in required_fields:
            if field not in card_data:
                raise CardValidationError(f"Missing required field: {field}")

        # Validate card number (Luhn algorithm)
        if not self._luhn_validate(card_data["card_number"]):
            raise CardValidationError("Invalid card number (failed Luhn check)")

        # Validate CVV
        cvv = card_data["cvv"]
        if not (cvv.isdigit() and 3 <= len(cvv) <= 4):
            raise CardValidationError("Invalid CVV")

        # Validate expiry format
        expiry = card_data["expiry"]
        if not self._validate_expiry(expiry):
            raise CardValidationError("Invalid expiry format (use MM/YY or MM/YYYY)")

    def _luhn_validate(self, card_number: str) -> bool:
        """Validate card number using Luhn algorithm"""
        digits = [int(c) for c in card_number if c.isdigit()]
        checksum = 0
        parity = len(digits) % 2

        for i, digit in enumerate(digits):
            if i % 2 == parity:
                digit *= 2
                if digit > 9:
                    digit -= 9
            checksum += digit

        return checksum % 10 == 0

    def _validate_expiry(self, expiry: str) -> bool:
        """Validate expiry date format"""
        try:
            if "/" not in expiry:
                return False
            
            parts = expiry.split("/")
            if len(parts) != 2:
                return False

            month, year = parts
            
            # Validate month
            if not (month.isdigit() and 1 <= int(month) <= 12):
                return False

            # Validate year (YY or YYYY format)
            if not (year.isdigit() and (len(year) == 2 or len(year) == 4)):
                return False

            return True
        except Exception:
            return False

# Singleton instance for the application
wallet_service = CeloraWalletService()

def get_wallet_service() -> CeloraWalletService:
    """Get the wallet service instance"""
    return wallet_service
