'use server'

import { prisma } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
import { sendEmail } from '@/lib/email/smtp'
import { welcomeEmail } from '@/lib/email/templates'

export async function createUserAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const email = formData.get('email') as string
  const name = formData.get('name') as string
  const password = formData.get('password') as string
  const clientAccountId = formData.get('clientAccountId') as string
  const sendWelcomeEmail = formData.get('sendWelcomeEmail') === 'on'

  if (!email || !name || !password || !clientAccountId) {
    return { error: 'Wypełnij wszystkie wymagane pola' }
  }

  if (password.length < 8) {
    return { error: 'Hasło musi mieć minimum 8 znaków' }
  }

  // Sprawdź czy email nie jest zajęty
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existing) {
    return { error: 'Użytkownik z tym adresem email już istnieje' }
  }

  try {
    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role: 'CLIENT_USER',
        clientAccountId,
        isActive: true,
      },
    })

    // Wyślij email powitalny
    if (sendWelcomeEmail) {
      const emailContent = welcomeEmail({
        recipientName: name,
        email: email.toLowerCase(),
        temporaryPassword: password,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      })

      await sendEmail({
        to: email.toLowerCase(),
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })
    }

    return { success: true, userId: user.id }
  } catch (error) {
    console.error('Error creating user:', error)
    return { error: 'Nie udało się utworzyć użytkownika' }
  }
}

export async function updateUserAction(userId: string, formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const email = formData.get('email') as string
  const name = formData.get('name') as string

  if (!email || !name) {
    return { error: 'Wypełnij wszystkie wymagane pola' }
  }

  // Sprawdź czy email nie jest zajęty przez innego użytkownika
  const existing = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      NOT: { id: userId },
    },
  })

  if (existing) {
    return { error: 'Użytkownik z tym adresem email już istnieje' }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: email.toLowerCase(),
        name,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating user:', error)
    return { error: 'Nie udało się zaktualizować użytkownika' }
  }
}

export async function toggleUserActiveAction(userId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { error: 'Użytkownik nie istnieje' }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !user.isActive,
      },
    })

    // Jeśli dezaktywujemy, usuń sesje
    if (user.isActive) {
      await prisma.session.deleteMany({
        where: { userId },
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error toggling user active:', error)
    return { error: 'Nie udało się zmienić statusu użytkownika' }
  }
}

export async function resetUserPasswordAction(userId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { error: 'Użytkownik nie istnieje' }
    }

    // Wygeneruj nowe hasło
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let newPassword = ''
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    const hashedPassword = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    })

    // Wyślij email z nowym hasłem
    const emailContent = welcomeEmail({
      recipientName: user.name,
      email: user.email,
      temporaryPassword: newPassword,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    })

    await sendEmail({
      to: user.email,
      subject: 'GraphFlow: Nowe hasło',
      html: emailContent.html,
      text: emailContent.text,
    })

    // Usuń sesje użytkownika
    await prisma.session.deleteMany({
      where: { userId },
    })

    return { success: true }
  } catch (error) {
    console.error('Error resetting password:', error)
    return { error: 'Nie udało się zresetować hasła' }
  }
}

export async function deleteUserAction(userId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { error: 'Użytkownik nie istnieje' }
    }

    // Nie można usunąć admina
    if (user.role === 'ADMIN') {
      return { error: 'Nie można usunąć konta administratora' }
    }

    // Usuń sesje użytkownika
    await prisma.session.deleteMany({
      where: { userId },
    })

    // Usuń powiadomienia użytkownika
    await prisma.notification.deleteMany({
      where: { userId },
    })

    // Usuń użytkownika
    await prisma.user.delete({
      where: { id: userId },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { error: 'Nie udało się usunąć użytkownika' }
  }
}
