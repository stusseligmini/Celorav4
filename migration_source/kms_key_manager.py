"""
KMS-backed key management for Celora wallet encryption.
Supports key rotation and secure key derivation.
"""
import os
import json
import base64
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
from cryptography.fernet import Fernet
import hashlib
import hmac
import time

logger = logging.getLogger(__name__)

@dataclass
class KeyMetadata:
    """Metadata for encrypted keys"""
    kid: str  # Key ID
    version: int
    algorithm: str
    created_at: float
    rotated_at: Optional[float] = None

class KMSKeyManager:
    """KMS-backed key manager for wallet encryption"""
    
    def __init__(self, kms_endpoint: Optional[str] = None, region: str = "us-east-1"):
        self.kms_endpoint = kms_endpoint or os.environ.get("KMS_ENDPOINT")
        self.region = region
        self.master_key_id = os.environ.get("KMS_MASTER_KEY_ID")
        self._key_cache = {}
        
        # For demo/local development, use file-based fallback
        self.use_file_fallback = not self.kms_endpoint or not self.master_key_id
        self.key_store_path = "keys"
        if self.use_file_fallback:
            os.makedirs(self.key_store_path, exist_ok=True)
            logger.warning("Using file-based key storage. Configure KMS_ENDPOINT and KMS_MASTER_KEY_ID for production.")
    
    def generate_data_key(self, context: Optional[Dict[str, str]] = None) -> tuple[bytes, str, KeyMetadata]:
        """Generate a new data key for wallet encryption"""
        kid = f"wallet-key-{int(time.time())}-{os.urandom(4).hex()}"
        
        if self.use_file_fallback:
            return self._generate_file_key(kid, context)
        
        # In production, this would call actual KMS
        return self._generate_kms_key(kid, context)
    
    def _generate_file_key(self, kid: str, context: Optional[Dict[str, str]]) -> tuple[bytes, str, KeyMetadata]:
        """File-based key generation for development"""
        plaintext_key = Fernet.generate_key()
        
        # Simple encryption using a local master key
        master_key = self._get_local_master_key()
        encrypted_key = self._encrypt_with_master_key(plaintext_key, master_key, context)
        
        metadata = KeyMetadata(
            kid=kid,
            version=1,
            algorithm="AES-256-GCM",
            created_at=time.time()
        )
        
        # Store encrypted key
        key_data = {
            "encrypted_key": base64.b64encode(encrypted_key).decode(),
            "metadata": {
                "kid": metadata.kid,
                "version": metadata.version,
                "algorithm": metadata.algorithm,
                "created_at": metadata.created_at,
                "context": context or {}
            }
        }
        
        key_file = os.path.join(self.key_store_path, f"{kid}.json")
        with open(key_file, 'w') as f:
            json.dump(key_data, f, indent=2)
        
        logger.info(f"Generated data key {kid}")
        return plaintext_key, kid, metadata
    
    def _generate_kms_key(self, kid: str, context: Optional[Dict[str, str]]) -> tuple[bytes, str, KeyMetadata]:
        """KMS-based key generation for production"""
        # This would integrate with actual KMS service (AWS KMS, Azure Key Vault, etc.)
        # For now, implement a stub that could be replaced
        logger.info(f"KMS key generation not implemented yet for {kid}")
        raise NotImplementedError("KMS integration pending")
    
    def decrypt_data_key(self, kid: str, context: Optional[Dict[str, str]] = None) -> bytes:
        """Decrypt a data key by KID"""
        if kid in self._key_cache:
            return self._key_cache[kid]
        
        if self.use_file_fallback:
            key = self._decrypt_file_key(kid, context)
        else:
            key = self._decrypt_kms_key(kid, context)
        
        # Cache for performance
        self._key_cache[kid] = key
        return key
    
    def _decrypt_file_key(self, kid: str, context: Optional[Dict[str, str]]) -> bytes:
        """Decrypt file-based key"""
        key_file = os.path.join(self.key_store_path, f"{kid}.json")
        
        if not os.path.exists(key_file):
            raise ValueError(f"Key {kid} not found")
        
        with open(key_file, 'r') as f:
            key_data = json.load(f)
        
        encrypted_key = base64.b64decode(key_data["encrypted_key"])
        master_key = self._get_local_master_key()
        
        return self._decrypt_with_master_key(encrypted_key, master_key, context)
    
    def _decrypt_kms_key(self, kid: str, context: Optional[Dict[str, str]]) -> bytes:
        """KMS-based key decryption"""
        logger.info(f"KMS key decryption not implemented yet for {kid}")
        raise NotImplementedError("KMS integration pending")
    
    def rotate_key(self, old_kid: str) -> tuple[bytes, str, KeyMetadata]:
        """Rotate a key (generate new, mark old as rotated)"""
        logger.info(f"Rotating key {old_kid}")
        
        # Generate new key
        new_key, new_kid, new_metadata = self.generate_data_key()
        
        # Mark old key as rotated (in production, this would update KMS metadata)
        if self.use_file_fallback:
            self._mark_file_key_rotated(old_kid)
        
        return new_key, new_kid, new_metadata
    
    def _mark_file_key_rotated(self, kid: str):
        """Mark file-based key as rotated"""
        key_file = os.path.join(self.key_store_path, f"{kid}.json")
        if os.path.exists(key_file):
            with open(key_file, 'r') as f:
                key_data = json.load(f)
            key_data["metadata"]["rotated_at"] = time.time()
            with open(key_file, 'w') as f:
                json.dump(key_data, f, indent=2)
    
    def _get_local_master_key(self) -> bytes:
        """Get local master key for file-based encryption"""
        master_key_file = os.path.join(self.key_store_path, "master.key")
        
        if os.path.exists(master_key_file):
            with open(master_key_file, 'rb') as f:
                return f.read()
        
        # Generate new master key
        master_key = os.urandom(32)  # 256-bit key
        with open(master_key_file, 'wb') as f:
            f.write(master_key)
        
        logger.info("Generated new local master key")
        return master_key
    
    def _encrypt_with_master_key(self, data: bytes, master_key: bytes, context: Optional[Dict[str, str]]) -> bytes:
        """Encrypt data with master key (simplified AES-GCM simulation)"""
        # In production, use proper AES-GCM
        # For demo, use HMAC-based approach
        context_str = json.dumps(context or {}, sort_keys=True)
        derived_key = hashlib.pbkdf2_hmac('sha256', master_key, context_str.encode(), 100000)
        
        fernet = Fernet(base64.urlsafe_b64encode(derived_key))
        return fernet.encrypt(data)
    
    def _decrypt_with_master_key(self, encrypted_data: bytes, master_key: bytes, context: Optional[Dict[str, str]]) -> bytes:
        """Decrypt data with master key"""
        context_str = json.dumps(context or {}, sort_keys=True)
        derived_key = hashlib.pbkdf2_hmac('sha256', master_key, context_str.encode(), 100000)
        
        fernet = Fernet(base64.urlsafe_b64encode(derived_key))
        return fernet.decrypt(encrypted_data)
    
    def list_keys(self) -> list[KeyMetadata]:
        """List all available keys"""
        keys = []
        
        if self.use_file_fallback:
            for filename in os.listdir(self.key_store_path):
                if filename.endswith('.json') and filename != 'master.key':
                    key_file = os.path.join(self.key_store_path, filename)
                    with open(key_file, 'r') as f:
                        key_data = json.load(f)
                    
                    metadata = KeyMetadata(
                        kid=key_data["metadata"]["kid"],
                        version=key_data["metadata"]["version"],
                        algorithm=key_data["metadata"]["algorithm"],
                        created_at=key_data["metadata"]["created_at"],
                        rotated_at=key_data["metadata"].get("rotated_at")
                    )
                    keys.append(metadata)
        
        return keys
