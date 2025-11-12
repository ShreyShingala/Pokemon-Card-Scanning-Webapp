import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Analytics } from '@vercel/analytics/next'
import { ToastProvider } from '@/contexts/ToastContext'

export const metadata: Metadata = {
  title: 'PokéScanner - Card Collection Manager',
  description: 'Scan and collect Pokemon cards digitally',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Sidebar />
              <main className="main-content">
                {children}
              </main>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}