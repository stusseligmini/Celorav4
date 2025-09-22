import './globals.css'
import type { Metadata } from 'next'
import { SupabaseProvider } from '../providers/SupabaseProvider'
import { DebugPanel } from '../components/DebugPanel'
import NotificationCenter from '../components/NotificationCenter'
import PerformanceMonitor from '../components/PerformanceMonitor'
import { SpeedInsights } from "@vercel/speed-insights/next"

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
      <body className="min-h-screen bg-slate-900 antialiased text-foreground">
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black relative overflow-hidden">
          {/* Subtle background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-cyan-950/5 to-cyan-900/10"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.05),transparent_50%)]"></div>
          
          <div className="relative z-10">
            <SupabaseProvider>
              {/* Notification Center */}
              <div className="fixed top-4 right-4 z-50">
                <NotificationCenter />
              </div>
              
              {children}
              <DebugPanel />
              <PerformanceMonitor />
              <SpeedInsights />
            </SupabaseProvider>
          </div>
        </div>
      </body>
    </html>
  )
}