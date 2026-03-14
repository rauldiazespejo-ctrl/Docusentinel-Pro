# DocuSentinel PRO v2.0

## Descripción General
Plataforma empresarial de gestión documental con cifrado AES-256-GCM, verificación forense de autenticidad, control de accesos RBAC y auditoría inmutable encadenada criptográficamente.

## 🌐 URLs
- **Local**: http://localhost:3000
- **Sandbox**: https://3000-i1vt40x088oque1ny5bi0-c07dda5e.sandbox.novita.ai
- **Health**: /health

## 🔐 Credenciales
- **Superusuario**: rauldiazespejo@gmail.com / DocuSentinel@2024!Admin
- **Admin demo**: admin@docusentinel.com / (hash PBKDF2 - regenerar con /api/auth/change-password)

## ✅ Funcionalidades Implementadas

### Backend (Hono + Cloudflare Workers)
- ✅ **Autenticación JWT** con PBKDF2-SHA256 (contraseñas), HMAC-SHA256 (tokens)
- ✅ **TOTP MFA** con Web Crypto API nativa (RFC 6238)
- ✅ **RBAC**: 5 roles (SUPER_ADMIN=1, ADMIN_DOCS=2, AUDITOR=3, VERIFICADOR=4, USUARIO=5)
- ✅ **Cifrado AES-256-GCM** real para almacenamiento de documentos en R2
- ✅ **Motor forense real**: hash SHA-256, magic bytes, entropía, metadatos PDF/EXIF
- ✅ **Audit trail inmutable**: logs con hash chaining criptográfico
- ✅ **Rate limiting** via KV namespace
- ✅ **Gestión de permisos** por documento (view, download, edit, delete, share, verify)
- ✅ **CRUD de usuarios** (solo admins)

### Endpoints API
```
GET  /health                                → Estado del sistema

POST /api/auth/login                        → Login (superuser + usuarios DB)
POST /api/auth/register                     → Registro de usuarios
GET  /api/auth/profile                      → Perfil del usuario autenticado
POST /api/auth/logout                       → Cerrar sesión
POST /api/auth/change-password              → Cambiar contraseña
POST /api/auth/mfa/setup                    → Configurar MFA (TOTP)
POST /api/auth/mfa/verify                   → Verificar y activar MFA
GET  /api/auth/users                        → Listar usuarios (admin)
PATCH /api/auth/users/:id                   → Actualizar usuario (admin)

GET  /api/documents                         → Listar documentos (paginado)
GET  /api/documents/stats                   → Estadísticas del vault
POST /api/documents/upload                  → Subir documento (cifrado AES-256-GCM)
GET  /api/documents/:id                     → Ver documento
GET  /api/documents/:id/download            → Descargar (descifrado automático)
POST /api/documents/:id/permissions         → Otorgar permiso
DELETE /api/documents/:id/permissions/:pid  → Revocar permiso

POST /api/verification/upload-verify        → Verificar archivo externo (forense)
POST /api/verification/verify               → Verificar documento existente en vault
GET  /api/verification/stats                → Estadísticas de verificaciones
GET  /api/verification                      → Historial de verificaciones
GET  /api/verification/:id                  → Detalle de verificación

GET  /api/audit/logs                        → Logs de auditoría (filtros)
GET  /api/audit/stats                       → Estadísticas de auditoría
GET  /api/audit/integrity                   → Verificar integridad de la cadena
GET  /api/audit/export                      → Exportar logs (JSON/CSV)
GET  /api/audit/recent                      → Actividad reciente
GET  /api/audit/actions                     → Tipos de acciones registradas
GET  /api/audit/security-stats              → Estadísticas de seguridad
```

### Frontend (SPA Vanilla JS)
- ✅ **Dashboard** con estadísticas en tiempo real (documentos, verificaciones, auditoría)
- ✅ **Bóveda de Documentos** con búsqueda, paginación y descarga
- ✅ **Subida de Documentos** con drag & drop y cifrado visual
- ✅ **Verificación Forense** de archivos externos (análisis real de hash, magic bytes, entropía)
- ✅ **Historial de Verificaciones** con detalles de hallazgos
- ✅ **Autorizaciones** (gestión de permisos por documento)
- ✅ **Audit Trail** con filtros, exportación y visualización de integridad
- ✅ **Administración de Usuarios** (CRUD completo, solo admins)
- ✅ **Configuración** (perfil, contraseña, MFA, sesiones)

## 🏗️ Arquitectura

### Stack Tecnológico
- **Runtime**: Cloudflare Workers (Edge)
- **Framework**: Hono v4
- **Base de datos**: Cloudflare D1 (SQLite)
- **Almacenamiento**: Cloudflare R2 (archivos cifrados)
- **Cache/Sessions**: Cloudflare KV
- **Build**: Vite + TypeScript

### Módulos Backend
```
src/
├── index.tsx              → App principal + routing
├── routes/
│   ├── auth.ts            → Login, registro, MFA, usuarios
│   ├── documents.ts       → Vault, upload, download, permisos
│   ├── verification.ts    → Motor forense real
│   └── audit.ts           → Audit trail con hash chaining
├── auth/service.ts        → JWT (HMAC-SHA256), TOTP (RFC 6238), PBKDF2
├── encryption/service.ts  → AES-256-GCM, SHA-256
├── audit/service.ts       → Hash chaining, búsqueda con JOIN
├── middleware/auth.ts     → JWT verification, RBAC, rate limiting
└── config/superuser.ts    → Configuración superadmin
```

### Schema de Base de Datos
- **users**: id, email, name, role (1-5), password_hash (PBKDF2), mfa_enabled, mfa_secret
- **documents**: id, name, type, size, hash, encrypted_data (IV), encryption_key_id (AES key), metadata, security_level
- **permissions**: id, user_id, document_id, action (view/download/edit/delete/share/verify), expires_at
- **verifications**: id, document_id, status (authentic/suspicious/fraudulent/inconclusive), confidence_score, findings
- **audit_logs**: id, user_id, action, resource_type, resource_id, details, ip_address, previous_hash, current_hash
- **sessions**: id, user_id, token_hash, expires_at

## 🚀 Despliegue

### Local (Sandbox)
```bash
cd /home/user/webapp
npm run build
pm2 start ecosystem.config.cjs
# O reiniciar:
pm2 restart docusentinel-pro
```

### Cloudflare Pages (Producción)
```bash
# Requiere: CLOUDFLARE_API_TOKEN configurado
npx wrangler pages deploy dist --project-name docusentinel-pro
# Secrets:
npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro
npx wrangler pages secret put SUPERUSER_PASSWORD --project-name docusentinel-pro
```

## ⚠️ Pendiente para Producción
- [ ] Migrar hashes de contraseñas legacy (bcrypt) a PBKDF2 en primer login
- [ ] Configurar R2 bucket real en Cloudflare (actualmente usa local en dev)
- [ ] Implementar KMS real para protección de claves AES (actualmente claves en DB)
- [ ] Configurar SUPERUSER_PASSWORD vía env secret (cambiar contraseña por defecto)
- [ ] Rate limiting con TTL configurables en producción
- [ ] Notificaciones por email en eventos críticos

## 📅 Última Actualización
2026-03-14 — Corrección de errores backend, dashboard con stats reales, administración de usuarios
