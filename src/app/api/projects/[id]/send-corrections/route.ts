import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email/smtp'
import { projectCorrectionsEmail, ProjectFileLink, CorrectionItem } from '@/lib/email/templates'
import { getDropboxClient } from '@/lib/dropbox'

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
      try {
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
          if (linkError?.error?.error?.['.tag'] === 'shared_link_already_exists') {
            const existingLinks = await dbx.sharingListSharedLinks({
              path: file.dropboxPath,
              direct_only: true,
            })
            if (existingLinks.result.links.length > 0) {
              sharedLink = existingLinks.result.links[0].url
            } else {
              sharedLink = `${APP_URL}/api/projects/${projectId}/files/${file.id}/download`
            }
          } else {
            sharedLink = `${APP_URL}/api/projects/${projectId}/files/${file.id}/download`
          }
        }
        url = sharedLink
      } catch (error) {
        console.error('Error generating Dropbox link for file:', file.filename, error)
        url = `${APP_URL}/api/projects/${projectId}/files/${file.id}/download`
      }
    } else {
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const { corrections } = await request.json()

    // Validate corrections
    const correctionsList: string[] = Array.isArray(corrections)
      ? corrections.filter((c: unknown) => typeof c === 'string' && c.trim())
      : []

    if (correctionsList.length === 0) {
      return NextResponse.json({ error: 'At least one correction is required' }, { status: 400 })
    }

    // Get project with contacts
    const project = await (prisma.project.findUnique as any)({
      where: { id },
      include: {
        status: true,
        contacts: {
          where: { isActive: true },
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get contacts
    let contacts: Array<{ id: string; name: string; email: string }> = project.contacts || []
    if (contacts.length === 0 && project.createdBy) {
      contacts = [project.createdBy]
    }

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts to send email to' }, { status: 400 })
    }

    // Generate file links
    const fileLinks = await generateFileLinks(project.id)

    // Build corrections items
    const correctionItems: CorrectionItem[] = correctionsList.map((title, index) => ({
      number: `${index + 1}`,
      title: title.trim(),
    }))

    // Save corrections to database
    const now = new Date()
    await Promise.all(
      correctionsList.map((content: string) =>
        (prisma.projectCorrection as any).create({
          data: {
            projectId: project.id,
            content: content.trim(),
            updatedAt: now,
          },
        })
      )
    )

    // Send emails to contacts
    let sentCount = 0
    for (const contact of contacts) {
      const emailData = projectCorrectionsEmail({
        projectNumber: project.number,
        projectTitle: project.title,
        projectId: project.id,
        recipientName: contact.name,
        oldStatus: project.status.name,
        corrections: correctionItems,
        files: fileLinks,
      })

      try {
        await sendEmail({
          to: contact.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          projectId: project.id,
          recipientName: contact.name,
        })
        sentCount++
      } catch (emailError) {
        console.error(`Error sending corrections email to ${contact.email}:`, emailError)
      }
    }

    // Also send to notifyEmail if set
    if ((project as any).notifyEmail) {
      const emailData = projectCorrectionsEmail({
        projectNumber: project.number,
        projectTitle: project.title,
        projectId: project.id,
        oldStatus: project.status.name,
        corrections: correctionItems,
        files: fileLinks,
      })

      try {
        await sendEmail({
          to: (project as any).notifyEmail,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          projectId: project.id,
        })
        sentCount++
      } catch (emailError) {
        console.error(`Error sending corrections email to notifyEmail:`, emailError)
      }
    }

    if (sentCount === 0) {
      return NextResponse.json({ error: 'Failed to send any emails' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Email wysłany do ${sentCount} ${sentCount === 1 ? 'odbiorcy' : 'odbiorców'}`,
      sentCount,
    })
  } catch (error) {
    console.error('Error sending corrections email:', error)
    return NextResponse.json(
      { error: 'Failed to send corrections email' },
      { status: 500 }
    )
  }
}
