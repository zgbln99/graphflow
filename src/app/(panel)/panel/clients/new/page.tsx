import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ClientForm } from '@/components/forms/client-form'

export default async function NewClientPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nowy klient</h1>
        <p className="text-gray-600 mt-1">Dodaj nowe konto klienta</p>
      </div>

      <ClientForm />
    </div>
  )
}
