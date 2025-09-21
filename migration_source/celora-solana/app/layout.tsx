import './globals.css';
import type { Metadata } from 'next';
import PWAManager from './components/PWAManager';

export const metadata: Metadata = {
  title: 'Celora Wallet - Secure Multi-Chain Crypto Wallet',
  description: 'Your own secure multi-chain wallet for Solana and Ethereum with encrypted local storage. Generate, import, and manage your crypto assets safely.',
  keywords: ['crypto wallet', 'solana', 'ethereum', 'multi-chain', 'secure', 'web3', 'PWA'],
  authors: [{ name: 'Celora Team' }],
  creator: 'Celora',
  publisher: 'Celora',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  themeColor: '#00ffc7',
  colorScheme: 'dark',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Celora Wallet',
    startupImage: [
      {
        url: '/splash/apple-splash-2048-2732.jpg',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1668-2224.jpg',
        media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1536-2048.jpg',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1125-2436.jpg',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1242-2208.jpg',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-750-1334.jpg',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-640-1136.jpg',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'Celora Wallet',
    title: 'Celora Wallet - Secure Multi-Chain Crypto Wallet',
    description: 'Your own secure multi-chain wallet for Solana and Ethereum with encrypted local storage.',
    url: 'https://celora.app',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Celora Wallet - Secure Multi-Chain Crypto Wallet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Celora Wallet - Secure Multi-Chain Crypto Wallet',
    description: 'Your own secure multi-chain wallet for Solana and Ethereum with encrypted local storage.',
    images: ['/og-image.png'],
    creator: '@celora_wallet',
  },
  icons: {
    icon: [
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/safari-pinned-tab.svg',
        color: '#00ffc7',
      },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'msapplication-TileColor': '#041c24',
    'msapplication-config': '/browserconfig.xml',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA primary color */}
        <meta name="theme-color" content="#00ffc7" />
        
        {/* Disable automatic detection and formatting of possible phone numbers */}
        <meta name="format-detection" content="telephone=no" />
        
        {/* Add to homescreen for Chrome on Android */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Celora Wallet" />
        
        {/* Add to homescreen for Safari on iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Celora Wallet" />
        
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicon and icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#00ffc7" />
        
        {/* Windows tiles */}
        <meta name="msapplication-TileColor" content="#041c24" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Disable tap highlighting */}
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      </head>
      <body>
        {children}
        <PWAManager />
      </body>
    </html>
  );
}