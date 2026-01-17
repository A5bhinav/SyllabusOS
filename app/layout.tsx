import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SyllabusOS',
  description: 'AI Professor-in-a-Box - Course management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

