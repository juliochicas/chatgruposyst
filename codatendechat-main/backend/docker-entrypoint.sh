#!/bin/sh
set -e

SEED_MARKER="/app/public/.seeds_applied"

echo "==> Running database migrations..."
npx sequelize db:migrate

if [ ! -f "$SEED_MARKER" ]; then
  echo "==> Running database seeds (first time)..."
  if npx sequelize db:seed:all; then
    touch "$SEED_MARKER"
    echo "==> Seeds applied successfully."
  else
    echo "==> Warning: Some seeds failed. Will retry on next restart."
  fi
else
  echo "==> Seeds already applied, skipping."
fi

echo "==> Starting backend server..."
node dist/server.js
