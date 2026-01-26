-- Migration: Add Project Contacts relation
-- This creates the many-to-many join table between Project and User for email notification contacts
-- Run this migration manually with: psql $DATABASE_URL -f sql/add_project_contacts.sql

-- Create the join table for Project-User many-to-many (contacts)
CREATE TABLE IF NOT EXISTS "_ProjectContacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProjectContacts_A_fkey" FOREIGN KEY ("A") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProjectContacts_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique index on the pair
CREATE UNIQUE INDEX IF NOT EXISTS "_ProjectContacts_AB_unique" ON "_ProjectContacts"("A", "B");

-- Create index on B for faster lookups
CREATE INDEX IF NOT EXISTS "_ProjectContacts_B_index" ON "_ProjectContacts"("B");

-- Add toName column to EmailLog if it doesn't exist
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "toName" TEXT;

-- After running this migration, regenerate the Prisma client:
-- npx prisma generate
