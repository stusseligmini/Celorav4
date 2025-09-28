/**
 * MFA Recovery Process Test Script
 * 
 * This script tests the MFA recovery process end-to-end.
 * It simulates a user who has lost their MFA device and needs to regain access.
 * 
 * To run this test:
 * 1. Install Playwright: npm install -D @playwright/test
 * 2. Run the test: npx playwright test mfa-recovery-test.ts
 */

import { test, expect, Page } from '@playwright/test';

// Test user details (use test account, not production account)
const TEST_EMAIL = 'test_recovery@example.com';

// Test recovery flow end-to-end
test('MFA Recovery Process End-to-End', async ({ page }) => {
  // Step 1: Navigate to MFA Recovery page
  await page.goto('/mfa-recovery');
  
  // Verify page has loaded correctly
  await expect(page.getByText('MFA RECOVERY')).toBeVisible();
  
  // Step 2: Submit email
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.click('button:has-text("CONTINUE")');
  
  // Verify verification code page is shown
  await expect(page.getByText('We\'ve sent a verification code')).toBeVisible();
  
  // Step 3: Enter verification code (in a real test, you would need to get this from email or mock it)
  await page.fill('input#verification-code', '123456');
  await page.click('button:has-text("CONTINUE")');
  
  // Verify identity verification page is shown
  await expect(page.getByText('To verify your identity')).toBeVisible();
  
  // Step 4: Submit identity information
  await page.fill('input#full-name', 'Test User');
  await page.fill('input#date-of-birth', '1990-01-01');
  await page.fill('input#last-four-digits', '1234');
  await page.click('button:has-text("SUBMIT RECOVERY REQUEST")');
  
  // Verify processing state
  await expect(page.getByText('Processing Your Request')).toBeVisible();
  
  // Wait for success state (this might take a few seconds in the UI)
  await expect(page.getByText('Recovery Request Submitted')).toBeVisible({ timeout: 10000 });
  
  // Verify case number is displayed
  await expect(page.locator('.font-mono.text-xl.text-cyan-400')).toBeVisible();
  
  // Record the case number for the admin test
  const caseNumber = await page.locator('.font-mono.text-xl.text-cyan-400').textContent();
  console.log(`Created recovery case: ${caseNumber}`);
});

// Test admin approval flow
test('Admin MFA Recovery Approval Flow', async ({ page }) => {
  // This test assumes you have a case number from a previous test
  // In a real test, you would either create one first or use a known test case
  const CASE_NUMBER = 'MFA-TEST-CASE'; // Replace with actual case number or create one dynamically
  
  // Step 1: Log in as admin (implementation depends on your auth system)
  await loginAsAdmin(page);
  
  // Step 2: Navigate to MFA Recovery Admin page
  await page.goto('/admin/mfa-recovery');
  
  // Verify page has loaded correctly
  await expect(page.getByText('MFA Recovery Management')).toBeVisible();
  
  // Step 3: Find the test case
  await page.fill('input[placeholder="Search case number or email..."]', CASE_NUMBER);
  
  // Click on the View Details button for the test case
  await page.click('button:has-text("View Details")');
  
  // Verify details modal is shown
  await expect(page.getByText('Recovery Request Details')).toBeVisible();
  
  // Step 4: Add review notes
  await page.fill('textarea#review-notes', 'Identity verified through secondary channels.');
  
  // Step 5: Approve the request
  await page.click('button:has-text("Approve Request")');
  
  // Verify the request was approved (should show Complete Recovery Process button)
  await expect(page.getByText('Complete Recovery Process')).toBeVisible();
  
  // Step 6: Complete the recovery process
  await page.click('button:has-text("Complete Recovery Process")');
  
  // Close the modal
  await expect(page.getByText('Recovery Request Details')).not.toBeVisible({ timeout: 5000 });
  
  // Verify the request is now in the Completed filter
  await page.click('button:has-text("Completed")');
  await page.fill('input[placeholder="Search case number or email..."]', CASE_NUMBER);
  
  // Check that the status is now Completed
  await expect(page.getByText('Completed')).toBeVisible();
});

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  // Implementation depends on your auth system
  await page.goto('/signin');
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'admin-password');
  await page.click('button:has-text("Sign In")');
  
  // Wait for admin dashboard to load
  await expect(page.getByText('Admin Dashboard')).toBeVisible();
}