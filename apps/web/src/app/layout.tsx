import './globals.css'
import type { Metadata } from 'next'
import { SupabaseProvider } from '../providers/SupabaseProvider'
import { DebugPanel } from '../components/DebugPanel'

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
      <body className="min-h-screen bg-primary font-sans antialiased text-foreground">
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
          <SupabaseProvider>
            {children}
            <DebugPanel />
          </SupabaseProvider>
        </div>
      </body>
    </html>
  )
}