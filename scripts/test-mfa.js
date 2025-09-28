/**
 * Test MFA functionality
 */
import { auth, setupMFA, verifyMFA, enableMFA, disableMFA } from '../src/lib/auth';
import { createClient } from '@supabase/supabase-js';
import speakeasy from 'speakeasy';

async function testMFASetup() {
  console.log('🔐 Testing MFA functionality...');
  
  // Mock user for testing
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };
  
  try {
    // Test MFA setup
    console.log('📱 Testing MFA setup...');
    const setupResult = await setupMFA(testUser.id);
    
    if (!setupResult || !setupResult.secret || !setupResult.qrCodeUrl) {
      console.error('❌ MFA setup failed - missing secret or QR code');
      return false;
    }
    
    console.log('✅ MFA setup successful');
    console.log('🔑 Secret Base32:', setupResult.secret.base32);
    console.log('🖼️ QR Code URL generated');
    
    // Generate a valid token using the secret
    const token = speakeasy.totp({
      secret: setupResult.secret.base32,
      encoding: 'base32',
    });
    
    console.log('🔢 Generated TOTP token:', token);
    
    // Test MFA verification
    console.log('🔍 Testing MFA verification...');
    const verifyResult = await verifyMFA(testUser.id, token);
    
    if (!verifyResult || !verifyResult.verified) {
      console.error('❌ MFA verification failed');
      return false;
    }
    
    console.log('✅ MFA verification successful');
    
    // Test MFA enabling
    console.log('✅ Testing MFA enabling...');
    const enableResult = await enableMFA(testUser.id, token);
    
    if (!enableResult || !enableResult.enabled) {
      console.error('❌ MFA enabling failed');
      return false;
    }
    
    console.log('✅ MFA enabling successful');
    console.log('🔑 Recovery codes generated:', enableResult.recoveryCodes.length);
    
    // Test MFA disabling
    console.log('🚫 Testing MFA disabling...');
    const disableResult = await disableMFA(testUser.id, token);
    
    if (!disableResult || !disableResult.disabled) {
      console.error('❌ MFA disabling failed');
      return false;
    }
    
    console.log('✅ MFA disabling successful');
    
    return true;
  } catch (error) {
    console.error('❌ Error during MFA testing:', error.message);
    return false;
  }
}

// Run the test
testMFASetup()
  .then(success => {
    if (success) {
      console.log('🎉 All MFA tests passed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Some MFA tests failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Fatal error during MFA testing:', error);
    process.exit(1);
  });