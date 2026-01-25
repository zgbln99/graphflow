'use server'

import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { resetPasswordSchema } from '@/lib/validators'

export async function resetPasswordAction(formData: FormData) {
  const rawData = {
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  // Walidacja
  const validationResult = resetPasswordSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const { token, password } = validationResult.data

  // Znajdź użytkownika po tokenie
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
  })

  if (!user) {
    return { error: 'Link do resetu hasła wygasł lub jest nieprawidłowy' }
  }

  // Zaktualizuj hasło
  const hashedPassword = await hashPassword(password)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  // Usuń wszystkie sesje użytkownika (wymuszone ponowne logowanie)
  await prisma.session.deleteMany({
    where: { userId: user.id },
  })

  return { success: true }
}
