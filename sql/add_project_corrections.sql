-- Migration: Add ProjectCorrection table
-- This migration adds a table for storing project corrections

CREATE TABLE IF NOT EXISTS "ProjectCorrection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCorrection_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "ProjectCorrection_projectId_idx" ON "ProjectCorrection"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectCorrection_isResolved_idx" ON "ProjectCorrection"("isResolved");

-- Add foreign key constraint
ALTER TABLE "ProjectCorrection"
ADD CONSTRAINT "ProjectCorrection_projectId_fkey"
FOREIGN KEY ("projectId")
REFERENCES "Project"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
