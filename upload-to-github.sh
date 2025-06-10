#!/bin/bash

# Script para subir todos los cambios a GitHub

echo "🚀 Subiendo cambios a GitHub..."

# Agregar todos los archivos nuevos
git add backend/src/models/*.ts
git add backend/src/services/*.ts
git add backend/src/services/ChannelServices/*.ts
git add backend/src/controllers/*.ts
git add backend/src/routes/*.ts
git add backend/src/database/migrations/*.ts

# Verificar estado
echo ""
echo "📊 Estado de Git:"
git status --short

# Hacer commit
echo ""
echo "💾 Creando commit..."
git commit -m "feat: Sistema Omnichannel completo - Backend

- Soporte multicanal: WhatsApp, Facebook, Instagram
- Sistema de planes SaaS con límites y facturación
- Configuraciones desde UI (sin .env)
- Servicios base para todos los canales
- Webhooks para Meta y preparación TikTok
- Encriptación de datos sensibles
- Migración completa de BD incluida"

# Push
echo ""
echo "📤 Subiendo a GitHub..."
git push origin main

echo ""
echo "✅ ¡Listo! Revisa tu repositorio en GitHub"
