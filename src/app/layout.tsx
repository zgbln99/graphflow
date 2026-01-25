import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GraphFlow - System zarządzania projektami graficznymi',
  description: 'Profesjonalny system do zarządzania projektami graficznymi dla agencji i freelancerów.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}
