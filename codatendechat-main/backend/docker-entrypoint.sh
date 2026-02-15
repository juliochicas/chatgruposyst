#!/bin/sh
set -e

echo "==> Running database migrations..."
npx sequelize db:migrate

echo "==> Running database seeds..."
npx sequelize db:seed:all || echo "Seeds already applied or skipped."

echo "==> Starting backend server..."
node dist/server.js
