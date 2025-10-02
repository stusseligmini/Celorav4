import { redirect } from 'next/navigation';

/**
 * MFA Route Redirector
 * 
 * This page automatically redirects users to the appropriate MFA page
 */
export default function MfaRouterPage() {
  // Default redirect to mobile verification
  redirect('/mfa-verification-mobile');
}
