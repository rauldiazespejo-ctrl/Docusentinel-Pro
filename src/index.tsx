import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'
import authRoutes from './routes/auth'
import documentRoutes from './routes/documents'
import verificationRoutes from './routes/verification'
import auditRoutes from './routes/audit'
import { AuthMiddleware } from './middleware/auth'

const app = new Hono<{ Bindings: CloudflareBindings }>()
const authMiddleware = new AuthMiddleware()

// Middleware global
app.use('*', logger())
app.use('*', cors({
  origin: ['*'],
  credentials: true,
  maxAge: 86400
}))

// Servir archivos estáticos
app.use('/static/*', serveStatic({ root: './public' }))

// Rutas de API
app.route('/api/auth', authRoutes)
app.route('/api/documents', documentRoutes)
app.route('/api/verification', verificationRoutes)
app.route('/api/audit', auditRoutes)

// Health check
app.get('/health', (c) => {
  return c.json({
    success: true,
    status: 'operational',
    service: 'DocuSentinel PRO API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    region: c.req.header('CF-Ray') ? 'cloudflare-edge' : 'local'
  })
})

// Ruta principal - SPA completa
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DocuSentinel PRO — Seguridad Documental Empresarial</title>
  <meta name="description" content="Plataforma empresarial de gestión documental con cifrado AES-256, control de accesos y verificación forense de autenticidad.">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <!-- Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css">
  
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

  <link href="/static/styles.css" rel="stylesheet">
</head>
<body>
  <div id="app">
    <!-- Loading screen -->
    <div id="loading-screen" class="loading-screen">
      <div class="loading-content">
        <div class="loading-logo">
          <i class="fas fa-shield-halved"></i>
        </div>
        <div class="loading-text">DocuSentinel <span class="text-cyan">PRO</span></div>
        <div class="loading-bar"><div class="loading-bar-fill"></div></div>
        <div class="loading-status">Inicializando sistema seguro...</div>
      </div>
    </div>
  </div>
  
  <script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
