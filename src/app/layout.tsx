import './globals.css'
import type { Metadata } from 'next'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { SupabaseProvider } from '../providers/SupabaseProvider'
import ErrorBoundary from '../components/ErrorBoundary'
import NetworkStatusHandler from '../components/NetworkStatusHandler'
import ServiceWorkerRegistration from '../components/ServiceWorkerRegistration'
import PushNotificationRegistration from '../components/PushNotificationRegistration'
import { headers } from 'next/headers'
import { CspNonceProvider } from '../lib/cspHelpers'
import SecurityMonitor from '../components/SecurityMonitor'
import { FeatureFlagProvider } from '../components/FeatureFlagComponents'

export const metadata: Metadata = {
  title: 'Celora - Professional Fintech Platform',
  description: 'Advanced financial technology platform for virtual cards, cryptocurrency management, and real-time analytics',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Celora'
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the CSP nonce from headers (set by middleware)
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';
  
  return (
    <html lang="en" className="dark">
      <head>
        {/* Make nonce available to client components via meta tag */}
        <meta name="csp-nonce" content={nonce} />
      </head>
      <body className="min-h-screen bg-slate-900 antialiased">
        <ErrorBoundary>
          <NetworkStatusHandler>
            <SupabaseProvider>
              <SecurityMonitor>
                <FeatureFlagProvider>
                  {children}
                </FeatureFlagProvider>
              </SecurityMonitor>
            </SupabaseProvider>
          </NetworkStatusHandler>
        </ErrorBoundary>
        <ServiceWorkerRegistration />
        <PushNotificationRegistration />
        <SpeedInsights />
      </body>
    </html>
  )
}