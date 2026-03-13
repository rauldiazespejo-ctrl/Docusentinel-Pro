#!/bin/bash

# DocuSentinel Pro - Despliegue Simplificado
# Script alternativo para desplegar sin crear recursos nuevos

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

log_info "Iniciando despliegue simplificado de DocuSentinel Pro..."

# Verificar API token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    log_error "CLOUDFLARE_API_TOKEN no está configurado"
    exit 1
fi

# Verificar autenticación
log_info "Verificando autenticación..."
if curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        "https://api.cloudflare.com/client/v4/user/tokens/verify" > /dev/null 2>&1; then
    log_success "Token válido"
else
    log_error "Token inválido o sin permisos adecuados"
    exit 1
fi

# Crear configuración wrangler.jsonc básica
log_info "Creando configuración básica..."
cat > wrangler.jsonc << 'EOF'
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "docusentinel-pro",
  "main": "src/index.tsx",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist"
}
EOF

# Construir el proyecto
log_info "Construyendo el proyecto..."
npm run build

# Intentar desplegar con una configuración mínima
log_info "Desplegando a Cloudflare Pages..."
if npx wrangler pages deploy dist --project-name "$PROJECT_NAME" --compatibility-date 2024-01-01; then
    log_success "Despliegue exitoso"
    
    DEPLOYMENT_URL="https://${PROJECT_NAME}.pages.dev"
    echo ""
    echo -e "${GREEN}✅ DESPLIEGUE COMPLETADO${NC}"
    echo -e "URL: ${YELLOW}$DEPLOYMENT_URL${NC}"
    echo -e "Health Check: ${YELLOW}${DEPLOYMENT_URL}/api/health${NC}"
    echo -e "Docs: ${YELLOW}${DEPLOYMENT_URL}/api/docs${NC}"
    
else
    log_error "Fallo en el despliegue"
    echo ""
    echo -e "${YELLOW}💡 Alternativas:${NC}"
    echo "1. Verifica que tu token tenga permisos para Cloudflare Pages"
    echo "2. Intenta crear el proyecto manualmente en el dashboard de Cloudflare"
    echo "3. Usa el modo de desarrollo local: npm run dev"
    exit 1
fi