# 🚀 Guía de Despliegue de DocuSentinel Pro

## 📋 REQUISITOS PREVIOS

Antes de comenzar el despliegue, asegúrate de tener:

1. ✅ Cuenta de Cloudflare con acceso a Pages, D1, KV y R2
2. ✅ API key de Cloudflare configurada (ve a la pestaña Deploy)
3. ✅ Node.js 18+ instalado
4. ✅ npm o yarn instalado

---

## 🔐 PASO 1: CONFIGURAR API KEY DE CLOUDFLARE

**IMPORTANTE: Este paso es obligatorio antes de continuar**

1. Ve a la pestaña "Deploy" en la interfaz
2. Configura tu API key de Cloudflare
3. Una vez configurada, ejecuta:

```bash
npx wrangler whoami
```

Si ves tu información de usuario, ¡estás listo para continuar!

---

## 🗄️ PASO 2: CREAR RECURSOS DE CLOUDFLARE

### 2.1 Crear Base de Datos D1

```bash
# Crear base de datos D1
npx wrangler d1 create docusentinel-pro

# Guarda el ID que te muestre - lo necesitarás después
```

### 2.2 Crear KV Namespaces

```bash
# Crear namespace KV principal
npx wrangler kv:namespace create docusentinel-pro-kv

# Crear namespace KV para desarrollo
npx wrangler kv:namespace create docusentinel-pro-kv --preview

# Guarda los IDs de ambos namespaces
```

### 2.3 Crear Bucket R2

```bash
# Crear bucket R2
npx wrangler r2 bucket create docusentinel-pro-bucket
```

---

## ⚙️ PASO 3: ACTUALIZAR CONFIGURACIÓN

### 3.1 Actualizar wrangler.jsonc

Abre el archivo `wrangler.jsonc` y actualiza los siguientes valores con los IDs que obtuviste:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "docusentinel-pro",
      "database_id": "TU-ID-D1-AQUI"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "TU-ID-KV-AQUI",
      "preview_id": "TU-ID-KV-PREVIEW-AQUI"
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

---

## 🔑 PASO 4: CONFIGURAR SECRETOS

Configura los siguientes secretos en Cloudflare Pages:

```bash
# Clave secreta para JWT
npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro
# Usa una clave segura de al menos 256 bits

# Clave de encriptación
npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro
# Usa una clave de 256 bits para AES-256-GCM

# Secreto TOTP
npx wrangler pages secret put TOTP_SECRET --project-name docusentinel-pro
# Usa un secreto seguro para TOTP
```

---

## 🗃️ PASO 5: APLICAR MIGRACIONES DE BASE DE DATOS

### 5.1 Aplicar migraciones en producción

```bash
# Aplicar migraciones a la base de datos D1
npx wrangler d1 migrations apply docusentinel-pro --remote

# Si hay errores, verifica las migraciones en la carpeta migrations/
```

### 5.2 Cargar datos de prueba (opcional)

```bash
# Cargar datos de prueba
npx wrangler d1 execute docusentinel-pro --remote --file=./seed.sql
```

---

## 🚀 PASO 6: CONSTRUIR Y DESPLEGAR

### 6.1 Construir el proyecto

```bash
# Construir para producción
npm run build

# Verificar que se creó la carpeta dist/
ls -la dist/
```

### 6.2 Desplegar a Cloudflare Pages

```bash
# Desplegar a Cloudflare Pages
npx wrangler pages deploy dist --project-name docusentinel-pro

# Si es la primera vez, crea el proyecto primero:
npx wrangler pages project create docusentinel-pro --production-branch main
```

---

## ✅ PASO 7: VERIFICAR EL DESPLIEGUE

### 7.1 Verificar que la aplicación está en línea

```bash
# Obtener la URL de la aplicación
echo "Tu aplicación debería estar disponible en:"
echo "https://docusentinel-pro.pages.dev"

# Verificar que responda
curl https://docusentinel-pro.pages.dev/api/health
```

### 7.2 Verificar endpoints principales

```bash
# Verificar documentación API
curl https://docusentinel-pro.pages.dev/api/docs

# Verificar health check
curl https://docusentinel-pro.pages.dev/api/health

# Verificar autenticación (debe fallar sin token)
curl https://docusentinel-pro.pages.dev/api/auth/profile
```

---

## 🔧 PASO 8: CONFIGURACIÓN POST-DESPLIEGUE

### 8.1 Configurar dominio personalizado (opcional)

```bash
# Agregar dominio personalizado
npx wrangler pages domain add tu-dominio.com --project-name docusentinel-pro
```

### 8.2 Configurar políticas de seguridad

1. Ve al panel de Cloudflare Pages
2. Selecciona tu proyecto
3. Configura las políticas de seguridad:
   - Habilitar HTTPS forzado
   - Configurar CORS
   - Establecer límites de rate limiting

---

## 🧪 PASO 9: PRUEBAS DE INTEGRACIÓN

### 9.1 Probar flujo de autenticación completo

```bash
# 1. Registrar nuevo usuario
curl -X POST https://docusentinel-pro.pages.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# 2. Login
curl -X POST https://docusentinel-pro.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# 3. Verificar perfil (usar token del login)
curl -H "Authorization: Bearer TU_TOKEN_AQUI" \
  https://docusentinel-pro.pages.dev/api/auth/profile
```

### 9.2 Probar verificación de documentos

```bash
# Subir documento para verificación
curl -X POST https://docusentinel-pro.pages.dev/api/verification/upload \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -F "document=@/ruta/al/documento.pdf" \
  -F "type=financial_statement"
```

---

## 📊 MONITOREO Y MANTENIMIENTO

### Logs y monitoreo

1. **Cloudflare Analytics**: Ve al panel de Cloudflare para ver métricas
2. **Logs de Workers**: Usa `npx wrangler tail` para ver logs en tiempo real
3. **Alertas**: Configura alertas para errores 5xx y alta latencia

### Backup y recuperación

1. **Base de datos**: Exporta regularmente desde D1
2. **Archivos**: R2 tiene redundancia automática
3. **Configuración**: Mantén el repositorio git actualizado

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Problemas comunes:

1. **Error 404 en rutas estáticas**: Verifica que los archivos estén en `public/`
2. **Error de CORS**: Actualiza el origen CORS en la configuración
3. **Database connection errors**: Verifica los IDs en `wrangler.jsonc`
4. **Token inválido**: Regenera los secretos JWT

### Comandos útiles:

```bash
# Ver logs en tiempo real
npx wrangler tail

# Verificar conectividad
npx wrangler whoami

# Listar secretos configurados
npx wrangler pages secret list --project-name docusentinel-pro

# Actualizar secreto
npx wrangler pages secret put NOMBRE_SECRETO --project-name docusentinel-pro
```

---

## 🎯 VERIFICACIÓN FINAL

✅ **Checklist de despliegue:**
- [ ] API key de Cloudflare configurada
- [ ] Base de datos D1 creada y migraciones aplicadas
- [ ] KV namespaces creados
- [ ] Bucket R2 creado
- [ ] wrangler.jsonc actualizado con IDs reales
- [ ] Secretos configurados en Cloudflare Pages
- [ ] Aplicación desplegada y funcionando
- [ ] HTTPS habilitado
- [ ] Dominio personalizado (opcional)
- [ ] Pruebas de integración pasadas

---

## 📞 SOPORTE

Si encuentras problemas durante el despliegue:

1. **Verifica los logs**: `npx wrangler tail`
2. **Revisa la configuración**: Todos los IDs deben ser correctos
3. **Secretos**: Asegúrate de que todos los secretos estén configurados
4. **Permisos**: Verifica que tu API key tenga los permisos necesarios

¡Tu aplicación DocuSentinel Pro debería estar completamente funcional en producción!