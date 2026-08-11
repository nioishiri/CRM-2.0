#!/bin/sh
set -e

echo "=== CRM MVP Entrypoint ==="
echo "Running Prisma migrations..."

# Применяем миграции
npx prisma migrate deploy

echo "Migrations applied."

# Seed если включен
if [ "$SEED_ON_BOOT" = "true" ]; then
  echo "Running seed..."
  npm run db:seed || echo "Seed warning: already seeded or error"
fi

echo "Starting Next.js server..."
exec node server.js