# Guía de Despliegue en Netlify - DocuSentinel Pro

## 🚀 Estado Actual
✅ Proyecto configurado y listo para desplegar
✅ Netlify CLI instalado localmente
✅ Cuenta de Netlify vinculada al proyecto `docusentinelpro`
❌ Falta ejecutar el build y configurar correctamente las variables de entorno

## 📋 Pasos para completar el despliegue

### Paso 1: En tu máquina local (Windows)

1. **Abre una terminal en el proyecto** (en tu carpeta local donde tienes el proyecto)

2. **Crea el archivo .env** (copia desde el ejemplo):
   ```bash
   copy .env.example .env
   ```

3. **Edita el archivo .env** con un editor de texto y rellena los valores:
   ```
   JWT_SECRET=tu-secreto-jwt-super-seguro-de-al-menos-32-caracteres
   ENCRYPTION_KEY=12345678901234567890123456789012
   NODE_ENV=production
   ```

4. **Instala dependencias si es necesario**:
   ```bash
   npm install
   ```

### Paso 2: Build del proyecto

**Ejecuta el build:
```bash
npm run build
```

Esto creará la carpeta `dist` con todos los archivos necesarios.

### Paso 3: Verifica que el build funcionó

**Comprueba que existe la carpeta dist**:
```bash
dir dist
```

Deberías ver archivos como `index.html`, `index.js`, etc.

### Paso 4: Despliegue en Netlify

**Opción A - Con Netlify CLI** (recomendado):
```bash
# Primero haz build
npm run build

# Luego despliega
netlify deploy --prod --dir=dist --functions=netlify/functions
```

**Opción B - Build automático con Netlify**:
```bash
# Esto hará build y despliegue automáticamente
netlify build && netlify deploy --prod
```

### Paso 5: Configura las variables de entorno en Netlify

1. **Ve al panel de control**: https://app.netlify.com/sites/docusentinelpro/settings/deploys#environment

2. **Agrega estas variables**:
   - `JWT_SECRET` = `tu-secreto-jwt-super-seguro-de-al-menos-32-caracteres`
   - `ENCRYPTION_KEY` = `12345678901234567890123456789012` (exactamente 32 caracteres)
   - `NODE_ENV` = `production`

3. **Guarda los cambios**

### Paso 6: Verifica el despliegue

Después del despliegue exitoso, verifica estos endpoints:

- **Aplicación principal**: https://docusentinelpro.netlify.app/
- **Health check**: https://docusentinelpro.netlify.app/health
- **Documentación API**: https://docusentinelpro.netlify.app/docs
- **API base**: https://docusentinelpro.netlify.app/.netlify/functions/api/health

## 🔧 Solución de problemas comunes

### Error: "The deploy directory was not found"
**Solución**: Ejecuta `npm run build` antes de `netlify deploy`

### Error: "Authorization required"
**Solución**: Asegúrate de estar logueado en Netlify:
```bash
netlify login
```

### Error: "Environment variables missing"
**Solución**: Configura las variables en el panel de Netlify (paso 5)

### Error: "Functions not found"
**Solución**: Verifica que existe la carpeta `netlify/functions` con el archivo `api.js`

## 📁 Estructura final del proyecto
```
webapp/
├── dist/                    # Carpeta generada por el build
│   ├── index.html
│   ├── index.js
│   └── static/
├── netlify/
│   └── functions/
│       └── api.js          # Función serverless
├── netlify.toml           # Configuración de Netlify
├── .env                   # Variables locales (no subir a git)
├── .env.example         # Plantilla de variables
└── package.json
```

## 🎯 Comandos útiles

```bash
# Build del proyecto
npm run build

# Despliegue manual
netlify deploy --prod --dir=dist --functions=netlify/functions

# Despliegue con build automático
netlify build && netlify deploy --prod

# Ver logs del sitio
netlify logs

# Abrir panel de control
netlify open:admin
```

## 📞 ¿Necesitas ayuda?

Si encuentras problemas:
1. Verifica que estás en el directorio correcto del proyecto
2. Asegúrate de tener Node.js instalado
3. Comprueba que el archivo `netlify.toml` existe
4. Revisa que las variables de entorno estén configuradas

¡El proyecto está listo para desplegar! 🚀