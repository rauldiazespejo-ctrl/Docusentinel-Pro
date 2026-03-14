# 🚀 DocuSentinel Pro - Guía de Despliegue a Producción

## 📋 Pasos para Desplegar a Producción

### 1. Configurar API Key de Cloudflare
Primero necesitas configurar tu API key. Ve a la pestaña "Deploy" en el sidebar y sigue las instrucciones.

### 2. Crear Servicios de Cloudflare
Una vez configurada la API key, ejecuta estos comandos:

```bash
# Crear base de datos D1
npx wrangler d1 create docusentinel-pro-production

# Crear KV namespace
npx wrangler kv:namespace create docusentinel-pro-kv
npx wrangler kv:namespace create docusentinel-pro-kv --preview

# Crear R2 bucket
npx wrangler r2 bucket create docusentinel-pro-bucket
```

### 3. Actualizar wrangler.jsonc con los IDs
Después de crear los servicios, actualiza el archivo `wrangler.jsonc` con los IDs que obtuviste:

```json
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
      "database_name": "docusentinel-pro-production",
      "database_id": "TU-DATABASE-ID-AQUI"
    }
  ],

  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "TU-KV-ID-AQUI",
      "preview_id": "TU-KV-PREVIEW-ID-AQUI"
    }
  ],

  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "docusentinel-pro-bucket"
    }
  ]
}
```

### 4. Aplicar Migraciones a Producción
```bash
# Aplicar migraciones a la base de datos de producción
cd /home/user/webapp
npx wrangler d1 migrations apply docusentinel-pro-production
```

### 5. Configurar Variables de Entorno
```bash
# Configurar variables de entorno para producción
cd /home/user/webapp
npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro
npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro
npx wrangler pages secret put API_KEY --project-name docusentinel-pro
```

### 6. Construir y Desplegar
```bash
# Construir para producción
npm run build

# Desplegar a Cloudflare Pages
npm run deploy:prod
```

### 7. Verificar Despliegue
Una vez desplegado, obtendrás una URL como:
`https://[hash].docusentinel-pro.pages.dev`

## 🔧 Comandos Útiles

```bash
# Ver estado de Wrangler
npx wrangler whoami

# Listar secretos configurados
npx wrangler pages secret list --project-name docusentinel-pro

# Ver logs de producción
npx wrangler pages deployment tail --project-name docusentinel-pro

# Eliminar despliegue anterior (si es necesario)
npx wrangler pages deployment list --project-name docusentinel-pro
```

## 📊 Monitoreo en Producción

### Métricas Disponibles:
- **Tiempo de respuesta**: Dashboard de Cloudflare
- **Errores**: Logs en tiempo real
- **Uso de recursos**: Analytics de Pages
- **Seguridad**: WAF y rate limiting

### URLs de Monitoreo:
- **Dashboard**: `https://dash.cloudflare.com/[tu-cuenta]/pages/view/docusentinel-pro`
- **Analytics**: `https://dash.cloudflare.com/[tu-cuenta]/analytics`
- **Logs**: `https://dash.cloudflare.com/[tu-cuenta]/logs`

## 🚨 Solución de Problemas

### Error: "Failed to deploy"
1. Verificar que la API key tenga los permisos correctos
2. Comprobar que el nombre del proyecto esté disponible
3. Revisar límites de Cloudflare en tu plan

### Error: "Database not found"
1. Verificar que la base de datos D1 esté creada
2. Comprobar el ID en wrangler.jsonc
3. Asegurar que las migraciones se aplicaron

### Error: "KV namespace not found"
1. Crear el KV namespace con el comando correcto
2. Actualizar los IDs en wrangler.jsonc
3. Verificar que el namespace existe en el dashboard

## 📞 Soporte

Si encuentras problemas durante el despliegue:
1. Verifica los logs de Wrangler: `npx wrangler logs`
2. Consulta la documentación de Cloudflare: https://developers.cloudflare.com/pages/
3. Revisa la configuración de tu cuenta en el dashboard de Cloudflare

---

**🎯 Última actualización**: Marzo 2026
**⚡ Versión**: 2.0.0 - Configuración para Producción