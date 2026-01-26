const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://graphflow.eu'
// Użyj białych wersji logo dla ciemnego tła w emailach
const LOGO_URL = `${APP_URL}/logo-white.png`
const ICON_URL = `${APP_URL}/icon-white.png`

// Brand colors
const COLORS = {
  mirage: '#1B1F3B',      // Dark navy - headers, footer
  toryBlue: '#0B46AC',    // Primary blue - buttons, links
  white: '#FFFFFF',
  shark: '#1F1F21',       // Dark gray - text
  athensGray: '#E3E7ED',  // Light gray - backgrounds
  gullGray: '#979FB6',    // Medium gray - secondary text
}

interface TicketEmailData {
  ticketNumber: string
  ticketTitle: string
  ticketId: string
  replyToAddress: string
  recipientName?: string
}

interface ProjectEmailData {
  projectNumber: string
  projectTitle: string
  projectId: string
  recipientName?: string
  submittedByName?: string  // Imię i nazwisko zgłaszającego
}

function getBaseTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${COLORS.shark}; margin: 0; padding: 0; background-color: ${COLORS.athensGray};">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header with logo -->
        <div style="background: ${COLORS.mirage}; padding: 24px 32px; border-radius: 8px 8px 0 0; text-align: center;">
          <img src="${LOGO_URL}" alt="GraphFlow" style="max-height: 48px; max-width: 200px;" />
        </div>

        <!-- Content -->
        <div style="background: ${COLORS.white}; padding: 32px; border-left: 1px solid ${COLORS.athensGray}; border-right: 1px solid ${COLORS.athensGray};">
          ${content}
        </div>

        <!-- Footer -->
        <div style="background: ${COLORS.mirage}; padding: 24px 32px; border-radius: 0 0 8px 8px; text-align: center;">
          <img src="${ICON_URL}" alt="GraphFlow" style="height: 40px; width: auto; margin-bottom: 12px;" />
          <p style="color: ${COLORS.gullGray}; font-size: 12px; margin: 0 0 8px 0;">
            GraphFlow - System zarządzania projektami graficznymi
          </p>
          <p style="color: ${COLORS.gullGray}; font-size: 11px; margin: 0;">
            <a href="${APP_URL}" style="color: ${COLORS.gullGray}; text-decoration: underline;">${APP_URL}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function getButton(text: string, url: string, color: string = COLORS.toryBlue): string {
  return `
    <a href="${url}" style="display: inline-block; background: ${color}; color: ${COLORS.white}; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 8px 0;">
      ${text}
    </a>
  `
}

function getInfoBox(content: string, borderColor: string = COLORS.toryBlue): string {
  return `
    <div style="background: ${COLORS.athensGray}; border-left: 4px solid ${borderColor}; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      ${content}
    </div>
  `
}

function getFooterLink(url: string, text: string = 'Przejdź do panelu'): string {
  return `
    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid ${COLORS.athensGray};">
      <p style="color: ${COLORS.gullGray}; font-size: 13px; margin: 0;">
        ${text}: <a href="${url}" style="color: ${COLORS.toryBlue};">${url}</a>
      </p>
    </div>
  `
}

// ============================================
// TICKET EMAILS
// ============================================

export function ticketCreatedEmail(data: TicketEmailData & { description?: string; submittedByName?: string }): { subject: string; html: string; text: string } {
  const ticketUrl = `${APP_URL}/panel/tickets/${data.ticketId}`
  const subject = `[${data.ticketNumber}] ${data.ticketTitle}`

  const html = getBaseTemplate(`
    <h1 style="color: ${COLORS.mirage}; font-size: 24px; margin: 0 0 8px 0;">Nowe zgłoszenie utworzone</h1>
    <p style="color: ${COLORS.gullGray}; font-size: 14px; margin: 0 0 24px 0;">Twoje zgłoszenie zostało zarejestrowane</p>

    ${data.recipientName ? `<p style="margin: 0 0 16px 0;">Cześć <strong>${data.recipientName}</strong>,</p>` : ''}
    <p style="margin: 0 0 20px 0;">Twoje zgłoszenie zostało pomyślnie zarejestrowane w systemie GraphFlow. Powiadomimy Cię o wszelkich zmianach statusu.</p>

    ${getInfoBox(`
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">NUMER ZGŁOSZENIA</p>
      <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${COLORS.mirage};">${data.ticketNumber}</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">TYTUŁ</p>
      <p style="margin: 0; font-size: 16px; color: ${COLORS.shark};">${data.ticketTitle}</p>
      ${data.submittedByName ? `
        <p style="margin: 16px 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZGŁOSIŁ</p>
        <p style="margin: 0; font-size: 14px; color: ${COLORS.shark};">${data.submittedByName}</p>
      ` : ''}
      ${data.description ? `
        <p style="margin: 16px 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">OPIS</p>
        <p style="margin: 0; font-size: 14px; color: ${COLORS.shark};">${data.description}</p>
      ` : ''}
    `)}

    <div style="text-align: center; margin: 28px 0;">
      ${getButton('Zobacz zgłoszenie', ticketUrl)}
    </div>

    <p style="color: ${COLORS.gullGray}; font-size: 13px; margin: 0;">
      Możesz odpowiedzieć bezpośrednio na ten email, a Twoja odpowiedź zostanie dodana do zgłoszenia.
    </p>
  `)

  const text = `
NOWE ZGŁOSZENIE UTWORZONE
${data.ticketNumber}

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Twoje zgłoszenie zostało pomyślnie zarejestrowane w systemie GraphFlow.

Numer: ${data.ticketNumber}
Tytuł: ${data.ticketTitle}
${data.submittedByName ? `Zgłosił: ${data.submittedByName}` : ''}
${data.description ? `Opis: ${data.description}` : ''}

Link do zgłoszenia: ${ticketUrl}

Możesz odpowiedzieć bezpośrednio na ten email.

---
GraphFlow - System zarządzania projektami graficznymi
${APP_URL}
  `.trim()

  return { subject, html, text }
}

export function ticketStatusChangedEmail(
  data: TicketEmailData & { oldStatus: string; newStatus: string; submittedByName?: string }
): { subject: string; html: string; text: string } {
  const ticketUrl = `${APP_URL}/panel/tickets/${data.ticketId}`
  const subject = `[${data.ticketNumber}] Zmiana statusu: ${data.newStatus}`

  const html = getBaseTemplate(`
    <h1 style="color: ${COLORS.mirage}; font-size: 24px; margin: 0 0 8px 0;">Zmiana statusu zgłoszenia</h1>
    <p style="color: ${COLORS.gullGray}; font-size: 14px; margin: 0 0 24px 0;">Status Twojego zgłoszenia został zaktualizowany</p>

    ${data.recipientName ? `<p style="margin: 0 0 16px 0;">Cześć <strong>${data.recipientName}</strong>,</p>` : ''}
    <p style="margin: 0 0 20px 0;">Informujemy o zmianie statusu Twojego zgłoszenia.</p>

    ${getInfoBox(`
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZGŁOSZENIE</p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.shark};">[${data.ticketNumber}] ${data.ticketTitle}</p>
      ${data.submittedByName ? `
        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZGŁOSIŁ</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: ${COLORS.shark};">${data.submittedByName}</p>
      ` : ''}
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZMIANA STATUSU</p>
      <p style="margin: 0;">
        <span style="color: ${COLORS.gullGray}; text-decoration: line-through;">${data.oldStatus}</span>
        <span style="color: ${COLORS.gullGray}; margin: 0 8px;">→</span>
        <strong style="color: ${COLORS.toryBlue};">${data.newStatus}</strong>
      </p>
    `)}

    <div style="text-align: center; margin: 28px 0;">
      ${getButton('Zobacz zgłoszenie', ticketUrl)}
    </div>
  `)

  const text = `
ZMIANA STATUSU ZGŁOSZENIA
${data.ticketNumber}

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Informujemy o zmianie statusu Twojego zgłoszenia.

Zgłoszenie: [${data.ticketNumber}] ${data.ticketTitle}
${data.submittedByName ? `Zgłosił: ${data.submittedByName}` : ''}
Status: ${data.oldStatus} → ${data.newStatus}

Link do zgłoszenia: ${ticketUrl}

---
GraphFlow - System zarządzania projektami graficznymi
${APP_URL}
  `.trim()

  return { subject, html, text }
}

export function ticketNewCommentEmail(
  data: TicketEmailData & { commentAuthor: string; commentContent: string; submittedByName?: string }
): { subject: string; html: string; text: string } {
  const ticketUrl = `${APP_URL}/panel/tickets/${data.ticketId}`
  const subject = `[${data.ticketNumber}] Nowy komentarz od ${data.commentAuthor}`

  const html = getBaseTemplate(`
    <h1 style="color: ${COLORS.mirage}; font-size: 24px; margin: 0 0 8px 0;">Nowy komentarz</h1>
    <p style="color: ${COLORS.gullGray}; font-size: 14px; margin: 0 0 24px 0;">Do Twojego zgłoszenia dodano komentarz</p>

    ${data.recipientName ? `<p style="margin: 0 0 16px 0;">Cześć <strong>${data.recipientName}</strong>,</p>` : ''}
    <p style="margin: 0 0 20px 0;"><strong>${data.commentAuthor}</strong> dodał komentarz do zgłoszenia <strong>[${data.ticketNumber}]</strong>.</p>

    ${getInfoBox(`
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZGŁOSZENIE</p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.shark};">[${data.ticketNumber}] ${data.ticketTitle}</p>
      ${data.submittedByName ? `
        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZGŁOSIŁ</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: ${COLORS.shark};">${data.submittedByName}</p>
      ` : ''}
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">KOMENTARZ OD ${data.commentAuthor.toUpperCase()}</p>
      <div style="background: ${COLORS.white}; border-radius: 4px; padding: 12px; margin-top: 8px; border: 1px solid ${COLORS.athensGray};">
        <p style="margin: 0; color: ${COLORS.shark}; white-space: pre-wrap;">${data.commentContent}</p>
      </div>
    `)}

    <div style="text-align: center; margin: 28px 0;">
      ${getButton('Odpowiedz', ticketUrl)}
    </div>

    <p style="color: ${COLORS.gullGray}; font-size: 13px; margin: 0;">
      Możesz odpowiedzieć bezpośrednio na ten email, a Twoja odpowiedź zostanie dodana do zgłoszenia.
    </p>
  `)

  const text = `
NOWY KOMENTARZ
${data.ticketNumber}

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

${data.commentAuthor} dodał komentarz do zgłoszenia [${data.ticketNumber}].

Zgłoszenie: ${data.ticketTitle}
${data.submittedByName ? `Zgłosił: ${data.submittedByName}` : ''}

Komentarz:
${data.commentContent}

Link do zgłoszenia: ${ticketUrl}

Możesz odpowiedzieć bezpośrednio na ten email.

---
GraphFlow - System zarządzania projektami graficznymi
${APP_URL}
  `.trim()

  return { subject, html, text }
}

export function ticketDeadlineReminderEmail(
  data: TicketEmailData & { deadline: string; hoursLeft: number; submittedByName?: string }
): { subject: string; html: string; text: string } {
  const ticketUrl = `${APP_URL}/panel/tickets/${data.ticketId}`
  const isUrgent = data.hoursLeft <= 24
  const subject = `${isUrgent ? '⚠️ PILNE: ' : ''}[${data.ticketNumber}] Zbliża się termin`

  const html = getBaseTemplate(`
    <h1 style="color: ${isUrgent ? '#dc2626' : COLORS.mirage}; font-size: 24px; margin: 0 0 8px 0;">
      ${isUrgent ? '⚠️ ' : ''}Zbliża się termin realizacji
    </h1>
    <p style="color: ${COLORS.gullGray}; font-size: 14px; margin: 0 0 24px 0;">Przypomnienie o terminie zgłoszenia</p>

    ${data.recipientName ? `<p style="margin: 0 0 16px 0;">Cześć <strong>${data.recipientName}</strong>,</p>` : ''}
    <p style="margin: 0 0 20px 0;">Przypominamy o zbliżającym się terminie realizacji zgłoszenia.</p>

    ${getInfoBox(`
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZGŁOSZENIE</p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.shark};">[${data.ticketNumber}] ${data.ticketTitle}</p>
      ${data.submittedByName ? `
        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZGŁOSIŁ</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: ${COLORS.shark};">${data.submittedByName}</p>
      ` : ''}
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">TERMIN</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${isUrgent ? '#dc2626' : COLORS.toryBlue};">
        ${data.deadline} <span style="font-size: 14px; font-weight: normal;">(za ${data.hoursLeft}h)</span>
      </p>
    `, isUrgent ? '#dc2626' : COLORS.toryBlue)}

    <div style="text-align: center; margin: 28px 0;">
      ${getButton('Zobacz zgłoszenie', ticketUrl)}
    </div>
  `)

  const text = `
${isUrgent ? '⚠️ PILNE: ' : ''}ZBLIŻA SIĘ TERMIN
${data.ticketNumber}

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Przypominamy o zbliżającym się terminie realizacji zgłoszenia.

Zgłoszenie: [${data.ticketNumber}] ${data.ticketTitle}
${data.submittedByName ? `Zgłosił: ${data.submittedByName}` : ''}
Termin: ${data.deadline} (za ${data.hoursLeft}h)

Link do zgłoszenia: ${ticketUrl}

---
GraphFlow - System zarządzania projektami graficznymi
${APP_URL}
  `.trim()

  return { subject, html, text }
}

// ============================================
// PROJECT EMAILS
// ============================================

export interface ProjectFileLink {
  filename: string
  url: string
  size?: number
}

export function projectStatusChangedEmail(
  data: ProjectEmailData & { oldStatus: string; newStatus: string; files?: ProjectFileLink[] }
): { subject: string; html: string; text: string } {
  const projectUrl = `${APP_URL}/panel/projects/${data.projectId}`
  const subject = `[${data.projectNumber}] Zmiana statusu projektu: ${data.newStatus}`

  const filesSection = data.files && data.files.length > 0 ? `
    <div style="margin: 24px 0;">
      <p style="margin: 0 0 16px 0; font-size: 13px; color: ${COLORS.gullGray}; text-transform: uppercase;">PLIKI DO POBRANIA (${data.files.length})</p>
      <div style="background: ${COLORS.athensGray}; border-radius: 8px; overflow: hidden;">
        ${data.files.map((file, index) => `
          <div style="padding: 12px 16px; ${index > 0 ? `border-top: 1px solid ${COLORS.white};` : ''} display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1; min-width: 0;">
              <p style="margin: 0; font-size: 14px; color: ${COLORS.shark}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.filename}</p>
              ${file.size ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: ${COLORS.gullGray};">${formatFileSizeForEmail(file.size)}</p>` : ''}
            </div>
            <a href="${file.url}" style="margin-left: 16px; padding: 8px 16px; background: ${COLORS.toryBlue}; color: ${COLORS.white}; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500; white-space: nowrap;">Pobierz</a>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''

  const html = getBaseTemplate(`
    <h1 style="color: ${COLORS.mirage}; font-size: 24px; margin: 0 0 8px 0;">Zmiana statusu projektu</h1>
    <p style="color: ${COLORS.gullGray}; font-size: 14px; margin: 0 0 24px 0;">Status Twojego projektu został zaktualizowany</p>

    ${data.recipientName ? `<p style="margin: 0 0 16px 0;">Cześć <strong>${data.recipientName}</strong>,</p>` : ''}
    <p style="margin: 0 0 20px 0;">Informujemy o zmianie statusu Twojego projektu w systemie GraphFlow.</p>

    ${getInfoBox(`
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">PROJEKT</p>
      <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${COLORS.mirage};">[${data.projectNumber}] ${data.projectTitle}</p>
      ${data.submittedByName ? `
        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZGŁOSIŁ</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: ${COLORS.shark};">${data.submittedByName}</p>
      ` : ''}
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZMIANA STATUSU</p>
      <p style="margin: 0;">
        <span style="color: ${COLORS.gullGray}; text-decoration: line-through;">${data.oldStatus}</span>
        <span style="color: ${COLORS.gullGray}; margin: 0 8px;">→</span>
        <strong style="color: ${COLORS.toryBlue};">${data.newStatus}</strong>
      </p>
    `)}

    ${filesSection}

    <div style="text-align: center; margin: 28px 0;">
      ${getButton('Zobacz projekt', projectUrl)}
    </div>
  `)

  const filesText = data.files && data.files.length > 0
    ? `\nPLIKI DO POBRANIA:\n${data.files.map(f => `- ${f.filename}${f.size ? ` (${formatFileSizeForEmail(f.size)})` : ''}\n  ${f.url}`).join('\n')}\n`
    : ''

  const text = `
ZMIANA STATUSU PROJEKTU
${data.projectNumber}

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Informujemy o zmianie statusu Twojego projektu.

Projekt: [${data.projectNumber}] ${data.projectTitle}
${data.submittedByName ? `Zgłosił: ${data.submittedByName}` : ''}
Status: ${data.oldStatus} → ${data.newStatus}
${filesText}
Link do projektu: ${projectUrl}

---
GraphFlow - System zarządzania projektami graficznymi
${APP_URL}
  `.trim()

  return { subject, html, text }
}

function formatFileSizeForEmail(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function projectCompletedEmail(
  data: ProjectEmailData & { oldStatus: string; files: ProjectFileLink[] }
): { subject: string; html: string; text: string } {
  const projectUrl = `${APP_URL}/panel/projects/${data.projectId}`
  const subject = `[${data.projectNumber}] Projekt zakończony - pliki do pobrania`

  const filesSection = data.files.length > 0 ? `
    <div style="margin: 24px 0;">
      <p style="margin: 0 0 16px 0; font-size: 13px; color: ${COLORS.gullGray}; text-transform: uppercase;">PLIKI DO POBRANIA (${data.files.length})</p>
      <div style="background: ${COLORS.athensGray}; border-radius: 8px; overflow: hidden;">
        ${data.files.map((file, index) => `
          <div style="padding: 12px 16px; ${index > 0 ? `border-top: 1px solid ${COLORS.white};` : ''} display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1; min-width: 0;">
              <p style="margin: 0; font-size: 14px; color: ${COLORS.shark}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.filename}</p>
              ${file.size ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: ${COLORS.gullGray};">${formatFileSizeForEmail(file.size)}</p>` : ''}
            </div>
            <a href="${file.url}" style="margin-left: 16px; padding: 8px 16px; background: ${COLORS.toryBlue}; color: ${COLORS.white}; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500; white-space: nowrap;">Pobierz</a>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''

  const html = getBaseTemplate(`
    <h1 style="color: ${COLORS.mirage}; font-size: 24px; margin: 0 0 8px 0;">Projekt zakończony!</h1>
    <p style="color: ${COLORS.gullGray}; font-size: 14px; margin: 0 0 24px 0;">Twój projekt został ukończony i jest gotowy do odbioru</p>

    ${data.recipientName ? `<p style="margin: 0 0 16px 0;">Cześć <strong>${data.recipientName}</strong>,</p>` : ''}
    <p style="margin: 0 0 20px 0;">Z przyjemnością informujemy, że Twój projekt został zakończony. Poniżej znajdziesz linki do pobrania wszystkich plików projektu.</p>

    ${getInfoBox(`
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">PROJEKT</p>
      <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${COLORS.mirage};">[${data.projectNumber}] ${data.projectTitle}</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">STATUS</p>
      <p style="margin: 0;">
        <span style="display: inline-block; padding: 4px 12px; background: #10b981; color: white; border-radius: 9999px; font-size: 13px; font-weight: 500;">Zakończony</span>
      </p>
    `, '#10b981')}

    ${filesSection}

    <div style="text-align: center; margin: 28px 0;">
      ${getButton('Zobacz projekt', projectUrl, '#10b981')}
    </div>

    <p style="color: ${COLORS.gullGray}; font-size: 13px; margin: 24px 0 0 0;">
      Dziękujemy za współpracę! Jeśli masz jakiekolwiek pytania lub potrzebujesz zmian, skontaktuj się z nami.
    </p>
  `)

  const filesText = data.files.length > 0
    ? `\nPLIKI DO POBRANIA:\n${data.files.map(f => `- ${f.filename}${f.size ? ` (${formatFileSizeForEmail(f.size)})` : ''}\n  ${f.url}`).join('\n')}\n`
    : ''

  const text = `
PROJEKT ZAKOŃCZONY!
${data.projectNumber}

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Z przyjemnością informujemy, że Twój projekt został zakończony.

Projekt: [${data.projectNumber}] ${data.projectTitle}
Status: Zakończony
${filesText}
Link do projektu: ${projectUrl}

Dziękujemy za współpracę!

---
GraphFlow - System zarządzania projektami graficznymi
${APP_URL}
  `.trim()

  return { subject, html, text }
}

export function newProjectRequestEmail(
  data: ProjectEmailData & { clientName: string; createdByName: string; description?: string }
): { subject: string; html: string; text: string } {
  const projectUrl = `${APP_URL}/panel/projects/${data.projectId}`
  const subject = `[${data.projectNumber}] Nowe zgłoszenie projektu od ${data.clientName}`

  const html = getBaseTemplate(`
    <h1 style="color: ${COLORS.mirage}; font-size: 24px; margin: 0 0 8px 0;">Nowe zgłoszenie projektu</h1>
    <p style="color: ${COLORS.gullGray}; font-size: 14px; margin: 0 0 24px 0;">Klient zgłosił nowy projekt do realizacji</p>

    ${data.recipientName ? `<p style="margin: 0 0 16px 0;">Cześć <strong>${data.recipientName}</strong>,</p>` : ''}
    <p style="margin: 0 0 20px 0;">Otrzymaliśmy nowe zgłoszenie projektu wymagające Twojej akceptacji.</p>

    ${getInfoBox(`
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">NUMER PROJEKTU</p>
      <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${COLORS.mirage};">${data.projectNumber}</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">TYTUŁ</p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.shark};">${data.projectTitle}</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">KLIENT</p>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: ${COLORS.shark};">${data.clientName}</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">ZGŁOSIŁ</p>
      <p style="margin: 0${data.description ? ' 0 16px 0' : ''}; font-size: 14px; color: ${COLORS.shark}; font-weight: 600;">${data.createdByName}</p>
      ${data.description ? `
        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">OPIS</p>
        <p style="margin: 0; font-size: 14px; color: ${COLORS.shark}; white-space: pre-wrap;">${data.description}</p>
      ` : ''}
    `, '#f59e0b')}

    <div style="text-align: center; margin: 28px 0;">
      ${getButton('Przejrzyj i zaakceptuj', projectUrl, '#f59e0b')}
    </div>
  `)

  const text = `
NOWE ZGŁOSZENIE PROJEKTU
${data.projectNumber}

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Otrzymaliśmy nowe zgłoszenie projektu wymagające Twojej akceptacji.

Projekt: [${data.projectNumber}] ${data.projectTitle}
Klient: ${data.clientName}
Zgłosił: ${data.createdByName}
${data.description ? `Opis: ${data.description}` : ''}

Link do projektu: ${projectUrl}

---
GraphFlow - System zarządzania projektami graficznymi
${APP_URL}
  `.trim()

  return { subject, html, text }
}

// ============================================
// AUTH EMAILS
// ============================================

export function passwordResetEmail(data: {
  recipientName?: string
  resetUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Reset hasła - GraphFlow'

  const html = getBaseTemplate(`
    <h1 style="color: ${COLORS.mirage}; font-size: 24px; margin: 0 0 8px 0;">Reset hasła</h1>
    <p style="color: ${COLORS.gullGray}; font-size: 14px; margin: 0 0 24px 0;">Otrzymaliśmy prośbę o reset hasła</p>

    ${data.recipientName ? `<p style="margin: 0 0 16px 0;">Cześć <strong>${data.recipientName}</strong>,</p>` : ''}
    <p style="margin: 0 0 20px 0;">Otrzymaliśmy prośbę o reset hasła do Twojego konta w systemie GraphFlow. Kliknij poniższy przycisk, aby ustawić nowe hasło.</p>

    <div style="text-align: center; margin: 28px 0;">
      ${getButton('Zresetuj hasło', data.resetUrl)}
    </div>

    <div style="background: ${COLORS.athensGray}; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.gullGray};">
        <strong>Ważne:</strong> Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość - Twoje konto jest bezpieczne.
      </p>
    </div>
  `)

  const text = `
RESET HASŁA - GRAPHFLOW

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Otrzymaliśmy prośbę o reset hasła do Twojego konta w systemie GraphFlow.

Kliknij poniższy link, aby zresetować hasło:
${data.resetUrl}

Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.

---
GraphFlow - System zarządzania projektami graficznymi
${APP_URL}
  `.trim()

  return { subject, html, text }
}

export function welcomeEmail(data: {
  recipientName: string
  email: string
  temporaryPassword?: string
  loginUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Witamy w GraphFlow!'

  const html = getBaseTemplate(`
    <h1 style="color: ${COLORS.mirage}; font-size: 24px; margin: 0 0 8px 0;">Witamy w GraphFlow!</h1>
    <p style="color: ${COLORS.gullGray}; font-size: 14px; margin: 0 0 24px 0;">Twoje konto zostało utworzone</p>

    <p style="margin: 0 0 16px 0;">Cześć <strong>${data.recipientName}</strong>,</p>
    <p style="margin: 0 0 20px 0;">Twoje konto w systemie GraphFlow zostało pomyślnie utworzone. Możesz teraz zalogować się i rozpocząć współpracę.</p>

    ${getInfoBox(`
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">EMAIL</p>
      <p style="margin: 0${data.temporaryPassword ? ' 0 16px 0' : ''}; font-size: 16px; color: ${COLORS.shark};">${data.email}</p>
      ${data.temporaryPassword ? `
        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.gullGray};">TYMCZASOWE HASŁO</p>
        <p style="margin: 0; font-size: 16px; font-family: monospace; color: ${COLORS.shark}; background: ${COLORS.white}; padding: 8px 12px; border-radius: 4px; display: inline-block;">${data.temporaryPassword}</p>
      ` : ''}
    `)}

    ${data.temporaryPassword ? `
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 12px 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #dc2626;">
          <strong>Ważne:</strong> Zalecamy zmianę hasła po pierwszym logowaniu.
        </p>
      </div>
    ` : ''}

    <div style="text-align: center; margin: 28px 0;">
      ${getButton('Zaloguj się', data.loginUrl)}
    </div>
  `)

  const text = `
WITAMY W GRAPHFLOW!

Cześć ${data.recipientName},

Twoje konto w systemie GraphFlow zostało pomyślnie utworzone.

Email: ${data.email}
${data.temporaryPassword ? `Tymczasowe hasło: ${data.temporaryPassword}` : ''}

${data.temporaryPassword ? 'WAŻNE: Zalecamy zmianę hasła po pierwszym logowaniu.' : ''}

Zaloguj się: ${data.loginUrl}

---
GraphFlow - System zarządzania projektami graficznymi
${APP_URL}
  `.trim()

  return { subject, html, text }
}
