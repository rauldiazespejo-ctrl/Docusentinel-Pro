#!/bin/bash

# DocuSentinel Pro - Despliegue Manual para Pages
# Script adaptado para el entorno actual

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_NAME="docusentinel-pro"

log_info "Iniciando despliegue de DocuSentinel Pro..."

# Verificar token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    log_error "CLOUDFLARE_API_TOKEN no está configurado"
    exit 1
fi

# Verificar autenticación básica
log_info "Verificando autenticación..."
if npx wrangler whoami > /dev/null 2>&1; then
    log_success "Autenticación exitosa"
else
    log_error "Fallo en autenticación"
    exit 1
fi

# Paso 1: Crear configuración para Pages
log_info "Creando configuración para Cloudflare Pages..."
cat > wrangler.jsonc << EOF
{
  "\$schema": "node_modules/wrangler/config-schema.json",
  "name": "$PROJECT_NAME",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist"
}
EOF

# Paso 2: Construir el proyecto
log_info "Construyendo el proyecto..."
npm run build

# Verificar que exista el build
if [ ! -f "dist/index.js" ]; then
    log_error "No se encontró el archivo build dist/index.js"
    exit 1
fi

# Paso 3: Crear proyecto Pages (si no existe)
log_info "Creando proyecto Pages..."
if npx wrangler pages project create "$PROJECT_NAME" --production-branch main 2>/dev/null; then
    log_success "Proyecto Pages creado"
else
    log_warning "El proyecto ya existe o no se pudo crear"
fi

# Paso 4: Desplegar
log_info "Desplegando a Cloudflare Pages..."
if npx wrangler pages deploy dist --project-name "$PROJECT_NAME"; then
    log_success "Despliegue exitoso"
    
    DEPLOYMENT_URL="https://${PROJECT_NAME}.pages.dev"
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ DESPLIEGUE COMPLETADO${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}📋 INFORMACIÓN DEL DESPLIEGUE:${NC}"
    echo -e "${GREEN}✅${NC} Proyecto: ${YELLOW}$PROJECT_NAME${NC}"
    echo -e "${GREEN}✅${NC} URL: ${YELLOW}$DEPLOYMENT_URL${NC}"
    echo -e "${GREEN}✅${NC} Health: ${YELLOW}${DEPLOYMENT_URL}/api/health${NC}"
    echo -e "${GREEN}✅${NC} Docs: ${YELLOW}${DEPLOYMENT_URL}/api/docs${NC}"
    echo ""
    echo -e "${GREEN}🎉 DocuSentinel Pro está en producción!${NC}"
    
    # Guardar info
    echo "$DEPLOYMENT_URL" > deployment-url.txt
    
else
    log_error "Fallo en el despliegue"
    echo ""
    echo -e "${YELLOW}💡 Alternativas:${NC}"
    echo "1. Verifica que tu token tenga permisos para Cloudflare Pages"
    echo "2. Intenta crear el proyecto manualmente en el dashboard"
    echo "3. La app está funcionando en modo desarrollo local"
    exit 1
fi