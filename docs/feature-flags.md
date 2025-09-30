# Feature Flag System - Developer Guide

This guide explains how to use the feature flag system in Celora V2 to safely roll out new features, conduct A/B tests, and manage feature availability across different user segments.

## Table of Contents
- [Overview](#overview)
- [Key Concepts](#key-concepts)
- [Using Feature Flags in React Components](#using-feature-flags-in-react-components)
- [Using Feature Flags in API Routes](#using-feature-flags-in-api-routes)
- [Using Feature Flags in Middleware](#using-feature-flags-in-middleware)
- [Creating and Managing Feature Flags](#creating-and-managing-feature-flags)
- [Best Practices](#best-practices)

## Overview

Feature flags allow you to decouple feature deployment from feature release. This means you can merge code into production without making it visible to users until you're ready. This approach offers several benefits:

- **Gradual Rollouts**: Release features to a small percentage of users before wider deployment
- **A/B Testing**: Create variants of a feature to test different approaches
- **Kill Switches**: Turn off problematic features without redeployment
- **Targeted Releases**: Enable features only for specific user segments
- **Beta Programs**: Allow opt-in access to new features

## Key Concepts

### Feature Flag Components

- **Flag Name**: A unique identifier for the feature (e.g., `new_dashboard`)
- **Enabled State**: Whether the flag is active at all
- **Targeting Rules**: Conditions that determine which users see the feature
- **Percentage Rollout**: What percentage of users will see the feature
- **Variants**: Different versions of the feature for A/B testing

### User Context

User context provides attributes about the current user that can be used for targeting. This includes:

- `userId` - The user's unique ID
- `email` - User's email address
- `role` - User's role (admin, user, etc.)
- `country` - User's country
- `language` - User's preferred language
- `deviceType` - Type of device (mobile, desktop, tablet)
- `customAttributes` - Any additional attributes

## Using Feature Flags in React Components

### Simple Feature Toggle

Use the `FeatureFlag` component for conditional rendering:

```tsx
import { FeatureFlag } from '@/components/FeatureFlagComponents';

function MyComponent() {
  return (
    <div>
      <h1>My Component</h1>
      
      <FeatureFlag name="new_feature" fallback={<LegacyFeature />}>
        <NewFeature />
      </FeatureFlag>
    </div>
  );
}
```

### A/B Testing with Variants

Use `FeatureFlagVariant` for testing multiple versions:

```tsx
import { FeatureFlagVariant } from '@/components/FeatureFlagComponents';

function SignupForm() {
  return (
    <FeatureFlagVariant 
      name="signup_flow" 
      variants={{
        'control': <StandardForm />,
        'variant_a': <SimplifiedForm />,
        'variant_b': <SocialSignupForm />
      }}
      defaultVariant="control"
    />
  );
}
```

### Using Hooks

For more flexibility, you can use the hooks directly:

```tsx
import { useFeatureFlag, useFeatureFlagVariant } from '@/lib/featureFlags';

function MyComponent() {
  const isNewFeatureEnabled = useFeatureFlag('new_feature');
  const pricingVariant = useFeatureFlagVariant('pricing_test', 'control');
  
  if (!isNewFeatureEnabled) {
    return <LegacyFeature />;
  }
  
  return (
    <div>
      {pricingVariant === 'discount' ? (
        <DiscountedPricing />
      ) : (
        <StandardPricing />
      )}
    </div>
  );
}
```

## Using Feature Flags in API Routes

For server-side feature flags in API routes:

```ts
import { featureFlags } from '@/lib/featureFlags';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  
  if (featureFlags.isEnabled('new_api_version', {}, { userId })) {
    return NextResponse.json({
      version: 'v2',
      // Enhanced data...
    });
  } else {
    return NextResponse.json({
      version: 'v1',
      // Standard data...
    });
  }
}
```

## Using Feature Flags in Middleware

Feature flags can control middleware behavior:

```ts
import { featureFlags } from '@/lib/featureFlags';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Get user context from cookies or headers
  const userId = request.cookies.get('userId')?.value;
  
  // Initialize feature flags
  featureFlags.initialize({ userId });
  
  // Apply security headers based on feature flag
  if (featureFlags.isEnabled('enhanced_security', {}, { userId })) {
    response.headers.set('Content-Security-Policy', "default-src 'self'");
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }
  
  return response;
}
```

## Creating and Managing Feature Flags

Feature flags are managed through the admin interface at `/admin/feature-flags`. Here you can:

1. **Create new flags** with appropriate targeting rules
2. **Edit existing flags** to modify rollout percentages or targeting
3. **Enable/disable flags** globally
4. **Set up A/B test variants** with percentage distributions
5. **View flag usage metrics** (if analytics integration is enabled)

### Database Structure

Feature flags are stored in the `feature_flags` table with the following structure:

```sql
CREATE TABLE feature_flags (
  name TEXT PRIMARY KEY,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  user_percentage INT,
  targeting_rules JSONB,
  is_sticky BOOLEAN DEFAULT true,
  variant_distribution JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Best Practices

1. **Use descriptive flag names** that clearly indicate the feature being toggled
   - Good: `enhanced_search_algorithm`
   - Bad: `feature123`

2. **Clean up old flags** after features are fully deployed or experiments concluded
   - Consider having a cleanup schedule for old flags
   - Document the expected lifetime of each flag

3. **Use targeting rules appropriately**
   - Target by user role for admin/power-user features
   - Target by country for region-specific features
   - Use percentage rollouts for gradual deployment of risky changes

4. **Design for fallbacks**
   - Always provide a fallback experience
   - Ensure the application works if flag evaluation fails

5. **Test both flag states**
   - Test your application with the flag both on and off
   - Use local overrides during development

6. **Document your flags**
   - Maintain a list of active flags
   - Document the purpose of each flag
   - Record when flags can be removed

7. **Avoid flag dependencies**
   - Try to make flags independent of each other
   - If dependencies are necessary, document them clearly

8. **Consider performance**
   - Use local storage caching for client-side flags
   - Batch flag evaluations when possible

---

For more information or help with feature flags, contact the platform team.