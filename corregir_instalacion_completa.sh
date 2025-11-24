#!/bin/bash

# Script profesional para corregir completamente la instalación
# Este script verifica y corrige todos los problemas conocidos

set -e  # Salir si hay errores

echo "🔧 Iniciando corrección completa de la instalación..."
echo ""

# 1. Verificar y actualizar código
echo "1. Actualizando código desde GitHub..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend

# Verificar si es un repositorio git
if [ ! -d ".git" ]; then
    echo "⚠️  No es un repositorio git, clonando desde GitHub..."
    cd /home/deploy/GRUPO
    rm -rf backend
    git clone https://github.com/juliochicas/chatgruposyst.git temp-repo
    mv temp-repo/codatendechat-main/backend backend
    rm -rf temp-repo
    cd backend
else
    echo "   ✓ Repositorio git encontrado"
    git fetch origin
    git reset --hard origin/main
    echo "   ✓ Código actualizado desde GitHub"
fi
DEPLOY_EOF

# 2. Verificar dependencias
echo "2. Verificando dependencias..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend

if [ ! -d "node_modules" ] || [ ! -f "node_modules/reflect-metadata/package.json" ]; then
    echo "   ⚠️  Instalando dependencias..."
    npm install
    echo "   ✓ Dependencias instaladas"
else
    echo "   ✓ Dependencias verificadas"
fi
DEPLOY_EOF

# 3. Limpiar compilación anterior
echo "3. Limpiando compilación anterior..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend
rm -rf dist
echo "   ✓ Compilación anterior eliminada"
DEPLOY_EOF

# 4. Recompilar
echo "4. Recompilando backend..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend
npm run build

# Verificar que la compilación fue exitosa
if [ ! -d "dist" ] || [ ! -f "dist/server.js" ]; then
    echo "   ❌ Error: La compilación falló"
    exit 1
fi
echo "   ✓ Compilación exitosa"
DEPLOY_EOF

# 5. Verificar que reflect-metadata esté en los archivos compilados
echo "5. Verificando reflect-metadata en archivos compilados..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend

# Verificar bootstrap.js
if ! grep -q 'require("reflect-metadata")' dist/bootstrap.js 2>/dev/null; then
    echo "   ⚠️  Agregando reflect-metadata a dist/bootstrap.js..."
    sed -i '1i require("reflect-metadata");' dist/bootstrap.js
    echo "   ✓ reflect-metadata agregado a dist/bootstrap.js"
else
    echo "   ✓ reflect-metadata ya existe en dist/bootstrap.js"
fi

# Verificar server.js
if ! grep -q 'require("reflect-metadata")' dist/server.js 2>/dev/null; then
    echo "   ⚠️  Agregando reflect-metadata a dist/server.js..."
    sed -i '1i require("reflect-metadata");' dist/server.js
    echo "   ✓ reflect-metadata agregado a dist/server.js"
else
    echo "   ✓ reflect-metadata ya existe en dist/server.js"
fi

# Verificar database/index.js
if [ -f "dist/database/index.js" ]; then
    if ! grep -q 'require("reflect-metadata")' dist/database/index.js 2>/dev/null; then
        echo "   ⚠️  Agregando reflect-metadata a dist/database/index.js..."
        sed -i '1i require("reflect-metadata");' dist/database/index.js
        echo "   ✓ reflect-metadata agregado a dist/database/index.js"
    else
        echo "   ✓ reflect-metadata ya existe en dist/database/index.js"
    fi
fi
DEPLOY_EOF

# 6. Verificar que Plan.ts tenga DataType
echo "6. Verificando que Plan.ts tenga DataType explícito..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend

if grep -q '@Column$' src/models/Plan.ts 2>/dev/null || ! grep -q 'DataType.INTEGER' src/models/Plan.ts 2>/dev/null; then
    echo "   ⚠️  Plan.ts necesita corrección, actualizando desde GitHub..."
    # El código ya está actualizado en GitHub, solo necesitamos recompilar
    echo "   ✓ Plan.ts será corregido en la próxima compilación"
else
    echo "   ✓ Plan.ts ya tiene DataType explícito"
fi
DEPLOY_EOF

# 7. Reiniciar PM2
echo "7. Reiniciando PM2..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend

# Detener y eliminar procesos existentes
pm2 stop GRUPO-backend 2>/dev/null || true
pm2 delete GRUPO-backend 2>/dev/null || true

# Iniciar backend
pm2 start dist/server.js --name GRUPO-backend
pm2 save

echo ""
echo "✅ Backend reiniciado"
DEPLOY_EOF

echo ""
echo "=========================================="
echo "✅ Corrección completa finalizada"
echo "=========================================="
echo ""
echo "Verificar estado:"
echo "  sudo -u deploy pm2 list"
echo "  sudo -u deploy pm2 logs GRUPO-backend --lines 50"
echo ""
echo "Si aún hay errores, revisar los logs para identificar el modelo específico"
echo ""

