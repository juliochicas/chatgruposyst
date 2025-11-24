#!/bin/bash

# Script profesional para iniciar el backend correctamente
# Este script:
# 1. Actualiza el código desde GitHub
# 2. Recompila el backend
# 3. Agrega reflect-metadata a los archivos compilados
# 4. Inicia/reinicia PM2

set -e  # Salir si hay errores

echo "🚀 Iniciando proceso de inicio del backend..."
echo ""

# 1. Actualizar código
echo "1. Actualizando código desde GitHub..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend
git pull origin main || echo "⚠️  No se pudo hacer git pull (puede estar en un directorio diferente)"
DEPLOY_EOF

# 2. Recompilar
echo "2. Recompilando backend..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend
npm run build
DEPLOY_EOF

# 3. Agregar reflect-metadata
echo "3. Agregando reflect-metadata a archivos compilados..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend

# Verificar que los archivos existen
if [ ! -f "dist/bootstrap.js" ]; then
    echo "❌ Error: dist/bootstrap.js no existe"
    exit 1
fi

if [ ! -f "dist/server.js" ]; then
    echo "❌ Error: dist/server.js no existe"
    exit 1
fi

# Agregar reflect-metadata solo si no existe
if ! grep -q 'require("reflect-metadata")' dist/bootstrap.js; then
    sed -i '1i require("reflect-metadata");' dist/bootstrap.js
    echo "   ✓ reflect-metadata agregado a dist/bootstrap.js"
else
    echo "   ⏭️  reflect-metadata ya existe en dist/bootstrap.js"
fi

if ! grep -q 'require("reflect-metadata")' dist/server.js; then
    sed -i '1i require("reflect-metadata");' dist/server.js
    echo "   ✓ reflect-metadata agregado a dist/server.js"
else
    echo "   ⏭️  reflect-metadata ya existe en dist/server.js"
fi
DEPLOY_EOF

# 4. Iniciar/reiniciar PM2
echo "4. Iniciando/reiniciando PM2..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend

# Detener y eliminar procesos existentes
pm2 stop GRUPO-backend 2>/dev/null || true
pm2 delete GRUPO-backend 2>/dev/null || true

# Iniciar backend
pm2 start dist/server.js --name GRUPO-backend
pm2 save

echo ""
echo "✅ Backend iniciado correctamente"
echo ""
echo "Ver estado:"
echo "  sudo -u deploy pm2 list"
echo "  sudo -u deploy pm2 logs GRUPO-backend --lines 50"
DEPLOY_EOF

echo ""
echo "=========================================="
echo "✅ Proceso completado"
echo "=========================================="
echo ""
echo "Verificar estado:"
echo "  sudo -u deploy pm2 list"
echo "  sudo -u deploy pm2 logs GRUPO-backend"
echo ""

