# 🎯 Superusuario Configurado

## 📋 Credenciales del Administrador Principal
- **Email**: `rauliazespejo@gmail.com`
- **Contraseña**: `123456`
- **Rol**: `admin`
- **Nombre**: `Raul Azespejo`

## 🔐 Permisos del Superusuario
- ✅ Gestión completa de usuarios
- ✅ Acceso a todos los documentos
- ✅ Gestión de auditoría
- ✅ Control del sistema
- ✅ Administración de permisos

## 🚀 Cómo usar el superusuario

### Login directo:
```bash
curl -X POST https://docusentinelpro.netlify.app/.netlify/functions/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rauliazespejo@gmail.com",
    "password": "123456"
  }'
```

### Registro de usuarios (solo admin):
```bash
curl -X POST https://docusentinelpro.netlify.app/.netlify/functions/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "email": "nuevo@usuario.com",
    "password": "SecurePass123!",
    "name": "Nuevo Usuario"
  }'
```

## ⚠️ Seguridad
- **Cambia la contraseña** después del primer login
- **Activa MFA** para mayor seguridad
- **No compartas** estas credenciales
