'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createClientAccountSchema, updateClientAccountSchema } from '@/lib/validators'
import { slugify } from '@/lib/utils'

export async function createClientAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const rawData = {
    name: formData.get('name'),
    email: formData.get('email') || '',
    phone: formData.get('phone') || '',
    address: formData.get('address') || '',
    notes: formData.get('notes') || '',
    emailDomains: formData.get('emailDomains') || '',
  }

  const validationResult = createClientAccountSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    // Generuj slug
    let slug = slugify(data.name)
    let counter = 1

    // Upewnij się, że slug jest unikalny
    while (await prisma.clientAccount.findUnique({ where: { slug } })) {
      slug = `${slugify(data.name)}-${counter}`
      counter++
    }

    const client = await prisma.clientAccount.create({
      data: {
        name: data.name,
        slug,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        emailDomains: data.emailDomains || null,
      },
    })

    return { success: true, clientId: client.id }
  } catch (error) {
    console.error('Error creating client:', error)
    return { error: 'Nie udało się utworzyć klienta' }
  }
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const rawData = {
    name: formData.get('name'),
    email: formData.get('email') || '',
    phone: formData.get('phone') || '',
    address: formData.get('address') || '',
    notes: formData.get('notes') || '',
    emailDomains: formData.get('emailDomains') || '',
  }

  const isActive = formData.get('isActive') === 'on'

  const validationResult = updateClientAccountSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    const client = await prisma.clientAccount.update({
      where: { id: clientId },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        emailDomains: data.emailDomains || null,
        isActive,
      },
    })

    return { success: true, clientId: client.id }
  } catch (error) {
    console.error('Error updating client:', error)
    return { error: 'Nie udało się zaktualizować klienta' }
  }
}
