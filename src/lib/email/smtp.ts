import nodemailer from 'nodemailer'
import { prisma } from '../db'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
  ticketId?: string
  projectId?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const fromName = process.env.SMTP_FROM_NAME || 'GraphFlow'
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'no-reply@graphflow.eu'

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo || fromEmail,
    })

    // Loguj wysłany email
    await prisma.emailLog.create({
      data: {
        toEmail: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        status: 'sent',
        ticketId: options.ticketId,
        projectId: options.projectId,
      },
    })

    return true
  } catch (error) {
    console.error('Błąd wysyłki email:', error)

    // Loguj błąd
    await prisma.emailLog.create({
      data: {
        toEmail: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Nieznany błąd',
        ticketId: options.ticketId,
        projectId: options.projectId,
      },
    })

    return false
  }
}

export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await transporter.verify()
    return true
  } catch (error) {
    console.error('Błąd weryfikacji SMTP:', error)
    return false
  }
}
