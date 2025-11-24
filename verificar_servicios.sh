#!/bin/bash

# Script para verificar y corregir servicios (PostgreSQL y Redis)

set -e

echo "🔍 Verificando servicios..."
echo ""

# 1. Verificar PostgreSQL
echo "1. Verificando PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    echo "   ✓ PostgreSQL está corriendo"
else
    echo "   ⚠️  PostgreSQL no está corriendo, iniciando..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    echo "   ✓ PostgreSQL iniciado"
fi

# Verificar que la base de datos existe
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw GRUPO; then
    echo "   ✓ Base de datos 'GRUPO' existe"
else
    echo "   ⚠️  Base de datos 'GRUPO' no existe, creando..."
    sudo -u postgres psql << 'EOF' || true
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'GRUPO') THEN
        CREATE DATABASE "GRUPO";
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'GRUPO') THEN
        CREATE USER "GRUPO" WITH SUPERUSER INHERIT CREATEDB CREATEROLE;
    END IF;
    ALTER USER "GRUPO" PASSWORD '3PDTleNftG3hfREtysleqHx61bgyKO89z2wIQ2Guw7M=';
END
$$;
EOF
    echo "   ✓ Base de datos 'GRUPO' creada"
fi

# 2. Verificar Redis
echo ""
echo "2. Verificando Redis..."
if docker ps | grep -q redis-GRUPO; then
    echo "   ✓ Contenedor Redis está corriendo"
else
    echo "   ⚠️  Contenedor Redis no está corriendo, iniciando..."
    if docker ps -a | grep -q redis-GRUPO; then
        docker start redis-GRUPO
        echo "   ✓ Contenedor Redis iniciado"
    else
        echo "   ⚠️  Contenedor Redis no existe, creando..."
        docker run --name redis-GRUPO -p 5000:6379 --restart always --detach redis redis-server --requirepass 3PDTleNftG3hfREtysleqHx61bgyKO89z2wIQ2Guw7M=
        echo "   ✓ Contenedor Redis creado e iniciado"
    fi
fi

# 3. Verificar configuración del backend
echo ""
echo "3. Verificando configuración del backend..."
sudo -u deploy bash << 'DEPLOY_EOF'
cd /home/deploy/GRUPO/backend

# Verificar que .env existe y tiene la configuración correcta
if [ ! -f .env ]; then
    echo "   ⚠️  Archivo .env no existe, creando..."
    
    # Generar JWT secrets
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    
    cat > .env << EOF
NODE_ENV=production
BACKEND_URL=https://chatapi.gruposyst.com
FRONTEND_URL=https://chat.gruposyst.com
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_DIALECT=postgres
DB_USER=GRUPO
DB_PASS=3PDTleNftG3hfREtysleqHx61bgyKO89z2wIQ2Guw7M=
DB_NAME=GRUPO
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
REDIS_HOST=localhost
REDIS_PORT=5000
REDIS_PASS=3PDTleNftG3hfREtysleqHx61bgyKO89z2wIQ2Guw7M=
REDIS_URI=redis://:3PDTleNftG3hfREtysleqHx61bgyKO89z2wIQ2Guw7M=@localhost:5000
EOF
    echo "   ✓ Archivo .env creado"
else
    echo "   ✓ Archivo .env existe"
    
    # Verificar que tiene DB_DIALECT=postgres
    if ! grep -q "DB_DIALECT=postgres" .env; then
        echo "   ⚠️  Corrigiendo DB_DIALECT a postgres..."
        if grep -q "DB_DIALECT=" .env; then
            sed -i 's/DB_DIALECT=.*/DB_DIALECT=postgres/' .env
        else
            echo "DB_DIALECT=postgres" >> .env
        fi
        echo "   ✓ DB_DIALECT corregido"
    fi
    
    # Verificar que tiene DB_PORT=5432
    if ! grep -q "DB_PORT=5432" .env; then
        echo "   ⚠️  Corrigiendo DB_PORT a 5432..."
        if grep -q "DB_PORT=" .env; then
            sed -i 's/DB_PORT=.*/DB_PORT=5432/' .env
        else
            echo "DB_PORT=5432" >> .env
        fi
        echo "   ✓ DB_PORT corregido"
    fi
    
    # Verificar que tiene REDIS_URI
    if ! grep -q "REDIS_URI=" .env; then
        echo "   ⚠️  Agregando REDIS_URI..."
        echo "REDIS_URI=redis://:3PDTleNftG3hfREtysleqHx61bgyKO89z2wIQ2Guw7M=@localhost:5000" >> .env
        echo "   ✓ REDIS_URI agregado"
    fi
fi
DEPLOY_EOF

# 4. Verificar conexión a PostgreSQL
echo ""
echo "4. Verificando conexión a PostgreSQL..."
if sudo -u postgres psql -d GRUPO -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✓ Conexión a PostgreSQL exitosa"
else
    echo "   ❌ Error: No se puede conectar a PostgreSQL"
    exit 1
fi

# 5. Verificar conexión a Redis
echo ""
echo "5. Verificando conexión a Redis..."
if docker exec redis-GRUPO redis-cli -a "3PDTleNftG3hfREtysleqHx61bgyKO89z2wIQ2Guw7M=" ping > /dev/null 2>&1; then
    echo "   ✓ Conexión a Redis exitosa"
else
    echo "   ❌ Error: No se puede conectar a Redis"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Todos los servicios están configurados correctamente"
echo "=========================================="
echo ""
echo "Ahora puedes reiniciar el backend:"
echo "  sudo -u deploy pm2 restart GRUPO-backend"
echo "  sudo -u deploy pm2 logs GRUPO-backend --lines 50"
echo ""

