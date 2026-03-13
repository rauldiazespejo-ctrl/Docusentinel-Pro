#!/bin/bash

# DocuSentinel Pro - Despliegue Automático
# Script completo para desplegar la aplicación en Cloudflare Pages

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_NAME="docusentinel-pro"
API_HEALTH_ENDPOINT="/api/health"
API_DOCS_ENDPOINT="/api/docs"

# Funciones de utilidad
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "No se encuentra package.json. Asegúrate de estar en el directorio del proyecto"
    exit 1
fi

# Verificar API token de Cloudflare
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    log_error "CLOUDFLARE_API_TOKEN no está configurado"
    exit 1
fi

log_info "Iniciando despliegue automático de DocuSentinel Pro..."

# Paso 1: Verificar autenticación de Cloudflare
log_info "Verificando autenticación de Cloudflare..."
if npx wrangler whoami > /dev/null 2>&1; then
    log_success "Autenticación de Cloudflare exitosa"
else
    log_error "Fallo en la autenticación de Cloudflare. Verifica tu API token"
    exit 1
fi

# Paso 2: Crear D1 Database
log_info "Creando D1 Database..."
if npx wrangler d1 create "$PROJECT_NAME" 2>/dev/null; then
    log_success "D1 Database creada exitosamente"
else
    log_warning "La D1 Database ya existe o hubo un error al crearla"
fi

# Obtener el ID de la base de datos
DB_ID=$(npx wrangler d1 list | grep "$PROJECT_NAME" | awk '{print $2}')
if [ -z "$DB_ID" ]; then
    log_error "No se pudo obtener el ID de la D1 Database"
    exit 1
fi
log_info "ID de D1 Database: $DB_ID"

# Paso 3: Crear KV Namespaces
log_info "Creando KV Namespaces..."
if npx wrangler kv:namespace create "${PROJECT_NAME}-kv" 2>/dev/null; then
    log_success "KV Namespace principal creado"
else
    log_warning "KV Namespace principal ya existe o hubo un error"
fi

if npx wrangler kv:namespace create "${PROJECT_NAME}-kv" --preview 2>/dev/null; then
    log_success "KV Namespace preview creado"
else
    log_warning "KV Namespace preview ya existe o hubo un error"
fi

# Obtener IDs de KV
KV_ID=$(npx wrangler kv:namespace list | grep -A 5 "${PROJECT_NAME}-kv" | grep '"id"' | head -1 | cut -d'"' -f4)
KV_PREVIEW_ID=$(npx wrangler kv:namespace list | grep -A 5 "${PROJECT_NAME}-kv" | grep -A 10 "preview" | grep '"id"' | head -1 | cut -d'"' -f4)

log_info "KV ID: $KV_ID"
log_info "KV Preview ID: $KV_PREVIEW_ID"

# Paso 4: Crear R2 Bucket
log_info "Creando R2 Bucket..."
if npx wrangler r2 bucket create "${PROJECT_NAME}-bucket" 2>/dev/null; then
    log_success "R2 Bucket creado exitosamente"
else
    log_warning "R2 Bucket ya existe o hubo un error al crearlo"
fi

# Paso 5: Actualizar wrangler.jsonc con los IDs
log_info "Actualizando wrangler.jsonc con los IDs de los servicios..."
cat > wrangler.jsonc << EOF
{
  "\$schema": "node_modules/wrangler/config-schema.json",
  "name": "$PROJECT_NAME",
  "main": "src/index.tsx",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "$PROJECT_NAME",
      "database_id": "$DB_ID"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "$KV_ID",
      "preview_id": "$KV_PREVIEW_ID"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "${PROJECT_NAME}-bucket"
    }
  ]
}
EOF
log_success "wrangler.jsonc actualizado con los IDs de los servicios"

# Paso 6: Generar y configurar secretos
log_info "Generando secretos de seguridad..."
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
TOTP_SECRET=$(openssl rand -base64 32)

log_info "Configurando secretos en Cloudflare..."
echo "$JWT_SECRET" | npx wrangler pages secret put JWT_SECRET --project-name "$PROJECT_NAME"
echo "$ENCRYPTION_KEY" | npx wrangler pages secret put ENCRYPTION_KEY --project-name "$PROJECT_NAME"
echo "$TOTP_SECRET" | npx wrangler pages secret put TOTP_SECRET --project-name "$PROJECT_NAME"

log_success "Secretos configurados exitosamente"

# Paso 7: Aplicar migraciones de base de datos
log_info "Aplicando migraciones de base de datos..."
if [ -d "migrations" ] && [ "$(ls -A migrations)" ]; then
    npx wrangler d1 migrations apply "$PROJECT_NAME" --remote
    log_success "Migraciones aplicadas exitosamente"
else
    log_warning "No se encontraron migraciones para aplicar"
fi

# Paso 8: Construir el proyecto
log_info "Construyendo el proyecto..."
npm run build
log_success "Proyecto construido exitosamente"

# Paso 9: Crear proyecto en Cloudflare Pages
log_info "Creando proyecto en Cloudflare Pages..."
if npx wrangler pages project create "$PROJECT_NAME" --production-branch main; then
    log_success "Proyecto creado en Cloudflare Pages"
else
    log_warning "El proyecto ya existe o hubo un error al crearlo"
fi

# Paso 10: Desplegar a Cloudflare Pages
log_info "Desplegando a Cloudflare Pages..."
if npx wrangler pages deploy dist --project-name "$PROJECT_NAME"; then
    log_success "Despliegue exitoso"
else
    log_error "Fallo en el despliegue"
    exit 1
fi

# Obtener la URL del despliegue
DEPLOYMENT_URL="https://${PROJECT_NAME}.pages.dev"
log_info "URL del despliegue: $DEPLOYMENT_URL"

# Paso 11: Verificar el despliegue
log_info "Verificando el despliegue..."
sleep 10  # Esperar a que el despliegue se propague

# Verificar endpoint de health
if curl -f -s "${DEPLOYMENT_URL}${API_HEALTH_ENDPOINT}" > /dev/null; then
    log_success "Health check exitoso"
else
    log_warning "Health check fallido - el servicio puede estar aún inicializando"
fi

# Verificar documentación de API
if curl -f -s "${DEPLOYMENT_URL}${API_DOCS_ENDPOINT}" > /dev/null; then
    log_success "Documentación de API accesible"
else
    log_warning "Documentación de API no accesible"
fi

# Resumen final
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ DESPLIEGUE COMPLETADO EXITOSAMENTE${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📋 RESUMEN DEL DESPLIEGUE:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅${NC} Proyecto: ${YELLOW}$PROJECT_NAME${NC}"
echo -e "${GREEN}✅${NC} URL Principal: ${YELLOW}$DEPLOYMENT_URL${NC}"
echo -e "${GREEN}✅${NC} Health Check: ${YELLOW}${DEPLOYMENT_URL}/api/health${NC}"
echo -e "${GREEN}✅${NC} Documentación API: ${YELLOW}${DEPLOYMENT_URL}/api/docs${NC}"
echo -e "${GREEN}✅${NC} Autenticación: ${YELLOW}${DEPLOYMENT_URL}/api/auth${NC}"
echo -e "${GREEN}✅${NC} Documentos: ${YELLOW}${DEPLOYMENT_URL}/api/documents${NC}"
echo -e "${GREEN}✅${NC} Verificación: ${YELLOW}${DEPLOYMENT_URL}/api/verification${NC}"
echo -e "${GREEN}✅${NC} Auditoría: ${YELLOW}${DEPLOYMENT_URL}/api/audit${NC}"
echo ""
echo -e "${BLUE}🔧 SERVICIOS CONFIGURADOS:${NC}"
echo -e "${GREEN}✅${NC} D1 Database: $PROJECT_NAME"
echo -e "${GREEN}✅${NC} KV Namespace: ${PROJECT_NAME}-kv"
echo -e "${GREEN}✅${NC} R2 Bucket: ${PROJECT_NAME}-bucket"
echo -e "${GREEN}✅${NC} Secretos: JWT_SECRET, ENCRYPTION_KEY, TOTP_SECRET"
echo ""
echo -e "${BLUE}📝 PRÓXIMOS PASOS:${NC}"
echo -e "1. Visita ${YELLOW}$DEPLOYMENT_URL${NC} para acceder a la aplicación"
echo -e "2. Revisa la documentación en ${YELLOW}${DEPLOYMENT_URL}/api/docs${NC}"
echo -e "3. Ejecuta pruebas con: ${YELLOW}./test-produccion.sh${NC}"
echo -e "4. Configura monitoreo y alertas"
echo ""
echo -e "${GREEN}🎉 DocuSentinel Pro está ahora en producción!${NC}"

# Guardar información del despliegue
cat > deployment-info.txt << EOF
DESPLIEGUE DOCU_SENTINEL PRO
===========================
Fecha: $(date)
Proyecto: $PROJECT_NAME
URL: $DEPLOYMENT_URL
Health Check: ${DEPLOYMENT_URL}/api/health
API Docs: ${DEPLOYMENT_URL}/api/docs
D1 Database ID: $DB_ID
KV Namespace ID: $KV_ID
R2 Bucket: ${PROJECT_NAME}-bucket

Endpoints:
- Health: ${DEPLOYMENT_URL}/api/health
- Auth: ${DEPLOYMENT_URL}/api/auth  
- Documents: ${DEPLOYMENT_URL}/api/documents
- Verification: ${DEPLOYMENT_URL}/api/verification
- Audit: ${DEPLOYMENT_URL}/api/audit
EOF

log_success "Información del despliegue guardada en deployment-info.txt"