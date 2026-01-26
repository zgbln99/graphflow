'use server'

import { prisma } from '@/lib/db'
import { getSession, hashPassword, verifyPassword } from '@/lib/auth'

export async function changePasswordAction(formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Musisz byc zalogowany' }
  }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'Wypelnij wszystkie pola' }
  }

  if (newPassword.length < 8) {
    return { error: 'Nowe haslo musi miec minimum 8 znakow' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Hasla nie sa takie same' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return { error: 'Uzytkownik nie istnieje' }
    }

    const isValidPassword = await verifyPassword(currentPassword, user.password)

    if (!isValidPassword) {
      return { error: 'Aktualne haslo jest nieprawidlowe' }
    }

    const hashedPassword = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return { success: true }
  } catch (error) {
    console.error('Error changing password:', error)
    return { error: 'Nie udalo sie zmienic hasla' }
  }
}
