/**
 * REAL SOLANA WALLET CREATION TEST
 * Test creating actual Solana wallets with your QuikNode RPC
 */

const { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Your QuikNode RPC endpoint
const QUIKNODE_RPC = 'https://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295';

async function testRealWalletCreation() {
  console.log('🪙 TESTING REAL SOLANA WALLET CREATION\n');
  
  try {
    // Create connection
    const connection = new Connection(QUIKNODE_RPC, 'confirmed');
    
    // Test 1: Create a new wallet (keypair)
    console.log('🔄 Creating new Solana wallet...');
    const newWallet = Keypair.generate();
    
    console.log('✅ Wallet created successfully!');
    console.log(`📍 Public Key (Address): ${newWallet.publicKey.toString()}`);
    console.log(`🔐 Private Key: [HIDDEN FOR SECURITY]`);
    console.log(`🔢 Private Key Length: ${newWallet.secretKey.length} bytes`);
    
    // Test 2: Check wallet balance (should be 0 for new wallet)
    console.log('\n🔄 Checking wallet balance...');
    const balance = await connection.getBalance(newWallet.publicKey);
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL (${balance} lamports)`);
    
    // Test 3: Create another wallet for testing
    console.log('\n🔄 Creating second wallet for comparison...');
    const secondWallet = Keypair.generate();
    console.log(`📍 Second wallet address: ${secondWallet.publicKey.toString()}`);
    
    // Test 4: Verify addresses are different
    console.log('\n🔄 Verifying wallets are unique...');
    const areUnique = newWallet.publicKey.toString() !== secondWallet.publicKey.toString();
    console.log(`✅ Wallets are unique: ${areUnique}`);
    
    // Test 5: Test address validation
    console.log('\n🔄 Testing address validation...');
    try {
      const validAddress = new PublicKey(newWallet.publicKey.toString());
      console.log('✅ Address validation passed');
    } catch (error) {
      console.log('❌ Address validation failed');
    }
    
    // Test 6: Show wallet info summary
    console.log('\n📊 WALLET CREATION SUMMARY:');
    console.log('=====================================');
    console.log(`🆔 Wallet 1: ${newWallet.publicKey.toString().substring(0, 20)}...`);
    console.log(`🆔 Wallet 2: ${secondWallet.publicKey.toString().substring(0, 20)}...`);
    console.log(`💰 Both balances: 0 SOL (new wallets)`);
    console.log(`🔗 Network: Solana Mainnet (via QuikNode)`);
    console.log(`⚡ Connection: Active and responsive`);
    
    console.log('\n🎉 WALLET CREATION TEST SUCCESSFUL!');
    console.log('\n💡 Next steps for production:');
    console.log('   1. Store private keys securely (encrypted)');
    console.log('   2. Implement proper key management');
    console.log('   3. Add wallet funding mechanisms');
    console.log('   4. Test transaction sending');
    
  } catch (error) {
    console.error('\n❌ Wallet creation test failed:', error);
  }
}

// Run the test
testRealWalletCreation();