// Production Key Generator
// Generates secure 256-bit encryption keys for production deployment

const crypto = require('crypto');

console.log('🔐 GENERATING PRODUCTION SECURITY KEYS');
console.log('=====================================');
console.log('Copy these values to your production environment:\n');

// Generate secure random keys
const generateKey = (bytes = 32) => crypto.randomBytes(bytes).toString('base64');
const generateHexKey = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

console.log(`JWT_SECRET=${generateKey()}`);
console.log(`NEXTAUTH_SECRET=${generateKey()}`);
console.log(`WALLET_ENCRYPTION_KEY=${generateKey()}`);
console.log(`SEED_PHRASE_ENCRYPTION_KEY=${generateKey()}`);
console.log(`API_SECRET_KEY=${generateHexKey()}`);
console.log(`BACKUP_ENCRYPTION_KEY=${generateKey()}`);

console.log('\n✅ All keys generated successfully!');
console.log('📋 These are production-grade 256-bit encryption keys.');
console.log('⚠️  Store these securely - never commit to version control!');
console.log('\n🚀 Ready for production deployment!');