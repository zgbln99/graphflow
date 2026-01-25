import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProfileForm } from '@/components/forms/profile-form'

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mój profil</h1>
        <p className="text-gray-600 mt-1">Zarządzaj swoim kontem</p>
      </div>

      <ProfileForm user={user} />
    </div>
  )
}
