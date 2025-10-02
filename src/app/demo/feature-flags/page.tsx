'use client';

import React from 'react';
import { FeatureFlag, FeatureFlagVariant } from '@/components/FeatureFlagComponents';

export default function FeatureFlagsDemo() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Feature Flags Demo</h1>

      <div className="space-y-8">
        {/* Example 1: Simple feature toggle */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Simple Feature Toggle</h2>
          
          <FeatureFlag name="new_dashboard" fallback={<LegacyDashboardDemo />}>
            <NewDashboardDemo />
          </FeatureFlag>
        </div>

        {/* Example 2: A/B Testing with Variants */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">A/B Testing with Variants</h2>
          
          <FeatureFlagVariant 
            name="signup_flow" 
            variants={{
              'control': <SignupVariantA />,
              'variant_a': <SignupVariantB />,
              'variant_b': <SignupVariantC />
            }}
            defaultVariant="control"
          />
        </div>

        {/* Example 3: Dark Mode Feature Toggle */}
        <div className="shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Dark Mode Example</h2>
          
          <FeatureFlag 
            name="dark_mode" 
            fallback={<LightModeUI />}
          >
            <DarkModeUI />
          </FeatureFlag>
        </div>
      </div>
    </div>
  );
}

function NewDashboardDemo() {
  return (
    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
      <p className="font-semibold text-blue-800">New Dashboard UI</p>
      <p className="text-sm text-blue-600 mt-2">
        This is the new dashboard UI that is enabled by the "new_dashboard" feature flag.
      </p>
    </div>
  );
}

function LegacyDashboardDemo() {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
      <p className="font-semibold text-gray-800">Legacy Dashboard UI</p>
      <p className="text-sm text-gray-600 mt-2">
        This is the legacy dashboard UI shown when the "new_dashboard" feature flag is disabled.
      </p>
    </div>
  );
}

function SignupVariantA() {
  return (
    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
      <p className="font-semibold text-green-800">Signup Flow: Control Variant</p>
      <p className="text-sm text-green-600 mt-2">
        This is the original signup flow (control group).
      </p>
    </div>
  );
}

function SignupVariantB() {
  return (
    <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
      <p className="font-semibold text-purple-800">Signup Flow: Variant A</p>
      <p className="text-sm text-purple-600 mt-2">
        This is variant A of the signup flow with simplified form fields.
      </p>
    </div>
  );
}

function SignupVariantC() {
  return (
    <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
      <p className="font-semibold text-amber-800">Signup Flow: Variant B</p>
      <p className="text-sm text-amber-600 mt-2">
        This is variant B of the signup flow with social login prominence.
      </p>
    </div>
  );
}

function DarkModeUI() {
  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white">
      <p className="font-semibold">Dark Mode UI</p>
      <p className="text-sm text-gray-300 mt-2">
        Dark mode is enabled. This UI uses a dark color scheme to reduce eye strain.
      </p>
    </div>
  );
}

function LightModeUI() {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <p className="font-semibold text-gray-800">Light Mode UI</p>
      <p className="text-sm text-gray-600 mt-2">
        Dark mode is disabled. This UI uses a light color scheme.
      </p>
    </div>
  );
}
