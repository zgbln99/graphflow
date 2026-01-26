import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ChunkErrorHandler } from '@/components/ui/chunk-error-handler'

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
    <html lang="pl" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ChunkErrorHandler />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
