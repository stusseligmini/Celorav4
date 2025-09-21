"""
Monitoring and alerting utilities for Celora wallet.
Includes custom metrics, alerts, and dashboard config.
"""
import time
import logging
from typing import Dict, Any, Optional
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
import structlog
from contextlib import contextmanager

logger = structlog.get_logger(__name__)

# Custom metrics registry
REGISTRY = CollectorRegistry()

# Security metrics
FAILED_AUTH_ATTEMPTS = Counter(
    'wallet_failed_auth_attempts_total',
    'Failed authentication attempts',
    ['endpoint', 'reason'],
    registry=REGISTRY
)

WALLET_LOCKOUTS = Counter(
    'wallet_lockouts_total',
    'Wallet lockout events',
    ['owner'],
    registry=REGISTRY
)

CRYPTO_FAILURES = Counter(
    'crypto_failures_total',
    'Cryptographic operation failures',
    ['operation', 'error_type'],
    registry=REGISTRY
)

# Performance metrics
KMS_OPERATION_DURATION = Histogram(
    'kms_operation_duration_seconds',
    'KMS operation duration',
    ['operation'],
    registry=REGISTRY
)

DB_OPERATION_DURATION = Histogram(
    'db_operation_duration_seconds',
    'Database operation duration',
    ['operation'],
    registry=REGISTRY
)

WALLET_RESPONSE_TIME = Histogram(
    'wallet_response_time_seconds',
    'Wallet API response time',
    ['endpoint', 'status'],
    registry=REGISTRY
)

# Business metrics
ACTIVE_WALLETS_GAUGE = Gauge(
    'active_wallets_total',
    'Number of active wallets',
    registry=REGISTRY
)

CARDS_PER_WALLET = Histogram(
    'cards_per_wallet',
    'Number of cards per wallet',
    registry=REGISTRY
)

TRANSACTION_AMOUNTS = Histogram(
    'transaction_amounts',
    'Transaction amounts in USD',
    ['transaction_type'],
    buckets=[1, 10, 50, 100, 500, 1000, 5000, 10000, float('inf')],
    registry=REGISTRY
)

# Alerting thresholds
ALERT_THRESHOLDS = {
    'failed_auth_rate': 10,  # per minute
    'crypto_failure_rate': 5,  # per minute
    'response_time_p95': 2.0,  # seconds
    'kms_operation_p95': 1.0,  # seconds
    'db_operation_p95': 0.5,  # seconds
}

class SecurityMonitor:
    """Monitor security events and trigger alerts"""
    
    def __init__(self):
        self.failed_attempts_window = {}
        self.window_size = 300  # 5 minutes
    
    def record_failed_auth(self, endpoint: str, reason: str, owner: Optional[str] = None):
        """Record failed authentication attempt"""
        FAILED_AUTH_ATTEMPTS.labels(endpoint=endpoint, reason=reason).inc()
        
        # Track rate for alerting
        now = time.time()
        key = f"{endpoint}:{reason}"
        
        if key not in self.failed_attempts_window:
            self.failed_attempts_window[key] = []
        
        # Add current attempt
        self.failed_attempts_window[key].append(now)
        
        # Clean old attempts
        cutoff = now - self.window_size
        self.failed_attempts_window[key] = [
            t for t in self.failed_attempts_window[key] if t > cutoff
        ]
        
        # Check for alert threshold
        recent_attempts = len(self.failed_attempts_window[key])
        if recent_attempts >= ALERT_THRESHOLDS['failed_auth_rate']:
            self._trigger_security_alert(
                'HIGH_FAILED_AUTH_RATE',
                f"High failed auth rate: {recent_attempts} attempts in {self.window_size}s",
                {'endpoint': endpoint, 'reason': reason, 'owner': owner}
            )
    
    def record_wallet_lockout(self, owner: str, attempts: int):
        """Record wallet lockout event"""
        WALLET_LOCKOUTS.labels(owner=owner).inc()
        
        logger.warning(
            "Wallet locked due to failed PIN attempts",
            owner=owner,
            attempts=attempts,
            alert=True
        )
        
        self._trigger_security_alert(
            'WALLET_LOCKOUT',
            f"Wallet {owner} locked after {attempts} failed PIN attempts",
            {'owner': owner, 'attempts': attempts}
        )
    
    def record_crypto_failure(self, operation: str, error_type: str, details: Optional[Dict] = None):
        """Record cryptographic operation failure"""
        CRYPTO_FAILURES.labels(operation=operation, error_type=error_type).inc()
        
        logger.error(
            "Cryptographic operation failed",
            operation=operation,
            error_type=error_type,
            details=details,
            alert=True
        )
        
        # Crypto failures are always critical
        self._trigger_security_alert(
            'CRYPTO_FAILURE',
            f"Cryptographic failure in {operation}: {error_type}",
            {'operation': operation, 'error_type': error_type, 'details': details}
        )
    
    def _trigger_security_alert(self, alert_type: str, message: str, metadata: Dict[str, Any]):
        """Trigger security alert"""
        alert_data = {
            'type': alert_type,
            'message': message,
            'metadata': metadata,
            'timestamp': time.time(),
            'severity': 'HIGH' if alert_type in ['CRYPTO_FAILURE', 'WALLET_LOCKOUT'] else 'MEDIUM'
        }
        
        # In production, send to alerting system (PagerDuty, Slack, etc.)
        logger.critical("SECURITY ALERT", **alert_data)
        
        # Could integrate with:
        # - PagerDuty API
        # - Slack webhooks
        # - AWS SNS
        # - Email alerts

class PerformanceMonitor:
    """Monitor performance metrics and SLAs"""
    
    @contextmanager
    def time_kms_operation(self, operation: str):
        """Time KMS operations"""
        start = time.time()
        try:
            yield
        finally:
            duration = time.time() - start
            KMS_OPERATION_DURATION.labels(operation=operation).observe(duration)
            
            # Check SLA
            if duration > ALERT_THRESHOLDS['kms_operation_p95']:
                logger.warning(
                    "Slow KMS operation",
                    operation=operation,
                    duration=duration,
                    threshold=ALERT_THRESHOLDS['kms_operation_p95']
                )
    
    @contextmanager
    def time_db_operation(self, operation: str):
        """Time database operations"""
        start = time.time()
        try:
            yield
        finally:
            duration = time.time() - start
            DB_OPERATION_DURATION.labels(operation=operation).observe(duration)
            
            # Check SLA
            if duration > ALERT_THRESHOLDS['db_operation_p95']:
                logger.warning(
                    "Slow database operation",
                    operation=operation,
                    duration=duration,
                    threshold=ALERT_THRESHOLDS['db_operation_p95']
                )
    
    def record_transaction_amount(self, transaction_type: str, amount: float):
        """Record transaction amount for analysis"""
        TRANSACTION_AMOUNTS.labels(transaction_type=transaction_type).observe(amount)

class BusinessMetrics:
    """Track business KPIs"""
    
    def update_active_wallets_count(self, count: int):
        """Update active wallets gauge"""
        ACTIVE_WALLETS_GAUGE.set(count)
    
    def record_cards_per_wallet(self, count: int):
        """Record number of cards per wallet"""
        CARDS_PER_WALLET.observe(count)

# Global instances
security_monitor = SecurityMonitor()
performance_monitor = PerformanceMonitor()
business_metrics = BusinessMetrics()

# Grafana dashboard configuration (JSON)
GRAFANA_DASHBOARD = {
    "dashboard": {
        "title": "Celora Wallet Monitoring",
        "tags": ["celora", "wallet", "security"],
        "timezone": "utc",
        "panels": [
            {
                "title": "Failed Authentication Rate",
                "type": "stat",
                "targets": [
                    {
                        "expr": "rate(wallet_failed_auth_attempts_total[5m]) * 60",
                        "legendFormat": "{{endpoint}} - {{reason}}"
                    }
                ],
                "thresholds": [
                    {"color": "green", "value": 0},
                    {"color": "yellow", "value": 5},
                    {"color": "red", "value": 10}
                ]
            },
            {
                "title": "Wallet Lockouts",
                "type": "stat",
                "targets": [
                    {
                        "expr": "increase(wallet_lockouts_total[1h])",
                        "legendFormat": "Lockouts/hour"
                    }
                ]
            },
            {
                "title": "Crypto Operation Failures",
                "type": "stat",
                "targets": [
                    {
                        "expr": "rate(crypto_failures_total[5m]) * 60",
                        "legendFormat": "{{operation}} - {{error_type}}"
                    }
                ],
                "thresholds": [
                    {"color": "green", "value": 0},
                    {"color": "red", "value": 1}
                ]
            },
            {
                "title": "API Response Times",
                "type": "graph",
                "targets": [
                    {
                        "expr": "histogram_quantile(0.95, rate(wallet_response_time_seconds_bucket[5m]))",
                        "legendFormat": "95th percentile"
                    },
                    {
                        "expr": "histogram_quantile(0.50, rate(wallet_response_time_seconds_bucket[5m]))",
                        "legendFormat": "50th percentile"
                    }
                ]
            },
            {
                "title": "KMS Operation Duration",
                "type": "graph",
                "targets": [
                    {
                        "expr": "histogram_quantile(0.95, rate(kms_operation_duration_seconds_bucket[5m]))",
                        "legendFormat": "{{operation}} - 95th percentile"
                    }
                ]
            },
            {
                "title": "Active Wallets",
                "type": "stat",
                "targets": [
                    {
                        "expr": "active_wallets_total",
                        "legendFormat": "Active Wallets"
                    }
                ]
            },
            {
                "title": "Transaction Amounts",
                "type": "histogram",
                "targets": [
                    {
                        "expr": "rate(transaction_amounts_bucket[5m])",
                        "legendFormat": "{{transaction_type}} - {{le}}"
                    }
                ]
            }
        ]
    }
}

if __name__ == "__main__":
    # Example usage
    import json
    
    # Export Grafana dashboard config
    with open('grafana_dashboard.json', 'w') as f:
        json.dump(GRAFANA_DASHBOARD, f, indent=2)
    
    print("Monitoring utilities loaded. Dashboard config exported to grafana_dashboard.json")
    print("Available monitors:")
    print("- security_monitor: Track auth failures, lockouts, crypto failures")
    print("- performance_monitor: Time operations, check SLAs")
    print("- business_metrics: Track KPIs and business metrics")
