-- Migration: Add notifyOnChange field to ProjectStatus
-- This field controls whether email notifications are sent when a project changes to this status

ALTER TABLE "ProjectStatus"
ADD COLUMN IF NOT EXISTS "notifyOnChange" BOOLEAN NOT NULL DEFAULT true;

-- Comment explaining the field
COMMENT ON COLUMN "ProjectStatus"."notifyOnChange" IS 'Whether to send email notifications when a project changes to this status';
