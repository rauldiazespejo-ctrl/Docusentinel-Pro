# 🚨 GUIA DE RESOLUCIÓN DE PROBLEMAS - DOCUSENTINEL PRO
# VERSION: Emergencia - Soluciones Rápidas

# =============================================================================
# ⚡ SOLUCIONES RÁPIDAS POR PROBLEMA
# =============================================================================

echo "🚨 GUIA DE RESOLUCIÓN DE PROBLEMAS - DOCUSENTINEL PRO"
echo "======================================================"
echo ""

# Función para imprimir con colores
print_emergency() {
    echo -e "\033[41;97m🚨 EMERGENCIA: $1\033[0m"
}

print_fix() {
    echo -e "\033[42;97m🔧 SOLUCIÓN: $1\033[0m"
}

print_check() {
    echo -e "\033[44;97m🔍 VERIFICAR: $1\033[0m"
}

# =============================================================================
# PROBLEMA 1: ERROR DE AUTENTICACIÓN DE CLOUDFLARE
# =============================================================================

problema_autenticacion() {
    echo ""
    print_emergency "ERROR DE AUTENTICACIÓN DE CLOUDFLARE"
    echo ""
    print_check "Síntomas:"
    echo "  - npx wrangler whoami falla"
    echo "  - Mensaje: 'In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN'"
    echo "  - Cualquier comando de wrangler falla"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Ve a la pestaña 'Deploy' en la interfaz"
    echo "2. Configura tu API key de Cloudflare"
    echo "3. Espera el mensaje de confirmación"
    echo "4. Ejecuta: npx wrangler whoami"
    echo ""
    
    print_check "VERIFICACIÓN RÁPIDA:"
    echo "Ejecuta: npx wrangler whoami"
    echo "Si ves tu información, el problema está resuelto"
    echo ""
}

# =============================================================================
# PROBLEMA 2: BASE DE DATOS D1 NO ENCONTRADA
# =============================================================================

problema_d1_no_encontrada() {
    echo ""
    print_emergency "BASE DE DATOS D1 NO ENCONTRADA"
    echo ""
    print_check "Síntomas:"
    echo "  - Error: 'Unable to find a D1 DB named docusentinel-pro'"
    echo "  - Migraciones fallan"
    echo "  - No se puede conectar a la base de datos"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Crear la base de datos:"
    echo "   npx wrangler d1 create docusentinel-pro"
    echo ""
    echo "2. Si ya existe pero con problema:"
    echo "   npx wrangler d1 list"
    echo "   # Si aparece, obtener el ID"
    echo ""
    echo "3. Actualizar wrangler.jsonc con el ID correcto"
    echo ""
    
    print_check "VERIFICACIÓN RÁPIDA:"
    echo "npx wrangler d1 list | grep docusentinel-pro"
    echo ""
}

# =============================================================================
# PROBLEMA 3: KV NAMESPACE NO ENCONTRADO
# =============================================================================

problema_kv_no_encontrado() {
    echo ""
    print_emergency "KV NAMESPACE NO ENCONTRADO"
    echo ""
    print_check "Síntomas:"
    echo "  - Error: 'KV namespace not found'"
    echo "  - Problemas con caché o sesiones"
    echo "  - La aplicación no puede acceder a KV"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Crear KV namespace principal:"
    echo "   npx wrangler kv:namespace create docusentinel-pro-kv"
    echo ""
    echo "2. Crear KV namespace para preview:"
    echo "   npx wrangler kv:namespace create docusentinel-pro-kv --preview"
    echo ""
    echo "3. Obtener IDs y actualizar wrangler.jsonc"
    echo "   npx wrangler kv:namespace list | grep docusentinel-pro"
    echo ""
    
    print_check "VERIFICACIÓN RÁPIDA:"
    echo "npx wrangler kv:namespace list | grep docusentinel-pro"
    echo ""
}

# =============================================================================
# PROBLEMA 4: BUCKET R2 NO ENCONTRADO
# =============================================================================

problema_r2_no_encontrado() {
    echo ""
    print_emergency "BUCKET R2 NO ENCONTRADO"
    echo ""
    print_check "Síntomas:"
    echo "  - Error: 'R2 bucket not found'"
    echo "  - Problemas para subir archivos"
    echo "  - La aplicación no puede acceder a R2"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Crear bucket R2:"
    echo "   npx wrangler r2 bucket create docusentinel-pro-bucket"
    echo ""
    echo "2. Verificar que se creó:"
    echo "   npx wrangler r2 bucket list"
    echo ""
    
    print_check "VERIFICACIÓN RÁPIDA:"
    echo "npx wrangler r2 bucket list | grep docusentinel-pro"
    echo ""
}

# =============================================================================
# PROBLEMA 5: SECRETOS NO CONFIGURADOS
# =============================================================================

problema_secretos_no_configurados() {
    echo ""
    print_emergency "SECRETOS DE SEGURIDAD NO CONFIGURADOS"
    echo ""
    print_check "Síntomas:"
    echo "  - Error: 'secret not found'"
    echo "  - JWT no funciona"
    echo "  - Encriptación falla"
    echo "  - Autenticación no funciona"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Configurar JWT_SECRET:"
    echo "   npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro"
    echo "   # Usa una clave segura de 256 bits"
    echo ""
    echo "2. Configurar ENCRYPTION_KEY:"
    echo "   npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro"
    echo "   # Usa una clave de 256 bits"
    echo ""
    echo "3. Configurar TOTP_SECRET:"
    echo "   npx wrangler pages secret put TOTP_SECRET --project-name docusentinel-pro"
    echo "   # Usa un secreto seguro"
    echo ""
    echo "4. Verificar que se configuraron:"
    echo "   npx wrangler pages secret list --project-name docusentinel-pro"
    echo ""
    
    print_check "VERIFICACIÓN RÁPIDA:"
    echo "npx wrangler pages secret list --project-name docusentinel-pro | grep -E '(JWT_SECRET|ENCRYPTION_KEY|TOTP_SECRET)'"
    echo ""
}

# =============================================================================
# PROBLEMA 6: BUILD FALLIDO
# =============================================================================

problema_build_fallido() {
    echo ""
    print_emergency "BUILD FALLIDO"
    echo ""
    print_check "Síntomas:"
    echo "  - npm run build falla"
    echo "  - Errores de TypeScript"
    echo "  - No se crea la carpeta dist/"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Limpiar build anterior:"
    echo "   rm -rf dist/"
    echo ""
    echo "2. Verificar errores de TypeScript:"
    echo "   npm run build 2>&1 | head -20"
    echo ""
    echo "3. Si hay errores de TypeScript, corrígelos en el código"
    echo ""
    echo "4. Intentar build nuevamente:"
    echo "   npm run build"
    echo ""
    echo "5. Verificar resultado:"
    echo "   ls -la dist/"
    echo ""
}

# =============================================================================
# PROBLEMA 7: DESPLIEGUE FALLIDO
# =============================================================================

problema_despliegue_fallido() {
    echo ""
    print_emergency "DESPLIEGUE FALLIDO"
    echo ""
    print_check "Síntomas:"
    echo "  - npx wrangler pages deploy falla"
    echo "  - Error: 'Project not found'"
    echo "  - Error: 'Build failed'"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Verificar que el proyecto existe:"
    echo "   npx wrangler pages project list | grep docusentinel-pro"
    echo ""
    echo "2. Si no existe, crearlo:"
    echo "   npx wrangler pages project create docusentinel-pro --production-branch main"
    echo ""
    echo "3. Verificar que el build existe:"
    echo "   ls -la dist/_worker.js"
    echo ""
    echo "4. Intentar despliegue nuevamente:"
    echo "   npx wrangler pages deploy dist --project-name docusentinel-pro"
    echo ""
    echo "5. Si sigue fallando, ver logs:"
    echo "   npx wrangler tail"
    echo ""
}

# =============================================================================
# PROBLEMA 8: APLICACIÓN NO RESPONDE
# =============================================================================

problema_aplicacion_no_responde() {
    echo ""
    print_emergency "APLICACIÓN NO RESPONDE"
    echo ""
    print_check "Síntomas:"
    echo "  - curl https://docusentinel-pro.pages.dev falla"
    echo "  - Error: 'Connection refused'"
    echo "  - Error: '404 Not Found'"
    echo "  - La página no carga"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Verificar que el despliegue esté completo:"
    echo "   curl -I https://docusentinel-pro.pages.dev"
    echo ""
    echo "2. Verificar health check:"
    echo "   curl https://docusentinel-pro.pages.dev/api/health"
    echo ""
    echo "3. Verificar logs de Cloudflare:"
    echo "   npx wrangler tail"
    echo ""
    echo "4. Verificar que el proyecto esté activo:"
    echo "   npx wrangler pages project list | grep docusentinel-pro"
    echo ""
    echo "5. Si acabas de desplegar, espera 2-3 minutos más"
    echo "   La propagación global puede tardar tiempo"
    echo ""
}

# =============================================================================
# PROBLEMA 9: ERRORES DE CORS
# =============================================================================

problema_cors() {
    echo ""
    print_emergency "PROBLEMAS DE CORS"
    echo ""
    print_check "Síntomas:"
    echo "  - Error: 'CORS policy blocked'"
    echo "  - La API no responde desde el navegador"
    echo "  - Error: 'Access-Control-Allow-Origin'"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Verificar que CORS esté habilitado en el código"
    echo "2. En src/index.tsx, debería haber:"
    echo "   app.use('/api/*', cors())"
    echo ""
    echo "3. Verificar origen CORS permitido"
    echo "4. Para desarrollo local, permitir todos los orígenes:"
    echo "   app.use('/api/*', cors({ origin: '*' }))"
    echo ""
    echo "5. Para producción, especificar dominios permitidos"
    echo ""
}

# =============================================================================
# PROBLEMA 10: BASE DE DATOS CON ERRORES
# =============================================================================

problema_database_errores() {
    echo ""
    print_emergency "BASE DE DATOS CON ERRORES"
    echo ""
    print_check "Síntomas:"
    echo "  - Error: 'SQL error'"
    echo "  - Las migraciones fallan"
    echo "  - No se pueden ejecutar queries"
    echo ""
    
    print_fix "SOLUCIÓN INMEDIATA:"
    echo "1. Verificar estado de la base de datos:"
    echo "   npx wrangler d1 execute docusentinel-pro --remote --command='SELECT 1'"
    echo ""
    echo "2. Verificar tablas existentes:"
    echo "   npx wrangler d1 execute docusentinel-pro --remote --command='SELECT name FROM sqlite_master WHERE type=\"table\";'"
    echo ""
    echo "3. Si hay errores de tabla, recrear:"
    echo "   npx wrangler d1 migrations apply docusentinel-pro --remote"
    echo ""
    echo "4. Si persiste, ver logs:"
    echo "   npx wrangler tail | grep -i error"
    echo ""
}

# =============================================================================
# FUNCIÓN DE DIAGNÓSTICO AUTOMÁTICO
# =============================================================================

 diagnostico_automatico() {
    echo ""
    print_check "EJECUTANDO DIAGNÓSTICO AUTOMÁTICO..."
    echo ""
    
    PROBLEMAS_ENCONTRADOS=0
    
    # 1. Verificar autenticación
    echo "🔐 Verificando autenticación..."
    if ! npx wrangler whoami > /dev/null 2>&1; then
        problema_autenticacion
        PROBLEMAS_ENCONTRADOS=$((PROBLEMAS_ENCONTRADOS + 1))
    fi
    
    # 2. Verificar D1
    echo "🗄️ Verificando base de datos D1..."
    if ! npx wrangler d1 list | grep -q "docusentinel-pro"; then
        problema_d1_no_encontrada
        PROBLEMAS_ENCONTRADOS=$((PROBLEMAS_ENCONTRADOS + 1))
    fi
    
    # 3. Verificar KV
    echo "📁 Verificando KV namespaces..."
    if ! npx wrangler kv:namespace list | grep -q "docusentinel-pro-kv"; then
        problema_kv_no_encontrado
        PROBLEMAS_ENCONTRADOS=$((PROBLEMAS_ENCONTRADOS + 1))
    fi
    
    # 4. Verificar R2
    echo "☁️ Verificando bucket R2..."
    if ! npx wrangler r2 bucket list | grep -q "docusentinel-pro-bucket"; then
        problema_r2_no_encontrado
        PROBLEMAS_ENCONTRADOS=$((PROBLEMAS_ENCONTRADOS + 1))
    fi
    
    # 5. Verificar secretos
    echo "🔑 Verificando secretos..."
    if ! npx wrangler pages secret list --project-name docusentinel-pro | grep -q "JWT_SECRET"; then
        problema_secretos_no_configurados
        PROBLEMAS_ENCONTRADOS=$((PROBLEMAS_ENCONTRADOS + 1))
    fi
    
    # 6. Verificar aplicación
    echo "🌐 Verificando aplicación..."
    if ! curl -s --max-time 5 "https://docusentinel-pro.pages.dev/api/health" > /dev/null; then
        problema_aplicacion_no_responde
        PROBLEMAS_ENCONTRADOS=$((PROBLEMAS_ENCONTRADOS + 1))
    fi
    
    echo ""
    echo "========================================="
    if [ $PROBLEMAS_ENCONTRADOS -eq 0 ]; then
        print_success "✅ NO SE ENCONTRARON PROBLEMAS CRÍTICOS"
        print_success "Tu aplicación debería estar funcionando correctamente"
    else
        print_warning "⚠️  SE ENCONTRARON $PROBLEMAS_ENCONTRADOS PROBLEMAS"
        print_info "Sigue las soluciones proporcionadas arriba"
    fi
    echo "========================================="
}

# =============================================================================
# MENÚ DE EMERGENCIA
# =============================================================================

menu_emergencia() {
    echo ""
    echo -e "\033[41;97m═══════════════════════════════════════\033[0m"
    echo -e "\033[41;97m     🚨 MENÚ DE EMERGENCIA          \033[0m"
    echo -e "\033[41;97m═══════════════════════════════════════\033[0m"
    echo ""
    echo "Selecciona el problema que tienes:"
    echo ""
    echo "1. 🔐 Error de autenticación Cloudflare"
    echo "2. 🗄️ Base de datos D1 no encontrada"
    echo "3. 📁 KV namespace no encontrado"
    echo "4. ☁️ Bucket R2 no encontrado"
    echo "5. 🔑 Secretos no configurados"
    echo "6. 🏗️ Build fallido"
    echo "7. 🚀 Despliegue fallido"
    echo "8. 🌐 Aplicación no responde"
    echo "9. 🔗 Problemas de CORS"
    echo "10. 🗃️ Base de datos con errores"
    echo "11. 🤖 Diagnóstico automático completo"
    echo "12. 📞 Ver comandos de emergencia"
    echo "13. 🚪 Salir"
    echo ""
    echo -n "Selecciona una opción (1-13): "
}

# =============================================================================
# COMANDOS DE EMERGENCIA RÁPIDA
# =============================================================================

comandos_emergencia() {
    echo ""
    print_check "COMANDOS DE EMERGENCIA RÁPIDA"
    echo "=============================="
    echo ""
    
    echo "📋 COMANDOS QUE SIEMPRE FUNCIONAN:"
    echo "================================="
    echo ""
    echo "1. VERIFICAR ESTADO GENERAL:"
    echo "   npx wrangler whoami"
    echo ""
    echo "2. VERIFICAR RECURSOS:"
    echo "   npx wrangler pages project list | grep docusentinel-pro"
    echo "   npx wrangler d1 list | grep docusentinel-pro"
    echo "   npx wrangler kv:namespace list | grep docusentinel-pro"
    echo "   npx wrangler r2 bucket list | grep docusentinel-pro"
    echo ""
    echo "3. VERIFICAR SECRETOS:"
    echo "   npx wrangler pages secret list --project-name docusentinel-pro"
    echo ""
    echo "4. VERIFICAR APLICACIÓN:"
    echo "   curl -I https://docusentinel-pro.pages.dev"
    echo "   curl https://docusentinel-pro.pages.dev/api/health"
    echo ""
    echo "5. VER LOGS EN TIEMPO REAL:"
    echo "   npx wrangler tail"
    echo ""
    echo "6. RECONSTRUIR Y REDEPLEGAR:"
    echo "   rm -rf dist/ && npm run build"
    echo "   npx wrangler pages deploy dist --project-name docusentinel-pro"
    echo ""
    echo "7. OBTENER INFORMACIÓN DETALLADA:"
    echo "   npx wrangler pages project list"
    echo "   npx wrangler d1 info docusentinel-pro"
    echo ""
}

# =============================================================================
# FUNCIÓN PRINCIPAL
# =============================================================================

main_emergencia() {
    while true; do
        clear
        menu_emergencia
        read -r opcion
        
        case $opcion in
            1) problema_autenticacion ;;
            2) problema_d1_no_encontrada ;;
            3) problema_kv_no_encontrado ;;
            4) problema_r2_no_encontrado ;;
            5) problema_secretos_no_configurados ;;
            6) problema_build_fallido ;;
            7) problema_despliegue_fallido ;;
            8) problema_aplicacion_no_responde ;;
            9) problema_cors ;;
            10) problema_database_errores ;;
            11) diagnostico_automatico ;;
            12) comandos_emergencia ;;
            13) echo "¡Hasta luego! 👋"; exit 0 ;;
            *) echo "Opción inválida. Presiona ENTER para continuar..."; read -r ;;
        esac
        
        echo ""
        echo -n "Presiona ENTER para continuar..."
        read -r
    done
}

# Ejecutar función principal de emergencia
main_emergencia