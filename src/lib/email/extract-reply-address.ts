import { ParsedMail, AddressObject } from 'mailparser'

/**
 * Wyciąga adres reply+...@graphflow.eu z nagłówków maila
 * Używa kilku fallbacków w kolejności priorytetu
 *
 * WAŻNE: Preferuj Delivered-To / X-Original-To jeśli dostępne,
 * bo czasem To: bywa przepisywane przez serwery pocztowe.
 */
export function extractReplyAddress(mail: ParsedMail): string | null {
  const replyDomain = process.env.EMAIL_REPLY_DOMAIN || 'graphflow.eu'
  const replyPattern = new RegExp(`reply\\+[^@]+@${replyDomain.replace('.', '\\.')}`, 'i')

  // 1. Sprawdź X-Original-To (najczęściej używane przez catch-all)
  const xOriginalTo = mail.headers.get('x-original-to')
  if (xOriginalTo) {
    const match = String(xOriginalTo).match(replyPattern)
    if (match) return match[0].toLowerCase()
  }

  // 2. Sprawdź Delivered-To
  const deliveredTo = mail.headers.get('delivered-to')
  if (deliveredTo) {
    const match = String(deliveredTo).match(replyPattern)
    if (match) return match[0].toLowerCase()
  }

  // 3. Sprawdź Envelope-To
  const envelopeTo = mail.headers.get('envelope-to')
  if (envelopeTo) {
    const match = String(envelopeTo).match(replyPattern)
    if (match) return match[0].toLowerCase()
  }

  // 4. Sprawdź To: header
  if (mail.to) {
    const addresses = normalizeAddresses(mail.to)
    for (const addr of addresses) {
      const match = addr.match(replyPattern)
      if (match) return match[0].toLowerCase()
    }
  }

  // 5. Sprawdź CC: header
  if (mail.cc) {
    const addresses = normalizeAddresses(mail.cc)
    for (const addr of addresses) {
      const match = addr.match(replyPattern)
      if (match) return match[0].toLowerCase()
    }
  }

  // 6. Sprawdź In-Reply-To (może zawierać Message-ID z adresem)
  const inReplyTo = mail.inReplyTo
  if (inReplyTo) {
    const match = inReplyTo.match(replyPattern)
    if (match) return match[0].toLowerCase()
  }

  // 7. Sprawdź References
  const references = mail.references
  if (references) {
    const refs = Array.isArray(references) ? references : [references]
    for (const ref of refs) {
      const match = ref.match(replyPattern)
      if (match) return match[0].toLowerCase()
    }
  }

  return null
}

/**
 * Normalizuje różne formaty adresów do tablicy stringów
 */
function normalizeAddresses(addresses: AddressObject | AddressObject[]): string[] {
  const result: string[] = []

  const addrs = Array.isArray(addresses) ? addresses : [addresses]

  for (const addrObj of addrs) {
    if (addrObj.value) {
      for (const addr of addrObj.value) {
        if (addr.address) {
          result.push(addr.address)
        }
      }
    }
  }

  return result
}

/**
 * Czyści treść odpowiedzi z cytowań i stopek
 */
export function cleanReplyContent(text: string): string {
  if (!text) return ''

  const lines = text.split('\n')
  const cleanedLines: string[] = []

  for (const line of lines) {
    // Przerwij na znacznikach cytowania
    if (line.match(/^>+\s/)) break
    if (line.match(/^On .+ wrote:$/i)) break
    if (line.match(/^W dniu .+ napisał/i)) break
    if (line.match(/^Dnia .+ .+ napisał/i)) break
    if (line.match(/^-{3,}.*Original Message.*-{3,}/i)) break
    if (line.match(/^_{3,}/)) break
    if (line.match(/^From:/i) && line.includes('@')) break
    if (line.match(/^Sent:/i) || line.match(/^Wysłano:/i)) break

    cleanedLines.push(line)
  }

  return cleanedLines
    .join('\n')
    .trim()
    // Usuń nadmiarowe puste linie
    .replace(/\n{3,}/g, '\n\n')
}

/**
 * Pobiera adres email nadawcy
 */
export function getSenderEmail(mail: ParsedMail): string | null {
  if (mail.from?.value?.[0]?.address) {
    return mail.from.value[0].address.toLowerCase()
  }
  return null
}

/**
 * Pobiera nazwę nadawcy
 */
export function getSenderName(mail: ParsedMail): string | null {
  if (mail.from?.value?.[0]?.name) {
    return mail.from.value[0].name
  }
  return null
}
