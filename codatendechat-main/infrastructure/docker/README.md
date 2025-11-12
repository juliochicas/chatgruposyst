# Docker Deployment (Preview)

This folder introduces a container-based workflow that simplifica el despliegue sin modificar los scripts heredados.  
Sigue estos pasos para levantar la aplicación completa en un VPS o en tu máquina local:

1. **Copiar variables**  
   ```bash
   cp infrastructure/docker/example.env infrastructure/docker/.env
   ```
   Ajusta los valores según tu entorno (puertos, contraseñas, dominios, etc.).

2. **Construir e iniciar los servicios**  
   ```bash
   docker compose up -d --build
   ```
   Esto levantará Postgres, Redis, el backend de Node y el frontend servido por Nginx.

3. **Verificar estado**  
   ```bash
   docker compose ps
   docker compose logs backend
   ```

4. **Apagar o actualizar**  
   ```bash
   docker compose down        # detener
   docker compose pull && docker compose up -d --build   # actualizar
   ```

Los datos de Postgres y Redis se guardan en volúmenes nombrados, y los archivos subidos se persisten en `backend/public`.  
Puedes seguir utilizando el instalador clásico; este flujo ofrece una alternativa simplificada y reproducible.

