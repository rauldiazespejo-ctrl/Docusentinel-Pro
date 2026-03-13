#!/bin/bash

# Script de validación para DocuSentinel Pro Deployment
# Este script verifica cada paso del despliegue

set -e

echo "🔍 VALIDADOR DE DESPLIEGUE DOCUSENTINEL PRO"
echo "============================================="
echo ""

# Colores para output
ROJO='\033[0;31m'
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
AZUL='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir estado
imprimir_estado() {
    local paso=$1
    local estado=$2
    if [ "$estado" = "OK" ]; then
        echo -e "${VERDE}✅ PASO $paso: COMPLETADO${NC}"
    elif [ "$estado" = "ERROR" ]; then
        echo -e "${ROJO}❌ PASO $paso: FALLIDO${NC}"
    else
        echo -e "${AMARILLO}⏳ PASO $paso: EN PROGRESO${NC}"
    fi
}

# Función para verificar comando
verificar_comando() {
    local comando=$1
    local descripcion=$2
    if command -v $comando &> /dev/null; then
        echo -e "${VERDE}✅ $descripcion${NC}"
        return 0
    else
        echo -e "${ROJO}❌ $descripcion${NC}"
        return 1
    fi
}

# Menú principal
mostrar_menu() {
    echo ""
    echo "Selecciona una opción:"
    echo "1. Validar preparación (Node.js, npm, wrangler)"
    echo "2. Validar autenticación Cloudflare"
    echo "3. Validar base de datos D1"
    echo "4. Validar KV namespaces"
    echo "5. Validar bucket R2"
    echo "6. Validar configuración wrangler.jsonc"
    echo "7. Validar secretos configurados"
    echo "8. Validar migraciones aplicadas"
    echo "9. Validar build y despliegue"
    echo "10. Validación completa (todos los pasos)"
    echo "11. Diagnóstico y solución de problemas"
    echo "12. Salir"
    echo ""
    read -p "Opción: " opcion
    return $opcion
}

# 1. Validar preparación
validar_preparacion() {
    echo ""
    echo "🔧 VALIDANDO PREPARACIÓN INICIAL"
    echo "================================="
    
    local todo_bien=true
    
    # Verificar Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${VERDE}✅ Node.js encontrado: $NODE_VERSION${NC}"
        
        # Verificar versión mínima (v18+)
        if [[ "$NODE_VERSION" =~ ^v([0-9]+)\. ]]; then
            MAJOR_VERSION=${BASH_REMATCH[1]}
            if [ "$MAJOR_VERSION" -ge 18 ]; then
                echo -e "${VERDE}✅ Versión de Node.js compatible (18+)${NC}"
            else
                echo -e "${ROJO}❌ Versión de Node.js incompatible. Se requiere 18+${NC}"
                todo_bien=false
            fi
        fi
    else
        echo -e "${ROJO}❌ Node.js no encontrado${NC}"
        todo_bien=false
    fi
    
    # Verificar npm
    if verificar_comando "npm" "npm instalado"; then
        NPM_VERSION=$(npm --version)
        echo -e "${VERDE}✅ npm versión: $NPM_VERSION${NC}"
    else
        todo_bien=false
    fi
    
    # Verificar wrangler
    if command -v npx &> /dev/null; then
        echo -e "${VERDE}✅ npx disponible${NC}"
        if npx wrangler --version &> /dev/null; then
            WRANGLER_VERSION=$(npx wrangler --version)
            echo -e "${VERDE}✅ Wrangler disponible: $WRANGLER_VERSION${NC}"
        else
            echo -e "${ROJO}❌ Wrangler no disponible${NC}"
            todo_bien=false
        fi
    else
        echo -e "${ROJO}❌ npx no disponible${NC}"
        todo_bien=false
    fi
    
    # Verificar directorio actual
    if [ -f "package.json" ]; then
        echo -e "${VERDE}✅ Estás en el directorio correcto${NC}"
    else
        echo -e "${ROJO}❌ No estás en el directorio del proyecto${NC}"
        echo -e "${AMARILLO}💡 Debes estar en: cd /home/user/webapp${NC}"
        todo_bien=false
    fi
    
    if [ "$todo_bien" = true ]; then
        echo -e "${VERDE}✅ PREPARACIÓN COMPLETA${NC}"
        return 0
    else
        echo -e "${ROJO}❌ PREPARACIÓN INCOMPLETA${NC}"
        return 1
    fi
}

# 2. Validar autenticación Cloudflare
validar_auth() {
    echo ""
    echo "🔐 VALIDANDO AUTENTICACIÓN CLOUDFLARE"
    echo "====================================="
    
    if npx wrangler whoami &> /dev/null; then
        echo -e "${VERDE}✅ Autenticación exitosa${NC}"
        ACCOUNT_INFO=$(npx wrangler whoami 2>/dev/null | head -n 5)
        echo -e "${AZUL}Información de cuenta:${NC}"
        echo "$ACCOUNT_INFO"
        return 0
    else
        echo -e "${ROJO}❌ Error de autenticación${NC}"
        echo -e "${AMARILLO}💡 Ejecuta: setup_cloudflare_api_key${NC}"
        return 1
    fi
}

# 3. Validar D1
validar_d1() {
    echo ""
    echo "🗄️ VALIDANDO BASE DE DATOS D1"
    echo "============================="
    
    if npx wrangler d1 list | grep -q "docusentinel-pro"; then
        echo -e "${VERDE}✅ Base de datos D1 existe${NC}"
        
        # Obtener ID
        DB_ID=$(npx wrangler d1 list | grep "docusentinel-pro" | awk -F'│' '{print $3}' | tr -d ' ')
        echo -e "${AZUL}ID de base de datos: $DB_ID${NC}"
        
        # Verificar si está en wrangler.jsonc
        if grep -q "$DB_ID" wrangler.jsonc; then
            echo -e "${VERDE}✅ ID configurado en wrangler.jsonc${NC}"
        else
            echo -e "${AMARILLO}⚠️ ID no encontrado en wrangler.jsonc${NC}"
            echo -e "${AMARILLO}💡 Actualiza el archivo con el ID: $DB_ID${NC}"
        fi
        return 0
    else
        echo -e "${ROJO}❌ Base de datos D1 no encontrada${NC}"
        echo -e "${AMARILLO}💡 Ejecuta: npx wrangler d1 create docusentinel-pro${NC}"
        return 1
    fi
}

# 4. Validar KV
validar_kv() {
    echo ""
    echo "📁 VALIDANDO KV NAMESPACES"
    echo "==========================="
    
    local kv_count=$(npx wrangler kv:namespace list | grep -c "docusentinel-pro-kv" || echo "0")
    
    if [ "$kv_count" -ge 2 ]; then
        echo -e "${VERDE}✅ KV namespaces encontrados: $kv_count${NC}"
        
        # Obtener IDs
        echo -e "${AZUL}IDs de KV:${NC}"
        npx wrangler kv:namespace list | grep "docusentinel-pro-kv" | awk -F'│' '{print "  - " $3}' | tr -d ' '
        
        return 0
    else
        echo -e "${ROJO}❌ KV namespaces incompletos (encontrados: $kv_count)${NC}"
        echo -e "${AMARILLO}💡 Ejecuta:${NC}"
        echo -e "${AMARILLO}  npx wrangler kv:namespace create docusentinel-pro-kv${NC}"
        echo -e "${AMARILLO}  npx wrangler kv:namespace create docusentinel-pro-kv --preview${NC}"
        return 1
    fi
}

# 5. Validar R2
validar_r2() {
    echo ""
    echo "☁️ VALIDANDO BUCKET R2"
    echo "======================="
    
    if npx wrangler r2 bucket list | grep -q "docusentinel-pro-bucket"; then
        echo -e "${VERDE}✅ Bucket R2 existe${NC}"
        return 0
    else
        echo -e "${ROJO}❌ Bucket R2 no encontrado${NC}"
        echo -e "${AMARILLO}💡 Ejecuta: npx wrangler r2 bucket create docusentinel-pro-bucket${NC}"
        return 1
    fi
}

# 6. Validar wrangler.jsonc
validar_wrangler_config() {
    echo ""
    echo "⚙️ VALIDANDO CONFIGURACIÓN WRANGLER"
    echo "==================================="
    
    if [ ! -f "wrangler.jsonc" ]; then
        echo -e "${ROJO}❌ wrangler.jsonc no existe${NC}"
        return 1
    fi
    
    local errores=0
    
    # Verificar estructura básica
    if grep -q '"name": "docusentinel-pro"' wrangler.jsonc; then
        echo -e "${VERDE}✅ Nombre del proyecto correcto${NC}"
    else
        echo -e "${ROJO}❌ Nombre del proyecto incorrecto${NC}"
        ((errores++))
    fi
    
    # Verificar D1 configurado
    if grep -q "docusentinel-pro" wrangler.jsonc && grep -q "database_id" wrangler.jsonc; then
        echo -e "${VERDE}✅ D1 configurado${NC}"
    else
        echo -e "${ROJO}❌ D1 no configurado correctamente${NC}"
        ((errores++))
    fi
    
    # Verificar KV configurado
    if grep -q "kv_namespaces" wrangler.jsonc; then
        echo -e "${VERDE}✅ KV namespaces configurados${NC}"
    else
        echo -e "${ROJO}❌ KV namespaces no configurados${NC}"
        ((errores++))
    fi
    
    # Verificar R2 configurado
    if grep -q "r2_buckets" wrangler.jsonc; then
        echo -e "${VERDE}✅ R2 bucket configurado${NC}"
    else
        echo -e "${ROJO}❌ R2 bucket no configurado${NC}"
        ((errores++))
    fi
    
    if [ $errores -eq 0 ]; then
        echo -e "${VERDE}✅ CONFIGURACIÓN WRANGLER COMPLETA${NC}"
        return 0
    else
        echo -e "${ROJO}❌ CONFIGURACIÓN WRANGLER INCOMPLETA ($errores errores)${NC}"
        return 1
    fi
}

# 7. Validar secretos
validar_secretos() {
    echo ""
    echo "🔑 VALIDANDO SECRETOS CONFIGURADOS"
    echo "================================="
    
    local secret_count=$(npx wrangler pages secret list --project-name docusentinel-pro 2>/dev/null | grep -c "JWT_SECRET\|ENCRYPTION_KEY\|TOTP_SECRET" || echo "0")
    
    if [ "$secret_count" -ge 3 ]; then
        echo -e "${VERDE}✅ Todos los secretos están configurados${NC}"
        echo -e "${AZUL}Secretos encontrados:${NC}"
        npx wrangler pages secret list --project-name docusentinel-pro 2>/dev/null | grep -E "JWT_SECRET|ENCRYPTION_KEY|TOTP_SECRET"
        return 0
    else
        echo -e "${ROJO}❌ Secretos incompletos (encontrados: $secret_count/3)${NC}"
        echo -e "${AMARILLO}💡 Ejecuta los comandos para configurar:${NC}"
        echo -e "${AMARILLO}  npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro${NC}"
        echo -e "${AMARILLO}  npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro${NC}"
        echo -e "${AMARILLO}  npx wrangler pages secret put TOTP_SECRET --project-name docusentinel-pro${NC}"
        return 1
    fi
}

# 8. Validar migraciones
validar_migraciones() {
    echo ""
    echo "🗃️ VALIDANDO MIGRACIONES"
    echo "======================="
    
    # Verificar si hay migraciones aplicadas
    local table_count=$(npx wrangler d1 execute docusentinel-pro --remote --command="SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'" 2>/dev/null | grep -o '[0-9]*' || echo "0")
    
    if [ "$table_count" -gt 5 ]; then
        echo -e "${VERDE}✅ Migraciones aplicadas ($table_count tablas)${NC}"
        return 0
    else
        echo -e "${AMARILLO}⚠️ Pocas tablas encontradas ($table_count)${NC}"
        echo -e "${AMARILLO}💡 Ejecuta: npx wrangler d1 migrations apply docusentinel-pro --remote${NC}"
        return 1
    fi
}

# 9. Validar build y despliegue
validar_build_deploy() {
    echo ""
    echo "🚀 VALIDANDO BUILD Y DESPLIEGUE"
    echo "==============================="
    
    # Verificar build
    if [ -d "dist" ] && [ -f "dist/_worker.js" ]; then
        echo -e "${VERDE}✅ Build completado${NC}"
    else
        echo -e "${ROJO}❌ Build no encontrado${NC}"
        echo -e "${AMARILLO}💡 Ejecuta: npm run build${NC}"
        return 1
    fi
    
    # Verificar si está desplegado (esto es una verificación básica)
    echo -e "${AZUL}Para verificar el despliegue, ejecuta:${NC}"
    echo -e "${AMARILLO}  npx wrangler pages deploy dist --project-name docusentinel-pro${NC}"
    
    return 0
}

# Diagnóstico completo
diagnostico_completo() {
    echo ""
    echo "🔧 DIAGNÓSTICO COMPLETO"
    echo "====================="
    
    echo -e "${AZUL}Resumen de errores comunes:${NC}"
    echo -e "${ROJO}1. Autenticación:${NC} setup_cloudflare_api_key"
    echo -e "${ROJO}2. Base de datos:${NC} npx wrangler d1 create docusentinel-pro"
    echo -e "${ROJO}3. KV namespaces:${NC} npx wrangler kv:namespace create docusentinel-pro-kv (dos veces)"
    echo -e "${ROJO}4. R2 bucket:${NC} npx wrangler r2 bucket create docusentinel-pro-bucket"
    echo -e "${ROJO}5. Secretos:${NC} npx wrangler pages secret put ... (tres veces)"
    echo -e "${ROJO}6. Migraciones:${NC} npx wrangler d1 migrations apply docusentinel-pro --remote"
    echo ""
    
    echo -e "${AZUL}Scripts útiles:${NC}"
    echo "./validar-pasos.sh  # Este script"
    echo "./deploy.sh         # Script de despliegue automático"
    echo ""
    
    echo -e "${AZUL}Comandos de debug:${NC}"
    echo "npx wrangler whoami"
    echo "npx wrangler tail"
    echo "npx wrangler pages secret list --project-name docusentinel-pro"
}

# Validación completa
validacion_completa() {
    echo ""
    echo -e "${AZUL}🧪 EJECUTANDO VALIDACIÓN COMPLETA${NC}"
    echo "================================="
    
    local errores=0
    
    validar_preparacion || ((errores++))
    validar_auth || ((errores++))
    validar_d1 || ((errores++))
    validar_kv || ((errores++))
    validar_r2 || ((errores++))
    validar_wrangler_config || ((errores++))
    validar_secretos || ((errores++))
    validar_migraciones || ((errores++))
    validar_build_deploy || ((errores++))
    
    echo ""
    if [ $errores -eq 0 ]; then
        echo -e "${VERDE}🎉 ¡TODO LISTO PARA DESPLEGAR!${NC}"
    else
        echo -e "${ROJO}❌ Se encontraron $errores problemas${NC}"
        diagnostico_completo
    fi
    
    return $errores
}

# Main
main() {
    while true; do
        mostrar_menu
        opcion=$?
        
        case $opcion in
            1) validar_preparacion ;;
            2) validar_auth ;;
            3) validar_d1 ;;
            4) validar_kv ;;
            5) validar_r2 ;;
            6) validar_wrangler_config ;;
            7) validar_secretos ;;
            8) validar_migraciones ;;
            9) validar_build_deploy ;;
            10) validacion_completa ;;
            11) diagnostico_completo ;;
            12) echo "¡Hasta luego!"; exit 0 ;;
            *) echo -e "${ROJO}Opción inválida${NC}" ;;
        esac
        
        echo ""
        read -p "Presiona Enter para continuar..."
    done
}

# Ejecutar
main "$@"