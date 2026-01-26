import { PrismaClient, UserRole, TicketPriority, TicketStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

function generateReplyToken(ticketNumber: string): string {
  const secret = process.env.EMAIL_REPLY_SECRET || 'dev-secret-change-me'
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(ticketNumber)
  return hmac.digest('hex').substring(0, 16)
}

async function main() {
  console.log('🌱 Rozpoczynam seedowanie bazy danych...\n')

  // ============================================
  // STATUSY PROJEKTÓW
  // ============================================
  console.log('📊 Tworzę statusy projektów...')

  const statuses = await Promise.all([
    prisma.projectStatus.upsert({
      where: { slug: 'nowe' },
      update: {},
      create: { name: 'Nowe', slug: 'nowe', color: '#3b82f6', order: 0, isDefault: true },
    }),
    prisma.projectStatus.upsert({
      where: { slug: 'w-trakcie' },
      update: {},
      create: { name: 'W trakcie', slug: 'w-trakcie', color: '#f59e0b', order: 1 },
    }),
    prisma.projectStatus.upsert({
      where: { slug: 'do-akceptacji' },
      update: {},
      create: { name: 'Do akceptacji', slug: 'do-akceptacji', color: '#8b5cf6', order: 2 },
    }),
    prisma.projectStatus.upsert({
      where: { slug: 'poprawki' },
      update: {},
      create: { name: 'Poprawki', slug: 'poprawki', color: '#ef4444', order: 3 },
    }),
    prisma.projectStatus.upsert({
      where: { slug: 'zakonczone' },
      update: {},
      create: { name: 'Zakończone', slug: 'zakonczone', color: '#10b981', order: 4 },
    }),
    prisma.projectStatus.upsert({
      where: { slug: 'wstrzymane' },
      update: {},
      create: { name: 'Wstrzymane', slug: 'wstrzymane', color: '#6b7280', order: 5 },
    }),
  ])

  console.log(`   ✓ Utworzono ${statuses.length} statusów\n`)

  // ============================================
  // TAGI PROJEKTÓW
  // ============================================
  console.log('🏷️  Tworzę tagi projektów...')

  const tags = await Promise.all([
    prisma.projectTag.upsert({
      where: { name: 'Logo' },
      update: {},
      create: { name: 'Logo', color: '#ef4444' },
    }),
    prisma.projectTag.upsert({
      where: { name: 'Strona www' },
      update: {},
      create: { name: 'Strona www', color: '#3b82f6' },
    }),
    prisma.projectTag.upsert({
      where: { name: 'Social Media' },
      update: {},
      create: { name: 'Social Media', color: '#8b5cf6' },
    }),
    prisma.projectTag.upsert({
      where: { name: 'Druk' },
      update: {},
      create: { name: 'Druk', color: '#f59e0b' },
    }),
    prisma.projectTag.upsert({
      where: { name: 'Branding' },
      update: {},
      create: { name: 'Branding', color: '#10b981' },
    }),
    prisma.projectTag.upsert({
      where: { name: 'Pilne' },
      update: {},
      create: { name: 'Pilne', color: '#dc2626' },
    }),
  ])

  console.log(`   ✓ Utworzono ${tags.length} tagów\n`)

  // ============================================
  // SZABLON TIMELINE
  // ============================================
  console.log('📅 Tworzę szablon timeline...')

  const template = await prisma.timelineTemplate.upsert({
    where: { id: 'default-template' },
    update: {},
    create: {
      id: 'default-template',
      name: 'Standardowy',
      isDefault: true,
      stages: {
        create: [
          { name: 'Brief', order: 0 },
          { name: 'Koncepcja', order: 1 },
          { name: 'Wersja 1', order: 2 },
          { name: 'Poprawki', order: 3 },
          { name: 'Final', order: 4 },
        ],
      },
    },
  })

  console.log(`   ✓ Utworzono szablon "${template.name}"\n`)

  // ============================================
  // ADMIN
  // ============================================
  console.log('👤 Tworzę konto administratora...')

  const adminPassword = await hashPassword('dev')
  const admin = await prisma.user.upsert({
    where: { email: 'marek@graphflow.eu' },
    update: {},
    create: {
      email: 'marek@graphflow.eu',
      password: adminPassword,
      name: 'Marek',
      role: UserRole.ADMIN,
      isActive: true,
    },
  })

  console.log(`   ✓ Admin: ${admin.email} (hasło: dev)\n`)

  // ============================================
  // KLIENT DEMO
  // ============================================
  console.log('🏢 Tworzę klienta demo...')

  const client = await prisma.clientAccount.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      email: 'kontakt@acme.pl',
      phone: '+48 123 456 789',
      address: 'ul. Przykładowa 1\n00-001 Warszawa',
      notes: 'Klient demo - do testów',
      emailDomains: 'acme.pl,example.com',
    },
  })

  console.log(`   ✓ Klient: ${client.name}\n`)

  // ============================================
  // UŻYTKOWNICY KLIENTA
  // ============================================
  console.log('👥 Tworzę użytkowników klienta...')

  const clientPassword = await hashPassword('klient123')

  const clientUser1 = await prisma.user.upsert({
    where: { email: 'jan.kowalski@example.com' },
    update: {},
    create: {
      email: 'jan.kowalski@example.com',
      password: clientPassword,
      name: 'Jan Kowalski',
      role: UserRole.CLIENT_USER,
      clientAccountId: client.id,
      isActive: true,
    },
  })

  const clientUser2 = await prisma.user.upsert({
    where: { email: 'anna.nowak@example.com' },
    update: {},
    create: {
      email: 'anna.nowak@example.com',
      password: clientPassword,
      name: 'Anna Nowak',
      role: UserRole.CLIENT_USER,
      clientAccountId: client.id,
      isActive: true,
    },
  })

  console.log(`   ✓ ${clientUser1.email} (hasło: klient123)`)
  console.log(`   ✓ ${clientUser2.email} (hasło: klient123)\n`)

  // ============================================
  // PROJEKTY
  // ============================================
  console.log('📁 Tworzę projekty...')

  const project1 = await prisma.project.upsert({
    where: { number: 'GF-001' },
    update: {},
    create: {
      number: 'GF-001',
      title: 'Redesign strony głównej',
      description: 'Kompleksowy redesign strony głównej wraz z nowymi animacjami i responsywnym layoutem.',
      clientAccountId: client.id,
      statusId: statuses[1].id, // W trakcie
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Za 14 dni
      localPath: '/Projekty/AcmeCorp/Redesign-www',
      dropboxPath: '/Dropbox/Projekty/AcmeCorp/Redesign',
      tags: {
        connect: [{ id: tags[1].id }, { id: tags[4].id }], // Strona www, Branding
      },
      timelineStages: {
        create: [
          { name: 'Brief', order: 0, isCompleted: true, actualDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { name: 'Koncepcja', order: 1, isCurrent: true, plannedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
          { name: 'Wersja 1', order: 2, plannedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          { name: 'Poprawki', order: 3, plannedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
          { name: 'Final', order: 4, plannedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        ],
      },
      statusHistory: {
        create: [
          { toStatus: 'Nowe', changedBy: admin.id },
          { fromStatus: 'Nowe', toStatus: 'W trakcie', changedBy: admin.id },
        ],
      },
    },
  })

  const project2 = await prisma.project.upsert({
    where: { number: 'GF-002' },
    update: {},
    create: {
      number: 'GF-002',
      title: 'Nowe logo firmy',
      description: 'Projekt nowego logo wraz z brand guidelines.',
      clientAccountId: client.id,
      statusId: statuses[2].id, // Do akceptacji
      localPath: '/Projekty/AcmeCorp/Logo-2024',
      tags: {
        connect: [{ id: tags[0].id }, { id: tags[4].id }], // Logo, Branding
      },
      timelineStages: {
        create: [
          { name: 'Brief', order: 0, isCompleted: true },
          { name: 'Koncepcja', order: 1, isCompleted: true },
          { name: 'Wersja 1', order: 2, isCompleted: true },
          { name: 'Poprawki', order: 3, isCurrent: true },
          { name: 'Final', order: 4 },
        ],
      },
    },
  })

  console.log(`   ✓ ${project1.number}: ${project1.title}`)
  console.log(`   ✓ ${project2.number}: ${project2.title}\n`)

  // ============================================
  // TICKETY
  // ============================================
  console.log('🎫 Tworzę tickety...')

  const ticket1 = await prisma.ticket.upsert({
    where: { number: 'TCK-000001' },
    update: {},
    create: {
      number: 'TCK-000001',
      title: 'Zmiana kolorystyki hero section',
      description: 'Proszę o zmianę kolorystyki sekcji hero na stronie głównej. Preferowane kolory: odcienie niebieskiego zamiast obecnych zielonych.',
      priority: TicketPriority.NORMAL,
      status: TicketStatus.IN_PROGRESS,
      clientAccountId: client.id,
      createdById: clientUser1.id,
      projectId: project1.id,
      replyToken: generateReplyToken('TCK-000001'),
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  })

  const ticket2 = await prisma.ticket.upsert({
    where: { number: 'TCK-000002' },
    update: {},
    create: {
      number: 'TCK-000002',
      title: 'Dodanie nowej podstrony produktowej',
      description: 'Potrzebujemy nowej podstrony dla produktu X zgodnie z briefem wysłanym w załączniku.',
      priority: TicketPriority.HIGH,
      status: TicketStatus.NEW,
      clientAccountId: client.id,
      createdById: clientUser2.id,
      projectId: project1.id,
      replyToken: generateReplyToken('TCK-000002'),
    },
  })

  const ticket3 = await prisma.ticket.upsert({
    where: { number: 'TCK-000003' },
    update: {},
    create: {
      number: 'TCK-000003',
      title: 'Poprawki w projekcie logo',
      description: 'Wersja 2 logo wymaga drobnych poprawek:\n- Grubość linii w symbolu\n- Kolor tekstu do zmiany',
      priority: TicketPriority.NORMAL,
      status: TicketStatus.WAITING_FOR_CLIENT,
      clientAccountId: client.id,
      createdById: clientUser1.id,
      projectId: project2.id,
      replyToken: generateReplyToken('TCK-000003'),
    },
  })

  const ticket4 = await prisma.ticket.upsert({
    where: { number: 'TCK-000004' },
    update: {},
    create: {
      number: 'TCK-000004',
      title: 'Materiały do social media',
      description: 'Potrzebujemy zestawu grafik do kampanii na Facebooku i Instagramie.',
      priority: TicketPriority.URGENT,
      status: TicketStatus.NEW,
      clientAccountId: client.id,
      createdById: clientUser2.id,
      replyToken: generateReplyToken('TCK-000004'),
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  })

  console.log(`   ✓ ${ticket1.number}: ${ticket1.title}`)
  console.log(`   ✓ ${ticket2.number}: ${ticket2.title}`)
  console.log(`   ✓ ${ticket3.number}: ${ticket3.title}`)
  console.log(`   ✓ ${ticket4.number}: ${ticket4.title}\n`)

  // ============================================
  // KOMENTARZE
  // ============================================
  console.log('💬 Tworzę komentarze...')

  await prisma.comment.create({
    data: {
      content: 'Zaczynam prace nad zmianą kolorystyki. Prześlę propozycje do końca dnia.',
      visibility: 'PUBLIC',
      authorId: admin.id,
      ticketId: ticket1.id,
    },
  })

  await prisma.comment.create({
    data: {
      content: 'Super, czekam na propozycje!',
      visibility: 'PUBLIC',
      authorId: clientUser1.id,
      ticketId: ticket1.id,
    },
  })

  await prisma.comment.create({
    data: {
      content: 'Klient lubi ciemniejsze odcienie. Sprawdzić paletę z poprzedniego projektu.',
      visibility: 'INTERNAL',
      authorId: admin.id,
      ticketId: ticket1.id,
    },
  })

  console.log(`   ✓ Utworzono przykładowe komentarze\n`)

  // ============================================
  // NOTATKI PRYWATNE
  // ============================================
  console.log('📝 Tworzę notatki prywatne...')

  await prisma.note.create({
    data: {
      content: 'Stawka: 150 zł/h\nSzacowany czas: 20h\nBudżet: 3000 zł',
      projectId: project1.id,
    },
  })

  console.log(`   ✓ Utworzono przykładowe notatki\n`)

  // ============================================
  // USTAWIENIA POWIADOMIEŃ
  // ============================================
  console.log('⚙️  Tworzę ustawienia powiadomień...')

  await prisma.notificationSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      statusChangeEnabled: true,
      newCommentEnabled: true,
      deadlineReminderEnabled: true,
      deadlineReminder48h: true,
      deadlineReminder24h: true,
    },
  })

  console.log(`   ✓ Ustawienia domyślne utworzone\n`)

  console.log('✅ Seedowanie zakończone pomyślnie!\n')
  console.log('📋 Podsumowanie:')
  console.log('   Admin: marek@graphflow.eu / dev')
  console.log('   Klient: jan.kowalski@example.com / klient123')
  console.log('   Klient: anna.nowak@example.com / klient123')
  console.log('\n⚠️  WAŻNE: Zmień hasła przed wdrożeniem produkcyjnym!')
}

main()
  .catch((e) => {
    console.error('❌ Błąd seedowania:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
