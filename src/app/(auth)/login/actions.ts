'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { createSession, verifyPassword, COOKIE_NAME } from '@/lib/auth'
import { loginSchema } from '@/lib/validators'

export async function loginAction(formData: FormData) {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  // Walidacja
  const validationResult = loginSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const { email, password } = validationResult.data

  // Znajdź użytkownika
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!user) {
    return { error: 'Nieprawidłowy email lub hasło' }
  }

  if (!user.isActive) {
    return { error: 'Konto zostało dezaktywowane' }
  }

  // Sprawdź hasło
  const isValidPassword = await verifyPassword(password, user.password)

  if (!isValidPassword) {
    return { error: 'Nieprawidłowy email lub hasło' }
  }

  // Utwórz sesję
  const token = await createSession(user)

  // Ustaw cookie
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 dni
    path: '/',
  })

  return { success: true }
}
