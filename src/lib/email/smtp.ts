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

interface EmailAttachment {
  filename: string
  content?: Buffer
  path?: string
  contentType?: string
  cid?: string // Content-ID dla osadzania w HTML
}

interface SendEmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
  ticketId?: string
  projectId?: string
  attachments?: EmailAttachment[]
  recipientName?: string // Nazwa odbiorcy do logów
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
      attachments: options.attachments,
    })

    // Loguj wysłany email
    // TODO: Remove 'as any' after running migration and regenerating Prisma client
    await (prisma.emailLog.create as any)({
      data: {
        toEmail: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        toName: options.recipientName,
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
    // TODO: Remove 'as any' after running migration and regenerating Prisma client
    await (prisma.emailLog.create as any)({
      data: {
        toEmail: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        toName: options.recipientName,
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
