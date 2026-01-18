import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export const metadata: Metadata = {
  title: 'ProfAI',
  description: 'AI Professor-in-a-Box - Course management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <ErrorBoundary>
          {children}
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  )
}

