import './globals.css'
import type { Metadata } from 'next'
import { SupabaseProvider } from '../providers/SupabaseProvider'
import { DebugPanel } from '../components/DebugPanel'
import NotificationCenter from '../components/NotificationCenter'
import PerformanceMonitor from '../components/PerformanceMonitor'

export const metadata: Metadata = {
  title: 'Celora - Cyberpunk Fintech Platform',
  description: 'Advanced virtual cards and crypto wallets with cyberpunk aesthetics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-primary font-mono antialiased text-foreground">
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
          {/* Cyberpunk background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-cyan-950/10 to-cyan-900/20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(0,255,255,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(0,255,255,0.05),transparent_50%)]"></div>
          
          <div className="relative z-10">
            <SupabaseProvider>
              {/* Notification Center */}
              <div className="fixed top-4 right-4 z-50">
                <NotificationCenter />
              </div>
              
              {children}
              <DebugPanel />
              <PerformanceMonitor />
            </SupabaseProvider>
          </div>
        </div>
      </body>
    </html>
  )
}