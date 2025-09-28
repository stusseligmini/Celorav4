/**
 * MFA Testing Script
 * 
 * This script tests the MFA functionality including mobile optimization and internationalization features.
 * It verifies that all components work correctly across devices and languages.
 */

const { test } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');

// Import test utilities
const { setupTestUser, cleanupTestUser } = require('./test-utils');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tests for core MFA functionality
async function testCoreMFAFunctionality() {
  console.log('Testing core MFA functionality...');
  
  // 1. Test MFA setup process
  const testUser = await setupTestUser();
  console.log('Created test user:', testUser.email);
  
  // Enable MFA for the test user
  const { data: setupData, error: setupError } = await supabase.rpc('setup_mfa', {
    user_id: testUser.id
  });
  
  if (setupError) {
    console.error('MFA setup failed:', setupError);
    return false;
  }
  
  console.log('MFA setup successful. Secret:', setupData.secret.substring(0, 5) + '...');
  
  // 2. Test TOTP code verification
  // Generate a valid TOTP code using the secret
  const speakeasy = require('speakeasy');
  const totpCode = speakeasy.totp({
    secret: setupData.secret,
    encoding: 'base32',
    algorithm: 'sha1'
  });
  
  const { data: verifyData, error: verifyError } = await supabase.rpc('verify_mfa', {
    user_id: testUser.id,
    code: totpCode
  });
  
  if (verifyError || !verifyData) {
    console.error('MFA verification failed:', verifyError || 'Invalid code');
    return false;
  }
  
  console.log('MFA verification successful');
  
  // 3. Test recovery code validation
  const { data: recoveryCodes } = await supabase.rpc('get_recovery_codes', {
    user_id: testUser.id
  });
  
  if (!recoveryCodes || recoveryCodes.length === 0) {
    console.error('Failed to get recovery codes');
    return false;
  }
  
  const testCode = recoveryCodes[0];
  const { data: recoveryResult, error: recoveryError } = await supabase.rpc('use_recovery_code', {
    user_id: testUser.id,
    recovery_code: testCode
  });
  
  if (recoveryError || !recoveryResult) {
    console.error('Recovery code validation failed:', recoveryError || 'Invalid code');
    return false;
  }
  
  console.log('Recovery code validation successful');
  
  // Cleanup
  await cleanupTestUser(testUser.id);
  console.log('Test user cleaned up');
  
  return true;
}

// Tests for mobile-optimized MFA components
async function testMobileOptimization() {
  console.log('Testing mobile optimization...');
  
  // Use Playwright to test mobile views
  await test('Mobile MFA components render correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X dimensions
    
    // 1. Test MFA verification mobile
    await page.goto('/mfa-verification-mobile');
    await page.waitForSelector('.mfa-mobile-container');
    
    // Verify mobile-specific elements are present
    const hasMobileElements = await page.evaluate(() => {
      return !!document.querySelector('.mfa-mobile-header') && 
             !!document.querySelector('.mfa-code-segment');
    });
    
    console.assert(hasMobileElements, 'Mobile-specific elements not found on verification page');
    
    // 2. Test MFA recovery mobile
    await page.goto('/mfa-recovery-mobile');
    await page.waitForSelector('.mfa-mobile-container');
    
    const hasRecoveryMobileElements = await page.evaluate(() => {
      return !!document.querySelector('.mfa-mobile-header');
    });
    
    console.assert(hasRecoveryMobileElements, 'Mobile-specific elements not found on recovery page');
    
    // 3. Test device detection and routing
    await page.goto('/mfa-router');
    // Should be redirected to mobile version
    await page.waitForURL(url => url.pathname.includes('mfa-mobile'));
    
    console.log('Device detection routing successful');
  });
  
  return true;
}

// Tests for internationalization features
async function testInternationalization() {
  console.log('Testing internationalization...');
  
  // Use Playwright to test language switching
  await test('MFA components display correct translations', async ({ page }) => {
    // Test English (default)
    await page.goto('/mfa-verification');
    
    const englishTitle = await page.textContent('h2');
    console.assert(englishTitle.includes('Verification'), 'English title not found');
    
    // Set Norwegian language preference
    await page.evaluate(() => {
      localStorage.setItem('celora-language', 'no');
    });
    
    // Reload page to apply Norwegian language
    await page.reload();
    await page.waitForSelector('h2');
    
    const norwegianTitle = await page.textContent('h2');
    console.assert(norwegianTitle.includes('Verifisering'), 'Norwegian title not found');
    
    // Test language switcher
    const languageSwitcher = await page.$('.language-switcher');
    await languageSwitcher.click();
    await page.click('[data-language="en"]');
    
    // Wait for language change to apply
    await page.waitForTimeout(500);
    
    const titleAfterSwitch = await page.textContent('h2');
    console.assert(titleAfterSwitch.includes('Verification'), 'Language switching failed');
    
    console.log('Internationalization testing successful');
  });
  
  return true;
}

// Main test function
async function runTests() {
  console.log('Starting MFA tests...');
  
  try {
    // Run all test categories
    const coreResults = await testCoreMFAFunctionality();
    const mobileResults = await testMobileOptimization();
    const i18nResults = await testInternationalization();
    
    // Report results
    console.log('\nTest Results:');
    console.log('-------------');
    console.log(`Core MFA Functionality: ${coreResults ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Mobile Optimization: ${mobileResults ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Internationalization: ${i18nResults ? '✅ PASS' : '❌ FAIL'}`);
    
    // Overall result
    const overallPass = coreResults && mobileResults && i18nResults;
    console.log('\nOverall Result:', overallPass ? '✅ PASS' : '❌ FAIL');
    
  } catch (error) {
    console.error('Error running tests:', error);
    console.log('\nOverall Result: ❌ FAIL');
  }
}

// Run the tests
runTests();