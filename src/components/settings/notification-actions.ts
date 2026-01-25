'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function updateNotificationSettingsAction(
  id: string,
  data: {
    statusChangeEnabled: boolean
    newCommentEnabled: boolean
    deadlineReminderEnabled: boolean
    deadlineReminder48h: boolean
    deadlineReminder24h: boolean
  }
) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    await prisma.notificationSetting.update({
      where: { id },
      data,
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return { error: 'Nie udało się zapisać ustawień' }
  }
}
