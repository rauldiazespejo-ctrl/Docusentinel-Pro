#!/bin/bash

# Script para generar claves criptográficas seguras para DocuSentinel Pro
# Este script genera claves de alta seguridad para producción

set -e

echo "🔐 GENERADOR DE CLAVES DE SEGURIDAD DOCUSENTINEL PRO"
echo "======================================================="
echo ""

# Colores
ROJO='\033[0;31m'
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
AZUL='\033[0;34m'
NC='\033[0m'

# Función para generar clave aleatoria
generate_key() {
    local length=$1
    openssl rand -base64 $length
}

# Función para generar clave hex
generate_hex_key() {
    local length=$1
    openssl rand -hex $length
}

# Función para generar UUID v4
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen
    else
        # Generar UUID manualmente
        local hex=$(openssl rand -hex 16)
        echo "${hex:0:8}-${hex:8:4}-4${hex:13:3}-${hex:16:4}-${hex:20:12}"
    fi
}

# Función para generar clave RSA privada
generate_rsa_private_key() {
    local key_size=$1
    local key_file="/tmp/rsa_private_${key_size}.pem"
    
    openssl genrsa -out "$key_file" $key_size 2>/dev/null
    echo "$key_file"
}

# Función para generar clave EC
generate_ec_key() {
    local curve=$1
    local key_file="/tmp/ec_private_${curve}.pem"
    
    openssl ecparam -name "$curve" -genkey -out "$key_file" -noout 2>/dev/null
    echo "$key_file"
}

# Generar todas las claves necesarias
generate_all_keys() {
    echo -e "${AZUL}Generando claves de seguridad...${NC}"
    echo ""
    
    # JWT Secret (256 bits = 32 bytes)
    echo -e "${AMARILLO}1. JWT Secret (256 bits):${NC}"
    JWT_SECRET=$(generate_key 32)
    echo "JWT_SECRET=$JWT_SECRET"
    echo ""
    
    # Encryption Key (256 bits)
    echo -e "${AMARILLO}2. Encryption Key (256 bits):${NC}"
    ENCRYPTION_KEY=$(generate_key 32)
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
    echo ""
    
    # TOTP Secret (128 bits)
    echo -e "${AMARILLO}3. TOTP Secret (128 bits):${NC}"
    TOTP_SECRET=$(generate_key 16)
    echo "TOTP_SECRET=$TOTP_SECRET"
    echo ""
    
    # API Key (256 bits)
    echo -e "${AMARILLO}4. API Key (256 bits):${NC}"
    API_KEY=$(generate_key 32)
    echo "API_KEY=$API_KEY"
    echo ""
    
    # Session Secret (256 bits)
    echo -e "${AMARILLO}5. Session Secret (256 bits):${NC}"
    SESSION_SECRET=$(generate_key 32)
    echo "SESSION_SECRET=$SESSION_SECRET"
    echo ""
    
    # CSRF Token (128 bits)
    echo -e "${AMARILLO}6. CSRF Token (128 bits):${NC}"
    CSRF_TOKEN=$(generate_key 16)
    echo "CSRF_TOKEN=$CSRF_TOKEN"
    echo ""
    
    # Database Encryption Key (256 bits)
    echo -e "${AMARILLO}7. Database Encryption Key (256 bits):${NC}"
    DB_ENCRYPTION_KEY=$(generate_key 32)
    echo "DB_ENCRYPTION_KEY=$DB_ENCRYPTION_KEY"
    echo ""
    
    # Backup Encryption Key (256 bits)
    echo -e "${AMARILLO}8. Backup Encryption Key (256 bits):${NC}"
    BACKUP_ENCRYPTION_KEY=$(generate_key 32)
    echo "BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY"
    echo ""
    
    # Audit Log Key (256 bits)
    echo -e "${AMARILLO}9. Audit Log Key (256 bits):${NC}"
    AUDIT_LOG_KEY=$(generate_key 32)
    echo "AUDIT_LOG_KEY=$AUDIT_LOG_KEY"
    echo ""
    
    # Webhook Secret (256 bits)
    echo -e "${AMARILLO}10. Webhook Secret (256 bits):${NC}"
    WEBHOOK_SECRET=$(generate_key 32)
    echo "WEBHOOK_SECRET=$WEBHOOK_SECRET"
    echo ""
    
    # UUID para identificadores únicos
    echo -e "${AMARILLO}11. UUID único:${NC}"
    UNIQUE_UUID=$(generate_uuid)
    echo "UNIQUE_UUID=$UNIQUE_UUID"
    echo ""
    
    # Salt para contraseñas (256 bits)
    echo -e "${AMARILLO}12. Password Salt (256 bits):${NC}"
    PASSWORD_SALT=$(generate_key 32)
    echo "PASSWORD_SALT=$PASSWORD_SALT"
    echo ""
}

# Generar claves asimétricas (si se necesitan)
generate_asymmetric_keys() {
    echo -e "${AZUL}Generando claves asimétricas (opcional)...${NC}"
    echo ""
    
    # RSA 2048 bits (para JWT o firma digital)
    echo -e "${AMARILLO}13. RSA Private Key (2048 bits):${NC}"
    RSA_PRIVATE_KEY_FILE=$(generate_rsa_private_key 2048)
    echo "RSA_PRIVATE_KEY_FILE=$RSA_PRIVATE_KEY_FILE"
    echo "Contenido (guardar de forma segura):"
    cat "$RSA_PRIVATE_KEY_FILE"
    echo ""
    
    # RSA 4096 bits (para encriptación más fuerte)
    echo -e "${AMARILLO}14. RSA Private Key (4096 bits):${NC}"
    RSA_PRIVATE_KEY_4096_FILE=$(generate_rsa_private_key 4096)
    echo "RSA_PRIVATE_KEY_4096_FILE=$RSA_PRIVATE_KEY_4096_FILE"
    echo "Contenido (guardar de forma segura):"
    cat "$RSA_PRIVATE_KEY_4096_FILE"
    echo ""
    
    # EC P-256 (para ECDSA)
    echo -e "${AMARILLO}15. EC Private Key (P-256):${NC}"
    EC_PRIVATE_KEY_FILE=$(generate_ec_key "prime256v1")
    echo "EC_PRIVATE_KEY_FILE=$EC_PRIVATE_KEY_FILE"
    echo "Contenido (guardar de forma segura):"
    cat "$EC_PRIVATE_KEY_FILE"
    echo ""
}

# Generar archivo .env seguro
generate_env_file() {
    echo -e "${AZUL}Generando archivo .env...${NC}"
    echo ""
    
    cat > .env.production << EOF
# 🚨 ARCHIVO DE ENTORNO DE PRODUCCIÓN - MANTENER SEGURO
# DocuSentinel Pro - Variables de entorno
# Generado el: $(date)

# ==============================================
# 🔐 CLAVES DE SEGURIDAD PRINCIPALES
# ==============================================

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
JWT_ALGORITHM=HS256

# Encryption
ENCRYPTION_KEY=$ENCRYPTION_KEY
ENCRYPTION_ALGORITHM=AES-256-GCM

# TOTP/MFA
TOTP_SECRET=$TOTP_SECRET
TOTP_SERVICE_NAME=DocuSentinelPro
TOTP_ISSUER=DocuSentinel

# API Security
API_KEY=$API_KEY
API_RATE_LIMIT=100

# Session Management
SESSION_SECRET=$SESSION_SECRET
SESSION_MAX_AGE=86400000
SESSION_SECURE=true
SESSION_HTTP_ONLY=true

# CSRF Protection
CSRF_TOKEN=$CSRF_TOKEN
CSRF_COOKIE_SECURE=true

# ==============================================
# 🗄️ BASES DE DATOS Y ALMACENAMIENTO
# ==============================================

# Database Encryption
DB_ENCRYPTION_KEY=$DB_ENCRYPTION_KEY
DB_ENCRYPTION_ALGORITHM=AES-256-CBC

# Backup Security
BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY
BACKUP_RETENTION_DAYS=30

# Audit Log
AUDIT_LOG_KEY=$AUDIT_LOG_KEY
AUDIT_LOG_RETENTION_DAYS=90

# ==============================================
# 🔌 INTEGRACIONES
# ==============================================

# Webhooks
WEBHOOK_SECRET=$WEBHOOK_SECRET
WEBHOOK_TIMEOUT=30000

# Password Security
PASSWORD_SALT=$PASSWORD_SALT
PASSWORD_PEPPER=$(generate_key 32)
PASSWORD_MIN_LENGTH=12

# ==============================================
# 🆔 IDENTIFICADORES ÚNICOS
# ==============================================

UNIQUE_UUID=$UNIQUE_UUID
INSTANCE_ID=$(generate_uuid)
DEPLOYMENT_ID=$(date +%s)

# ==============================================
# 🔒 SEGURIDAD AVANZADA
# ==============================================

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Headers de seguridad
SECURITY_HEADERS_ENABLED=true
SECURITY_CSP_ENABLED=true
SECURITY_HSTS_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_SENSITIVE=false
EOF

    print_success "Archivo .env.production creado"
    echo ""
    echo -e "${AMARILLO}IMPORTANTE:${NC}"
    echo "1. Mantén este archivo SEGURO y NUNCA lo subas a Git"
    echo "2. Copia las claves necesarias a Cloudflare Pages secrets"
    echo "3. Guarda una copia de seguridad en un lugar seguro"
    echo "4. Usa diferentes claves para desarrollo y producción"
}

# Mostrar comandos de Cloudflare
show_cloudflare_commands() {
    echo -e "${AZUL}Comandos para configurar en Cloudflare Pages:${NC}"
    echo ""
    echo -e "${AMARILLO}# Configurar secretos en Cloudflare:${NC}"
    echo "npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro"
    echo "echo '$JWT_SECRET' | npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro"
    echo ""
    echo "npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro"
    echo "echo '$ENCRYPTION_KEY' | npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro"
    echo ""
    echo "npx wrangler pages secret put TOTP_SECRET --project-name docusentinel-pro"
    echo "echo '$TOTP_SECRET' | npx wrangler pages secret put TOTP_SECRET --project-name docusentinel-pro"
    echo ""
    echo -e "${AMARILLO}# Verificar secretos:${NC}"
    echo "npx wrangler pages secret list --project-name docusentinel-pro"
    echo ""
}

# Función principal
main() {
    # Verificar que openssl está instalado
    if ! command -v openssl &> /dev/null; then
        echo -e "${ROJO}Error: openssl no está instalado${NC}"
        echo "Por favor instala openssl:"
        echo "  Ubuntu/Debian: sudo apt-get install openssl"
        echo "  macOS: brew install openssl"
        echo "  CentOS/RHEL: sudo yum install openssl"
        exit 1
    fi
    
    echo ""
    echo -e "${AZUL}Este script generará claves criptográficas seguras para producción${NC}"
    echo -e "${AMARILLO}Las claves generadas son CRÍTICAS para la seguridad de tu aplicación${NC}"
    echo ""
    read -p "¿Deseas continuar? (s/n): " confirmacion
    
    if [ "$confirmacion" != "s" ] && [ "$confirmacion" != "S" ]; then
        echo "Operación cancelada"
        exit 0
    fi
    
    # Generar claves
    generate_all_keys
    
    # Preguntar si generar claves asimétricas
    read -p "¿Generar claves asimétricas (RSA/EC)? (s/n): " asimetrica
    if [ "$asimetrica" = "s" ] || [ "$asimetrica" = "S" ]; then
        generate_asymmetric_keys
    fi
    
    # Generar archivo .env
    generate_env_file
    
    # Mostrar comandos de Cloudflare
    show_cloudflare_commands
    
    echo -e "${VERDE}✅ Generación de claves completada${NC}"
    echo ""
    echo -e "${AMARILLO}⚠️  IMPORTANTE:${NC}"
    echo "1. Copia las claves necesarias a Cloudflare Pages secrets YA"
    echo "2. Guarda el archivo .env.production en un lugar SEGURO"
    echo "3. NUNCA compartas estas claves"
    echo "4. Usa diferentes claves para cada ambiente"
    echo ""
    echo -e "${AZUL}Próximos pasos:${NC}"
    echo "1. Ejecuta los comandos de Cloudflare mostrados arriba"
    echo "2. Verifica que los secretos estén configurados"
    echo "3. Despliega tu aplicación"
    echo "4. Ejecuta las pruebas de integración"
}

# Ejecutar
main "$@"