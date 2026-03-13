#!/bin/bash

# Script de Despliegue de DocuSentinel Pro
# Este script automatiza el proceso de despliegue a Cloudflare Pages

set -e  # Detener el script si hay algún error

echo "🚀 Iniciando despliegue de DocuSentinel Pro..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "wrangler.jsonc" ]; then
    print_error "No se encontró wrangler.jsonc. Asegúrate de estar en el directorio del proyecto."
    exit 1
fi

# Paso 1: Verificar autenticación de Cloudflare
print_status "Verificando autenticación de Cloudflare..."
if ! npx wrangler whoami > /dev/null 2>&1; then
    print_error "No estás autenticado con Cloudflare. Por favor, configura tu API key."
    exit 1
fi
print_status "✅ Autenticación verificada"

# Paso 2: Crear recursos de Cloudflare si no existen
print_status "Creando recursos de Cloudflare..."

# Crear base de datos D1
print_status "Creando base de datos D1..."
npx wrangler d1 create docusentinel-pro || print_warning "La base de datos D1 ya existe o hubo un error"

# Crear KV namespaces
print_status "Creando namespaces KV..."
npx wrangler kv:namespace create docusentinel-pro-kv || print_warning "El namespace KV ya existe o hubo un error"
npx wrangler kv:namespace create docusentinel-pro-kv --preview || print_warning "El namespace KV preview ya existe o hubo un error"

# Crear bucket R2
print_status "Creando bucket R2..."
npx wrangler r2 bucket create docusentinel-pro-bucket || print_warning "El bucket R2 ya existe o hubo un error"

# Paso 3: Actualizar wrangler.jsonc con los IDs reales
print_status "Actualizando configuración con IDs de recursos..."
print_warning "Por favor, actualiza manualmente los IDs en wrangler.jsonc con los valores reales"

# Paso 4: Aplicar migraciones de base de datos
print_status "Aplicando migraciones de base de datos..."
npx wrangler d1 migrations apply docusentinel-pro --remote

# Paso 5: Construir el proyecto
print_status "Construyendo el proyecto..."
npm run build

# Paso 6: Desplegar a Cloudflare Pages
print_status "Desplegando a Cloudflare Pages..."
npx wrangler pages deploy dist --project-name docusentinel-pro

# Paso 7: Configurar secretos
print_status "Configurando secretos..."
echo "Por favor, configura los siguientes secretos manualmente:"
echo "npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro"
echo "npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro"
echo "npx wrangler pages secret put TOTP_SECRET --project-name docusentinel-pro"

print_status "🎉 Despliegue completado!"
print_status "URL de la aplicación: https://docusentinel-pro.pages.dev"
print_status "Documentación API: https://docusentinel-pro.pages.dev/api/docs"