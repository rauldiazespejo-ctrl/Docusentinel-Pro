// Función principal de Netlify para DocuSentinel Pro
const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { serveStatic } = require('hono/cloudflare-workers');

// Importar rutas modulares
const authRoutes = require('../../src/routes/auth');
const documentRoutes = require('../../src/routes/documents');
const verificationRoutes = require('../../src/routes/verification');
const auditRoutes = require('../../src/routes/audit');
const { AuthMiddleware } = require('../../src/middleware/auth');

// Crear aplicación Hono
const app = new Hono();

// Middleware global
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://docusentinel-pro.netlify.app'],
  credentials: true,
  maxAge: 86400
}));

// Ruta de health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'DocuSentinel Pro',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Documentación de la API
app.get('/docs', (c) => {
  return c.json({
    name: 'DocuSentinel Pro API',
    version: '2.0.0',
    description: 'API para gestión segura de documentos con verificación AI',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Registrar nuevo usuario',
        'POST /api/auth/login': 'Iniciar sesión',
        'POST /api/auth/logout': 'Cerrar sesión',
        'GET /api/auth/profile': 'Obtener perfil de usuario'
      },
      documents: {
        'GET /api/documents': 'Listar documentos del usuario',
        'POST /api/documents': 'Subir nuevo documento',
        'GET /api/documents/:id': 'Obtener documento específico',
        'DELETE /api/documents/:id': 'Eliminar documento'
      },
      verification: {
        'POST /api/verification': 'Verificar autenticidad de documento',
        'GET /api/verification/:id': 'Obtener resultado de verificación'
      },
      audit: {
        'GET /api/audit/logs': 'Obtener logs de auditoría',
        'GET /api/audit/export': 'Exportar reporte de auditoría'
      }
    }
  });
});

// Montar rutas de API
app.route('/api/auth', authRoutes);
app.route('/api/documents', documentRoutes);
app.route('/api/verification', verificationRoutes);
app.route('/api/audit', auditRoutes);

// Ruta raíz - Servir la aplicación frontend
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
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-900 text-white min-h-screen">
        <!-- Header Futurista -->
        <header class="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-cyan-500 shadow-lg">
            <div class="container mx-auto px-6 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-shield-alt text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                DocuSentinel Pro
                            </h1>
                            <p class="text-gray-400 text-sm">Gestión Integral de Documentos - 2026</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <button id="loginBtn" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors duration-200">
                            <i class="fas fa-sign-in-alt mr-2"></i>Iniciar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Hero Section -->
        <section class="relative overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,217,255,0.1),transparent_70%)]"></div>
            <div class="container mx-auto px-6 py-20 relative z-10">
                <div class="text-center max-w-4xl mx-auto">
                    <h2 class="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Seguridad Documental del Futuro
                    </h2>
                    <p class="text-xl text-gray-300 mb-8 leading-relaxed">
                        Protege, verifica y gestiona tus documentos con tecnología de encriptación avanzada y verificación AI
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <button id="startBtn" class="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105">
                            <i class="fas fa-rocket mr-2"></i>Comenzar Ahora
                        </button>
                        <button id="demoBtn" class="px-8 py-4 border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white rounded-lg font-semibold transition-all duration-200">
                            <i class="fas fa-play mr-2"></i>Ver Demo
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Features Grid -->
        <section class="py-20 bg-gray-800">
            <div class="container mx-auto px-6">
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <!-- Encriptación -->
                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-cyan-500 transition-colors duration-200 group">
                        <div class="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                            <i class="fas fa-lock text-white text-xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-3 text-cyan-400">Encriptación Avanzada</h3>
                        <p class="text-gray-400">AES-256-GCM + RSA-4096 para máxima seguridad</p>
                    </div>

                    <!-- Verificación AI -->
                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-cyan-500 transition-colors duration-200 group">
                        <div class="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                            <i class="fas fa-brain text-white text-xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-3 text-purple-400">Verificación AI</h3>
                        <p class="text-gray-400">Detección inteligente de manipulación y falsificación</p>
                    </div>

                    <!-- Auditoría -->
                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-cyan-500 transition-colors duration-200 group">
                        <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                            <i class="fas fa-clipboard-check text-white text-xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-3 text-orange-400">Auditoría Forense</h3>
                        <p class="text-gray-400">Registro completo e inmutable de todas las operaciones</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-900 border-t border-gray-700 py-8">
            <div class="container mx-auto px-6 text-center">
                <p class="text-gray-400">
                    © 2026 DocuSentinel Pro. Todos los derechos reservados. 
                    <span class="text-cyan-400">Seguridad de nivel empresarial</span>
                </p>
            </div>
        </footer>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

// Manejo de errores
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message
  }, 500);
});

// Exportar para Netlify Functions
module.exports.handler = async (event, context) => {
  const url = new URL(event.path, 'https://' + event.headers.host);
  const request = new Request(url.toString(), {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body
  });

  const response = await app.fetch(request, {}, {});
  
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text()
  };
};