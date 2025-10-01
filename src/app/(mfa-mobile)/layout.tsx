import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './mfa-mobile.css';

// Font setup
const inter = Inter({ subsets: ['latin'] });

// Metadata for MFA Mobile Pages
export const metadata: Metadata = {
  title: 'Celora - Multi-Factor Authentication',
  description: 'Secure verification and recovery for your Celora account.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f172a'
};

/**
 * Layout for Mobile MFA Pages
 * Provides consistent styling and viewport settings for mobile MFA flows
 */
export default function MfaMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`mfa-mobile-wrapper bg-slate-900 text-white ${inter.className}`}>
      <div className="mfa-mobile-container">
        {children}
      </div>
      <div className="mfa-mobile-bottom-padding"></div>
    </div>
  );
}