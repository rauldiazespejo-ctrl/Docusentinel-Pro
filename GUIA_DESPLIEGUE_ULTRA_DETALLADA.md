# 🚀 GUIA ULTRA-DETALLADA: DESPLIEGUE DOCUSENTINEL PRO A PRODUCCIÓN

## 📋 ÍNDICE DE PASOS (10 PASOS CRÍTICOS)

### PASOS OBLIGATORIOS (1-4):
1. 🔐 **CONFIGURAR API KEY CLOUDFLARE** → SIN ESTO NO FUNCIONA NADA
2. 🗄️ **CREAR BASE DE DATOS D1** → ALMACENAMIENTO PRINCIPAL
3. 📁 **CREAR KV NAMESPACES** → CACHÉ Y CONFIGURACIÓN
4. ☁️ **CREAR BUCKET R2** → ALMACENAMIENTO DE ARCHIVOS

### PASOS DE CONFIGURACIÓN (5-7):
5. ⚙️ **ACTUALIZAR WRANGLER.JSONC** → CONFIGURAR IDs REALES
6. 🔑 **CONFIGURAR SECRETOS** → JWT, ENCRIPTACIÓN, TOTP
7. 🗃️ **APLICAR MIGRACIONES** → ESTRUCTURA DE BASE DE DATOS

### PASOS FINALES (8-10):
8. 🏗️ **CONSTRUIR PROYECTO** → BUILD PARA PRODUCCIÓN
9. 🚀 **DESPLEGAR** → SUBIR A CLOUDFLARE PAGES
10. ✅ **VERIFICAR** → PROBAR QUE TODO FUNCIONA

---

## 🎯 PASO 0: PREPARACIÓN INICIAL (CRÍTICO)

### Verificar requisitos:
```bash
# Estar en el directorio correcto (OBLIGATORIO)
cd /home/user/webapp

# Verificar Node.js (18+ obligatorio)
node --version  # Debe ser v18.0.0 o superior

# Verificar npm
npm --version

# Verificar wrangler
npx wrangler --version
```

### Si falta algo:
```bash
# Instalar Node.js 18+
# Descargar desde: https://nodejs.org/

# Instalar wrangler globalmente
npm install -g wrangler
```

---

## 🔐 PASO 1: CONFIGURAR API KEY DE CLOUDFLARE

### Este es el PASO MÁS IMPORTANTE - SIN ESTO NO FUNCIONA NADA

#### Opción A: Automática (RECOMENDADA)
```bash
# Configurar automáticamente (solo si está disponible)
setup_cloudflare_api_key

# Verificar que funcionó
npx wrangler whoami
```

#### Opción B: Manual (si la automática falla)
1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click en tu perfil (esquina superior derecha)
3. Click en "My Profile"
4. Click en "API Tokens"
5. Click en "Create Token"
6. Usar plantilla "Edit Cloudflare Workers"
7. Copiar el token generado
8. En el sandbox, ejecutar:

```bash
# Configurar manualmente el token
export CLOUDFLARE_API_TOKEN="tu-token-aqui"

# Verificar que funciona
npx wrangler whoami
```

### ✅ VERIFICACIÓN:
```bash
# Esto debe mostrar tu información de cuenta
npx wrangler whoami

# Si aparece tu email y cuenta, está bien
# Si aparece un error, repetir el paso 1
```

---

## 🗄️ PASO 2: CREAR BASE DE DATOS D1

### Crear la base de datos:
```bash
# Crear base de datos D1 (si falla, verificar paso 1)
npx wrangler d1 create docusentinel-pro

# Verificar que se creó
npx wrangler d1 list
```

### Guardar el ID (MUY IMPORTANTE):
```bash
# Obtener el ID de la base de datos
npx wrangler d1 list | grep "docusentinel-pro"

# Copiar el ID que aparece (ejemplo: 12345678-abcd-1234-efgh-123456789012)
# GUARDAR ESTE ID - LO NECESITARÁS EN EL PASO 5
```

### Verificar que funciona:
```bash
# Probar conexión
npx wrangler d1 execute docusentinel-pro --command="SELECT 'funciona' as test"
```

---

## 📁 PASO 3: CREAR KV NAMESPACES

### Crear los namespaces (necesitas crear DOS):
```bash
# Namespace principal (producción)
npx wrangler kv:namespace create docusentinel-pro-kv

# Namespace para desarrollo/preview
npx wrangler kv:namespace create docusentinel-pro-kv --preview
```

### Verificar que se crearon:
```bash
# Listar KV namespaces
npx wrangler kv:namespace list | grep "docusentinel-pro-kv"

# Deben aparecer DOS líneas:
# - docusentinel-pro-kv (principal)
# - docusentinel-pro-kv (preview)
```

### Guardar los IDs:
```bash
# Obtener IDs
npx wrangler kv:namespace list | grep "docusentinel-pro-kv"

# Copiar AMBOS IDs - LOS NECESITARÁS EN EL PASO 5:
# 1. ID principal (production)
# 2. ID preview (development)
```

---

## ☁️ PASO 4: CREAR BUCKET R2

### Crear el bucket:
```bash
# Crear bucket R2
npx wrangler r2 bucket create docusentinel-pro-bucket

# Verificar que se creó
npx wrangler r2 bucket list | grep "docusentinel-pro-bucket"
```

### Verificar que funciona:
```bash
# Listar buckets
npx wrangler r2 bucket list

# Debe aparecer: docusentinel-pro-bucket
```

---

## ⚙️ PASO 5: ACTUALIZAR WRANGLER.JSONC

### Editar el archivo:
```bash
# Abrir el archivo para editar
nano wrangler.jsonc

# O usar tu editor favorito
vim wrangler.jsonc
```

### Actualizar con TUS IDs reales:
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
      "database_name": "docusentinel-pro",
      "database_id": "AQUI_PON_EL_ID_QUE_OBTUVISTE_DEL_PASO_2"
    }
  ],
  
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "AQUI_PON_EL_ID_PRINCIPAL_DEL_PASO_3",
      "preview_id": "AQUI_PON_EL_ID_PREVIEW_DEL_PASO_3"
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

### Ejemplo con IDs reales:
```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "docusentinel-pro",
      "database_id": "12345678-abcd-1234-efgh-123456789012"
    }
  ],
  
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "abcdef1234567890",
      "preview_id": "fedcba0987654321"
    }
  ]
}
```

### Verificar que está bien:
```bash
# El archivo debe ser JSON válido
# Puedes usar un validador online o:
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('wrangler.jsonc', 'utf8'))))"
```

---

## 🔑 PASO 6: CONFIGURAR SECRETOS DE SEGURIDAD

### Generar claves seguras:
```bash
# Generar JWT_SECRET (256 bits)
openssl rand -base64 32

# Generar ENCRYPTION_KEY (256 bits)
openssl rand -base64 32

# Generar TOTP_SECRET
openssl rand -base64 16
```

### Configurar en Cloudflare:
```bash
# Configurar JWT_SECRET (pega la clave generada)
npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro

# Configurar ENCRYPTION_KEY
npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro

# Configurar TOTP_SECRET
npx wrangler pages secret put TOTP_SECRET --project-name docusentinel-pro
```

### Verificar que se configuraron:
```bash
# Listar secretos configurados
npx wrangler pages secret list --project-name docusentinel-pro

# Deben aparecer 3 secretos:
# - JWT_SECRET
# - ENCRYPTION_KEY
# - TOTP_SECRET
```

---

## 🗃️ PASO 7: APLICAR MIGRACIONES DE BASE DE DATOS

### Aplicar migraciones:
```bash
# Aplicar migraciones a producción
npx wrangler d1 migrations apply docusentinel-pro --remote

# Verificar tablas creadas
npx wrangler d1 execute docusentinel-pro --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### Debes ver múltiples tablas como:
- users
- documents
- audit_logs
- verification_records
- etc.

---

## 🏗️ PASO 8: CONSTRUIR PROYECTO

### Construir para producción:
```bash
# Limpiar build anterior
rm -rf dist/

# Construir
npm run build

# Verificar resultado
ls -la dist/
```

### Verificar archivos generados:
- `dist/_worker.js` (obligatorio)
- `dist/_routes.json` (obligatorio)
- Archivos estáticos en `dist/`

---

## 🚀 PASO 9: DESPLEGAR A CLOUDFLARE PAGES

### Crear proyecto (solo primera vez):
```bash
# Crear proyecto en Cloudflare Pages
npx wrangler pages project create docusentinel-pro --production-branch main
```

### Desplegar:
```bash
# Desplegar a producción
npx wrangler pages deploy dist --project-name docusentinel-pro
```

### Resultado esperado:
```
✨ Build completed successfully!
✨ Successfully deployed your project to Cloudflare Pages!
✨ Deployment complete!
🌐 https://docusentinel-pro.pages.dev
```

---

## ✅ PASO 10: VERIFICAR DESPLIEGUE

### Verificar que esté en línea:
```bash
# Health check
curl https://docusentinel-pro.pages.dev/api/health

# Documentación API
curl https://docusentinel-pro.pages.dev/api/docs
```

### Verificar endpoints principales:
```bash
# Probar endpoints
curl https://docusentinel-pro.pages.dev/api/health
curl https://docusentinel-pro.pages.dev/api/docs
curl https://docusentinel-pro.pages.dev/api/auth
curl https://docusentinel-pro.pages.dev/api/documents
curl https://docusentinel-pro.pages.dev/api/verification
curl https://docusentinel-pro.pages.dev/api/audit
```

---

## 🎯 SCRIPTS DE AYUDA

### Script de validación automática:
```bash
# Ejecutar validador interactivo
./validar-pasos.sh

# Validar paso específico
./validar-pasos.sh  # Luego selecciona el número
```

### Script de despliegue automático:
```bash
# Despliegue completo automático
./deploy-automatico.sh
```

### Comandos de diagnóstico:
```bash
# Ver logs en tiempo real
npx wrangler tail

# Verificar autenticación
npx wrangler whoami

# Listar recursos
npx wrangler pages project list
npx wrangler d1 list
npx wrangler kv:namespace list
npx wrangler r2 bucket list

# Verificar secretos
npx wrangler pages secret list --project-name docusentinel-pro
```

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Error: "No estás autenticado"
```bash
# Repetir paso 1
setup_cloudflare_api_key
npx wrangler whoami
```

### Error: "Base de datos no encontrada"
```bash
# Repetir paso 2
npx wrangler d1 create docusentinel-pro
```

### Error: "KV namespace no encontrado"
```bash
# Repetir paso 3
npx wrangler kv:namespace create docusentinel-pro-kv
npx wrangler kv:namespace create docusentinel-pro-kv --preview
```

### Error: "Build fallido"
```bash
# Verificar errores
npm run build 2>&1 | grep -i error

# Limpiar y reconstruir
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Error: "Despliegue fallido"
```bash
# Verificar logs
npx wrangler tail

# Verificar configuración
cat wrangler.jsonc | jq .

# Verificar secretos
npx wrangler pages secret list --project-name docusentinel-pro
```

---

## 📋 CHECKLIST FINAL

Antes de considerar el despliegue como COMPLETADO:

- [ ] API Key de Cloudflare configurada
- [ ] Base de datos D1 creada y con ID en wrangler.jsonc
- [ ] KV namespaces creados (principal y preview) y IDs en wrangler.jsonc
- [ ] Bucket R2 creado
- [ ] wrangler.jsonc actualizado con TODOS los IDs reales
- [ ] Secretos configurados (JWT_SECRET, ENCRYPTION_KEY, TOTP_SECRET)
- [ ] Migraciones aplicadas a producción
- [ ] Build exitoso (dist/_worker.js existe)
- [ ] Despliegue exitoso a Cloudflare Pages
- [ ] Health check responde correctamente
- [ ] Documentación API accesible
- [ ] Todos los endpoints principales funcionan

---

## 🎉 ¡FELICIDADES!

Tu aplicación DocuSentinel Pro debería estar funcionando en:
**https://docusentinel-pro.pages.dev**

### Próximos pasos:
1. Configurar dominio personalizado
2. Configurar certificado SSL
3. Ejecutar pruebas de integración
4. Validar MFA/FIDO2
5. Auditoría de seguridad
6. Aceptación del usuario

---

## 📞 SOPORTE

Si encuentras problemas:

1. Ejecuta: `./validar-pasos.sh` → opción 11 (diagnóstico)
2. Verifica: `npx wrangler tail` (logs)
3. Revisa esta guía paso a paso
4. Asegúrate de tener TODOS los IDs correctos

**¡TU APLICACIÓN ESTÁ LISTA PARA PRODUCCIÓN! 🚀**