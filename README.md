# 🛡️ DocuSentinel PRO — Plataforma de Seguridad Documental

Plataforma empresarial de gestión y verificación de documentos con cifrado AES-256-GCM, RBAC, MFA y auditoría inmutable.

## 🚀 Estado del Proyecto

**Código**: ✅ Listo para producción  
**GitHub**: https://github.com/rauldiazespejo-ctrl/Docusentinel-Pro  
**Local**: http://localhost:3000

## 🌐 Despliegue en Producción

### Opción 1: Render.com (RECOMENDADO - Gratuito)

1. Ve a [render.com](https://render.com) y regístrate con GitHub
2. Haz clic en **"New +"** → **"Web Service"**
3. Conecta el repositorio: `rauldiazespejo-ctrl/Docusentinel-Pro`
4. Render detectará automáticamente el `Dockerfile`
5. Configura las variables de entorno:
   - `JWT_SECRET` → genera uno aleatorio seguro
   - `ENCRYPTION_KEY` → genera uno aleatorio seguro
   - `SUPERUSER_PASSWORD` → `DocuSentinel@2024!Admin`
6. Haz clic en **"Create Web Service"**
7. ✅ En 5 minutos tendrás tu URL: `https://docusentinel-pro.onrender.com`

### Opción 2: Fly.io (Más rápido)

```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"

# Login y despliegue
fly auth login
fly launch --name docusentinel-pro --region mad
fly volumes create docusentinel_data --size 1 --region mad
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set ENCRYPTION_KEY=$(openssl rand -hex 32)
fly secrets set SUPERUSER_PASSWORD="DocuSentinel@2024!Admin"
fly deploy
```

### Opción 3: Railway.app

1. Ve a [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Selecciona `rauldiazespejo-ctrl/Docusentinel-Pro`
3. Railway detecta automáticamente el Dockerfile
4. Agrega variables de entorno en el panel
5. ✅ URL automática en minutos

### Opción 4: Vercel (Serverless)

```bash
npm install -g vercel
cd Docusentinel-Pro
vercel --prod
```

## 🔑 Credenciales por Defecto

| Campo | Valor |
|-------|-------|
| Email | `rauldiazespejo@gmail.com` |
| Contraseña | `DocuSentinel@2024!Admin` |
| Rol | Super Admin |

## 📋 Funcionalidades

- ✅ **Autenticación JWT** con sesiones seguras
- ✅ **MFA** via TOTP/Email/SMS
- ✅ **RBAC** con 5 niveles de roles
- ✅ **Cifrado AES-256-GCM** de documentos
- ✅ **Verificación forense** con análisis de integridad
- ✅ **Auditoría inmutable** con hash encadenado
- ✅ **Dashboard** con estadísticas en tiempo real
- ✅ **Gestión de usuarios** (CRUD admin)
- ✅ **API REST** completa documentada

## 🏗️ Arquitectura

```
DocuSentinel PRO
├── Frontend: HTML/CSS/JS + TailwindCSS (CDN)
├── Backend: Hono.js + Node.js
├── Base de Datos: SQLite (local) / LibSQL (cloud)
├── Almacenamiento: Sistema de archivos / R2
└── Sesiones: KV en memoria
```

## 📡 Endpoints API

| Endpoint | Descripción |
|----------|-------------|
| `GET /health` | Estado del servicio |
| `POST /api/auth/login` | Iniciar sesión |
| `POST /api/auth/register` | Registrar usuario |
| `GET /api/documents` | Listar documentos |
| `POST /api/documents/upload` | Subir documento |
| `GET /api/documents/stats` | Estadísticas del vault |
| `POST /api/verification/upload-verify` | Verificar documento |
| `GET /api/verification/stats` | Stats de verificación |
| `GET /api/audit/logs` | Logs de auditoría |
| `GET /api/auth/users` | Listar usuarios (admin) |

## 🛠️ Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/rauldiazespejo-ctrl/Docusentinel-Pro.git
cd Docusentinel-Pro

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
# → http://localhost:3000
```

## 🔧 Variables de Entorno

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=tu-secret-jwt-muy-seguro-min-32-chars
ENCRYPTION_KEY=tu-encryption-key-muy-segura-32chars
SUPERUSER_PASSWORD=TuPasswordSeguro@2024
DATA_DIR=/data           # Directorio para SQLite
MIGRATIONS_DIR=/app/migrations
PUBLIC_DIR=/app/public
```

## 📦 Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Hono.js 4.x
- **Base de datos**: SQLite (better-sqlite3)
- **Autenticación**: JWT (jose)
- **Cifrado**: AES-256-GCM via Web Crypto API
- **Hashing**: bcryptjs
- **MFA**: speakeasy (TOTP)
- **Validación**: Zod
- **Frontend**: Vanilla JS + TailwindCSS + FontAwesome

---

Desarrollado con ❤️ para seguridad documental empresarial
