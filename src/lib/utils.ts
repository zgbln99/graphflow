import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Generuje kolejny numer dla projektu/ticketa
 */
export async function generateNumber(
  prefix: 'GF' | 'TCK',
  prisma: any
): Promise<string> {
  const lastItem = prefix === 'GF'
    ? await prisma.project.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { number: true },
      })
    : await prisma.ticket.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { number: true },
      })

  let nextNum = 1

  if (lastItem?.number) {
    const match = lastItem.number.match(/\d+/)
    if (match) {
      nextNum = parseInt(match[0], 10) + 1
    }
  }

  // GF uses 3 digits (GF-001), TCK uses 6 digits (TCK-000001)
  const padding = prefix === 'GF' ? 3 : 6
  return `${prefix}-${String(nextNum).padStart(padding, '0')}`
}

/**
 * Formatuje datę po polsku (strefa czasowa: Warszawa)
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return '-'

  const d = typeof date === 'string' ? new Date(date) : date

  return d.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
  })
}

/**
 * Formatuje datę i czas po polsku (strefa czasowa: Warszawa)
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '-'

  const d = typeof date === 'string' ? new Date(date) : date

  return d.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  })
}

/**
 * Formatuje względny czas (np. "2 godziny temu")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'przed chwilą'
  if (diffMins < 60) return `${diffMins} min temu`
  if (diffHours < 24) return `${diffHours} godz. temu`
  if (diffDays < 7) return `${diffDays} dni temu`

  return formatDate(d)
}

/**
 * Skraca tekst do określonej długości
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Generuje slug z tekstu
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Usuń znaki diakrytyczne
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Mapowanie statusów ticketa na polskie nazwy
 */
export const ticketStatusLabels: Record<string, string> = {
  NEW: 'Nowe',
  IN_PROGRESS: 'W trakcie',
  WAITING_FOR_CLIENT: 'Oczekuje na klienta',
  WAITING_FOR_ADMIN: 'Oczekuje na admina',
  RESOLVED: 'Rozwiązane',
  CLOSED: 'Zamknięte',
}

/**
 * Mapowanie priorytetów na polskie nazwy
 */
export const priorityLabels: Record<string, string> = {
  LOW: 'Niski',
  NORMAL: 'Normalny',
  HIGH: 'Wysoki',
  URGENT: 'Pilny',
}

/**
 * Kolory dla statusów ticketa
 */
export const ticketStatusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  WAITING_FOR_CLIENT: 'bg-purple-100 text-purple-800',
  WAITING_FOR_ADMIN: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
}

/**
 * Kolory dla priorytetów
 */
export const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
}
