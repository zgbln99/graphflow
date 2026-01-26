// Run this with: node sql/run-migration.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Running migration: add_project_contacts...')

  try {
    // Create the join table for Project-User many-to-many (contacts)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_ProjectContacts" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL,
        CONSTRAINT "_ProjectContacts_A_fkey" FOREIGN KEY ("A") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "_ProjectContacts_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `)
    console.log('✓ Created _ProjectContacts table')

    // Create unique index on the pair
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "_ProjectContacts_AB_unique" ON "_ProjectContacts"("A", "B")
    `)
    console.log('✓ Created unique index')

    // Create index on B for faster lookups
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "_ProjectContacts_B_index" ON "_ProjectContacts"("B")
    `)
    console.log('✓ Created B index')

    // Add toName column to EmailLog if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "EmailLog" ADD COLUMN "toName" TEXT
      `)
      console.log('✓ Added toName column to EmailLog')
    } catch (e) {
      if (e.message?.includes('already exists')) {
        console.log('✓ toName column already exists')
      } else {
        throw e
      }
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run: npx prisma generate')
    console.log('2. Remove "as any" casts from code (search for TODO: Remove)')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
