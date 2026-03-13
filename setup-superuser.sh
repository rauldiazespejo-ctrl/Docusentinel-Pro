#!/bin/bash

# DocuSentinel Pro - Configuración de Superusuario
# Este script configura el usuario administrador principal

echo "=== Configurando Superusuario de DocuSentinel Pro ==="
echo ""

# Crear archivo de configuración de superusuario
cat > src/config/superuser.ts << 'EOF'
// Configuración del Superusuario Administrador
export const SUPERUSER_CONFIG = {
  email: 'rauliazespejo@gmail.com',
  password: '123456',
  name: 'Raul Azespejo',
  role: 'admin',
  isActive: true,
  createdAt: new Date().toISOString(),
  permissions: {
    canManageUsers: true,
    canManageDocuments: true,
    canManageAudit: true,
    canManageSystem: true,
    canAccessAllDocuments: true
  }
};

// Función para verificar si es el superusuario
export function isSuperuser(email: string): boolean {
  return email === SUPERUSER_CONFIG.email;
}

// Función para obtener credenciales del superusuario
export function getSuperuserCredentials() {
  return {
    email: SUPERUSER_CONFIG.email,
    password: SUPERUSER_CONFIG.password,
    name: SUPERUSER_CONFIG.name
  };
}
EOF

echo "✅ Archivo de configuración de superusuario creado"
echo "📧 Email: rauliazespejo@gmail.com"
echo "🔑 Contraseña: 123456"
echo ""

# Actualizar el servicio de autenticación para incluir el superusuario
cat > src/auth/superuser-setup.ts << 'EOF'
import { SUPERUSER_CONFIG, isSuperuser } from '../config/superuser';

// Función para inicializar el superusuario en el sistema
export async function initializeSuperuser() {
  try {
    // Aquí iría la lógica para crear el usuario en la base de datos
    // Por ahora, el superusuario está definido en la configuración
    console.log('🎯 Superusuario configurado:', SUPERUSER_CONFIG.email);
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar superusuario:', error);
    return false;
  }
}

// Función para autenticar al superusuario
export function authenticateSuperuser(email: string, password: string): boolean {
  return email === SUPERUSER_CONFIG.email && password === SUPERUSER_CONFIG.password;
}
EOF

echo "✅ Servicio de superusuario configurado"
echo ""

# Crear un archivo de instrucciones
cat > SUPERVISOR_SETUP.md << 'EOF'
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
EOF

echo "✅ Documentación de superusuario creada"
echo ""
echo "=== Configuración completada ==="
echo "🎯 Año actualizado a: 2026"
echo "👤 Superusuario: rauliazespejo@gmail.com"
echo "🔑 Contraseña: 123456"
echo "📁 Archivos creados:"
echo "   - src/config/superuser.ts"
echo "   - src/auth/superuser-setup.ts"
echo "   - SUPERVISOR_SETUP.md"
echo ""
echo "¡Listo para subir a GitHub!"
EOF

chmod +x setup-superuser.sh