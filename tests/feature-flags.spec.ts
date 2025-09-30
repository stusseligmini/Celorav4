/**
 * Feature Flag System Tests - EXAMPLE
 * 
 * Dette er et eksempel på hvordan man kan sette opp end-to-end tester
 * for feature flag systemet ved hjelp av Playwright.
 * 
 * For å bruke dette, må du installere Playwright:
 * npm install --save-dev @playwright/test
 * 
 * Dette eksemplet er kommentert ut for å unngå kompileringsfeil
 * siden prosjektet ikke har Playwright installert ennå.
 */

/*
import { test, expect } from '@playwright/test';
import { getSupabaseClient } from '@/lib/supabaseSingleton';

test.describe('Feature Flag System', () => {
  // Setup test feature flags before running tests
  test.beforeAll(async () => {
    const supabase = getSupabaseClient();
    
    // Clean up any existing test flags
    await supabase
      .from('feature_flags')
      .delete()
      .in('name', [
        'test_flag_simple', 
        'test_flag_percentage', 
        'test_flag_variant'
      ]);
    
    // Create test flags
    await supabase.from('feature_flags').insert([
      {
        name: 'test_flag_simple',
        description: 'A simple on/off test flag',
        is_enabled: true
      },
      {
        name: 'test_flag_percentage',
        description: 'A test flag with percentage rollout',
        is_enabled: true,
        user_percentage: 50
      },
      {
        name: 'test_flag_variant',
        description: 'A test flag with variants',
        is_enabled: true,
        variant_distribution: [
          { variant_name: 'control', percentage: 50 },
          { variant_name: 'test', percentage: 50 }
        ]
      }
    ]);
  });
  
  // Clean up after tests
  test.afterAll(async () => {
    const supabase = getSupabaseClient();
    
    await supabase
      .from('feature_flags')
      .delete()
      .in('name', [
        'test_flag_simple', 
        'test_flag_percentage', 
        'test_flag_variant'
      ]);
  });

  test('Feature flag demo page loads correctly', async ({ page }) => {
    await page.goto('/demo/feature-flags');
    
    // Check page title
    await expect(page.locator('h1')).toHaveText('Feature Flags Demo');
    
    // Ensure components are visible
    await expect(page.locator('text=Simple Feature Toggle')).toBeVisible();
    await expect(page.locator('text=A/B Testing with Variants')).toBeVisible();
    await expect(page.locator('text=Dark Mode Example')).toBeVisible();
  });
  
  test('Admin page allows managing feature flags', async ({ page }) => {
    // Log in as admin (this assumes auth is set up)
    // This is pseudo-code and would need to be adapted to your auth system
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin-password');
    await page.click('button[type="submit"]');
    
    // Go to feature flags admin page
    await page.goto('/admin/feature-flags');
    
    // Check admin interface elements
    await expect(page.locator('h1')).toContainText('Feature Flags');
    await expect(page.locator('button', { hasText: 'Create Flag' })).toBeVisible();
    
    // Check if our test flags are visible
    await expect(page.locator('text=test_flag_simple')).toBeVisible();
    
    // Test creating a new flag
    await page.click('button', { hasText: 'Create Flag' });
    await page.fill('input[name="name"]', 'test_new_flag');
    await page.fill('textarea[name="description"]', 'A new test flag created by E2E test');
    await page.check('input[type="checkbox"][name="is_enabled"]');
    await page.click('button', { hasText: 'Save' });
    
    // Verify the new flag appears in the list
    await expect(page.locator('text=test_new_flag')).toBeVisible();
    
    // Clean up the flag we created
    await page.click('button[aria-label="Delete test_new_flag"]');
    await page.click('button', { hasText: 'Confirm' });
    
    // Verify flag is removed
    await expect(page.locator('text=test_new_flag')).not.toBeVisible();
  });
  
  test('API route respects feature flags', async ({ page, request }) => {
    // Get the current user ID (this assumes being logged in)
    await page.goto('/demo/feature-flags');
    const userId = await page.evaluate(() => {
      const token = localStorage.getItem('supabase.auth.token');
      return token
        ? JSON.parse(token).currentSession?.user?.id
        : null;
    });
    
    // Call the API with user ID in header
    const response = await request.get('/api/demo/feature-flags', {
      headers: {
        'x-user-id': userId || 'test-user'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Should be either v1 or v2 depending on feature flag
    expect(data).toHaveProperty('version');
    expect(['v1', 'v2']).toContain(data.version);
  });
});
*/