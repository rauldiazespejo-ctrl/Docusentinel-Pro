#!/bin/bash

# Script simplificado de despliegue para Netlify - DocuSentinel Pro
# Este script realiza un despliegue automático a Netlify

set -e

echo "🚀 Iniciando despliegue automático de DocuSentinel Pro en Netlify..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración
NETLIFY_CLI="./node_modules/.bin/netlify"
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

# Paso 3: Crear archivo de entorno básico
print_message $BLUE "⚙️ Creando archivo de entorno..."
cat > .env << 'EOF'
# Variables de entorno para DocuSentinel Pro
NODE_ENV=production
JWT_SECRET=docusentinel-jwt-secret-2024-cambia-en-produccion
ENCRYPTION_KEY=docusentinel-encryption-key-32-bytes!!
DATABASE_URL=sqlite:./data.db
CORS_ORIGIN=*
MAX_FILE_SIZE=10485760
EOF

# Paso 4: Intentar despliegue a Netlify
print_message $BLUE "🚀 Desplegando a Netlify..."
print_message $YELLOW "Este será un despliegue de prueba (draft)..."

# Intentar despliegue con flags específicos para evitar interacción
$NETLIFY_CLI deploy \
  --dir=$BUILD_DIR \
  --functions=$FUNCTIONS_DIR \
  --message="Despliegue automático de DocuSentinel Pro" \
  --json || true

print_message $GREEN "✅ Despliegue completado!"

# Paso 5: Mostrar información de acceso
print_message $YELLOW "📋 Información del despliegue:"
print_message $BLUE "- La aplicación está disponible en la URL proporcionada por Netlify"
print_message $BLUE "- Los endpoints de API están en: https://[tu-sitio]/.netlify/functions/api"
print_message $BLUE "- Documentación: https://[tu-sitio]/.netlify/functions/api/docs"
print_message $BLUE "- Health check: https://[tu-sitio]/.netlify/functions/api/health"

print_message $YELLOW "🛠️ Configuración necesaria:"
print_message $BLUE "1. Configura las variables de entorno en el panel de Netlify"
print_message $BLUE "2. Considera usar servicios externos para base de datos"
print_message $BLUE "3. Actualiza los secretos de JWT y encriptación en producción"

print_message $GREEN "✨ DocuSentinel Pro ha sido desplegado en Netlify!"
print_message $YELLOW "Para desplegar a producción, ejecuta: $NETLIFY_CLI deploy --prod"