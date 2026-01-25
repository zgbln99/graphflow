import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { PanelLayoutClient } from '@/components/layout/panel-layout-client'

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <PanelLayoutClient user={session.user}>
      {children}
    </PanelLayoutClient>
  )
}
