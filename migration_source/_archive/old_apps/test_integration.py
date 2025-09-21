"""
Integration tests for Celora wallet with mocked Sling API.
Tests end-to-end flows including persistence and KMS.
"""
import pytest
import asyncio
import json
import os
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient
import jwt
from datetime import datetime, timedelta

# Test configuration
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost/celora_test"
TEST_JWT_SECRET = "test-jwt-secret"
TEST_KMS_ENDPOINT = None  # Use file-based fallback

@pytest.fixture
async def test_app():
    """Create test application instance"""
    # Set test environment variables
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    os.environ["JWT_SECRET"] = TEST_JWT_SECRET
    os.environ["REDIS_URL"] = "redis://localhost:6379/1"
    
    from enhanced_app import app
    return app

@pytest.fixture
async def client(test_app):
    """Create async test client"""
    async with AsyncClient(app=test_app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def test_user_token():
    """Generate test JWT token"""
    payload = {
        "sub": "test@celora.com",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")

@pytest.fixture
def mock_sling_api():
    """Mock Sling API responses"""
    with patch('requests.Session') as mock_session:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "balance": 1000.0,
            "transaction_id": "sling_tx_123"
        }
        mock_response.text = '{"success": true}'
        
        mock_session.return_value.post.return_value = mock_response
        mock_session.return_value.get.return_value = mock_response
        
        yield mock_session

class TestAuthentication:
    """Test authentication endpoints"""
    
    async def test_register_success(self, client):
        """Test successful user registration"""
        response = await client.post("/api/auth/register", json={
            "email": "newuser@celora.com",
            "password": "securepass123",
            "full_name": "Test User"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 86400
    
    async def test_register_invalid_email(self, client):
        """Test registration with invalid email"""
        response = await client.post("/api/auth/register", json={
            "email": "invalid-email",
            "password": "securepass123",
            "full_name": "Test User"
        })
        
        assert response.status_code == 422
    
    async def test_login_success(self, client):
        """Test successful login"""
        response = await client.post("/api/auth/login", json={
            "email": "user@celora.com",
            "password": "password123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

class TestWalletOperations:
    """Test wallet CRUD operations"""
    
    async def test_create_wallet_success(self, client, test_user_token):
        """Test successful wallet creation"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = await client.post("/api/wallets", 
            headers=headers,
            json={
                "pincode": "123456",
                "sling_api_key": "test_sling_key_123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["owner"] == "test@celora.com"
        assert "key_id" in data
    
    async def test_create_wallet_duplicate(self, client, test_user_token):
        """Test wallet creation when wallet already exists"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Create first wallet
        await client.post("/api/wallets", 
            headers=headers,
            json={
                "pincode": "123456",
                "sling_api_key": "test_sling_key_123"
            }
        )
        
        # Try to create second wallet for same user
        response = await client.post("/api/wallets", 
            headers=headers,
            json={
                "pincode": "654321",
                "sling_api_key": "test_sling_key_456"
            }
        )
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    async def test_create_wallet_invalid_pin(self, client, test_user_token):
        """Test wallet creation with invalid PIN"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = await client.post("/api/wallets", 
            headers=headers,
            json={
                "pincode": "12345",  # Too short
                "sling_api_key": "test_sling_key_123"
            }
        )
        
        assert response.status_code == 422
    
    async def test_create_wallet_unauthorized(self, client):
        """Test wallet creation without authentication"""
        response = await client.post("/api/wallets", json={
            "pincode": "123456",
            "sling_api_key": "test_sling_key_123"
        })
        
        assert response.status_code == 401

class TestCardOperations:
    """Test virtual card operations"""
    
    @pytest.fixture
    async def wallet_with_user(self, client, test_user_token):
        """Create wallet for testing"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        await client.post("/api/wallets", 
            headers=headers,
            json={
                "pincode": "123456",
                "sling_api_key": "test_sling_key_123"
            }
        )
        return headers
    
    async def test_add_card_success(self, client, wallet_with_user):
        """Test successful card addition"""
        response = await client.post("/api/wallets/cards",
            headers=wallet_with_user,
            json={
                "card_number": "4532015112830366",  # Valid test number
                "expiry": "12/25",
                "cvv": "123",
                "pincode": "123456"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "card_id" in data
    
    async def test_add_card_invalid_luhn(self, client, wallet_with_user):
        """Test card addition with invalid Luhn check"""
        response = await client.post("/api/wallets/cards",
            headers=wallet_with_user,
            json={
                "card_number": "4532015112830367",  # Invalid Luhn
                "expiry": "12/25",
                "cvv": "123",
                "pincode": "123456"
            }
        )
        
        assert response.status_code == 400
        assert "Luhn check" in response.json()["detail"]
    
    async def test_add_card_expired(self, client, wallet_with_user):
        """Test card addition with expired date"""
        response = await client.post("/api/wallets/cards",
            headers=wallet_with_user,
            json={
                "card_number": "4532015112830366",
                "expiry": "01/20",  # Expired
                "cvv": "123",
                "pincode": "123456"
            }
        )
        
        assert response.status_code == 400
        assert "past" in response.json()["detail"]
    
    async def test_add_card_wrong_pin(self, client, wallet_with_user):
        """Test card addition with wrong PIN"""
        response = await client.post("/api/wallets/cards",
            headers=wallet_with_user,
            json={
                "card_number": "4532015112830366",
                "expiry": "12/25",
                "cvv": "123",
                "pincode": "654321"  # Wrong PIN
            }
        )
        
        assert response.status_code == 400
        assert "pincode" in response.json()["detail"]
    
    async def test_list_cards_success(self, client, wallet_with_user):
        """Test listing cards"""
        # First add a card
        await client.post("/api/wallets/cards",
            headers=wallet_with_user,
            json={
                "card_number": "4532015112830366",
                "expiry": "12/25",
                "cvv": "123",
                "pincode": "123456"
            }
        )
        
        # Then list cards
        response = await client.get("/api/wallets/cards", headers=wallet_with_user)
        
        assert response.status_code == 200
        data = response.json()
        assert "cards" in data
        assert len(data["cards"]) == 1
        
        card = data["cards"][0]
        assert "id" in card
        assert "card_number_masked" in card
        assert card["card_number_masked"].endswith("0366")
        assert card["expiry"] == "12/25"
        assert card["cvv_masked"] == "***"
    
    async def test_list_cards_empty(self, client, wallet_with_user):
        """Test listing cards when none exist"""
        response = await client.get("/api/wallets/cards", headers=wallet_with_user)
        
        assert response.status_code == 200
        data = response.json()
        assert data["cards"] == []

class TestSecurityFeatures:
    """Test security and lockout mechanisms"""
    
    @pytest.fixture
    async def wallet_with_user(self, client, test_user_token):
        """Create wallet for security testing"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        await client.post("/api/wallets", 
            headers=headers,
            json={
                "pincode": "123456",
                "sling_api_key": "test_sling_key_123"
            }
        )
        return headers
    
    async def test_pin_lockout_mechanism(self, client, wallet_with_user):
        """Test PIN lockout after multiple failed attempts"""
        # Attempt to add cards with wrong PIN multiple times
        for i in range(5):  # Default max_attempts = 5
            response = await client.post("/api/wallets/cards",
                headers=wallet_with_user,
                json={
                    "card_number": "4532015112830366",
                    "expiry": "12/25",
                    "cvv": "123",
                    "pincode": "wrong_pin"
                }
            )
            
            if i < 4:
                assert response.status_code == 400
            else:
                # Should be locked on 5th attempt
                assert response.status_code == 423
                assert "locked" in response.json()["detail"]
    
    async def test_rate_limiting(self, client, test_user_token):
        """Test API rate limiting"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Make requests rapidly to trigger rate limit
        # This test would need adjustment based on actual rate limits
        tasks = []
        for i in range(20):  # Exceed rate limit
            task = client.post("/api/wallets", 
                headers=headers,
                json={
                    "pincode": "123456",
                    "sling_api_key": f"test_key_{i}"
                }
            )
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # At least some should be rate limited
        rate_limited = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 429)
        assert rate_limited > 0

class TestKeyRotation:
    """Test KMS key rotation functionality"""
    
    async def test_key_rotation_process(self):
        """Test key rotation workflow"""
        from kms_key_manager import KMSKeyManager
        
        kms = KMSKeyManager()
        
        # Generate initial key
        key1, kid1, metadata1 = kms.generate_data_key(context={"owner": "test@example.com"})
        
        # Rotate key
        key2, kid2, metadata2 = kms.rotate_key(kid1)
        
        # Verify new key is different
        assert kid1 != kid2
        assert key1 != key2
        assert metadata2.created_at > metadata1.created_at
        
        # Verify old key can still be decrypted
        decrypted_key1 = kms.decrypt_data_key(kid1)
        assert decrypted_key1 == key1
        
        # Verify new key can be decrypted
        decrypted_key2 = kms.decrypt_data_key(kid2)
        assert decrypted_key2 == key2

class TestMonitoringAndMetrics:
    """Test monitoring and observability features"""
    
    async def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = await client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
    
    async def test_metrics_endpoint(self, client):
        """Test Prometheus metrics endpoint"""
        response = await client.get("/metrics")
        
        assert response.status_code == 200
        # Should contain Prometheus metrics format
        metrics_text = response.text
        assert "wallet_operations_total" in metrics_text
        assert "crypto_operations_total" in metrics_text

class TestSlingAPIIntegration:
    """Test Sling API integration"""
    
    @pytest.fixture
    async def wallet_with_card(self, client, test_user_token, mock_sling_api):
        """Create wallet with card for Sling API testing"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Create wallet
        await client.post("/api/wallets", 
            headers=headers,
            json={
                "pincode": "123456",
                "sling_api_key": "test_sling_key_123"
            }
        )
        
        # Add card
        await client.post("/api/wallets/cards",
            headers=headers,
            json={
                "card_number": "4532015112830366",
                "expiry": "12/25",
                "cvv": "123",
                "pincode": "123456"
            }
        )
        
        return headers
    
    async def test_sling_api_deposit(self, client, wallet_with_card, mock_sling_api):
        """Test deposit via Sling API (mocked)"""
        # This test would be implemented when deposit endpoint is added
        # For now, verify that Sling API would be called correctly
        
        from celora_wallet import Wallet
        wallet = Wallet("test@celora.com", "123456", "test_sling_key")
        
        with patch.object(wallet._session, 'post') as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"transaction_id": "sling_123"}
            mock_post.return_value = mock_response
            
            result = wallet.deposit(100.0)
            
            assert "Deposited $100.00" in result
            mock_post.assert_called_once()

# Test utilities
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

if __name__ == "__main__":
    # Run tests with: python -m pytest test_integration.py -v
    pytest.main([__file__, "-v", "--tb=short"])
