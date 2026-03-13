#!/bin/bash

# Script de despliegue mejorado para Netlify - DocuSentinel Pro
# Este script adapta la aplicación de Cloudflare Pages a Netlify Functions

set -e

echo "🚀 Iniciando despliegue de DocuSentinel Pro en Netlify..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración
PROJECT_NAME="docusentinel-pro"
BUILD_DIR="dist"
FUNCTIONS_DIR="netlify/functions"
NETLIFY_CLI="./node_modules/.bin/netlify"

# Función para imprimir mensajes
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Verificar dependencias
print_message $BLUE "📋 Verificando dependencias..."
if ! command -v node &> /dev/null; then
    print_message $RED "❌ Node.js no está instalado"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_message $RED "❌ npm no está instalado"
    exit 1
fi

# Verificar que Netlify CLI esté instalado localmente
if [ ! -f "$NETLIFY_CLI" ]; then
    print_message $YELLOW "📦 Instalando Netlify CLI localmente..."
    npm install --save-dev netlify-cli
fi

# Construir la aplicación
print_message $BLUE "🔨 Construyendo aplicación..."
npm run build

# Crear estructura para Netlify Functions
print_message $BLUE "🏗️ Configurando funciones de Netlify..."
mkdir -p $FUNCTIONS_DIR

# Instalar dependencias de las funciones
print_message $BLUE "📦 Instalando dependencias de funciones..."
cd $FUNCTIONS_DIR
npm install
cd ../..

# Verificar autenticación de Netlify
print_message $BLUE "🔐 Verificando autenticación de Netlify..."
if ! $NETLIFY_CLI status &> /dev/null; then
    print_message $YELLOW "⚠️ No estás autenticado en Netlify"
    print_message $BLUE "Por favor autentícate con: $NETLIFY_CLI login"
    print_message $YELLOW "Ejecuta este comando y luego vuelve a ejecutar el script"
    exit 1
fi

# Crear archivo de entorno para Netlify
print_message $BLUE "⚙️ Creando archivo de entorno..."
cat > .env << 'EOF'
# Variables de entorno para DocuSentinel Pro
NODE_ENV=production
JWT_SECRET=tu-secreto-jwt-super-seguro-cambia-esto-en-produccion
ENCRYPTION_KEY=tu-clave-de-cifrado-32-bytes-1234567890123456

# URLs de servicios externos (reemplazar con tus servicios reales)
DATABASE_URL=tu-url-de-base-de-datos
REDIS_URL=tu-url-de-redis
STORAGE_URL=tu-url-de-almacenamiento

# Configuración de seguridad
SESSION_SECRET=tu-secreto-de-sesion-super-seguro
CORS_ORIGIN=*
MAX_FILE_SIZE=10485760
EOF

# Crear archivo .env.production
cat > .env.production << 'EOF'
# Variables de producción para Netlify
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
STORAGE_URL=${STORAGE_URL}
SESSION_SECRET=${SESSION_SECRET}
CORS_ORIGIN=${CORS_ORIGIN}
MAX_FILE_SIZE=${MAX_FILE_SIZE}
EOF

print_message $YELLOW "📝 Archivo de entorno creado. Por favor edita .env con tus valores reales"

# Verificar si existe un sitio de Netlify
print_message $BLUE "🔍 Verificando configuración de Netlify..."
if [ -f ".netlify/state.json" ]; then
    print_message $GREEN "✅ Configuración de Netlify encontrada"
else
    print_message $YELLOW "⚠️ No se encontró configuración de Netlify existente"
    print_message $BLUE "¿Deseas crear un nuevo sitio de Netlify? (s/n)"
    read -r response
    if [[ "$response" =~ ^[Ss]$ ]]; then
        print_message $BLUE "Creando nuevo sitio de Netlify..."
        $NETLIFY_CLI sites:create --name "$PROJECT_NAME" --with-deps
    else
        print_message $YELLOW "Se usará la configuración existente"
    fi
fi

# Desplegar a Netlify
print_message $BLUE "🚀 Desplegando a Netlify..."
echo "Opciones de despliegue:"
echo "1) Despliegue a producción (requiere configuración manual)"
echo "2) Despliegue de prueba (draft)"
echo "3) Solo construir sin desplegar"

read -p "Selecciona una opción (1-3): " deploy_option

case $deploy_option in
    1)
        print_message $YELLOW "⚠️ Despliegue a producción"
        print_message $BLUE "Por favor configura las variables de entorno en el panel de Netlify antes de continuar"
        print_message $BLUE "Variables necesarias: JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL, etc."
        read -p "¿Continuar con el despliegue? (s/n): " confirm
        if [[ "$confirm" =~ ^[Ss]$ ]]; then
            $NETLIFY_CLI deploy --prod --dir=$BUILD_DIR --functions=$FUNCTIONS_DIR
        else
            print_message $YELLOW "Despliegue cancelado"
        fi
        ;;
    2)
        print_message $BLUE "📦 Creando despliegue de prueba..."
        $NETLIFY_CLI deploy --dir=$BUILD_DIR --functions=$FUNCTIONS_DIR
        print_message $GREEN "✅ Despliegue de prueba completado"
        print_message $YELLOW "URL de prueba generada (mira el output anterior)"
        ;;
    3)
        print_message $BLUE "🔨 Construyendo sin desplegar..."
        print_message $YELLOW "La aplicación está construida en $BUILD_DIR"
        print_message $YELLOW "Puedes desplegar manualmente con: $NETLIFY_CLI deploy --dir=$BUILD_DIR --functions=$FUNCTIONS_DIR"
        ;;
    *)
        print_message $RED "❌ Opción inválida"
        exit 1
        ;;
esac

# Información final
print_message $GREEN "✅ Proceso de despliegue completado!"
print_message $YELLOW "📋 Resumen:"
print_message $BLUE "  - Función principal: netlify/functions/api.js"
print_message $BLUE "  - Configuración: netlify.toml"
print_message $BLUE "  - Variables: .env (edita con tus valores reales)"
print_message $BLUE "  - CLI: $NETLIFY_CLI"

print_message $YELLOW "🚀 Comandos útiles:"
print_message $BLUE "  - Ver estado: $NETLIFY_CLI status"
print_message $BLUE "  - Abrir panel: $NETLIFY_CLI open"
print_message $BLUE "  - Ver logs: $NETLIFY_CLI logs"
print_message $BLUE "  - Desplegar: $NETLIFY_CLI deploy --prod"

print_message $GREEN "✨ DocuSentinel Pro está listo para Netlify!"
print_message $YELLOW "⚠️ Recuerda configurar las variables de entorno en el panel de Netlify"
print_message $YELLOW "⚠️ Considera usar servicios externos para base de datos y almacenamiento"