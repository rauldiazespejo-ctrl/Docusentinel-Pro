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
  origin: ['http://localhost:3000', 'https://docusentinel-pro.pages.dev'],
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

// Ruta principal - Dashboard
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DocuSentinel Pro - Gestión Integral de Documentos</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      <style>
        .gradient-bg {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
        }
        .card-shadow {
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .hover-lift {
          transition: transform 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="gradient-bg text-white shadow-lg">
        <div class="container mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <i class="fas fa-shield-alt text-3xl text-yellow-400"></i>
              <div>
                <h1 class="text-2xl font-bold">DocuSentinel Pro</h1>
                <p class="text-blue-200 text-sm">Gestión Integral de Documentos</p>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <button id="loginBtn" class="bg-yellow-500 hover:bg-yellow-600 text-blue-900 px-6 py-2 rounded-lg font-semibold transition-colors">
                <i class="fas fa-sign-in-alt mr-2"></i>
                Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="container mx-auto px-6 py-12">
        <!-- Hero Section -->
        <section class="text-center mb-16">
          <h2 class="text-5xl font-bold text-gray-800 mb-6">
            Seguridad y Autenticidad de Documentos
          </h2>
          <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Plataforma empresarial de gestión documental con seguridad de nivel bancario y verificación de autenticidad mediante IA.
          </p>
          <div class="flex justify-center space-x-4">
            <button id="getStartedBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              Comenzar Ahora
            </button>
            <button id="demoBtn" class="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              Ver Demo
            </button>
          </div>
        </section>

        <!-- Features Grid -->
        <section class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div class="bg-white p-6 rounded-xl card-shadow hover-lift">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <i class="fas fa-lock text-blue-600 text-xl"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-3">Encriptación Avanzada</h3>
            <p class="text-gray-600">AES-256-GCM + RSA-4096 para máxima seguridad de documentos.</p>
          </div>

          <div class="bg-white p-6 rounded-xl card-shadow hover-lift">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <i class="fas fa-user-shield text-green-600 text-xl"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-3">Autenticación Multifactor</h3>
            <p class="text-gray-600">MFA obligatorio con soporte TOTP, WebAuthn y SMS.</p>
          </div>

          <div class="bg-white p-6 rounded-xl card-shadow hover-lift">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <i class="fas fa-eye text-purple-600 text-xl"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-3">Verificación con IA</h3>
            <p class="text-gray-600">Detección de manipulación y falsificación de documentos con inteligencia artificial.</p>
          </div>

          <div class="bg-white p-6 rounded-xl card-shadow hover-lift">
            <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <i class="fas fa-clipboard-check text-yellow-600 text-xl"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-3">Auditoría Completa</h3>
            <p class="text-gray-600">Logs encadenados criptográficamente para trazabilidad forense.</p>
          </div>

          <div class="bg-white p-6 rounded-xl card-shadow hover-lift">
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <i class="fas fa-users-cog text-red-600 text-xl"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-3">Control de Acceso</h3>
            <p class="text-gray-600">RBAC con 5 niveles de acceso y permisos granulares.</p>
          </div>

          <div class="bg-white p-6 rounded-xl card-shadow hover-lift">
            <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <i class="fas fa-certificate text-indigo-600 text-xl"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-3">Cumplimiento Normativo</h3>
            <p class="text-gray-600">Diseñado para cumplir con estándares de seguridad empresarial.</p>
          </div>
        </section>

        <!-- Security Features -->
        <section class="bg-white rounded-xl p-8 card-shadow mb-16">
          <h3 class="text-3xl font-bold text-gray-800 mb-8 text-center">Características de Seguridad</h3>
          <div class="grid md:grid-cols-2 gap-8">
            <div>
              <h4 class="text-xl font-semibold text-gray-800 mb-4">
                <i class="fas fa-shield-alt text-blue-600 mr-2"></i>
                Seguridad Documental
              </h4>
              <ul class="space-y-2 text-gray-600">
                <li><i class="fas fa-check text-green-500 mr-2"></i>Encriptación multinivel AES-256-GCM</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>Almacenamiento seguro de claves (HSM/Vault)</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>TLS 1.3 para comunicaciones</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>Validación estricta de entrada</li>
              </ul>
            </div>
            <div>
              <h4 class="text-xl font-semibold text-gray-800 mb-4">
                <i class="fas fa-user-check text-green-600 mr-2"></i>
                Autenticación Robusta
              </h4>
              <ul class="space-y-2 text-gray-600">
                <li><i class="fas fa-check text-green-500 mr-2"></i>MFA obligatorio para todos los usuarios</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>Soporte TOTP, WebAuthn, SMS</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>Control de acceso RBAC + ABAC</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>Sesiones con expiración automática</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Demo Section -->
        <section id="demoSection" class="hidden bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
          <h3 class="text-3xl font-bold text-gray-800 mb-6 text-center">Demo Interactiva</h3>
          <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg">
              <h4 class="text-xl font-semibold mb-4">Verificación de Documento</h4>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600 mb-4">Arrastra un documento aquí o haz clic para verificar</p>
                <input type="file" id="fileInput" class="hidden" accept=".pdf,.jpg,.jpeg,.png">
                <button id="selectFileBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                  Seleccionar Archivo
                </button>
              </div>
            </div>
            <div class="bg-white p-6 rounded-lg">
              <h4 class="text-xl font-semibold mb-4">Resultado de Verificación</h4>
              <div id="verificationResult" class="text-center text-gray-600">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>Sube un documento para comenzar la verificación</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- Footer -->
      <footer class="bg-gray-800 text-white py-8">
        <div class="container mx-auto px-6 text-center">
          <p>&copy; 2026 DocuSentinel Pro. Todos los dereenciales reservados.</p>
          <p class="text-gray-400 text-sm mt-2">Plataforma de gestión documental con verificación de autenticidad</p>
        </div>
      </footer>

      <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// Health check
app.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'DocuSentinel Pro API está funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// API docs
app.get('/api/docs', (c) => {
  return c.json({
    name: 'DocuSentinel Pro API',
    version: '1.0.0',
    description: 'API de gestión integral de documentos con verificación de autenticidad',
    endpoints: [
      {
        path: '/api/auth/login',
        method: 'POST',
        description: 'Iniciar sesión de usuario'
      },
      {
        path: '/api/auth/register',
        method: 'POST',
        description: 'Registrar nuevo usuario'
      },
      {
        path: '/api/auth/profile',
        method: 'GET',
        description: 'Obtener perfil de usuario (requiere autenticación)'
      },
      {
        path: '/api/documents',
        method: 'GET',
        description: 'Listar documentos (requiere autenticación)'
      },
      {
        path: '/api/verification',
        method: 'POST',
        description: 'Verificar autenticidad de documento'
      },
      {
        path: '/api/audit/logs',
        method: 'GET',
        description: 'Obtener logs de auditoría (requiere permisos)'
      }
    ]
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Ruta no encontrada',
    path: c.req.path
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Error no manejado:', err)
  return c.json({
    success: false,
    error: 'Error interno del servidor',
    message: err.message
  }, 500)
})

export default app