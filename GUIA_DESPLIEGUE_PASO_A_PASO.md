# 🚀 DESPLIEGUE DOCUSENTINEL PRO - GUIA COMPLETA POR PASOS

## 📋 CHECKLIST DE DESPLIEGUE (IMPRIMIR Y MARCAR)

### ✅ PREPARACIÓN INICIAL
- [ ] Estoy en el directorio correcto: `cd /home/user/webapp`
- [ ] Tengo Node.js 18+ instalado
- [ ] Tengo npm instalado
- [ ] Tengo acceso a Cloudflare con permisos necesarios
- [ ] Tengo mi API key de Cloudflare lista

### 🔐 PASO 1: CONFIGURAR API KEY DE CLOUDFLARE
**COMANDOS:**
```bash
# Verificar autenticación actual
npx wrangler whoami

# Si falla, configurar API key y luego:
npx wrangler whoami
```

**VALIDACIÓN:**
- [ ] Comando `npx wrangler whoami` muestra mi información
- [ ] No hay errores de autenticación

### 🗄️ PASO 2: CREAR BASE DE DATOS D1
**COMANDOS:**
```bash
# Crear base de datos D1
npx wrangler d1 create docusentinel-pro

# Verificar que se creó
npx wrangler d1 list

# Guardar el ID que aparece
```

**VALIDACIÓN:**
- [ ] Base de datos `docusentinel-pro` aparece en la lista
- [ ] Tengo el ID de la base de datos guardado

### 📁 PASO 3: CREAR KV NAMESPACES
**COMANDOS:**
```bash
# Crear KV namespace principal
npx wrangler kv:namespace create docusentinel-pro-kv

# Crear KV namespace para preview (desarrollo)
npx wrangler kv:namespace create docusentinel-pro-kv --preview

# Verificar que se crearon
npx wrangler kv:namespace list
```

**VALIDACIÓN:**
- [ ] Aparecen 2 namespaces KV con nombre `docusentinel-pro-kv`
- [ ] Tengo ambos IDs guardados (principal y preview)

### ☁️ PASO 4: CREAR BUCKET R2
**COMANDOS:**
```bash
# Crear bucket R2
npx wrangler r2 bucket create docusentinel-pro-bucket

# Verificar que se creó
npx wrangler r2 bucket list
```

**VALIDACIÓN:**
- [ ] Bucket `docusentinel-pro-bucket` aparece en la lista

### ⚙️ PASO 5: ACTUALIZAR CONFIGURACIÓN DE WRANGLER
**COMANDOS:**
```bash
# Editar el archivo wrangler.jsonc
nano wrangler.jsonc

# Actualizar con los IDs reales que obtuviste
```

**ARCHIVO WRANGLER.JSONC:**
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
      "database_id": "AQUI_VA_EL_ID_REAL_DE_TU_D1"
    }
  ],
  
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "AQUI_VA_TU_ID_KV_PRINCIPAL",
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
```

**VALIDACIÓN:**
- [ ] Reemplacé los IDs de ejemplo con los reales
- [ ] El archivo está bien formateado (JSON válido)

### 🔑 PASO 6: CONFIGURAR SECRETOS DE SEGURIDAD
**COMANDOS PARA GENERAR CLAVES SEGURAS:**
```bash
# Generar JWT_SECRET (256 bits)
openssl rand -base64 32

# Generar ENCRYPTION_KEY (256 bits)
openssl rand -base64 32

# Generar TOTP_SECRET
openssl rand -base64 16
```

**COMANDOS PARA CONFIGURAR EN CLOUDFLARE:**
```bash
# Configurar JWT_SECRET (pega la clave generada)
npx wrangler pages secret put JWT_SECRET --project-name docusentinel-pro

# Configurar ENCRYPTION_KEY
npx wrangler pages secret put ENCRYPTION_KEY --project-name docusentinel-pro

# Configurar TOTP_SECRET
npx wrangler pages secret put TOTP_SECRET --project-name docusentinel-pro

# Verificar que se configuraron
npx wrangler pages secret list --project-name docusentinel-pro
```

**VALIDACIÓN:**
- [ ] Los 3 secretos aparecen en la lista
- [ ] Las claves que generé son seguras y únicas

### 🗃️ PASO 7: APLICAR MIGRACIONES DE BASE DE DATOS
**COMANDOS:**
```bash
# Aplicar migraciones a producción
npx wrangler d1 migrations apply docusentinel-pro --remote

# Verificar tablas creadas
npx wrangler d1 execute docusentinel-pro --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

**VALIDACIÓN:**
- [ ] Las migraciones se aplicaron sin errores
- [ ] Veo múltiples tablas en la base de datos

### 🏗️ PASO 8: CONSTRUIR PROYECTO
**COMANDOS:**
```bash
# Limpiar build anterior
rm -rf dist/

# Construir para producción
npm run build

# Verificar resultado
ls -la dist/
```

**VALIDACIÓN:**
- [ ] Carpeta `dist/` creada exitosamente
- [ ] Archivo `dist/_worker.js` existe
- [ ] No hay errores de compilación

### 🚀 PASO 9: DESPLEGAR A CLOUDFLARE PAGES
**COMANDOS:**
```bash
# Crear proyecto (solo primera vez)
npx wrangler pages project create docusentinel-pro --production-branch main

# Desplegar
npx wrangler pages deploy dist --project-name docusentinel-pro
```

**VALIDACIÓN:**
- [ ] Despliegue completado sin errores
- [ ] Aparece la URL de la aplicación

### ✅ PASO 10: VERIFICAR DESPLIEGUE
**COMANDOS:**
```bash
# Verificar que esté en línea
curl https://docusentinel-pro.pages.dev/api/health

# Verificar endpoints principales
curl https://docusentinel-pro.pages.dev/api/docs
curl https://docusentinel-pro.pages.dev/api/health
```

**VALIDACIÓN FINAL:**
- [ ] La aplicación responde en la URL
- [ ] El health check funciona
- [ ] La documentación API es accesible

---

## 🎯 RESUMEN DE URLs IMPORTANTES

**Tu aplicación estará disponible en:**
- **Aplicación principal:** https://docusentinel-pro.pages.dev
- **Documentación API:** https://docusentinel-pro.pages.dev/api/docs
- **Health Check:** https://docusentinel-pro.pages.dev/api/health
- **Auth endpoints:** https://docusentinel-pro.pages.dev/api/auth
- **Documentos:** https://docusentinel-pro.pages.dev/api/documents
- **Verificación:** https://docusentinel-pro.pages.dev/api/verification
- **Auditoría:** https://docusentinel-pro.pages.dev/api/audit

---

## 🚨 COMANDOS DE EMERGENCIA

**Si algo falla, intenta:**
```bash
# Verificar logs en tiempo real
npx wrangler tail

# Verificar estado de servicios
npx wrangler whoami

# Listar recursos
npx wrangler pages project list
npx wrangler d1 list
npx wrangler kv:namespace list
npx wrangler r2 bucket list

# Verificar secretos
npx wrangler pages secret list --project-name docusentinel-pro
```

**Script de validación automática:**
```bash
# Ejecutar validación completa
./validar-pasos.sh

# Validar paso específico
./validar-pasos.sh  # Luego selecciona el número del paso
```

---

## 📞 SOPORTE INMEDIATO

Si encuentras problemas:

1. **Ejecuta el script de diagnóstico:** `./validar-pasos.sh` → opción 11
2. **Verifica los logs:** `npx wrangler tail`
3. **Revisa esta guía paso a paso**
4. **Asegúrate de tener todos los IDs correctos en wrangler.jsonc**

**¡TU APLICACIÓN ESTÁ LISTA PARA PRODUCCIÓN! 🚀**