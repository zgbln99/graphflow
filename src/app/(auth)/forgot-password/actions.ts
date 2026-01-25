'use server'

import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email/smtp'
import { passwordResetEmail } from '@/lib/email/templates'
import { resetPasswordRequestSchema } from '@/lib/validators'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://graphflow.eu'

export async function requestPasswordResetAction(formData: FormData) {
  const rawData = {
    email: formData.get('email'),
  }

  // Walidacja
  const validationResult = resetPasswordRequestSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const { email } = validationResult.data

  // Znajdź użytkownika (nie ujawniaj czy istnieje)
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (user && user.isActive) {
    // Generuj token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 godzina

    // Zapisz token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Wyślij email
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`
    const emailData = passwordResetEmail({
      recipientName: user.name,
      resetUrl,
    })

    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    })
  }

  // Zawsze zwracaj sukces (bezpieczeństwo)
  return { success: true }
}
