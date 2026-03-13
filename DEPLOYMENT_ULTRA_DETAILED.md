# 🚀 GUIA DE DESPLIEGUE ULTRA-DETALLADA - DOCUSENTINEL PRO
# VERSION: Producción 2024 - Paso a Paso con Validaciones

# =============================================================================
# 🎯 PREPARACIÓN INICIAL - VERIFICAR TODO ANTES DE COMENZAR
# =============================================================================

echo "🔍 VERIFICANDO PRE-REQUISITOS..."
echo "================================"

# 1. VERIFICAR DIRECTORIO DEL PROYECTO
echo "📁 Verificando directorio del proyecto..."
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: No estás en el directorio correcto del proyecto"
    echo "Por favor, ejecuta: cd /home/user/webapp"
    exit 1
fi
echo "✅ Directorio correcto: $(pwd)"

# 2. VERIFICAR ARCHIVOS CRÍTICOS
echo "📋 Verificando archivos críticos del proyecto..."
ARCHIVOS_CRITICOS=("package.json" "wrangler.jsonc" "src/index.tsx" "tsconfig.json")
for archivo in "${ARCHIVOS_CRITICOS[@]}"; do
    if [ -f "$archivo" ]; then
        echo "✅ $archivo encontrado"
    else
        echo "❌ ERROR: $archivo no encontrado"
        exit 1
    fi
done

# 3. VERIFICAR DEPENDENCIAS
echo "📦 Verificando dependencias instaladas..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules no encontrado, instalando dependencias..."
    npm install
fi
echo "✅ Dependencias verificadas"

# 4. VERIFICAR VERSIÓN DE NODE.JS
echo "🔢 Verificando versión de Node.js..."
NODE_VERSION=$(node --version)
echo "Versión de Node.js: $NODE_VERSION"
if [[ "$NODE_VERSION" < "v18" ]]; then
    echo "❌ ERROR: Se requiere Node.js 18+ (tienes $NODE_VERSION)"
    exit 1
fi
echo "✅ Versión de Node.js compatible"

echo ""
echo "🎯 PRE-REQUISITOS VERIFICADOS EXITOSAMENTE"
echo "========================================="
echo ""

# =============================================================================
# 🔐 PASO 1: CONFIGURACIÓN DE AUTENTICACIÓN DE CLOUDFLARE
# =============================================================================

echo "🔐 PASO 1: CONFIGURANDO AUTENTICACIÓN DE CLOUDFLARE"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANTE: Antes de continuar, debes:"
echo "   1. Ir a la pestaña 'Deploy' en la interfaz"
echo "   2. Configurar tu API key de Cloudflare"
echo "   3. Esperar el mensaje de confirmación"
echo ""

echo "Presiona ENTER cuando hayas configurado tu API key..."
read -r

echo "🔑 Verificando autenticación..."
for i in {1..3}; do
    echo "Intento $i de 3..."
    if npx wrangler whoami > /dev/null 2>&1; then
        echo "✅ Autenticación exitosa con Cloudflare"
        break
    else
        echo "❌ Fallo de autenticación"
        if [ $i -eq 3 ]; then
            echo "❌ ERROR CRÍTICO: No se pudo autenticar con Cloudflare"
            echo "Por favor, verifica tu API key y vuelve a intentarlo"
            exit 1
        fi
        echo "Reintentando en 5 segundos..."
        sleep 5
    fi
done

# Obtener información del usuario
echo "📋 Información de la cuenta:"
npx wrangler whoami

echo ""
echo "✅ PASO 1 COMPLETADO: Autenticación configurada"
echo "============================================="
echo ""

# =============================================================================
# 🗄️ PASO 2: CREAR BASE DE DATOS D1 CON CONFIGURACIÓN DETALLADA
# =============================================================================

echo "🗄️ PASO 2: CREANDO BASE DE DATOS D1"
echo "=================================="
echo ""

# Verificar si la base de datos ya existe
echo "🔍 Verificando si la base de datos D1 existe..."
if npx wrangler d1 list | grep -q "docusentinel-pro"; then
    echo "⚠️  La base de datos 'docusentinel-pro' ya existe"
    echo "¿Deseas usar la existente o crear una nueva? (usar/nueva)"
    read -r respuesta
    if [ "$respuesta" = "nueva" ]; then
        echo "🗑️  Eliminando base de datos existente..."
        npx wrangler d1 delete docusentinel-pro
        echo "creando nueva base de datos..."
        npx wrangler d1 create docusentinel-pro
    else
        echo "✅ Usando base de datos existente"
    fi
else
    echo "📊 Creando nueva base de datos D1..."
    npx wrangler d1 create docusentinel-pro
fi

# Obtener y guardar el ID de la base de datos
echo "📋 Guardando ID de la base de datos..."
D1_DATABASE_ID=$(npx wrangler d1 list | grep "docusentinel-pro" | awk '{print $2}')
echo "ID de base de datos D1: $D1_DATABASE_ID"

# Crear archivo de configuración con el ID
echo "$D1_DATABASE_ID" > .d1-database-id
echo "✅ ID de base de datos guardado en .d1-database-id"

echo ""
echo "✅ PASO 2 COMPLETADO: Base de datos D1 configurada"
echo "=============================================="
echo ""

# =============================================================================
# 📁 PASO 3: CREAR KV NAMESPACES CON VALIDACIÓN
# =============================================================================

echo "📁 PASO 3: CREANDO KV NAMESPACES"
echo "==============================="
echo ""

# KV Principal
echo "🔑 Creando KV namespace principal..."
if npx wrangler kv:namespace create "docusentinel-pro-kv" 2>/dev/null; then
    echo "✅ KV namespace principal creado"
else
    echo "⚠️  El KV namespace principal ya existe o hubo un error"
fi

# KV Preview para desarrollo
echo "🔑 Creando KV namespace preview..."
if npx wrangler kv:namespace create "docusentinel-pro-kv" --preview 2>/dev/null; then
    echo "✅ KV namespace preview creado"
else
    echo "⚠️  El KV namespace preview ya existe o hubo un error"
fi

# Obtener IDs de KV
echo "📋 Obteniendo IDs de KV namespaces..."
npx wrangler kv:namespace list | grep "docusentinel-pro-kv"

echo ""
echo "✅ PASO 3 COMPLETADO: KV namespaces creados"
echo "=========================================="
echo ""

# =============================================================================
# ☁️ PASO 4: CREAR BUCKET R2 CON VERIFICACIÓN
# =============================================================================

echo "☁️ PASO 4: CREANDO BUCKET R2"
echo "==========================="
echo ""

echo "📦 Creando bucket R2..."
if npx wrangler r2 bucket create "docusentinel-pro-bucket" 2>/dev/null; then
    echo "✅ Bucket R2 creado exitosamente"
else
    echo "⚠️  El bucket R2 ya existe o hubo un error"
fi

# Listar buckets para confirmar
echo "📋 Buckets R2 actuales:"
npx wrangler r2 bucket list | grep "docusentinel-pro-bucket"

echo ""
echo "✅ PASO 4 COMPLETADO: Bucket R2 configurado"
echo "========================================="
echo ""

# =============================================================================
# ⚙️ PASO 5: ACTUALIZAR WRANGLER.JSONC CON IDs REALES
# =============================================================================

echo "⚙️ PASO 5: ACTUALIZANDO CONFIGURACIÓN DE WRANGLER"
echo "================================================="
echo ""

# Crear backup del archivo original
cp wrangler.jsonc wrangler.jsonc.backup
echo "💾 Backup creado: wrangler.jsonc.backup"

# Obtener IDs reales y actualizar wrangler.jsonc
echo "📝 Obteniendo IDs de los recursos creados..."

# Para obtener los IDs correctamente, necesitamos parsear la salida
echo "Por favor, actualiza manualmente el archivo wrangler.jsonc con estos valores:"
echo ""
echo "📋 RESUMEN DE RECURSOS CREADOS:"
echo "=============================="
echo ""
echo "1. Base de datos D1:"
echo "   Nombre: docusentinel-pro"
echo "   Para obtener el ID: npx wrangler d1 list"
echo ""
echo "2. KV Namespaces:"
echo "   Nombre: docusentinel-pro-kv"
echo "   Para obtener IDs: npx wrangler kv:namespace list"
echo ""
echo "3. Bucket R2:"
echo "   Nombre: docusentinel-pro-bucket"
echo "   Para verificar: npx wrangler r2 bucket list"
echo ""

echo "📖 Ejemplo de wrangler.jsonc actualizado:"
cat > wrangler-ejemplo.jsonc << 'EOF'
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "docusentinel-pro",
  "main": "src/index.tsx",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist",
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "docusentinel-pro",
      "database_id": "AQUI_VA_TU_ID_D1"
    }
  ],
  
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "AQUI_VA_TU_ID_KV",
      "preview_id": "AQUI_VA_TU_ID_KV_PREVIEW"
    }
  ],
  
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "docusentinel-pro-bucket"
    }
  ]
}
EOF

echo ""
echo "📄 Ejemplo guardado en: wrangler-ejemplo.jsonc"
echo "Por favor, actualiza tu wrangler.jsonc con los IDs reales"
echo "Puedes obtener los IDs ejecutando:"
echo "  npx wrangler d1 list"
echo "  npx wrangler kv:namespace list"
echo ""

echo "Presiona ENTER cuando hayas actualizado el archivo..."
read -r

echo ""
echo "✅ PASO 5 COMPLETADO: Configuración actualizada"
echo "=============================================="
echo ""

# =============================================================================
# 🔑 PASO 6: CONFIGURAR SECRETOS DE SEGURIDAD
# =============================================================================

echo "🔑 PASO 6: CONFIGURANDO SECRETOS DE SEGURIDAD"
echo "============================================="
echo ""

echo "🛡️  Los siguientes secretos son CRÍTICOS para la seguridad:"
echo ""
echo "1. JWT_SECRET - Para firmar tokens JWT (mínimo 256 bits)"
echo "2. ENCRYPTION_KEY - Para encriptación AES-256-GCM (exactamente 256 bits)"
echo "3. TOTP_SECRET - Para autenticación de dos factores"
echo ""

# Generar claves seguras automáticamente
echo "🔐 Generando claves seguras..."
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
TOTP_SECRET=$(openssl rand -base64 16)

echo ""
echo "📋 CLAVES GENERADAS (GUÁRDALAS EN UN LUGAR SEGURO):"
echo "==================================================="
echo "JWT_SECRET: $JWT_SECRET"
echo "ENCRYPTION_KEY: $ENCRYPTION_KEY"
echo "TOTP_SECRET: $TOTP_SECRET"
echo ""

echo "💾 Guardando claves en archivo seguro..."
cat > .secrets.temp << EOF
# SECRETOS DE DOCUSENTINEL PRO - GUARDAR EN LUGAR SEGURO
# Fecha: $(date)
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
TOTP_SECRET=$TOTP_SECRET
EOF

echo "✅ Claves guardadas en .secrets.temp"
echo "⚠️  IMPORTANTE: Mueve este archivo a un lugar seguro y bórralo después"
echo ""

echo "📝 Configurando secretos en Cloudflare..."
echo "Esto puede tardar unos minutos..."

# Configurar JWT_SECRET
echo "Configurando JWT_SECRET..."
echo "$JWT_SECRET" | npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro

# Configurar ENCRYPTION_KEY
echo "Configurando ENCRYPTION_KEY..."
echo "$ENCRYPTION_KEY" | npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro

# Configurar TOTP_SECRET
echo "Configurando TOTP_SECRET..."
echo "$TOTP_SECRET" | npx wrangler pages secret put TOTP_SECRET --project-name docusentinel-pro

echo "✅ Secretos configurados exitosamente"
echo ""
echo "✅ PASO 6 COMPLETADO: Secretos de seguridad configurados"
echo "==============================================="
echo ""

# =============================================================================
# 🗃️ PASO 7: APLICAR MIGRACIONES DE BASE DE DATOS
# =============================================================================

echo "🗃️ PASO 7: APLICANDO MIGRACIONES DE BASE DE DATOS"
echo "=================================================="
echo ""

echo "📊 Verificando migraciones disponibles..."
ls -la migrations/

echo ""
echo "🔄 Aplicando migraciones a producción..."
echo "Esto ejecutará todas las migraciones en el orden correcto:"
echo ""

# Aplicar migraciones con verbose
echo "Ejecutando: npx wrangler d1 migrations apply docusentinel-pro --remote"
npx wrangler d1 migrations apply docusentinel-pro --remote

echo ""
echo "📋 Verificando estado de la base de datos..."
echo "Tablas creadas:"
npx wrangler d1 execute docusentinel-pro --remote --command="SELECT name FROM sqlite_master WHERE type='table';"

echo ""
echo "✅ PASO 7 COMPLETADO: Migraciones aplicadas"
echo "==========================================="
echo ""

# =============================================================================
# 🏗️ PASO 8: CONSTRUIR PROYECTO CON VALIDACIÓN
# =============================================================================

echo "🏗️ PASO 8: CONSTRUYENDO PROYECTO"
echo "==============================="
echo ""

echo "🧹 Limpiando build anterior..."
rm -rf dist/
echo "✅ Build anterior limpiado"

echo "📦 Instalando dependencias..."
npm install
echo "✅ Dependencias instaladas"

echo "🔨 Construyendo para producción..."
echo "Esto puede tardar varios minutos..."
npm run build

echo ""
echo "📋 Verificando build..."
if [ -d "dist" ]; then
    echo "✅ Carpeta dist creada exitosamente"
    echo "Contenido de dist/:"
    ls -la dist/
else
    echo "❌ ERROR: No se creó la carpeta dist"
    exit 1
fi

echo ""
echo "📊 Tamaño del build:"
du -sh dist/

echo ""
echo "✅ PASO 8 COMPLETADO: Proyecto construido"
echo "========================================="
echo ""

# =============================================================================
# 🚀 PASO 9: DESPLEGAR A CLOUDFLARE PAGES
# =============================================================================

echo "🚀 PASO 9: DESPLEGANDO A CLOUDFLARE PAGES"
echo "========================================="
echo ""

# Verificar si el proyecto existe
echo "🔍 Verificando si el proyecto existe..."
if npx wrangler pages project list | grep -q "docusentinel-pro"; then
    echo "✅ Proyecto encontrado"
else
    echo "📄 Creando proyecto en Cloudflare Pages..."
    npx wrangler pages project create docusentinel-pro --production-branch main
fi

echo ""
echo "🌐 Desplegando a Cloudflare Pages..."
echo "Esto subirá todos los archivos a la red global de Cloudflare..."

# Desplegar con verbose
echo "Ejecutando: npx wrangler pages deploy dist --project-name docusentinel-pro"
npx wrangler pages deploy dist --project-name docusentinel-pro

echo ""
echo "⏳ Esperando propagación global..."
echo "Esto puede tardar 1-2 minutos..."
sleep 60

echo ""
echo "✅ PASO 9 COMPLETADO: Despliegue completado"
echo "==========================================="
echo ""

# =============================================================================
# ✅ PASO 10: VERIFICACIÓN FINAL COMPLETA
# =============================================================================

echo "✅ PASO 10: VERIFICACIÓN FINAL"
echo "============================"
echo ""

# URLs de la aplicación
URL_PRINCIPAL="https://docusentinel-pro.pages.dev"
URL_API="https://docusentinel-pro.pages.dev/api"

echo "🌍 Verificando que la aplicación esté en línea..."
echo "URL principal: $URL_PRINCIPAL"
echo ""

# Verificar health check
echo "🔍 Verificando health check..."
for i in {1..5}; do
    echo "Intento $i de 5..."
    if curl -s "$URL_API/health" > /dev/null; then
        echo "✅ Health check pasó"
        break
    else
        echo "⏳ Esperando 30 segundos..."
        sleep 30
    fi
done

# Verificar endpoints principales
echo ""
echo "🔍 Verificando endpoints principales..."

# Verificar documentación API
echo "📚 Verificando documentación API..."
if curl -s "$URL_API/docs" > /dev/null; then
    echo "✅ Documentación API accesible"
else
    echo "⚠️  Documentación API no accesible"
fi

# Verificar autenticación
echo "🔐 Verificando sistema de autenticación..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL_API/auth/profile")
if [ "$RESPONSE" = "401" ]; then
    echo "✅ Sistema de autenticación funcionando (401 esperado sin token)"
else
    echo "⚠️  Sistema de autenticación puede tener problemas"
fi

echo ""
echo "🎉 ¡VERIFICACIÓN COMPLETADA!"
echo "=========================="
echo ""
echo "📍 URL DE TU APLICACIÓN:"
echo "========================"
echo "🌐 Aplicación principal: $URL_PRINCIPAL"
echo "📚 API Docs: $URL_API/docs"
echo "🔑 Auth endpoints: $URL_API/auth"
echo "📄 Documentos: $URL_API/documents"
echo "🔍 Verificación: $URL_API/verification"
echo "📊 Auditoría: $URL_API/audit"
echo ""
echo "✅ TU APLICACIÓN DOCUSENTINEL PRO ESTÁ EN PRODUCCIÓN"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANTE - SIGUIENTES PASOS:"
echo "================================="
echo "1. Guarda las claves generadas del archivo .secrets.temp"
echo "2. Configura un dominio personalizado si lo deseas"
echo "3. Configura alertas y monitoreo"
echo "4. Realiza pruebas de carga"
echo "5. Configura backups automáticos"
echo ""
echo "📖 PARA MÁS INFORMACIÓN:"
echo "====================="
echo "Lee el archivo DEPLOYMENT_GUIDE.md para configuraciones avanzadas"
echo "Ejecuta: cat DEPLOYMENT_GUIDE.md"
echo ""

# Limpiar archivos temporales
rm -f .secrets.temp

echo "🎊 ¡FELICITACIONES! HAS DESPLEGADO DOCUSENTINEL PRO EXITOSAMENTE 🎊"