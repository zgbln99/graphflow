'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { COOKIE_NAME } from '@/lib/auth'

export async function logoutAction() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (token) {
    // Usuń sesję z bazy
    await prisma.session.deleteMany({
      where: { token },
    })
  }

  // Usuń cookie
  cookieStore.delete(COOKIE_NAME)

  return { success: true }
}
