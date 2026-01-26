import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProfileForm } from '@/components/forms/profile-form'
import { Key, Shield, ChevronRight } from 'lucide-react'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clientAccount: true,
    },
  })

  if (!user) redirect('/login')

  const sessionCount = await prisma.session.count({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mój profil</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Zarządzaj swoim kontem</p>
      </div>

      <ProfileForm user={user} />

      {/* Security section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Bezpieczeństwo
        </h2>
        <div className="card dark:bg-gray-800 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          <Link
            href="/panel/settings/password"
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Zmiana hasła</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Zmień swoje hasło logowania
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/panel/settings/sessions"
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Aktywne sesje</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Zarządzaj sesjami logowania ({sessionCount} aktywnych)
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  )
}
