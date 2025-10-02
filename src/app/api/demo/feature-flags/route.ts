'use server';

import { NextRequest, NextResponse } from 'next/server';
import { featureFlags } from '@/lib/featureFlags';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') || undefined;
  
  // Initialiser feature flags først
  await featureFlags.initialize({ userId });
  
  // Check if the new API is enabled for this user
  if (featureFlags.isEnabled('new_api_version', {}, { userId })) {
    // New API version
    return NextResponse.json({
      version: 'v2',
      features: ['improved_performance', 'additional_data', 'new_endpoints'],
      message: 'You are using the new API version with enhanced features'
    });
  } else {
    // Legacy API version
    return NextResponse.json({
      version: 'v1',
      features: ['basic_data'],
      message: 'You are using the legacy API version'
    });
  }
}
