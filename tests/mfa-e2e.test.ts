/**
 * MFA Integration Test
 * 
 * This file tests the complete MFA flow from setup to verification
 * in an end-to-end scenario.
 */

import { test, expect } from '@playwright/test';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Test configuration
const TEST_EMAIL = 'mfa-test@example.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_FULL_NAME = 'MFA Test User';

test.describe('MFA End-to-End Flow', () => {
  let secret;
  let recoveryCodes;

  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/signin');
    
    // Clean up any existing test user data
    // This would typically be done via a test API
  });

  test('Complete MFA setup and verification flow', async ({ page }) => {
    // Step 1: Sign up with test account (if it doesn't exist)
    await page.goto('/signup');
    
    // Check if we're already signed in, and sign out if needed
    if (await page.getByText('Sign Out').isVisible()) {
      await page.getByText('Sign Out').click();
      await page.waitForURL('/signin');
    }
    
    // Fill in signup form
    await page.getByLabel('Full Name').fill(TEST_FULL_NAME);
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByText('CREATE ACCOUNT').click();
    
    // Wait for signup process to complete (might redirect to welcome or dashboard)
    await page.waitForURL(/\/(welcome|dashboard|)/);
    
    // Step 2: Navigate to security settings
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByText('Security').click();
    
    // Step 3: Enable MFA
    await expect(page.getByText('TWO-FACTOR AUTHENTICATION')).toBeVisible();
    await page.getByText('ENABLE TWO-FACTOR AUTHENTICATION').click();
    
    // Step 4: Start MFA setup
    await page.getByText('SET UP 2FA').click();
    
    // Step 5: Capture the secret key for verification
    await expect(page.getByText('SCAN QR CODE')).toBeVisible();
    
    // Extract the secret from the page
    const secretElement = await page.locator('.bg-gray-800/50 >> text=').first();
    const secretText = await secretElement.innerText();
    secret = secretText.trim();
    
    console.log('Extracted MFA secret:', secret);
    
    // Step 6: Generate a valid verification code using the secret
    const token = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
    });
    
    console.log('Generated verification code:', token);
    
    // Step 7: Enter verification code
    await page.getByPlaceholder('000000').fill(token);
    await page.getByText('VERIFY AND ENABLE').click();
    
    // Step 8: Save recovery codes
    await expect(page.getByText('SAVE RECOVERY CODES')).toBeVisible();
    
    // Extract recovery codes for later use
    const recoveryElements = await page.locator('.bg-gray-900/50.border-cyan-400').all();
    recoveryCodes = [];
    
    for (const el of recoveryElements) {
      recoveryCodes.push(await el.innerText());
    }
    
    console.log('Recovery codes:', recoveryCodes);
    
    // Complete the setup
    await page.getByText('I\'VE SAVED THESE CODES').click();
    
    // Verify MFA is now enabled
    await expect(page.getByText('Two-factor authentication is enabled')).toBeVisible();
    
    // Step 9: Sign out
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByText('Sign Out').click();
    await page.waitForURL('/signin');
    
    // Step 10: Sign in with MFA
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByText('SIGN IN').click();
    
    // Verify we're now at the MFA verification screen
    await expect(page.getByText('SECURITY VERIFICATION')).toBeVisible();
    
    // Step 11: Enter valid MFA code
    const loginToken = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
    });
    
    await page.getByPlaceholder('000000').fill(loginToken);
    await page.getByText('VERIFY').click();
    
    // Verify successful login
    await page.waitForURL(/\/(dashboard|)/);
    await expect(page.getByText('Sign Out')).toBeVisible();
    
    // Step 12: Test recovery code flow (sign out first)
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByText('Sign Out').click();
    await page.waitForURL('/signin');
    
    // Sign in again
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByText('SIGN IN').click();
    
    // Use recovery code instead of TOTP
    await expect(page.getByText('SECURITY VERIFICATION')).toBeVisible();
    await page.getByText('USE A RECOVERY CODE INSTEAD').click();
    
    // Enter a recovery code (first one)
    const recoveryCode = recoveryCodes[0];
    await page.getByPlaceholder('xxxx-xxxx-xxxx-xxxx').fill(recoveryCode);
    await page.getByText('VERIFY').click();
    
    // Verify successful login with recovery code
    await page.waitForURL(/\/(dashboard|)/);
    await expect(page.getByText('Sign Out')).toBeVisible();
    
    // Step 13: Test disabling MFA
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByText('Security').click();
    await page.getByText('DISABLE 2FA').click();
    
    // Generate a new token for verification
    const disableToken = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
    });
    
    await page.getByPlaceholder('000000').fill(disableToken);
    await page.getByText('DISABLE 2FA').click();
    
    // Verify MFA is now disabled
    await expect(page.getByText('Two-factor authentication is disabled')).toBeVisible();
  });
});
```