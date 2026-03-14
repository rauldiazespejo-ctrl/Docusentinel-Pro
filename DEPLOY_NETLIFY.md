# Guía de Despliegue Manual para Netlify

## 📋 PASOS PARA DESPLEGAR DOCUSENTINEL PRO EN NETLIFY

### ✅ PASO 1: Preparación completada
- ✅ Archivo `netlify.toml` configurado
- ✅ Función de Netlify creada en `netlify/functions/api.js`
- ✅ Archivos estáticos en `dist/`
- ✅ Build completado

### 🚀 PASO 2: Métodos de despliegue (elige uno)

#### MÉTODO A: Drag & Drop (Más fácil)
1. Ve a [https://app.netlify.com](https://app.netlify.com)
2. En la zona de "Deploy", arrastra la carpeta `/home/user/webapp/dist`
3. Espera a que termine el despliegue
4. ¡Listo! Tu URL será algo como: `https://nombre-aleatorio.netlify.app`

#### MÉTODO B: Conectar a GitHub
1. Ve a [https://app.netlify.com](https://app.netlify.com)
2. Haz clic en "New site from Git"
3. Conecta tu repositorio de GitHub
4. Configura:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Haz clic en "Deploy site"

#### MÉTODO C: CLI de Netlify (si tienes instalado netlify-cli)
```bash
# Si ya tienes netlify-cli instalado globalmente:
cd /home/user/webapp
netlify deploy --prod --dir=dist
```

### 🔧 PASO 3: Variables de entorno (IMPORTANTE)
Una vez desplegado, ve a:
1. Site settings → Environment variables
2. Añade estas variables:

```
JWT_SECRET=mi-super-secreto-jwt-2026-docusentinel
ENCRYPTION_KEY=mi-super-encriptacion-256-bits-2026
API_KEY=docusentinel-pro-api-key-2026
NODE_ENV=production
```

### 🌐 PASO 4: URLs de tu aplicación
Después del despliegue, tendrás:
- **URL Principal**: `https://nombre-aleatorio.netlify.app`
- **API**: `https://nombre-aleatorio.netlify.app/api`
- **Documentación API**: `https://nombre-aleatorio.netlify.app/api/docs`
- **Health Check**: `https://nombre-aleatorio.netlify.app/health`

### 📁 ESTRUCTURA DE ARCHIVOS PARA NETLIFY
```
webapp/
├── dist/                    # Archivos que se despliegan
│   ├── index.html            # Página principal
│   ├── static/
│   │   ├── styles.css        # Estilos futuristas
│   │   └── app.js           # JavaScript frontend
│   └── _redirects           # Redirecciones de Netlify
├── netlify/
│   └── functions/
│       └── api.js            # Backend completo
├── netlify.toml              # Configuración de Netlify
└── [otros archivos...]
```

### 🎨 CARACTERÍSTICAS DEL TEMA FUTURISTA
- **Colores**: Azul oscuro (#0a0e1a), cian eléctrico (#00d9ff), naranja neón (#ff8c00)
- **Efectos**: Glassmorphism, animaciones de brillo, gradientes animados
- **Tipografía**: Moderna y limpia
- **Diseño**: Responsive, con efectos hover futuristas

### 🛡️ SEGURIDAD INCLUIDA
- Encriptación AES-256-GCM
- Autenticación JWT
- Headers de seguridad configurados
- CORS configurado
- Validación de entrada

### 🚀 LISTO PARA DESPLEGAR
Todo está preparado. Solo necesitas:
1. Subir la carpeta `dist` a Netlify
2. Configurar las variables de entorno
3. ¡Tu DocuSentinel Pro estará en línea!

### 📞 SI NECESITAS AYUDA
Si tienes problemas con el despliegue:
1. Verifica que todos los archivos estén en `dist/`
2. Asegúrate de configurar las variables de entorno
3. Revisa la configuración en `netlify.toml`

**¡Tu aplicación DocuSentinel Pro con tema futurista está lista para desplegar!** 🎉