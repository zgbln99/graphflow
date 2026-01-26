'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { CommandPalette } from '@/components/search/command-palette'
import { ToastProvider } from '@/components/ui/toast'
import type { SessionUser } from '@/lib/auth'

interface PanelLayoutClientProps {
  user: SessionUser
  children: React.ReactNode
}

export function PanelLayoutClient({ user, children }: PanelLayoutClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <CommandPalette />
        <Sidebar
          user={user}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="lg:pl-64">
          <Header
            user={user}
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
