import type { Metadata } from 'next'

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
      <body>{children}</body>
    </html>
  )
}

