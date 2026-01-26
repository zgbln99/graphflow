#!/bin/bash
# Run this script to apply the project contacts migration
# Usage: DATABASE_URL="postgresql://..." ./sql/run-migration.sh
# Or:    ./sql/run-migration.sh "postgresql://..."

if [ -z "$DATABASE_URL" ] && [ -n "$1" ]; then
  DATABASE_URL="$1"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set"
  echo ""
  echo "Usage:"
  echo "  DATABASE_URL=\"postgresql://user:pass@host:5432/db\" ./sql/run-migration.sh"
  echo "  ./sql/run-migration.sh \"postgresql://user:pass@host:5432/db\""
  exit 1
fi

# Find psql
PSQL=$(which psql 2>/dev/null || echo "/usr/bin/psql")
if [ ! -x "$PSQL" ]; then
  echo "Error: psql not found. Install with: apt install postgresql-client"
  exit 1
fi

echo "Running migration: add_project_contacts..."
echo ""

$PSQL "$DATABASE_URL" -f sql/add_project_contacts.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Run: npx prisma generate"
  echo "2. Restart the application"
  echo "3. (Optional) Remove 'as any' casts from code"
else
  echo ""
  echo "❌ Migration failed"
  exit 1
fi
