#!/bin/bash
set -euo pipefail

echo "Applying database migrations..."
npx sequelize db:migrate

echo "Starting backend server..."
exec node dist/server.js

