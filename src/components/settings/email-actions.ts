'use server'

import { getSession } from '@/lib/auth'
import { sendEmail } from '@/lib/email/smtp'

export async function testEmailAction(toEmail: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, message: 'Brak uprawnień' }
  }

  try {
    await sendEmail({
      to: toEmail,
      subject: 'GraphFlow: Test wysyłki email',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111;">Test wysyłki email</h2>
          <p>Jeśli widzisz tę wiadomość, konfiguracja SMTP działa poprawnie.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            Wysłano z GraphFlow<br>
            ${new Date().toLocaleString('pl-PL')}
          </p>
        </div>
      `,
      text: `Test wysyłki email\n\nJeśli widzisz tę wiadomość, konfiguracja SMTP działa poprawnie.\n\nWysłano z GraphFlow\n${new Date().toLocaleString('pl-PL')}`,
    })

    return { success: true, message: `Email testowy wysłany na ${toEmail}` }
  } catch (error) {
    console.error('Test email error:', error)
    return {
      success: false,
      message: `Błąd wysyłki: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
    }
  }
}
