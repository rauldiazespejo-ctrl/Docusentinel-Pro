# DocuSentinel Pro - Configuración Alternativa

Mientras resolvemos el tema del despliegue a Cloudflare Pages, aquí tienes la aplicación funcionando con todas sus características:

## 🚀 **Aplicación en Funcionamiento**

**URL Principal**: https://3000-i1vt40x088oque1ny5bi0-c07dda5e.sandbox.novita.ai

## 🔗 **Endpoints Disponibles**

### Autenticación
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cierre de sesión
- `POST /api/auth/refresh` - Refrescar token

### Gestión de Documentos
- `GET /api/documents` - Listar documentos
- `POST /api/documents` - Subir documento
- `GET /api/documents/:id` - Obtener documento
- `PUT /api/documents/:id` - Actualizar documento
- `DELETE /api/documents/:id` - Eliminar documento

### Verificación y Auditoría
- `POST /api/verification/email` - Verificación por email
- `POST /api/verification/sms` - Verificación por SMS
- `POST /api/verification/totp` - Verificación TOTP
- `GET /api/audit` - Registros de auditoría

### Utilidades
- `GET /api/health` - Estado del sistema
- `GET /api/docs` - Documentación Swagger

## 🔧 **Características Implementadas**

✅ **Cifrado Híbrido**: AES-256-GCM + RSA-4096
✅ **MFA (Autenticación Multifactor)**: SMS, Email, TOTP
✅ **RBAC (Control de Acceso)**: Roles y permisos
✅ **Auditoría Inmutable**: Todos los eventos registrados
✅ **API RESTful**: Documentación Swagger completa
✅ **Seguridad Avanzada**: Validación, sanitización, rate limiting

## 📋 **Próximos Pasos para Cloudflare**

Para completar el despliegue en Cloudflare Pages, necesitarías:

1. **Crear manualmente en el dashboard de Cloudflare**:
   - Un proyecto Pages llamado `docusentinel-pro`
   - Una base de datos D1 (opcional, para datos persistentes)
   - Namespaces KV (opcional, para caché)
   - Un bucket R2 (opcional, para archivos)

2. **Obtener un token con estos permisos específicos**:
   - `Cloudflare Pages: Edit`
   - `Account: Read`
   - `Zone: Read` (para dominios personalizados)

## 🎯 **Instrucciones de Uso**

Puedes probar la aplicación inmediatamente usando:

```bash
# La aplicación ya está funcionando en:
# https://3000-i1vt40x088oque1ny5bi0-c07dda5e.sandbox.novita.ai

# Para registrar un usuario:
curl -X POST https://3000-i1vt40x088oque1ny5bi0-c07dda5e.sandbox.novita.ai/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "Contraseña123!",
    "name": "Usuario Test"
  }'

# Para ver el estado del sistema:
curl https://3000-i1vt40x088oque1ny5bi0-c07dda5e.sandbox.novita.ai/api/health
```

## 🌐 **Documentación API**

Visita: https://3000-i1vt40x088oque1ny5bi0-c07dda5e.sandbox.novita.ai/api/docs

Para ver la documentación interactiva de Swagger con todos los endpoints disponibles.

---

**Nota**: Aunque el despliegue a Cloudflare Pages tenga problemas de permisos, la aplicación está completamente funcional y segura en el entorno actual. Todos los módulos de seguridad están activos y operativos.