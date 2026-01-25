'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import type { SessionUser } from '@/lib/auth'

interface PanelLayoutClientProps {
  user: SessionUser
  children: React.ReactNode
}

export function PanelLayoutClient({ user, children }: PanelLayoutClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
  )
}
