# 📦 Manual de Instalación en VPS - Atendechat

## 🚀 Instalación en VPS

Este manual explica cómo instalar Atendechat en un servidor VPS usando los scripts de instalación automatizados.

### 📋 Requisitos Previos

- **VPS con Ubuntu** (recomendado Ubuntu 20.04 o superior)
- **Acceso root o sudo** al servidor
- **Dominios configurados** apuntando al VPS (para frontend y backend)
- **Puertos disponibles:**
  - Frontend: 3000-3999
  - Backend: 4000-4999
  - Redis: 5000-5999

---

## 🔧 Pasos de Instalación

### Paso 1: Conectarse al VPS

```bash
ssh root@tu-servidor-ip
# O con usuario con sudo
ssh usuario@tu-servidor-ip
```

### Paso 2: Clonar el Instalador

```bash
cd ~
git clone https://github.com/juliochicas/chatgruposyst.git
cd chatgruposyst/instalador-main
```

### Paso 3: Ejecutar el Script de Instalación

**Para instalación PRIMARIA (primera vez en el servidor):**
```bash
chmod +x install_primaria
./install_primaria
```

**Para instalar una NUEVA INSTANCIA (si ya tienes dependencias instaladas):**
```bash
chmod +x install_instancia
./install_instancia
```

### Paso 4: Seguir el Asistente Interactivo

El script mostrará un menú en español:

```
💻 Bienvenido(a) al Administrador Atendechat, ¡Seleccione a continuación la próxima acción!

   [0] Instalar Atendechat
   [1] Actualizar Atendechat
   [2] Eliminar Atendechat
   [3] Bloquear Atendechat
   [4] Desbloquear Atendechat
   [5] Alterar dominio Atendechat
```

**Selecciona `[0]` para instalar.**

### Paso 5: Proporcionar la Información Solicitada

El script te pedirá la siguiente información (en español):

1. **Contraseña para usuario Deploy y Base de Datos**
   - No utilizar caracteres especiales
   - Esta contraseña se usará para el usuario `deploy` y para PostgreSQL

2. **Nombre de la Instancia/Empresa**
   - Sin espacios ni caracteres especiales
   - Solo letras minúsculas
   - Ejemplo: `miempresa`, `cliente1`

3. **Cantidad de Conexiones/WhatsApp**
   - Número máximo de conexiones WhatsApp que podrá registrar esta instancia
   - Ejemplo: `5`, `10`, `20`

4. **Cantidad de Usuarios/Atendentes**
   - Número máximo de usuarios que podrá registrar esta instancia
   - Ejemplo: `10`, `50`, `100`

5. **Dominio del FRONTEND/PANEL**
   - Dominio completo para el panel de administración
   - Ejemplo: `panel.miempresa.com`
   - Debe estar apuntando al VPS

6. **Dominio del BACKEND/API**
   - Dominio completo para la API
   - Ejemplo: `api.miempresa.com`
   - Debe estar apuntando al VPS

7. **Puerto del FRONTEND**
   - Puerto entre 3000 y 3999
   - Ejemplo: `3000`, `3001`, `3100`

8. **Puerto del BACKEND**
   - Puerto entre 4000 y 4999
   - Ejemplo: `4000`, `4001`, `4100`

9. **Puerto del REDIS**
   - Puerto entre 5000 y 5999
   - Ejemplo: `5000`, `5001`, `5100`

---

## ⚙️ ¿Qué Hace el Instalador Automáticamente?

### Instalación Primaria (`install_primaria`)

El script instala todas las dependencias del sistema:

✅ **Actualización del sistema**  
✅ **Node.js v20.x**  
✅ **PM2** (gestor de procesos)  
✅ **Docker** (para Redis)  
✅ **Dependencias de Puppeteer**  
✅ **Snapd**  
✅ **Nginx** (servidor web)  
✅ **Certbot** (certificados SSL)  
✅ **PostgreSQL** (base de datos)  
✅ **Usuario `deploy`** (para ejecutar la aplicación)  
✅ **Configuración de zona horaria** (America/Sao_Paulo)

### Para Cada Instancia

El script configura automáticamente:

✅ **Clonación del código** desde `https://github.com/juliochicas/chatgruposyst`  
✅ **Contenedor Redis** con Docker  
✅ **Base de datos PostgreSQL**  
✅ **Variables de entorno** (.env para backend y frontend)  
✅ **Instalación de dependencias** (npm install)  
✅ **Compilación del código** (npm run build)  
✅ **Migraciones de base de datos** (npx sequelize db:migrate)  
✅ **Datos iniciales** (npx sequelize db:seed)  
✅ **Inicio con PM2** (backend y frontend como servicios)  
✅ **Configuración de Nginx** (proxy reverso)  
✅ **Certificados SSL** (Let's Encrypt con Certbot)

---

## 📁 Estructura Después de la Instalación

```
/home/deploy/
  └── {nombre_instancia}/
      ├── backend/
      │   ├── .env
      │   ├── dist/
      │   └── src/
      └── frontend/
          ├── .env
          ├── build/
          └── src/
```

---

## 🔍 Comandos Útiles Después de la Instalación

### Ver procesos PM2
```bash
pm2 list
pm2 status
```

### Ver logs
```bash
pm2 logs {nombre_instancia}-backend
pm2 logs {nombre_instancia}-frontend
pm2 logs --lines 100  # Últimas 100 líneas
```

### Reiniciar servicios
```bash
pm2 restart {nombre_instancia}-backend
pm2 restart {nombre_instancia}-frontend
pm2 restart all
```

### Ver estado de Nginx
```bash
sudo systemctl status nginx
sudo nginx -t  # Verificar configuración
```

### Ver estado de PostgreSQL
```bash
sudo systemctl status postgresql
sudo -u postgres psql -l  # Listar bases de datos
```

### Ver contenedores Docker (Redis)
```bash
docker ps
docker logs redis-{nombre_instancia}
```

---

## 🔄 Actualizar una Instancia

Para actualizar una instancia existente:

```bash
cd ~/chatgruposyst/instalador-main
./install_instancia
# Seleccionar opción [1] Actualizar Atendechat
# Ingresar el nombre de la instancia a actualizar
```

Esto actualizará el código desde el repositorio de GitHub y reiniciará los servicios.

---

## 🗑️ Eliminar una Instancia

Para eliminar una instancia:

```bash
cd ~/chatgruposyst/instalador-main
./install_instancia
# Seleccionar opción [2] Eliminar Atendechat
# Ingresar el nombre de la instancia a eliminar
```

Esto eliminará:
- Base de datos PostgreSQL
- Contenedor Redis
- Archivos del código
- Configuraciones de Nginx
- Procesos PM2

---

## 🔒 Bloquear/Desbloquear una Instancia

```bash
cd ~/chatgruposyst/instalador-main
./install_instancia
# Opción [3] Bloquear - Detiene el backend
# Opción [4] Desbloquear - Inicia el backend
```

---

## 🌐 Cambiar Dominios

Para cambiar los dominios de una instancia:

```bash
cd ~/chatgruposyst/instalador-main
./install_instancia
# Seleccionar opción [5] Alterar dominio Atendechat
# Seguir las instrucciones
```

**Nota:** Debes ingresar ambos dominios (frontend y backend), aunque solo vayas a cambiar uno.

---

## ⚠️ Notas Importantes

1. **Archivo de configuración:** El script crea un archivo `config` con contraseñas (permisos 700, solo root puede leerlo)

2. **Usuario deploy:** Se crea automáticamente con la contraseña que especifiques

3. **Certificados SSL:** Se configuran automáticamente con Let's Encrypt (renovación automática)

4. **PM2:** Se configura para iniciar automáticamente al reiniciar el servidor

5. **Cada instancia es independiente:**
   - Tiene su propia base de datos
   - Tiene su propio contenedor Redis
   - Tiene sus propios puertos
   - Tiene sus propios dominios

6. **Repositorio:** El código se clona desde `https://github.com/juliochicas/chatgruposyst` (versión traducida al español)

---

## 🐛 Solución de Problemas

### El servicio no inicia
```bash
pm2 logs {nombre_instancia}-backend --err
pm2 logs {nombre_instancia}-frontend --err
```

### Error de conexión a la base de datos
```bash
sudo -u postgres psql -c "SELECT datname FROM pg_database;"
sudo systemctl restart postgresql
```

### Error de Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Redis no funciona
```bash
docker ps -a
docker start redis-{nombre_instancia}
docker logs redis-{nombre_instancia}
```

---

## 📞 Soporte

Para más información:
- Repositorio: https://github.com/juliochicas/chatgruposyst
- Todos los derechos reservados a https://atendechat.com

---

**Versión:** 6.0.0  
**Última actualización:** 2025

