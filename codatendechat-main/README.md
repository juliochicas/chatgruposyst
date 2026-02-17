# ChateaYA

ChateaYA es una plataforma multiagente para WhatsApp y redes sociales que aumenta la productividad y organizacion de los equipos de atencion al cliente.

## Comenzando

El repositorio de ChateaYA posee 3 carpetas importantes:
- backend
- frontend
- landing

El backend esta hecho en Express y posee toda la estructura organizada dentro de esa carpeta. La carpeta de frontend contiene todo el framework de React.js que gestiona toda la interaccion con el usuario del sistema.

### Prerequisitos

```
- Node.js v20.x
- Postgres (release)
- Npm ( latest )
- Docker (bionic stable)
- Redis
```

### Instalacion con Docker (Recomendado)

```bash
./install.sh
```

### Instalacion Manual

#### Redis
```
docker run --name redis -p 6379:6379 --restart always --detach redis redis-server --requirepass YOUR_PASSWORD
```

#### Postgres
```
sudo su - postgres
createdb chateaya;
psql
CREATE USER chateaya SUPERUSER INHERIT CREATEDB CREATEROLE;
ALTER USER chateaya PASSWORD 'YOUR_PASSWORD';
```

#### Instalando dependencias
```
cd backend/
npm install --force
cd frontend/
npm install --force
```

### Ejecutando localmente
```
cd backend/
npm run watch
npm start

cd frontend/
npm start
```

## Despliegue en produccion

Usar Docker Compose:
```bash
docker compose build --no-cache
docker compose up -d
```

## Construido con

* [Express](https://expressjs.com/) - Framework backend
* [React](https://react.dev/) - Framework frontend
* [NPM](https://www.npmjs.com/) - Gestor de dependencias
* [Docker](https://www.docker.com/) - Contenedores

## Version

Version 6.0.0

## Licencia

Todos los derechos reservados a ChateaYA.
