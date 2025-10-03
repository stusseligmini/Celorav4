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
import { SupabaseInitializer } from './supabase-init'

export const metadata: Metadata = {
  title: 'Celora - Professional Fintech Platform',
  description: 'Advanced financial technology platform for virtual cards, cryptocurrency management, and real-time analytics',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Celora'
  },
}

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
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
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        {/* iOS: prevent phone/email auto-link styling */}
        <meta name="format-detection" content="telephone=no, email=no, address=no" />
        {/* Browser UI colors */}
        <meta name="theme-color" content="#0a0e17" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: light)" />
        {/* PWA icons for iOS/Android */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-128x128.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-96x96.png" />
      </head>
      <body className="min-h-screen bg-slate-900 antialiased">
        {/* Kjør Supabase-initialisering tidlig i livssyklusen */}
        <SupabaseInitializer />
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
