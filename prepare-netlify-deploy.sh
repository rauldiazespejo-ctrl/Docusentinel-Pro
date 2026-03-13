#!/bin/bash

# Script de preparación para despliegue en Netlify - DocuSentinel Pro
# Este script prepara la aplicación para ser desplegada manualmente en Netlify

set -e

echo "🚀 Preparando DocuSentinel Pro para despliegue en Netlify..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración
BUILD_DIR="dist"
FUNCTIONS_DIR="netlify/functions"

# Función para imprimir mensajes
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Paso 1: Construir la aplicación
print_message $BLUE "🔨 Construyendo aplicación..."
npm run build

# Paso 2: Instalar dependencias de funciones
print_message $BLUE "📦 Instalando dependencias de funciones..."
cd $FUNCTIONS_DIR
npm install
cd ../..

# Paso 3: Crear archivo de entorno para producción
print_message $BLUE "⚙️ Creando archivo de entorno..."
cat > .env.production << 'EOF'
# Variables de entorno para DocuSentinel Pro en Netlify
NODE_ENV=production
JWT_SECRET=tu-secreto-jwt-super-seguro-cambia-esto-en-produccion
ENCRYPTION_KEY=tu-clave-de-cifrado-32-bytes-1234567890123456
CORS_ORIGIN=*
MAX_FILE_SIZE=10485760
EOF

# Paso 4: Crear un archivo README para el despliegue manual
cat > NETLIFY_DEPLOY_GUIDE.md << 'EOF'
# Guía de Despliegue de DocuSentinel Pro en Netlify

## 🚀 Método 1: Despliegue Manual a través de la Web

1. **Accede a Netlify**
   - Ve a https://netlify.com
   - Inicia sesión o crea una cuenta

2. **Arrastra y suelta**
   - Arrastra la carpeta `dist` completa al área de despliegue de Netlify
   - Netlify detectará automáticamente el proyecto

3. **Configura el proyecto**
   - Nombre del sitio: `docusentinel-pro`
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Variables de entorno**
   - Ve a Settings > Environment Variables
   - Agrega las siguientes variables:
     ```
     JWT_SECRET=tu-secreto-jwt-muy-seguro
     ENCRYPTION_KEY=tu-clave-de-32-caracteres-exactos!!
     NODE_ENV=production
     ```

## 🔧 Método 2: Despliegue con Netlify CLI

1. **Instalar Netlify CLI globalmente**
   ```bash
   npm install -g netlify-cli
   ```

2. **Autenticarte**
   ```bash
   netlify login
   ```

3. **Desplegar**
   ```bash
   netlify deploy --prod --dir=dist --functions=netlify/functions
   ```

## 📋 Endpoints Disponibles

Una vez desplegado, tu aplicación tendrá estos endpoints:

- **Aplicación principal**: `https://[tu-sitio].netlify.app`
- **API**: `https://[tu-sitio].netlify.app/.netlify/functions/api`
- **Documentación**: `https://[tu-sitio].netlify.app/.netlify/functions/api/docs`
- **Health check**: `https://[tu-sitio].netlify.app/.netlify/functions/api/health`

## 🔐 Credenciales de Prueba

Usuario de prueba:
- Usuario: `admin`
- Contraseña: `password`
- Código MFA: `123456`

## 🛠️ Configuración de Base de Datos

Para producción, necesitas configurar una base de datos real:

1. **Opción 1: MongoDB Atlas** (gratis)
   - Crea una cuenta en https://mongodb.com
   - Crea un cluster gratuito
   - Obtén la URI de conexión
   - Actualiza la variable `DATABASE_URL`

2. **Opción 2: PostgreSQL con Supabase** (gratis)
   - Crea una cuenta en https://supabase.com
   - Crea un proyecto
   - Obtén los datos de conexión
   - Actualiza las variables de entorno

3. **Opción 3: PlanetScale** (gratis)
   - Crea una cuenta en https://planetscale.com
   - Crea una base de datos
   - Obtén la cadena de conexión

## 🔒 Seguridad

- Cambia TODOS los secretos por valores únicos y seguros
- Usa contraseñas fuertes para JWT_SECRET y ENCRYPTION_KEY
- Considera implementar rate limiting
- Habilita HTTPS automáticamente (Netlify lo hace por defecto)

## 📁 Estructura de Archivos

```
netlify/functions/api.js     # Función principal
netlify.toml               # Configuración de Netlify
dist/index.html             # Frontend
.env.production            # Variables de entorno
```

## 🚀 Después del Despliegue

1. Verifica que la aplicación funcione correctamente
2. Prueba todos los endpoints
3. Configura un dominio personalizado si lo deseas
4. Configura alertas y monitoreo
5. Implementa backups automáticos

## 🆘 Problemas Comunes

**Error 404 en API**: Verifica que las funciones estén en `netlify/functions/`
**Error 500**: Revisa los logs en Netlify Dashboard
**Problemas de CORS**: Verifica la configuración en `netlify.toml`

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en el dashboard de Netlify
2. Verifica las variables de entorno
3. Asegúrate de que todos los archivos estén en su lugar
4. Prueba localmente primero

EOF

# Paso 5: Crear un script de prueba local
print_message $BLUE "🧪 Creando script de prueba local..."
cat > test-netlify-local.sh << 'EOF'
#!/bin/bash

# Script para probar la aplicación localmente antes de desplegar

echo "🧪 Probando DocuSentinel Pro localmente..."

# Iniciar servidor local de Netlify
npx netlify dev --port 8888 &
SERVER_PID=$!

# Esperar a que el servidor inicie
sleep 5

# Probar endpoints
echo "🌐 Probando endpoints..."

# Health check
echo "Health check:"
curl -s http://localhost:8888/.netlify/functions/api/health | jq .

# Docs
echo "Documentación:"
curl -s http://localhost:8888/.netlify/functions/api/docs | jq .

# Detener servidor
echo "Deteniendo servidor..."
kill $SERVER_PID

echo "✅ Pruebas locales completadas"
EOF

chmod +x test-netlify-local.sh

# Paso 6: Crear archivo de configuración para servicios externos
print_message $BLUE "📝 Creando guía de servicios externos..."
cat > EXTERNAL_SERVICES.md << 'EOF'
# Servicios Externos Recomendados para DocuSentinel Pro

## 🗄️ Bases de Datos

### MongoDB Atlas (Recomendado)
- **Precio**: Gratis hasta 512MB
- **URL**: https://mongodb.com/atlas
- **Ventajas**: Fácil de usar, escalable, excelente documentación
- **Configuración**: Crea un cluster M0 gratuito y obtén la URI

### Supabase (PostgreSQL)
- **Precio**: Gratis hasta 500MB
- **URL**: https://supabase.com
- **Ventajas**: PostgreSQL real, API REST automática
- **Configuración**: Crea un proyecto y obtén los datos de conexión

### PlanetScale (MySQL)
- **Precio**: Gratis hasta 5GB
- **URL**: https://planetscale.com
- **Ventajas**: MySQL escalable, excelente para producción
- **Configuración**: Crea una base de datos y obtén la cadena de conexión

## 📊 Almacenamiento de Archivos

### Cloudinary
- **Precio**: Gratis hasta 25GB
- **URL**: https://cloudinary.com
- **Ventajas**: Optimización automática, CDN incluido

### AWS S3
- **Precio**: Pago por uso (muy económico)
- **URL**: https://aws.amazon.com/s3
- **Ventajas**: Muy confiable, escalable

### Google Cloud Storage
- **Precio**: Gratis hasta 5GB
- **URL**: https://cloud.google.com/storage
- **Ventajas**: Integración con otros servicios de Google

## 🔐 Servicios de Autenticación

### Auth0
- **Precio**: Gratis hasta 7,500 usuarios activos/mes
- **URL**: https://auth0.com
- **Ventajas**: MFA integrado, soporte para muchos proveedores

### Firebase Auth
- **Precio**: Gratis hasta 50,000 usuarios/mes
- **URL**: https://firebase.google.com/products/auth
- **Ventajas**: Integración con Firebase, muy fácil de usar

### Clerk
- **Precio**: Gratis hasta 5,000 usuarios/mes
- **URL**: https://clerk.com
- **Ventajas**: UI moderna, muy fácil de integrar

## 📝 Ejemplo de Configuración

```javascript
// Para MongoDB Atlas
const mongoose = require('mongoose');
await mongoose.connect(process.env.DATABASE_URL);

// Para Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Para Auth0
const { auth } = require('express-openid-connect');
app.use(auth({
  authRequired: true,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER
}));
```

## 🚀 Pasos para Implementar Servicios Externos

1. **Elige tu proveedor** basado en tus necesidades y presupuesto
2. **Crea una cuenta** y obtén las credenciales
3. **Actualiza las variables de entorno** en Netlify
4. **Modifica el código** para usar los servicios externos
5. **Prueba localmente** antes de desplegar
6. **Despliega y monitorea** el rendimiento

EOF

# Paso 7: Crear un paquete listo para desplegar
print_message $BLUE "📦 Creando paquete de despliegue..."

# Crear archivo .gitignore para el despliegue
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.env.production
.wrangler/
.wrangler/state/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.netlify/
dist/
!dist/index.html
!dist/static/
EOF

# Crear archivo de configuración para Vercel (alternativa)
cat > vercel.json << 'EOF'
{
  "functions": {
    "netlify/functions/api.js": {
      "runtime": "nodejs18.x"
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/netlify/functions/api.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/index.html"
    }
  ]
}
EOF

# Información final
print_message $GREEN "✅ Preparación completada!"
print_message $YELLOW "📋 Archivos creados:"
print_message $BLUE "  - .env.production (variables de entorno)"
print_message $BLUE "  - NETLIFY_DEPLOY_GUIDE.md (guía de despliegue)"
print_message $BLUE "  - EXTERNAL_SERVICES.md (servicios externos recomendados)"
print_message $BLUE "  - test-netlify-local.sh (script de prueba)"
print_message $BLUE "  - vercel.json (configuración alternativa para Vercel)"

print_message $YELLOW "🚀 Opciones de despliegue:"
print_message $BLUE "1. Arrastra la carpeta 'dist' a Netlify.com (método más fácil)"
print_message $BLUE "2. Usa la guía en NETLIFY_DEPLOY_GUIDE.md para CLI"
print_message $BLUE "3. Considera Vercel como alternativa (usa vercel.json)"

print_message $GREEN "✨ DocuSentinel Pro está listo para desplegar!"
print_message $YELLOW "⚠️ Recuerda:"
print_message $BLUE "- Cambia los secretos por valores seguros"
print_message $BLUE "- Configura una base de datos real para producción"
print_message $BLUE "- Lee NETLIFY_DEPLOY_GUIDE.md para instrucciones detalladas"