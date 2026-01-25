'use server'

import { prisma } from '@/lib/db'
import { getSession, hashPassword, verifyPassword } from '@/lib/auth'
import { changePasswordSchema } from '@/lib/validators'

export async function updateProfileAction(formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Nie jesteś zalogowany' }
  }

  const name = formData.get('name') as string

  if (!name || name.length < 2) {
    return { error: 'Imię musi mieć minimum 2 znaki' }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { error: 'Nie udało się zaktualizować profilu' }
  }
}

export async function changePasswordAction(formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Nie jesteś zalogowany' }
  }

  const rawData = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const validationResult = changePasswordSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const { currentPassword, newPassword } = validationResult.data

  try {
    // Pobierz użytkownika z hasłem
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return { error: 'Użytkownik nie istnieje' }
    }

    // Sprawdź aktualne hasło
    const isValid = await verifyPassword(currentPassword, user.password)
    if (!isValid) {
      return { error: 'Aktualne hasło jest nieprawidłowe' }
    }

    // Zaktualizuj hasło
    const hashedPassword = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return { success: true }
  } catch (error) {
    console.error('Error changing password:', error)
    return { error: 'Nie udało się zmienić hasła' }
  }
}
