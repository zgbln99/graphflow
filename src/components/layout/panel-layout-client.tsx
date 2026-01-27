'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { CommandPalette } from '@/components/search/command-palette'
import { ToastProvider } from '@/components/ui/toast'
import { KeyboardShortcuts } from '@/components/ui/keyboard-shortcuts'
import { OfflineIndicator, InstallBanner, UpdateBanner } from '@/components/ui/offline-indicator'
import { BottomNavigation, QuickActionsSheet } from '@/components/ui/bottom-navigation'
import { Home, FolderKanban, Ticket, User, Plus, FileText, MessageSquare } from 'lucide-react'
import type { SessionUser } from '@/lib/auth'

interface PanelLayoutClientProps {
  user: SessionUser
  children: React.ReactNode
}

export function PanelLayoutClient({ user, children }: PanelLayoutClientProps) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)

  const navItems = [
    { icon: <Home className="w-6 h-6" />, label: 'Dashboard', href: '/panel' },
    { icon: <FolderKanban className="w-6 h-6" />, label: 'Projekty', href: '/panel/projects' },
    { icon: <Ticket className="w-6 h-6" />, label: 'Tickety', href: '/panel/tickets' },
    { icon: <User className="w-6 h-6" />, label: 'Profil', href: '/panel/profile' },
  ]

  const quickActions = [
    {
      icon: <FolderKanban className="w-6 h-6" />,
      label: 'Nowy projekt',
      onClick: () => router.push('/panel/projects/new'),
      color: 'primary' as const,
    },
    {
      icon: <Ticket className="w-6 h-6" />,
      label: 'Nowy ticket',
      onClick: () => router.push('/panel/tickets/new'),
      color: 'primary' as const,
    },
    {
      icon: <FileText className="w-6 h-6" />,
      label: 'Eksport',
      onClick: () => router.push('/panel/export'),
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      label: 'Inbox',
      onClick: () => router.push('/panel/inbox'),
    },
  ]

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <CommandPalette />
        <KeyboardShortcuts />
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
          <main className="p-3 sm:p-4 lg:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>

        {/* PWA & Offline Components */}
        <OfflineIndicator />
        <InstallBanner />
        <UpdateBanner />

        {/* Mobile Bottom Navigation */}
        <BottomNavigation
          items={navItems}
          showFab={user.role === 'ADMIN'}
          fabIcon={<Plus className="w-6 h-6" />}
          onFabClick={() => setIsQuickActionsOpen(true)}
        />

        {/* Quick Actions Sheet for FAB */}
        <QuickActionsSheet
          isOpen={isQuickActionsOpen}
          onClose={() => setIsQuickActionsOpen(false)}
          actions={quickActions}
          title="Szybkie akcje"
        />
      </div>
    </ToastProvider>
  )
}
