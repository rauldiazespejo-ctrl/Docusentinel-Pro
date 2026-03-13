#!/bin/bash

# Script para probar la aplicación localmente antes de desplegar

echo "🧪 Probando DocuSentinel Pro localmente..."

# Iniciar servidor local de Netlify
npx netlify dev --port 8888 &
SERVER_PID=$!

# Esperar a que el servidor inicie
sleep 5

# Probar endpoints
echo "🌐 Probando endpoints..."

# Health check
echo "Health check:"
curl -s http://localhost:8888/.netlify/functions/api/health | jq .

# Docs
echo "Documentación:"
curl -s http://localhost:8888/.netlify/functions/api/docs | jq .

# Detener servidor
echo "Deteniendo servidor..."
kill $SERVER_PID

echo "✅ Pruebas locales completadas"
