const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://graphflow.eu'

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
}

function getFooter(ticketUrl: string): string {
  return `
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      Możesz odpowiedzieć bezpośrednio na ten email lub przejść do panelu:<br />
      <a href="${ticketUrl}" style="color: #4f46e5;">${ticketUrl}</a>
    </p>
    <p style="color: #9ca3af; font-size: 11px; margin: 16px 0 0 0;">
      GraphFlow - System zarządzania projektami graficznymi
    </p>
  `
}

function getBaseTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 24px;">
        ${content}
      </div>
    </body>
    </html>
  `
}

// ============================================
// TICKET EMAILS
// ============================================

export function ticketCreatedEmail(data: TicketEmailData & { description?: string }): { subject: string; html: string; text: string } {
  const ticketUrl = `${APP_URL}/panel/tickets/${data.ticketId}`
  const subject = `GraphFlow: [${data.ticketNumber}] ${data.ticketTitle}`

  const html = getBaseTemplate(`
    <h2 style="color: #111827; margin: 0 0 16px 0;">Nowe zgłoszenie utworzone</h2>
    ${data.recipientName ? `<p>Cześć ${data.recipientName},</p>` : ''}
    <p>Twoje zgłoszenie zostało zarejestrowane w systemie.</p>

    <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Numer:</strong> ${data.ticketNumber}</p>
      <p style="margin: 0 0 8px 0;"><strong>Tytuł:</strong> ${data.ticketTitle}</p>
      ${data.description ? `<p style="margin: 0;"><strong>Opis:</strong> ${data.description}</p>` : ''}
    </div>

    <p>Powiadomimy Cię o wszelkich zmianach statusu.</p>
    ${getFooter(ticketUrl)}
  `)

  const text = `
Nowe zgłoszenie utworzone

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Twoje zgłoszenie zostało zarejestrowane w systemie.

Numer: ${data.ticketNumber}
Tytuł: ${data.ticketTitle}
${data.description ? `Opis: ${data.description}` : ''}

Powiadomimy Cię o wszelkich zmianach statusu.

---
Link do zgłoszenia: ${ticketUrl}
GraphFlow - System zarządzania projektami graficznymi
  `.trim()

  return { subject, html, text }
}

export function ticketStatusChangedEmail(
  data: TicketEmailData & { oldStatus: string; newStatus: string }
): { subject: string; html: string; text: string } {
  const ticketUrl = `${APP_URL}/panel/tickets/${data.ticketId}`
  const subject = `GraphFlow: [${data.ticketNumber}] Zmiana statusu - ${data.newStatus}`

  const html = getBaseTemplate(`
    <h2 style="color: #111827; margin: 0 0 16px 0;">Zmiana statusu zgłoszenia</h2>
    ${data.recipientName ? `<p>Cześć ${data.recipientName},</p>` : ''}
    <p>Status Twojego zgłoszenia został zmieniony.</p>

    <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Zgłoszenie:</strong> [${data.ticketNumber}] ${data.ticketTitle}</p>
      <p style="margin: 0;"><strong>Status:</strong> <span style="text-decoration: line-through; color: #9ca3af;">${data.oldStatus}</span> → <strong style="color: #059669;">${data.newStatus}</strong></p>
    </div>
    ${getFooter(ticketUrl)}
  `)

  const text = `
Zmiana statusu zgłoszenia

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Status Twojego zgłoszenia został zmieniony.

Zgłoszenie: [${data.ticketNumber}] ${data.ticketTitle}
Status: ${data.oldStatus} → ${data.newStatus}

---
Link do zgłoszenia: ${ticketUrl}
  `.trim()

  return { subject, html, text }
}

export function ticketNewCommentEmail(
  data: TicketEmailData & { commentAuthor: string; commentContent: string }
): { subject: string; html: string; text: string } {
  const ticketUrl = `${APP_URL}/panel/tickets/${data.ticketId}`
  const subject = `GraphFlow: [${data.ticketNumber}] Nowy komentarz`

  const html = getBaseTemplate(`
    <h2 style="color: #111827; margin: 0 0 16px 0;">Nowy komentarz</h2>
    ${data.recipientName ? `<p>Cześć ${data.recipientName},</p>` : ''}
    <p>Do Twojego zgłoszenia dodano nowy komentarz.</p>

    <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Zgłoszenie:</strong> [${data.ticketNumber}] ${data.ticketTitle}</p>
      <p style="margin: 0 0 8px 0;"><strong>Od:</strong> ${data.commentAuthor}</p>
      <div style="border-left: 3px solid #4f46e5; padding-left: 12px; margin-top: 12px;">
        ${data.commentContent}
      </div>
    </div>

    <p>Możesz odpowiedzieć bezpośrednio na ten email.</p>
    ${getFooter(ticketUrl)}
  `)

  const text = `
Nowy komentarz

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Do Twojego zgłoszenia dodano nowy komentarz.

Zgłoszenie: [${data.ticketNumber}] ${data.ticketTitle}
Od: ${data.commentAuthor}

${data.commentContent}

---
Możesz odpowiedzieć bezpośrednio na ten email.
Link do zgłoszenia: ${ticketUrl}
  `.trim()

  return { subject, html, text }
}

export function ticketDeadlineReminderEmail(
  data: TicketEmailData & { deadline: string; hoursLeft: number }
): { subject: string; html: string; text: string } {
  const ticketUrl = `${APP_URL}/panel/tickets/${data.ticketId}`
  const subject = `GraphFlow: [${data.ticketNumber}] Przypomnienie o terminie`

  const urgencyText = data.hoursLeft <= 24 ? 'PILNE: ' : ''

  const html = getBaseTemplate(`
    <h2 style="color: #dc2626; margin: 0 0 16px 0;">${urgencyText}Zbliża się termin</h2>
    ${data.recipientName ? `<p>Cześć ${data.recipientName},</p>` : ''}
    <p>Przypominamy o zbliżającym się terminie realizacji zgłoszenia.</p>

    <div style="background: #fef2f2; border-radius: 6px; padding: 16px; margin: 16px 0; border: 1px solid #fecaca;">
      <p style="margin: 0 0 8px 0;"><strong>Zgłoszenie:</strong> [${data.ticketNumber}] ${data.ticketTitle}</p>
      <p style="margin: 0; color: #dc2626;"><strong>Termin:</strong> ${data.deadline} (za ${data.hoursLeft}h)</p>
    </div>
    ${getFooter(ticketUrl)}
  `)

  const text = `
${urgencyText}Zbliża się termin

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Przypominamy o zbliżającym się terminie realizacji zgłoszenia.

Zgłoszenie: [${data.ticketNumber}] ${data.ticketTitle}
Termin: ${data.deadline} (za ${data.hoursLeft}h)

---
Link do zgłoszenia: ${ticketUrl}
  `.trim()

  return { subject, html, text }
}

// ============================================
// PROJECT EMAILS
// ============================================

export function projectStatusChangedEmail(
  data: ProjectEmailData & { oldStatus: string; newStatus: string }
): { subject: string; html: string; text: string } {
  const projectUrl = `${APP_URL}/panel/projects/${data.projectId}`
  const subject = `GraphFlow: [${data.projectNumber}] Zmiana statusu projektu - ${data.newStatus}`

  const html = getBaseTemplate(`
    <h2 style="color: #111827; margin: 0 0 16px 0;">Zmiana statusu projektu</h2>
    ${data.recipientName ? `<p>Cześć ${data.recipientName},</p>` : ''}
    <p>Status Twojego projektu został zmieniony.</p>

    <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Projekt:</strong> [${data.projectNumber}] ${data.projectTitle}</p>
      <p style="margin: 0;"><strong>Status:</strong> <span style="text-decoration: line-through; color: #9ca3af;">${data.oldStatus}</span> → <strong style="color: #059669;">${data.newStatus}</strong></p>
    </div>

    <p>
      <a href="${projectUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Zobacz projekt</a>
    </p>
  `)

  const text = `
Zmiana statusu projektu

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Status Twojego projektu został zmieniony.

Projekt: [${data.projectNumber}] ${data.projectTitle}
Status: ${data.oldStatus} → ${data.newStatus}

---
Link do projektu: ${projectUrl}
  `.trim()

  return { subject, html, text }
}

export function newProjectRequestEmail(
  data: ProjectEmailData & { clientName: string; createdByName: string; description?: string }
): { subject: string; html: string; text: string } {
  const projectUrl = `${APP_URL}/panel/projects/${data.projectId}`
  const subject = `GraphFlow: [${data.projectNumber}] Nowe zgłoszenie projektu od ${data.clientName}`

  const html = getBaseTemplate(`
    <h2 style="color: #f59e0b; margin: 0 0 16px 0;">Nowe zgłoszenie projektu</h2>
    ${data.recipientName ? `<p>Cześć ${data.recipientName},</p>` : ''}
    <p>Klient zgłosił nowy projekt do realizacji.</p>

    <div style="background: #fffbeb; border-radius: 6px; padding: 16px; margin: 16px 0; border: 1px solid #fcd34d;">
      <p style="margin: 0 0 8px 0;"><strong>Projekt:</strong> [${data.projectNumber}] ${data.projectTitle}</p>
      <p style="margin: 0 0 8px 0;"><strong>Klient:</strong> ${data.clientName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Zgłosił:</strong> ${data.createdByName}</p>
      ${data.description ? `<p style="margin: 0;"><strong>Opis:</strong><br/>${data.description}</p>` : ''}
    </div>

    <p>Przejrzyj zgłoszenie i zaakceptuj lub odrzuć projekt.</p>

    <p style="margin: 24px 0;">
      <a href="${projectUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Przejrzyj projekt</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #9ca3af; font-size: 11px; margin: 0;">
      GraphFlow - System zarządzania projektami graficznymi
    </p>
  `)

  const text = `
Nowe zgłoszenie projektu

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Klient zgłosił nowy projekt do realizacji.

Projekt: [${data.projectNumber}] ${data.projectTitle}
Klient: ${data.clientName}
Zgłosił: ${data.createdByName}
${data.description ? `Opis: ${data.description}` : ''}

Przejrzyj zgłoszenie i zaakceptuj lub odrzuć projekt.

---
Link do projektu: ${projectUrl}
GraphFlow - System zarządzania projektami graficznymi
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
  const subject = 'GraphFlow: Reset hasła'

  const html = getBaseTemplate(`
    <h2 style="color: #111827; margin: 0 0 16px 0;">Reset hasła</h2>
    ${data.recipientName ? `<p>Cześć ${data.recipientName},</p>` : ''}
    <p>Otrzymaliśmy prośbę o reset hasła do Twojego konta w GraphFlow.</p>

    <p style="margin: 24px 0;">
      <a href="${data.resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Zresetuj hasło</a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #9ca3af; font-size: 11px; margin: 0;">
      GraphFlow - System zarządzania projektami graficznymi
    </p>
  `)

  const text = `
Reset hasła

${data.recipientName ? `Cześć ${data.recipientName},` : ''}

Otrzymaliśmy prośbę o reset hasła do Twojego konta w GraphFlow.

Kliknij poniższy link, aby zresetować hasło:
${data.resetUrl}

Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.

---
GraphFlow - System zarządzania projektami graficznymi
  `.trim()

  return { subject, html, text }
}

export function welcomeEmail(data: {
  recipientName: string
  email: string
  temporaryPassword?: string
  loginUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'GraphFlow: Witamy w systemie!'

  const html = getBaseTemplate(`
    <h2 style="color: #111827; margin: 0 0 16px 0;">Witamy w GraphFlow!</h2>
    <p>Cześć ${data.recipientName},</p>
    <p>Twoje konto w systemie GraphFlow zostało utworzone.</p>

    <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${data.email}</p>
      ${data.temporaryPassword ? `<p style="margin: 0;"><strong>Tymczasowe hasło:</strong> ${data.temporaryPassword}</p>` : ''}
    </div>

    ${data.temporaryPassword ? '<p style="color: #dc2626;">Zalecamy zmianę hasła po pierwszym logowaniu.</p>' : ''}

    <p style="margin: 24px 0;">
      <a href="${data.loginUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Zaloguj się</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #9ca3af; font-size: 11px; margin: 0;">
      GraphFlow - System zarządzania projektami graficznymi
    </p>
  `)

  const text = `
Witamy w GraphFlow!

Cześć ${data.recipientName},

Twoje konto w systemie GraphFlow zostało utworzone.

Email: ${data.email}
${data.temporaryPassword ? `Tymczasowe hasło: ${data.temporaryPassword}` : ''}

${data.temporaryPassword ? 'Zalecamy zmianę hasła po pierwszym logowaniu.' : ''}

Zaloguj się: ${data.loginUrl}

---
GraphFlow - System zarządzania projektami graficznymi
  `.trim()

  return { subject, html, text }
}
