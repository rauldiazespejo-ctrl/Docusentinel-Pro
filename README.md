# 🛡️ DocuSentinel PRO — Plataforma de Seguridad Documental

Plataforma empresarial de gestión y verificación de documentos con cifrado AES-256-GCM, RBAC, MFA y auditoría inmutable.

## 🌐 URL de Producción

**🔗 https://ranges-survivors-although-concrete.trycloudflare.com**

> Servidor activo: Node.js 20 + Hono.js + SQLite | Túnel: Cloudflare Quick Tunnel

## 🔑 Credenciales de Acceso

| Campo | Valor |
|-------|-------|
| **Email** | `rauldiazespejo@gmail.com` |
| **Contraseña** | `DocuSentinel@2024!Admin` |
| **Rol** | Super Admin (acceso total) |

## 📋 Funcionalidades Implementadas

- ✅ **Autenticación JWT** con sesiones seguras (24h)
- ✅ **MFA** via TOTP/Email/SMS con QR code
- ✅ **RBAC** con 5 niveles: Super Admin, Admin Docs, Auditor, Verificador, Usuario
- ✅ **Cifrado AES-256-GCM** de documentos
- ✅ **Verificación forense** con análisis de integridad (hash, firma, entropía, tipografía)
- ✅ **Auditoría inmutable** con hash encadenado (blockchain-like)
- ✅ **Dashboard** con estadísticas en tiempo real
- ✅ **Gestión de usuarios** (CRUD completo para admin)
- ✅ **Upload de documentos** con cifrado automático
- ✅ **Rate limiting** por IP via KV
- ✅ **API REST** completa con 15+ endpoints

## 🚀 Despliegue en Producción Permanente

### Opción 1: Render.com (GRATIS - Recomendado)
1. Ve a **[render.com](https://render.com)** → New Web Service
2. Conecta: `github.com/rauldiazespejo-ctrl/Docusentinel-Pro`
3. Render detecta el `Dockerfile` automáticamente
4. Variables de entorno a configurar:
   ```
   JWT_SECRET=<genera uno seguro>
   ENCRYPTION_KEY=<genera uno seguro>
   SUPERUSER_PASSWORD=DocuSentinel@2024!Admin
   ```
5. ✅ URL automática: `https://docusentinel-pro.onrender.com`

### Opción 2: Fly.io
```bash
fly auth login
fly launch --name docusentinel-pro
fly volumes create docusentinel_data --size 1
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly deploy
```

### Opción 3: Railway.app
1. New Project → Deploy from GitHub
2. Selecciona `rauldiazespejo-ctrl/Docusentinel-Pro`
3. Variables de entorno y deploy automático

## 📡 API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Estado del servicio |
| `/api/auth/login` | POST | Iniciar sesión |
| `/api/auth/register` | POST | Registrar usuario |
| `/api/auth/profile` | GET | Perfil del usuario |
| `/api/auth/users` | GET | Listar usuarios (admin) |
| `/api/documents` | GET | Listar documentos |
| `/api/documents/upload` | POST | Subir documento |
| `/api/documents/stats` | GET | Estadísticas del vault |
| `/api/documents/:id/download` | GET | Descargar documento |
| `/api/verification/upload-verify` | POST | Verificar documento |
| `/api/verification/stats` | GET | Stats de verificación |
| `/api/audit/logs` | GET | Logs de auditoría |
| `/api/audit/stats` | GET | Estadísticas de auditoría |
| `/api/audit/recent` | GET | Actividad reciente |

## 🏗️ Arquitectura Técnica

```
DocuSentinel PRO v2.0
├── Runtime: Node.js 20 LTS
├── Framework: Hono.js 4.x (edge-ready)
├── Base de Datos: SQLite (better-sqlite3)
├── Cifrado: AES-256-GCM (Web Crypto API)
├── Auth: JWT (jose) + bcryptjs
├── MFA: speakeasy (TOTP/HOTP)
├── Validación: Zod schemas
├── Frontend: Vanilla JS + TailwindCSS CDN
└── Deploy: Docker + Cloudflare Tunnel
```

## 🔧 Desarrollo Local

```bash
git clone https://github.com/rauldiazespejo-ctrl/Docusentinel-Pro.git
cd Docusentinel-Pro
npm install
npm run build:server
npm start
# → http://localhost:3000
```

## 📦 Variables de Entorno

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=min-32-chars-muy-seguro
ENCRYPTION_KEY=exactamente-32-caracteres-aqui!!
SUPERUSER_PASSWORD=TuPasswordSeguro@2024
DATA_DIR=/data
MIGRATIONS_DIR=/app/migrations
PUBLIC_DIR=/app/public
```

---
**GitHub**: https://github.com/rauldiazespejo-ctrl/Docusentinel-Pro  
**Versión**: 2.0.0 | **Última actualización**: 2026-03-14
