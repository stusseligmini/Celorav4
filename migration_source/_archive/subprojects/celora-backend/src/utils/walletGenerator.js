const { Keypair, PublicKey } = require('@solana/web3.js');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Generates a new Solana wallet keypair and encrypts the private key
 * @param {string} userId - User ID for wallet association
 * @param {Array} securityIcons - User's security icons for additional encryption
 * @returns {Object} - Wallet data with public key and encrypted private key
 */
async function generateSolanaWallet(userId, securityIcons = []) {
    try {
        // Generate new Solana keypair
        const keypair = Keypair.generate();
        
        // Get public key as base58 string (wallet address)
        const publicKey = keypair.publicKey.toBase58();
        
        // Convert private key to array for encryption
        const privateKeyArray = Array.from(keypair.secretKey);
        const privateKeyString = JSON.stringify(privateKeyArray);
        
        // Create encryption key using user data and security icons
        const encryptionSeed = userId + (securityIcons.join('')) + process.env.JWT_SECRET;
        const encryptionKey = crypto.scryptSync(encryptionSeed, 'celora-salt', 32);
        
        // Encrypt private key
        const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
        let encryptedPrivateKey = cipher.update(privateKeyString, 'utf8', 'hex');
        encryptedPrivateKey += cipher.final('hex');
        
        logger.info(`Generated Solana wallet for user ${userId}: ${publicKey}`);
        
        return {
            id: uuidv4(),
            address: publicKey,
            publicKey: publicKey,
            encryptedPrivateKey: encryptedPrivateKey,
            type: 'SOLANA',
            currency: 'SOL',
            balance: 0,
            isActive: true
        };
        
    } catch (error) {
        logger.error('Wallet generation error:', error);
        throw new Error('Failed to generate wallet');
    }
}

/**
 * Decrypts a private key using user data and security icons
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @param {string} userId - User ID
 * @param {Array} securityIcons - User's security icons
 * @returns {Uint8Array} - Decrypted private key as Uint8Array
 */
function decryptPrivateKey(encryptedPrivateKey, userId, securityIcons = []) {
    try {
        // Recreate encryption key
        const encryptionSeed = userId + (securityIcons.join('')) + process.env.JWT_SECRET;
        const encryptionKey = crypto.scryptSync(encryptionSeed, 'celora-salt', 32);
        
        // Decrypt private key
        const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
        let decrypted = decipher.update(encryptedPrivateKey, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        // Convert back to Uint8Array
        const privateKeyArray = JSON.parse(decrypted);
        return new Uint8Array(privateKeyArray);
        
    } catch (error) {
        logger.error('Private key decryption error:', error);
        throw new Error('Failed to decrypt private key');
    }
}

/**
 * Recreates a Keypair from encrypted private key
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @param {string} userId - User ID
 * @param {Array} securityIcons - User's security icons
 * @returns {Keypair} - Solana Keypair object
 */
function recreateKeypair(encryptedPrivateKey, userId, securityIcons = []) {
    const privateKeyArray = decryptPrivateKey(encryptedPrivateKey, userId, securityIcons);
    return Keypair.fromSecretKey(privateKeyArray);
}

/**
 * Generates a unique wallet name based on user data
 * @param {string} firstName - User's first name
 * @param {number} walletCount - Current number of wallets user has
 * @returns {string} - Unique wallet name
 */
function generateWalletName(firstName, walletCount = 0) {
    if (walletCount === 0) {
        return `${firstName}'s Main Wallet`;
    }
    return `${firstName}'s Wallet ${walletCount + 1}`;
}

/**
 * Validates a Solana address
 * @param {string} address - Solana address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateSolanaAddress(address) {
    try {
        new PublicKey(address);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    generateSolanaWallet,
    decryptPrivateKey,
    recreateKeypair,
    generateWalletName,
    validateSolanaAddress
};
