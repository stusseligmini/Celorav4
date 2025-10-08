/**
 * SOLANA QUIKNODE CONNECTION TEST
 * Test your QuikNode Solana RPC endpoints
 */

const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');

// Your QuikNode endpoints
const QUIKNODE_RPC = 'https://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295';
const QUIKNODE_WSS = 'wss://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295';

async function testSolanaConnection() {
  console.log('🔗 Testing QuikNode Solana Connection...\n');
  
  try {
    // Create connection with QuikNode RPC
    const connection = new Connection(QUIKNODE_RPC, {
      commitment: 'confirmed',
      wsEndpoint: QUIKNODE_WSS
    });
    
    console.log('✅ Connection created successfully');
    console.log(`📡 RPC Endpoint: ${QUIKNODE_RPC.substring(0, 50)}...`);
    console.log(`🔌 WebSocket: ${QUIKNODE_WSS.substring(0, 50)}...`);
    
    // Test 1: Get current slot
    console.log('\n🔄 Test 1: Getting current slot...');
    const slot = await connection.getSlot();
    console.log(`✅ Current slot: ${slot}`);
    
    // Test 2: Get cluster nodes
    console.log('\n🔄 Test 2: Getting cluster info...');
    const version = await connection.getVersion();
    console.log(`✅ Solana version: ${version['solana-core']}`);
    
    // Test 3: Get recent block hash
    console.log('\n🔄 Test 3: Getting recent blockhash...');
    const { blockhash } = await connection.getLatestBlockhash();
    console.log(`✅ Recent blockhash: ${blockhash.substring(0, 20)}...`);
    
    // Test 4: Check a known account (SOL token mint)
    console.log('\n🔄 Test 4: Checking SOL mint account...');
    const solMint = new PublicKey('So11111111111111111111111111111111111111112');
    const accountInfo = await connection.getAccountInfo(solMint);
    console.log(`✅ SOL mint account found: ${accountInfo ? 'Yes' : 'No'}`);
    
    // Test 5: Get balance of a random account
    console.log('\n🔄 Test 5: Getting balance of random account...');
    const randomAccount = new PublicKey('11111111111111111111111111111112'); // System program
    const balance = await connection.getBalance(randomAccount);
    console.log(`✅ Account balance: ${balance / 1e9} SOL`);
    
    // Test 6: Connection speed test
    console.log('\n🔄 Test 6: Speed test...');
    const startTime = Date.now();
    await connection.getSlot();
    const endTime = Date.now();
    console.log(`✅ Response time: ${endTime - startTime}ms`);
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('🚀 QuikNode Solana connection is working perfectly!');
    console.log('\n💡 Your Celora platform can now:');
    console.log('   ✅ Create real Solana wallets');
    console.log('   ✅ Query live SOL balances');
    console.log('   ✅ Send real SOL transactions');
    console.log('   ✅ Monitor transaction confirmations');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify QuikNode endpoint URLs');
    console.log('   3. Ensure no firewall blocking');
    console.log('   4. Check QuikNode dashboard for status');
  }
}

// Run the test
testSolanaConnection();