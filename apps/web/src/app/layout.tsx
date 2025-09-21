import './globals.css'
import type { Metadata } from 'next'
import { SupabaseProvider } from '../providers/SupabaseProvider'
import { DebugPanel } from '../components/DebugPanel'

export const metadata: Metadata = {
  title: 'Celora - Virtual Cards',
  description: 'Secure virtual card platform powered by Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SupabaseProvider>
          {children}
          <DebugPanel />
        </SupabaseProvider>
      </body>
    </html>
  )
}