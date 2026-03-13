#!/bin/bash

# DocuSentinel Pro - Netlify Deploy Helper
# Este script ayuda a desplegar correctamente en Netlify desde tu máquina local

echo "=== DocuSentinel Pro - Netlify Deploy Helper ==="
echo ""

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde la raíz del proyecto (webapp)"
    exit 1
fi

# Paso 1: Verificar variables de entorno
echo "📋 Paso 1: Verificando variables de entorno..."
if [ ! -f ".env" ]; then
    echo "⚠️  Advertencia: No se encontró el archivo .env"
    echo "   Debes crear un archivo .env con las siguientes variables:"
    echo "   JWT_SECRET=tu-secreto-jwt-super-seguro"
    echo "   ENCRYPTION_KEY=tu-clave-de-cifrado-32-bytes-exactos"
    echo "   NODE_ENV=production"
else
    echo "✅ Archivo .env encontrado"
fi

# Paso 2: Build del proyecto
echo ""
echo "🔨 Paso 2: Construyendo el proyecto..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completado exitosamente"
    echo "📁 Contenido de dist/:"
    ls -la dist/
else
    echo "❌ Error en el build"
    exit 1
fi

# Paso 3: Verificar netlify.toml
echo ""
echo "⚙️  Paso 3: Verificando configuración de Netlify..."
if [ -f "netlify.toml" ]; then
    echo "✅ Archivo netlify.toml encontrado"
    echo "📄 Contenido:"
    cat netlify.toml
else
    echo "❌ No se encontró netlify.toml"
    exit 1
fi

# Paso 4: Verificar funciones de Netlify
echo ""
echo "🔧 Paso 4: Verificando funciones de Netlify..."
if [ -d "netlify/functions" ]; then
    echo "✅ Directorio netlify/functions encontrado"
    echo "📁 Funciones disponibles:"
    ls -la netlify/functions/
else
    echo "❌ No se encontró el directorio netlify/functions"
    exit 1
fi

# Paso 5: Información de despliegue
echo ""
echo "🚀 Paso 5: Información para despliegue..."
echo ""
echo "Para desplegar en Netlify, ejecuta uno de estos comandos:"
echo ""
echo "Opción 1 - Despliegue manual (arrastrar y soltar):"
echo "   1. Abre https://app.netlify.com/sites/docusentinelpro"
echo "   2. Ve a 'Deploy settings'"
echo "   3. En 'Build settings', configura:"
echo "      - Build command: npm run build"
echo "      - Publish directory: dist"
echo "   4. Arrastra la carpeta 'dist' al área de despliegue"
echo ""
echo "Opción 2 - Despliegue con CLI:"
echo "   netlify deploy --prod --dir=dist --functions=netlify/functions"
echo ""
echo "Opción 3 - Despliegue con build automático:"
echo "   netlify build && netlify deploy --prod"
echo ""

# Paso 6: Verificar variables de entorno en Netlify
echo ""
echo "🔐 Paso 6: Verificar variables de entorno en Netlify..."
echo "   Asegúrate de configurar estas variables en https://app.netlify.com/sites/docusentinelpro/settings/deploys#environment"
echo "   - JWT_SECRET: tu-secreto-jwt-super-seguro"
echo "   - ENCRYPTION_KEY: tu-clave-de-cifrado-32-bytes-exactos"
echo "   - NODE_ENV: production"
echo ""

echo "=== Resumen ==="
echo "✅ Proyecto listo para desplegar"
echo "📍 Sitio en Netlify: https://docusentinelpro.netlify.app"
echo "📍 Panel de control: https://app.netlify.com/sites/docusentinelpro"
echo ""
echo "Próximos pasos:"
echo "1. Configura las variables de entorno en Netlify"
echo "2. Ejecuta: netlify build && netlify deploy --prod"
echo "3. Verifica los endpoints de producción"
echo ""

# Verificación final
echo "🔍 Verificación final..."
echo "Endpoints que deberían funcionar después del despliegue:"
echo "- https://docusentinelpro.netlify.app/"
echo "- https://docusentinelpro.netlify.app/.netlify/functions/api/health"
echo "- https://docusentinelpro.netlify.app/.netlify/functions/api/docs"
echo "- https://docusentinelpro.netlify.app/.netlify/functions/api/auth/register"