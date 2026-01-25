import crypto from 'crypto'

const EMAIL_REPLY_SECRET = process.env.EMAIL_REPLY_SECRET || 'default-hmac-secret-change-me'
const EMAIL_REPLY_DOMAIN = process.env.EMAIL_REPLY_DOMAIN || 'graphflow.eu'

/**
 * Generuje unikalny token HMAC dla ticketa
 */
export function generateReplyToken(ticketNumber: string): string {
  const hmac = crypto.createHmac('sha256', EMAIL_REPLY_SECRET)
  hmac.update(ticketNumber)
  return hmac.digest('hex').substring(0, 16) // Skrócony token dla czytelności
}

/**
 * Weryfikuje token HMAC dla ticketa
 */
export function verifyReplyToken(ticketNumber: string, token: string): boolean {
  const expectedToken = generateReplyToken(ticketNumber)
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  )
}

/**
 * Generuje pełny adres Reply-To dla ticketa
 * Format: reply+TCK-000123.abc123def456@graphflow.eu
 */
export function generateReplyToAddress(ticketNumber: string, token: string): string {
  return `reply+${ticketNumber}.${token}@${EMAIL_REPLY_DOMAIN}`
}

/**
 * Parsuje adres Reply-To i wyciąga numer ticketa oraz token
 * Zwraca null jeśli format jest nieprawidłowy
 */
export function parseReplyToAddress(email: string): { ticketNumber: string; token: string } | null {
  // Format: reply+TCK-000123.abc123def456@domain
  const match = email.match(/^reply\+([A-Z]+-\d+)\.([a-f0-9]+)@/i)

  if (!match) return null

  return {
    ticketNumber: match[1].toUpperCase(),
    token: match[2],
  }
}

/**
 * Wyciąga numer ticketa z tematu maila
 * Fallback gdy Reply-To nie działa
 */
export function extractTicketFromSubject(subject: string): string | null {
  // Format: [TCK-000123] lub GraphFlow: [TCK-000123]
  const match = subject.match(/\[([A-Z]+-\d+)\]/i)
  return match ? match[1].toUpperCase() : null
}
