// Wallet generering og kryptografi for Celora
import { Keypair } from '@solana/web3.js';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import * as bip39 from 'bip39';
import { hdkey } from 'ethereumjs-wallet';

export interface WalletGenerationResult {
  solanaWallet: {
    publicKey: string;
    privateKey: string;
    derivationPath: string;
  };
  ethereumWallet: {
    address: string;
    privateKey: string;
    derivationPath: string;
  };
  seedPhrase: string;
  encryptedData: {
    encryptedSolanaKey: string;
    encryptedEthereumKey: string;
    encryptedSeedPhrase: string;
  };
}

export class CeloraWalletGenerator {
  
  // Generate new HD wallet with both Solana and Ethereum keys
  static async generateWallet(masterPassword: string): Promise<WalletGenerationResult> {
    try {
      // Generate seed phrase
      const seedPhrase = bip39.generateMnemonic(256); // 24 words for extra security
      const seed = await bip39.mnemonicToSeed(seedPhrase);
      
      // Generate Solana wallet
      const solanaKeypair = Keypair.fromSeed(seed.slice(0, 32));
      const solanaPublicKey = solanaKeypair.publicKey.toBase58();
      const solanaPrivateKey = Buffer.from(solanaKeypair.secretKey).toString('hex');
      
      // Generate Ethereum wallet
      const hdWallet = hdkey.fromMasterSeed(seed);
      const ethWalletHD = hdWallet.derivePath("m/44'/60'/0'/0/0"); // Standard Ethereum derivation path
      const ethWallet = ethWalletHD.getWallet();
      const ethereumAddress = ethWallet.getAddressString();
      const ethereumPrivateKey = ethWallet.getPrivateKeyString();
      
      // Encrypt sensitive data
      const encryptedSolanaKey = this.encrypt(solanaPrivateKey, masterPassword);
      const encryptedEthereumKey = this.encrypt(ethereumPrivateKey, masterPassword);
      const encryptedSeedPhrase = this.encrypt(seedPhrase, masterPassword);
      
      return {
        solanaWallet: {
          publicKey: solanaPublicKey,
          privateKey: solanaPrivateKey,
          derivationPath: "m/44'/501'/0'/0'"
        },
        ethereumWallet: {
          address: ethereumAddress,
          privateKey: ethereumPrivateKey,
          derivationPath: "m/44'/60'/0'/0/0"
        },
        seedPhrase,
        encryptedData: {
          encryptedSolanaKey,
          encryptedEthereumKey,
          encryptedSeedPhrase
        }
      };
    } catch (error) {
      throw new Error(`Wallet generation failed: ${error}`);
    }
  }
  
  // Import wallet from seed phrase
  static async importFromSeedPhrase(seedPhrase: string, masterPassword: string): Promise<WalletGenerationResult> {
    try {
      if (!bip39.validateMnemonic(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }
      
      const seed = await bip39.mnemonicToSeed(seedPhrase);
      
      // Generate Solana wallet from seed
      const solanaKeypair = Keypair.fromSeed(seed.slice(0, 32));
      const solanaPublicKey = solanaKeypair.publicKey.toBase58();
      const solanaPrivateKey = Buffer.from(solanaKeypair.secretKey).toString('hex');
      
      // Generate Ethereum wallet from seed
      const hdWallet = hdkey.fromMasterSeed(seed);
      const ethWalletHD = hdWallet.derivePath("m/44'/60'/0'/0/0");
      const ethWallet = ethWalletHD.getWallet();
      const ethereumAddress = ethWallet.getAddressString();
      const ethereumPrivateKey = ethWallet.getPrivateKeyString();
      
      // Encrypt sensitive data
      const encryptedSolanaKey = this.encrypt(solanaPrivateKey, masterPassword);
      const encryptedEthereumKey = this.encrypt(ethereumPrivateKey, masterPassword);
      const encryptedSeedPhrase = this.encrypt(seedPhrase, masterPassword);
      
      return {
        solanaWallet: {
          publicKey: solanaPublicKey,
          privateKey: solanaPrivateKey,
          derivationPath: "m/44'/501'/0'/0'"
        },
        ethereumWallet: {
          address: ethereumAddress,
          privateKey: ethereumPrivateKey,
          derivationPath: "m/44'/60'/0'/0/0"
        },
        seedPhrase,
        encryptedData: {
          encryptedSolanaKey,
          encryptedEthereumKey,
          encryptedSeedPhrase
        }
      };
    } catch (error) {
      throw new Error(`Wallet import failed: ${error}`);
    }
  }
  
  // Import wallet from private key
  static async importFromPrivateKey(
    privateKey: string, 
    blockchain: 'solana' | 'ethereum', 
    masterPassword: string
  ): Promise<Partial<WalletGenerationResult>> {
    try {
      if (blockchain === 'solana') {
        const keypair = Keypair.fromSecretKey(new Uint8Array(Buffer.from(privateKey, 'hex')));
        const publicKey = keypair.publicKey.toBase58();
        const encryptedKey = this.encrypt(privateKey, masterPassword);
        
        return {
          solanaWallet: {
            publicKey,
            privateKey,
            derivationPath: 'imported'
          },
          encryptedData: {
            encryptedSolanaKey: encryptedKey,
            encryptedEthereumKey: '',
            encryptedSeedPhrase: ''
          }
        };
      } else {
        const wallet = new ethers.Wallet(privateKey);
        const address = wallet.address;
        const encryptedKey = this.encrypt(privateKey, masterPassword);
        
        return {
          ethereumWallet: {
            address,
            privateKey,
            derivationPath: 'imported'
          },
          encryptedData: {
            encryptedSolanaKey: '',
            encryptedEthereumKey: encryptedKey,
            encryptedSeedPhrase: ''
          }
        };
      }
    } catch (error) {
      throw new Error(`Private key import failed: ${error}`);
    }
  }
  
  // Encrypt data using AES
  static encrypt(data: string, password: string): string {
    return CryptoJS.AES.encrypt(data, password).toString();
  }
  
  // Decrypt data using AES
  static decrypt(encryptedData: string, password: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, password);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        throw new Error('Invalid password');
      }
      
      return decryptedData;
    } catch (error) {
      throw new Error('Decryption failed: Invalid password');
    }
  }
  
  // Generate secure salt for password hashing
  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }
  
  // Hash password with salt
  static hashPassword(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000
    }).toString();
  }
  
  // Validate seed phrase
  static validateSeedPhrase(seedPhrase: string): boolean {
    return bip39.validateMnemonic(seedPhrase);
  }
  
  // Generate password hint
  static generatePasswordHint(password: string): string {
    if (password.length < 3) return 'Short password';
    
    const firstChar = password.charAt(0);
    const lastChar = password.charAt(password.length - 1);
    const length = password.length;
    
    return `Starts with "${firstChar}", ends with "${lastChar}", ${length} characters`;
  }
}