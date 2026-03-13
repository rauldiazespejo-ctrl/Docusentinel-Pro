#!/bin/bash

# Script de pruebas de integración para DocuSentinel Pro en producción
# Este script prueba todos los endpoints críticos después del despliegue

set -e

# Colores
ROJO='\033[0;31m'
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
AZUL='\033[0;34m'
NC='\033[0m'

# Configuración
BASE_URL="https://docusentinel-pro.pages.dev"
TOTAL_PRUEBAS=0
PRUEBAS_EXITOSAS=0
PRUEBAS_FALLIDAS=0

# Funciones de utilidad
print_test() {
    echo -e "${AZUL}[PRUEBA]${NC} $1"
    ((TOTAL_PRUEBAS++))
}

print_success() {
    echo -e "${VERDE}✅ $1${NC}"
    ((PRUEBAS_EXITOSAS++))
}

print_error() {
    echo -e "${ROJO}❌ $1${NC}"
    ((PRUEBAS_FALLIDAS++))
}

print_warning() {
    echo -e "${AMARILLO}⚠️ $1${NC}"
}

# Función para hacer petición HTTP
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    
    local url="${BASE_URL}${endpoint}"
    
    if [ "$method" = "GET" ]; then
        curl -s -w "%{http_code}" -X GET "$url" -o /tmp/response.json
    elif [ "$method" = "POST" ]; then
        curl -s -w "%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$data" -o /tmp/response.json
    elif [ "$method" = "PUT" ]; then
        curl -s -w "%{http_code}" -X PUT "$url" -H "Content-Type: application/json" -d "$data" -o /tmp/response.json
    fi
}

# 1. Prueba de health check
test_health_check() {
    print_test "Probando health check..."
    
    local response=$(make_request "GET" "/api/health")
    
    if [ "$response" = "200" ]; then
        local body=$(cat /tmp/response.json)
        if echo "$body" | grep -q "status.*ok\|healthy\|online"; then
            print_success "Health check funcional"
        else
            print_error "Health check respondió pero con body inesperado: $body"
        fi
    else
        print_error "Health check falló con código: $response"
    fi
}

# 2. Prueba de documentación API
test_api_docs() {
    print_test "Probando documentación API..."
    
    local response=$(make_request "GET" "/api/docs")
    
    if [ "$response" = "200" ]; then
        local body=$(cat /tmp/response.json)
        if echo "$body" | grep -q "openapi\|swagger\|paths"; then
            print_success "Documentación API accesible"
        else
            print_warning "Documentación accesible pero formato inesperado"
        fi
    else
        print_error "Documentación API no accesible: $response"
    fi
}

# 3. Prueba de registro de usuario
test_user_registration() {
    print_test "Probando registro de usuario..."
    
    local test_email="test-$(date +%s)@example.com"
    local test_password="TestPassword123!"
    
    local data="{\"email\":\"$test_email\",\"password\":\"$test_password\",\"name\":\"Test User\"}"
    local response=$(make_request "POST" "/api/auth/register" "$data")
    
    if [ "$response" = "201" ] || [ "$response" = "200" ]; then
        local body=$(cat /tmp/response.json)
        if echo "$body" | grep -q "token\|user\|id"; then
            print_success "Registro de usuario funcional"
            # Extraer token para pruebas posteriores
            echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 > /tmp/test_token.txt
        else
            print_warning "Registro funcional pero respuesta inesperada"
        fi
    else
        print_error "Registro falló: $response"
    fi
}

# 4. Prueba de login
test_user_login() {
    print_test "Probando login de usuario..."
    
    # Usar credenciales de prueba estándar
    local data="{\"email\":\"test@example.com\",\"password\":\"TestPassword123!\"}"
    local response=$(make_request "POST" "/api/auth/login" "$data")
    
    if [ "$response" = "200" ]; then
        local body=$(cat /tmp/response.json)
        if echo "$body" | grep -q "token\|access_token"; then
            print_success "Login funcional"
        else
            print_warning "Login funcional pero sin token"
        fi
    else
        print_error "Login falló: $response"
    fi
}

# 5. Prueba de MFA/TOTP
test_mfa_setup() {
    print_test "Probando configuración MFA..."
    
    local data="{\"action\":\"setup\"}"
    local response=$(make_request "POST" "/api/auth/mfa" "$data")
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        local body=$(cat /tmp/response.json)
        if echo "$body" | grep -q "secret\|qr\|backup_codes"; then
            print_success "MFA configuración funcional"
        else
            print_warning "MFA configuración accesible"
        fi
    else
        print_warning "MFA no disponible o no configurado: $response"
    fi
}

# 6. Prueba de documentos
test_documents() {
    print_test "Probando endpoints de documentos..."
    
    # Listar documentos (público o con token)
    local response=$(make_request "GET" "/api/documents")
    
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        if [ "$response" = "200" ]; then
            print_success "Endpoint de documentos accesible"
        elif [ "$response" = "401" ]; then
            print_success "Documentos protegidos correctamente (401)"
        fi
    else
        print_error "Endpoint de documentos falló: $response"
    fi
}

# 7. Prueba de verificación
test_verification() {
    print_test "Probando verificación de documentos..."
    
    local response=$(make_request "GET" "/api/verification")
    
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        print_success "Endpoint de verificación accesible"
    else
        print_error "Verificación falló: $response"
    fi
}

# 8. Prueba de auditoría
test_audit() {
    print_test "Probando auditoría..."
    
    local response=$(make_request "GET" "/api/audit")
    
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        print_success "Endpoint de auditoría accesible"
    else
        print_error "Auditoría falló: $response"
    fi
}

# 9. Prueba de archivos estáticos
test_static_files() {
    print_test "Probando archivos estáticos..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/favicon.ico")
    
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        # También probar otros archivos estáticos si existen
        for file in "/app.js" "/styles.css" "/logo.png"; do
            local file_response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${file}")
            if [ "$file_response" = "200" ]; then
                print_success "Archivo estático encontrado: $file"
                return
            fi
        done
        print_warning "Archivos estáticos limitados"
    else
        print_error "Archivos estáticos no configurados"
    fi
}

# 10. Prueba de CORS
test_cors() {
    print_test "Probando CORS..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: https://example.com" "${BASE_URL}/api/health")
    
    if [ "$response" = "200" ]; then
        # Verificar headers CORS
        local cors_header=$(curl -s -H "Origin: https://example.com" -I "${BASE_URL}/api/health" | grep -i "access-control-allow-origin")
        if [ -n "$cors_header" ]; then
            print_success "CORS configurado correctamente"
        else
            print_warning "CORS parcialmente configurado"
        fi
    else
        print_warning "CORS no verificado: $response"
    fi
}

# 11. Prueba de rendimiento básico
test_performance() {
    print_test "Probando rendimiento básico..."
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health")
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))  # Convertir a milisegundos
    
    if [ "$response" = "200" ]; then
        if [ "$duration" -lt 1000 ]; then  # Menos de 1 segundo
            print_success "Rendimiento aceptable (${duration}ms)"
        elif [ "$duration" -lt 3000 ]; then  # Menos de 3 segundos
            print_warning "Rendimiento lento (${duration}ms)"
        else
            print_error "Rendimiento muy lento (${duration}ms)"
        fi
    else
        print_error "Rendimiento no verificado: $response"
    fi
}

# 12. Prueba de seguridad básica
test_security() {
    print_test "Probando seguridad básica..."
    
    # Verificar que no exponga información sensible
    local response=$(make_request "GET" "/api/health")
    local body=$(cat /tmp/response.json)
    
    if echo "$body" | grep -qi "password\|secret\|key\|token"; then
        print_error "Posible exposición de información sensible"
    else
        print_success "No se detectó exposición de información sensible"
    fi
    
    # Verificar headers de seguridad
    local security_headers=$(curl -s -I "${BASE_URL}/api/health" | grep -i "x-content-type-options\|x-frame-options\|x-xss-protection")
    if [ -n "$security_headers" ]; then
        print_success "Headers de seguridad presentes"
    else
        print_warning "Headers de seguridad limitados"
    fi
}

# Función principal
ejecutar_pruebas() {
    echo "🧪 INICIANDO PRUEBAS DE INTEGRACIÓN"
    echo "================================="
    echo "URL base: $BASE_URL"
    echo ""
    
    # Ejecutar todas las pruebas
    test_health_check
    echo ""
    
    test_api_docs
    echo ""
    
    test_user_registration
    echo ""
    
    test_user_login
    echo ""
    
    test_mfa_setup
    echo ""
    
    test_documents
    echo ""
    
    test_verification
    echo ""
    
    test_audit
    echo ""
    
    test_static_files
    echo ""
    
    test_cors
    echo ""
    
    test_performance
    echo ""
    
    test_security
    echo ""
    
    # Resumen final
    echo "📊 RESUMEN DE PRUEBAS"
    echo "====================="
    echo "Total de pruebas: $TOTAL_PRUEBAS"
    echo -e "Exitosas: ${VERDE}$PRUEBAS_EXITOSAS${NC}"
    echo -e "Fallidas: ${ROJO}$PRUEBAS_FALLIDAS${NC}"
    echo ""
    
    if [ "$PRUEBAS_FALLIDAS" -eq 0 ]; then
        echo -e "${VERDE}🎉 ¡TODAS LAS PRUEBAS PASARON!${NC}"
        echo "Tu aplicación está lista para producción."
    else
        echo -e "${AMARILLO}⚠️ ALGUNAS PRUEBAS FALLARON${NC}"
        echo "Revisa los errores anteriores."
        exit 1
    fi
}

# Menú interactivo
menu_interactivo() {
    echo "🧪 PRUEBAS DE INTEGRACIÓN DOCUSENTINEL PRO"
    echo "=========================================="
    echo ""
    echo "1. Ejecutar todas las pruebas"
    echo "2. Ejecutar prueba específica"
    echo "3. Cambiar URL base"
    echo "4. Salir"
    echo ""
    read -p "Selecciona una opción: " opcion
    
    case $opcion in
        1) ejecutar_pruebas ;;
        2) 
            echo "Función de prueba específica no implementada"
            echo "Ejecuta: ./test-produccion.sh"
            ;;
        3) 
            read -p "Nueva URL base: " nueva_url
            BASE_URL="$nueva_url"
            echo "URL actualizada a: $BASE_URL"
            ;;
        4) echo "Saliendo..."; exit 0 ;;
        *) echo "Opción inválida" ;;
    esac
}

# Verificar argumentos
if [ "$1" = "--url" ] && [ -n "$2" ]; then
    BASE_URL="$2"
    ejecutar_pruebas
elif [ "$1" = "--menu" ]; then
    menu_interactivo
else
    ejecutar_pruebas
fi