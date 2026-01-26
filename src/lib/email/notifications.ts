import { prisma } from '../db'
import { sendEmail } from './smtp'
import { generateReplyToken, generateReplyToAddress } from './reply-token'
import {
  ticketCreatedEmail,
  ticketStatusChangedEmail,
  ticketNewCommentEmail,
  ticketDeadlineReminderEmail,
  projectStatusChangedEmail,
  projectCompletedEmail,
  newProjectRequestEmail,
  ProjectFileLink,
} from './templates'
import { getDropboxClient } from '../dropbox'
import type { Ticket, Project, Comment, User, ClientAccount, ProjectFile } from '@prisma/client'

/**
 * Wysyła powiadomienie o utworzeniu ticketa do klienta
 */
export async function notifyTicketCreated(
  ticket: Ticket & { createdBy: User }
): Promise<void> {
  // Pobierz użytkowników klienta (bez twórcy)
  const clientUsers = await prisma.user.findMany({
    where: {
      clientAccountId: ticket.clientAccountId,
      isActive: true,
      id: { not: ticket.createdById },
    },
  })

  const replyToAddress = generateReplyToAddress(ticket.number, ticket.replyToken)

  for (const user of clientUsers) {
    const emailData = ticketCreatedEmail({
      ticketNumber: ticket.number,
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      replyToAddress,
      recipientName: user.name,
      description: ticket.description || undefined,
    })

    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: replyToAddress,
      ticketId: ticket.id,
    })
  }
}

/**
 * Wysyła powiadomienie o zmianie statusu ticketa
 */
export async function notifyTicketStatusChanged(
  ticket: Ticket,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  const clientUsers = await prisma.user.findMany({
    where: {
      clientAccountId: ticket.clientAccountId,
      isActive: true,
    },
  })

  const replyToAddress = generateReplyToAddress(ticket.number, ticket.replyToken)

  for (const user of clientUsers) {
    const emailData = ticketStatusChangedEmail({
      ticketNumber: ticket.number,
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      replyToAddress,
      recipientName: user.name,
      oldStatus,
      newStatus,
    })

    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: replyToAddress,
      ticketId: ticket.id,
    })
  }
}

/**
 * Wysyła powiadomienie o nowym komentarzu
 */
export async function notifyTicketNewComment(
  ticket: Ticket,
  comment: Comment & { author: User },
  notifyAdmin: boolean = false
): Promise<void> {
  // Pobierz użytkowników do powiadomienia
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        // Użytkownicy klienta (poza autorem)
        {
          clientAccountId: ticket.clientAccountId,
          id: { not: comment.authorId },
        },
        // Admin (jeśli notifyAdmin i komentarz nie jest od admina)
        ...(notifyAdmin ? [{ role: 'ADMIN' as const, id: { not: comment.authorId } }] : []),
      ],
    },
  })

  const replyToAddress = generateReplyToAddress(ticket.number, ticket.replyToken)

  for (const user of users) {
    const emailData = ticketNewCommentEmail({
      ticketNumber: ticket.number,
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      replyToAddress,
      recipientName: user.name,
      commentAuthor: comment.author.name,
      commentContent: comment.content,
    })

    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: replyToAddress,
      ticketId: ticket.id,
    })
  }
}

/**
 * Wysyła przypomnienia o zbliżających się deadline'ach
 */
export async function sendDeadlineReminders(): Promise<void> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Znajdź tickety z deadline w ciągu 48h
  const tickets = await prisma.ticket.findMany({
    where: {
      deadline: {
        gte: now,
        lte: in48h,
      },
      status: {
        notIn: ['RESOLVED', 'CLOSED'],
      },
    },
    include: {
      clientAccount: {
        include: {
          users: {
            where: { isActive: true },
          },
        },
      },
    },
  })

  for (const ticket of tickets) {
    const hoursLeft = Math.round(
      (ticket.deadline!.getTime() - now.getTime()) / (60 * 60 * 1000)
    )

    // Sprawdź czy wysłaliśmy już powiadomienie
    const alreadySent = await prisma.emailLog.findFirst({
      where: {
        ticketId: ticket.id,
        subject: { contains: 'Przypomnienie o terminie' },
        sentAt: {
          gte: new Date(now.getTime() - 12 * 60 * 60 * 1000), // W ciągu ostatnich 12h
        },
      },
    })

    if (alreadySent) continue

    const replyToAddress = generateReplyToAddress(ticket.number, ticket.replyToken)

    for (const user of ticket.clientAccount.users) {
      const emailData = ticketDeadlineReminderEmail({
        ticketNumber: ticket.number,
        ticketTitle: ticket.title,
        ticketId: ticket.id,
        replyToAddress,
        recipientName: user.name,
        deadline: ticket.deadline!.toLocaleString('pl-PL'),
        hoursLeft,
      })

      await sendEmail({
        to: user.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        replyTo: replyToAddress,
        ticketId: ticket.id,
      })
    }
  }
}

/**
 * Generuje linki do pobrania dla plików projektu
 */
async function generateFileLinks(projectId: string): Promise<ProjectFileLink[]> {
  const files = await prisma.projectFile.findMany({
    where: { projectId },
  })

  if (files.length === 0) return []

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://graphflow.eu'
  const fileLinks: ProjectFileLink[] = []
  const dbx = await getDropboxClient()

  for (const file of files) {
    let url: string

    if (file.storageType === 'dropbox' && file.dropboxPath && dbx) {
      // Generate Dropbox shared link
      try {
        // Try to get existing shared link or create new one
        let sharedLink: string
        try {
          const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
            path: file.dropboxPath,
            settings: {
              requested_visibility: { '.tag': 'public' },
            },
          })
          sharedLink = linkResponse.result.url
        } catch (linkError: any) {
          // If link already exists, get existing link
          if (linkError?.error?.error?.['.tag'] === 'shared_link_already_exists') {
            const existingLinks = await dbx.sharingListSharedLinks({
              path: file.dropboxPath,
              direct_only: true,
            })
            if (existingLinks.result.links.length > 0) {
              sharedLink = existingLinks.result.links[0].url
            } else {
              // Fallback to local download
              sharedLink = `${APP_URL}/api/projects/${projectId}/files/${file.id}/download`
            }
          } else {
            // Fallback to local download
            sharedLink = `${APP_URL}/api/projects/${projectId}/files/${file.id}/download`
          }
        }
        url = sharedLink
      } catch (error) {
        console.error('Error generating Dropbox link for file:', file.filename, error)
        // Fallback to local download
        url = `${APP_URL}/api/projects/${projectId}/files/${file.id}/download`
      }
    } else {
      // Local file - use download API
      url = `${APP_URL}/api/projects/${projectId}/files/${file.id}/download`
    }

    fileLinks.push({
      filename: file.filename,
      url,
      size: file.size,
    })
  }

  return fileLinks
}

/**
 * Wysyła powiadomienie o zmianie statusu projektu
 * Powiadomienia idą tylko do kontaktów przypisanych do projektu
 */
export async function notifyProjectStatusChanged(
  project: Project & { status: { name: string; slug?: string }; contacts?: User[] },
  oldStatusName: string
): Promise<void> {
  // Pobierz kontakty projektu (jeśli nie zostały przekazane)
  let contacts = project.contacts
  if (!contacts) {
    // TODO: Remove 'as any' after running migration and regenerating Prisma client
    // Migration file: sql/add_project_contacts.sql
    const projectWithContacts = await (prisma.project.findUnique as any)({
      where: { id: project.id },
      include: { contacts: { where: { isActive: true } } },
    })
    contacts = projectWithContacts?.contacts || []
  }

  // Jeśli brak kontaktów, użyj twórcy projektu
  if (contacts.length === 0 && project.createdById) {
    const creator = await prisma.user.findUnique({
      where: { id: project.createdById, isActive: true },
    })
    if (creator) {
      contacts = [creator]
    }
  }

  // Jeśli nadal brak kontaktów, nie wysyłaj
  if (contacts.length === 0) {
    console.log(`No contacts for project ${project.number}, skipping notification`)
    return
  }

  // Check status type
  const statusSlug = (project.status as any).slug
  const isCompleted = statusSlug === 'zakonczone' || project.status.name.toLowerCase().includes('zakończon')
  const isForApproval = statusSlug === 'do-akceptacji' || project.status.name.toLowerCase().includes('do akceptacji')

  // Generate file links for completed or approval statuses
  let fileLinks: ProjectFileLink[] = []
  if (isCompleted || isForApproval) {
    fileLinks = await generateFileLinks(project.id)
  }

  // Wyślij do kontaktów projektu
  for (const contact of contacts) {
    let emailData

    if (isCompleted) {
      // Use completed project email template with file links
      emailData = projectCompletedEmail({
        projectNumber: project.number,
        projectTitle: project.title,
        projectId: project.id,
        recipientName: contact.name,
        oldStatus: oldStatusName,
        files: fileLinks,
      })
    } else {
      // Use regular status change email (with file links for approval)
      emailData = projectStatusChangedEmail({
        projectNumber: project.number,
        projectTitle: project.title,
        projectId: project.id,
        recipientName: contact.name,
        oldStatus: oldStatusName,
        newStatus: project.status.name,
        files: isForApproval ? fileLinks : undefined,
      })
    }

    await sendEmail({
      to: contact.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      projectId: project.id,
      recipientName: contact.name,
    })
  }

  // Wyślij do dodatkowego emaila jeśli jest ustawiony
  if ((project as any).notifyEmail) {
    let emailData

    if (isCompleted) {
      emailData = projectCompletedEmail({
        projectNumber: project.number,
        projectTitle: project.title,
        projectId: project.id,
        oldStatus: oldStatusName,
        files: fileLinks,
      })
    } else {
      emailData = projectStatusChangedEmail({
        projectNumber: project.number,
        projectTitle: project.title,
        projectId: project.id,
        oldStatus: oldStatusName,
        newStatus: project.status.name,
        files: isForApproval ? fileLinks : undefined,
      })
    }

    await sendEmail({
      to: (project as any).notifyEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      projectId: project.id,
    })
  }
}

/**
 * Wysyła powiadomienie do adminów o nowym zgłoszeniu projektu
 */
export async function notifyNewProjectRequest(
  project: Project & { clientAccount: ClientAccount; createdBy: User | null }
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      isActive: true,
    },
  })

  for (const admin of admins) {
    const emailData = newProjectRequestEmail({
      projectNumber: project.number,
      projectTitle: project.title,
      projectId: project.id,
      recipientName: admin.name,
      clientName: project.clientAccount.name,
      createdByName: project.createdBy?.name || 'Nieznany',
      description: project.description || undefined,
    })

    await sendEmail({
      to: admin.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      projectId: project.id,
    })
  }
}
