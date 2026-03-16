# DocuSentinel PRO — Plataforma de Seguridad Documental Empresarial

## 🚀 Estado del Proyecto
- **Versión**: 2.1.0 (Software Profesional)
- **Estado**: ✅ Activo y desplegado
- **Último deploy**: 2026-03-16

## 🌐 URLs de Acceso
- **Producción (Render.com)**: https://docusentinel-pro.onrender.com
- **Sandbox (temporal)**: https://channels-proved-supported-learning.trycloudflare.com
- **GitHub**: https://github.com/rauldiazespejo-ctrl/Docusentinel-Pro
- **Releases APK**: https://github.com/rauldiazespejo-ctrl/Docusentinel-Pro/releases

## 🔑 Credenciales de Acceso
- **Email**: rauldiazespejo@gmail.com
- **Contraseña**: DocuSentinel@2024!Admin

## ✅ Funcionalidades Implementadas

### 🏠 Panel General (Dashboard)
- Estadísticas en tiempo real: documentos, verificaciones, alertas, auditoría
- Documentos recientes y actividad del sistema
- Barra de estado de seguridad con indicadores de integridad

### 🔐 Bóveda Segura
- Listado paginado con búsqueda y filtro por nivel de seguridad
- Upload con drag & drop con cifrado AES-256-GCM automático
- Previsualización de PDFs e imágenes (descifrado en tiempo real)
- **Eliminar documentos** con confirmación (cascada: permisos + verificaciones)
- Descarga de documentos cifrados
- Hash SHA-3 y BLAKE3 visibles

### 🔬 Verificación Forense
- Upload de documentos sospechosos para análisis
- Análisis completo: hash, metadatos EXIF, tipografía, firma digital
- Resultado con puntuación de confianza, veredicto y hallazgos detallados
- Historial de verificaciones con filtros y paginación

### 🔑 Control de Autorizaciones
- Gestión de permisos por documento y usuario
- Asignación por email con tipos: ver, descargar, editar, eliminar, compartir, verificar
- Permisos con fecha de expiración opcional

### 📊 Reportes (NUEVO)
- KPIs del sistema: documentos, verificaciones, auditoría, tasa de autenticidad
- Gráfico de barras: actividad de uploads en los últimos 30 días
- Distribución por tipo de archivo y nivel de seguridad
- Resultados de verificaciones forenses (auténtico/sospechoso/fraudulento)
- **Exportar CSV** de documentos y audit trail

### 📜 Audit Trail Inmutable
- Registro blockchain-style de todas las operaciones del sistema
- Filtros por tipo de evento
- Exportación CSV real con todos los campos
- Hashes encadenados criptográficamente (detección de alteraciones)

### 👤 Mi Perfil (NUEVO)
- Edición de nombre de usuario
- Cambio de contraseña funcional con validación
- Estado de MFA visible
- Información de rol y seguridad

### ⚙️ Configuración
- Edición de nombre conectada a la API
- Cambio de contraseña funcional
- Configuración de MFA (TOTP) con código QR
- Información de seguridad del sistema

### 👥 Gestión de Usuarios (Admin)
- Listado con búsqueda paginada
- Crear usuarios con rol asignable
- Editar nombre y rol
- Activar/desactivar usuarios
- **Eliminar (desactivar)** usuarios con confirmación modal

### 🔍 Búsqueda Global
- Campo de búsqueda en la barra superior
- Navegación automática a Bóveda con filtro aplicado

## 📱 Aplicación Android (APK)
- **Descarga v1.1.0**: https://github.com/rauldiazespejo-ctrl/Docusentinel-Pro/releases/download/v1.1.0/DocuSentinel-PRO-v1.1.0.apk
- URL apuntando a Render.com (permanente)
- Compilada con Capacitor 6 + Java 17

## 🏗️ Arquitectura Técnica

### Stack
- **Backend**: Hono.js + Node.js (TypeScript compilado con esbuild)
- **Base de datos**: SQLite (better-sqlite3) con migraciones
- **Almacenamiento archivos**: Simulado localmente (R2-compatible interface)
- **Autenticación**: JWT (jose) + bcryptjs
- **MFA**: TOTP (speakeasy) con QR codes (qrcode)
- **Frontend**: Vanilla JS SPA, TailwindCSS CDN, FontAwesome

### Seguridad
- Cifrado AES-256-GCM para documentos en reposo
- Hashes SHA-3 + BLAKE3 para integridad
- Audit trail con hashes encadenados (blockchain-style)
- JWT con expiración de 24h
- MFA con TOTP
- Roles y permisos granulares (5 niveles)

### Datos
| Tabla | Descripción |
|-------|-------------|
| users | Usuarios con roles, MFA, estado |
| sessions | Sesiones JWT con hash |
| documents | Metadatos cifrados de documentos |
| permissions | Control de acceso por documento |
| verifications | Resultados de análisis forenses |
| audit_logs | Registro inmutable blockchain-style |

## 🔌 API Endpoints Principales

```
POST   /api/auth/login              Iniciar sesión
POST   /api/auth/register           Registrar usuario
PUT    /api/auth/profile            Actualizar nombre
POST   /api/auth/change-password    Cambiar contraseña
GET    /api/auth/users              Listar usuarios (admin)
PATCH  /api/auth/users/:id          Editar usuario (admin)
DELETE /api/auth/users/:id          Desactivar usuario (admin)

GET    /api/documents               Listar documentos
POST   /api/documents/upload        Subir y cifrar documento
GET    /api/documents/stats         Estadísticas básicas
GET    /api/documents/stats/advanced Estadísticas avanzadas
GET    /api/documents/export/csv    Exportar documentos CSV
GET    /api/documents/:id           Detalles documento
GET    /api/documents/:id/download  Descargar descifrado
GET    /api/documents/:id/preview   Vista previa
DELETE /api/documents/:id           Eliminar documento

POST   /api/verification/upload-verify  Verificar archivo
GET    /api/verification             Historial verificaciones

GET    /api/audit/logs              Logs de auditoría
GET    /api/audit/export            Exportar audit CSV
GET    /api/audit/stats             Estadísticas audit

GET    /health                      Estado del sistema
GET    /download/apk                Descarga APK Android
```

## 🚀 Deploy

### Render.com (Producción)
El proyecto se despliega automáticamente desde GitHub cuando se hace push a `main`.
1. Ir a https://render.com
2. Conectar repo `rauldiazespejo-ctrl/Docusentinel-Pro`
3. Render detecta el `Dockerfile` automáticamente
4. Deploy gratuito en `https://docusentinel-pro.onrender.com`

### Local (Sandbox)
```bash
pm2 restart docusentinel-pro
curl http://localhost:3000/health
```

## 📝 Próximas Mejoras Sugeridas
- [ ] Notificaciones push en tiempo real (WebSocket/SSE)
- [ ] Dashboard con gráficos Chart.js interactivos
- [ ] Exportación de reportes PDF con firma digital
- [ ] Integración con servicios de correo (alertas de seguridad)
- [ ] API pública con OAuth2 para integraciones externas
- [ ] Soporte para más formatos (Word, Excel, ZIP)
- [ ] Firma digital de documentos (PKCS#7)
