# Guía de Despliegue de DocuSentinel Pro en Netlify

## 🚀 Método 1: Despliegue Manual a través de la Web

1. **Accede a Netlify**
   - Ve a https://netlify.com
   - Inicia sesión o crea una cuenta

2. **Arrastra y suelta**
   - Arrastra la carpeta `dist` completa al área de despliegue de Netlify
   - Netlify detectará automáticamente el proyecto

3. **Configura el proyecto**
   - Nombre del sitio: `docusentinel-pro`
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Variables de entorno**
   - Ve a Settings > Environment Variables
   - Agrega las siguientes variables:
     ```
     JWT_SECRET=tu-secreto-jwt-muy-seguro
     ENCRYPTION_KEY=tu-clave-de-32-caracteres-exactos!!
     NODE_ENV=production
     ```

## 🔧 Método 2: Despliegue con Netlify CLI

1. **Instalar Netlify CLI globalmente**
   ```bash
   npm install -g netlify-cli
   ```

2. **Autenticarte**
   ```bash
   netlify login
   ```

3. **Desplegar**
   ```bash
   netlify deploy --prod --dir=dist --functions=netlify/functions
   ```

## 📋 Endpoints Disponibles

Una vez desplegado, tu aplicación tendrá estos endpoints:

- **Aplicación principal**: `https://[tu-sitio].netlify.app`
- **API**: `https://[tu-sitio].netlify.app/.netlify/functions/api`
- **Documentación**: `https://[tu-sitio].netlify.app/.netlify/functions/api/docs`
- **Health check**: `https://[tu-sitio].netlify.app/.netlify/functions/api/health`

## 🔐 Credenciales de Prueba

Usuario de prueba:
- Usuario: `admin`
- Contraseña: `password`
- Código MFA: `123456`

## 🛠️ Configuración de Base de Datos

Para producción, necesitas configurar una base de datos real:

1. **Opción 1: MongoDB Atlas** (gratis)
   - Crea una cuenta en https://mongodb.com
   - Crea un cluster gratuito
   - Obtén la URI de conexión
   - Actualiza la variable `DATABASE_URL`

2. **Opción 2: PostgreSQL con Supabase** (gratis)
   - Crea una cuenta en https://supabase.com
   - Crea un proyecto
   - Obtén los datos de conexión
   - Actualiza las variables de entorno

3. **Opción 3: PlanetScale** (gratis)
   - Crea una cuenta en https://planetscale.com
   - Crea una base de datos
   - Obtén la cadena de conexión

## 🔒 Seguridad

- Cambia TODOS los secretos por valores únicos y seguros
- Usa contraseñas fuertes para JWT_SECRET y ENCRYPTION_KEY
- Considera implementar rate limiting
- Habilita HTTPS automáticamente (Netlify lo hace por defecto)

## 📁 Estructura de Archivos

```
netlify/functions/api.js     # Función principal
netlify.toml               # Configuración de Netlify
dist/index.html             # Frontend
.env.production            # Variables de entorno
```

## 🚀 Después del Despliegue

1. Verifica que la aplicación funcione correctamente
2. Prueba todos los endpoints
3. Configura un dominio personalizado si lo deseas
4. Configura alertas y monitoreo
5. Implementa backups automáticos

## 🆘 Problemas Comunes

**Error 404 en API**: Verifica que las funciones estén en `netlify/functions/`
**Error 500**: Revisa los logs en Netlify Dashboard
**Problemas de CORS**: Verifica la configuración en `netlify.toml`

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en el dashboard de Netlify
2. Verifica las variables de entorno
3. Asegúrate de que todos los archivos estén en su lugar
4. Prueba localmente primero

