import './globals.css'
import type { Metadata } from 'next'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { SupabaseProvider } from '../providers/SupabaseProvider'

export const metadata: Metadata = {
  title: 'Celora - Professional Fintech Platform',
  description: 'Advanced financial technology platform for virtual cards, cryptocurrency management, and real-time analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-900 antialiased">
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}