#!/bin/bash

# Script de despliegue para Netlify - DocuSentinel Pro
# Este script adapta la aplicación de Cloudflare Pages a Netlify Functions

set -e

echo "🚀 Iniciando despliegue de DocuSentinel Pro en Netlify..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración
PROJECT_NAME="docusentinel-pro"
BUILD_DIR="dist"
FUNCTIONS_DIR="netlify/functions"
NETLIFY_TOML="netlify.toml"

# Función para imprimir mensajes
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Verificar dependencias
print_message $BLUE "📋 Verificando dependencias..."
if ! command -v node &> /dev/null; then
    print_message $RED "❌ Node.js no está instalado"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_message $RED "❌ npm no está instalado"
    exit 1
fi

# Instalar Netlify CLI si no está instalado
if ! command -v netlify &> /dev/null; then
    print_message $YELLOW "📦 Instalando Netlify CLI..."
    npm install -g netlify-cli
fi

# Crear estructura para Netlify Functions
print_message $BLUE "🏗️ Creando estructura para Netlify Functions..."
mkdir -p $FUNCTIONS_DIR
mkdir -p $BUILD_DIR/static

# Crear adaptador para Netlify Functions
print_message $BLUE "🔧 Creando adaptador de Cloudflare a Netlify..."
cat > $FUNCTIONS_DIR/api.js << 'EOF'
const { Hono } = require('hono');
const { cors } = require('hono/cors');

// Adaptador para Netlify Functions
const app = new Hono();

// Middleware CORS
app.use('/api/*', cors());

// Importar rutas de la aplicación original
const routes = require('../../src/routes');

// Registrar rutas
app.route('/api', routes);

// Handler para Netlify Functions
exports.handler = async (event, context) => {
  // Adaptar el evento de Netlify al formato de Hono
  const url = new URL(event.rawUrl);
  const request = new Request(url.toString(), {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  });

  // Procesar con Hono
  const response = await app.fetch(request);

  // Adaptar la respuesta de Hono al formato de Netlify
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
};
EOF

# Crear archivo de configuración de Netlify
print_message $BLUE "⚙️ Creando netlify.toml..."
cat > $NETLIFY_TOML << 'EOF'
[build]
  command = "npm run build:netlify"
  functions = "netlify/functions"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api"
  status = 200

[[redirects]]
  from = "/static/*"
  to = "/static/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[functions]
  node_bundler = "esbuild"

[functions.api]
  included_files = ["src/**"]
EOF

# Crear script de build para Netlify
print_message $BLUE "🔨 Creando script de build para Netlify..."
# Actualizar package.json con scripts de Netlify
cat >> package.json << 'EOF'
,
  "scripts": {
    "build:netlify": "npm run build && npm run build:functions",
    "build:functions": "cd netlify/functions && npm install",
    "dev:netlify": "netlify dev",
    "deploy:netlify": "netlify deploy --prod"
  }
EOF

# Crear package.json para las funciones
print_message $BLUE "📦 Creando package.json para funciones..."
cat > $FUNCTIONS_DIR/package.json << 'EOF'
{
  "name": "docusentinel-functions",
  "version": "1.0.0",
  "description": "Funciones de Netlify para DocuSentinel Pro",
  "main": "api.js",
  "dependencies": {
    "hono": "^4.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.0",
    "node-forge": "^1.3.0",
    "crypto-js": "^4.1.0"
  },
  "engines": {
    "node": ">=18"
  }
}
EOF

# Crear archivo HTML principal adaptado para Netlify
print_message $BLUE "📝 Creando archivo HTML principal..."
cat > $BUILD_DIR/index.html << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DocuSentinel Pro - Gestión Documental Segura</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/crypto-js@4.1.0/crypto-js.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/speakeasy@2.0.0/speakeasy.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .glass { backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.1); }
        .hover-scale { transition: transform 0.2s ease; }
        .hover-scale:hover { transform: scale(1.05); }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div id="app">
        <!-- Header -->
        <header class="gradient-bg text-white shadow-lg">
            <div class="container mx-auto px-4 py-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-shield-alt text-3xl"></i>
                        <div>
                            <h1 class="text-2xl font-bold">DocuSentinel Pro</h1>
                            <p class="text-blue-100">Gestión Documental con Cifrado Militar</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <button id="themeToggle" class="p-2 rounded-lg hover:bg-white/20 transition-colors">
                            <i class="fas fa-moon"></i>
                        </button>
                        <div id="userInfo" class="hidden glass px-4 py-2 rounded-lg">
                            <span id="userName" class="font-medium"></span>
                            <span id="userRole" class="ml-2 px-2 py-1 bg-blue-600 rounded-full text-xs"></span>
                        </div>
                        <button id="logoutBtn" class="hidden glass px-4 py-2 rounded-lg hover:bg-white/20 transition-colors">
                            <i class="fas fa-sign-out-alt mr-2"></i>Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="container mx-auto px-4 py-8">
            <!-- Login Section -->
            <section id="loginSection" class="max-w-md mx-auto">
                <div class="bg-white rounded-xl shadow-lg p-8">
                    <div class="text-center mb-6">
                        <i class="fas fa-user-shield text-4xl text-blue-600 mb-4"></i>
                        <h2 class="text-2xl font-bold text-gray-800">Iniciar Sesión</h2>
                        <p class="text-gray-600">Sistema de autenticación multi-factor</p>
                    </div>
                    
                    <form id="loginForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                            <input type="text" id="username" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <input type="password" id="password" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <button type="submit" 
                                class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="fas fa-sign-in-alt mr-2"></i>Iniciar Sesión
                        </button>
                    </form>

                    <!-- MFA Section -->
                    <div id="mfaSection" class="hidden mt-6 p-4 bg-blue-50 rounded-lg">
                        <h3 class="font-medium text-blue-900 mb-3">Verificación de dos factores</h3>
                        <form id="mfaForm" class="space-y-3">
                            <input type="text" id="mfaCode" placeholder="Código MFA" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <button type="submit" 
                                    class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                                Verificar
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <!-- Dashboard Section -->
            <section id="dashboardSection" class="hidden">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Stats Cards -->
                    <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-white p-6 rounded-xl shadow-lg hover-scale">
                            <div class="flex items-center">
                                <div class="bg-blue-100 p-3 rounded-lg">
                                    <i class="fas fa-file-alt text-blue-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <h3 class="text-gray-600 text-sm font-medium">Documentos</h3>
                                    <p id="docCount" class="text-2xl font-bold text-gray-800">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-xl shadow-lg hover-scale">
                            <div class="flex items-center">
                                <div class="bg-green-100 p-3 rounded-lg">
                                    <i class="fas fa-check-circle text-green-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <h3 class="text-gray-600 text-sm font-medium">Verificados</h3>
                                    <p id="verifiedCount" class="text-2xl font-bold text-gray-800">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-xl shadow-lg hover-scale">
                            <div class="flex items-center">
                                <div class="bg-purple-100 p-3 rounded-lg">
                                    <i class="fas fa-shield-alt text-purple-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <h3 class="text-gray-600 text-sm font-medium">Seguridad</h3>
                                    <p class="text-2xl font-bold text-gray-800">Máxima</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Document Upload -->
                    <div class="bg-white p-6 rounded-xl shadow-lg">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-upload mr-2"></i>Subir Documento
                        </h3>
                        <form id="uploadForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                <input type="text" id="docTitle" required 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Archivo</label>
                                <input type="file" id="fileInput" required accept=".pdf,.doc,.docx,.txt"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nivel de acceso</label>
                                <select id="accessLevel" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="public">Público</option>
                                    <option value="internal">Interno</option>
                                    <option value="confidential">Confidencial</option>
                                    <option value="restricted">Restringido</option>
                                </select>
                            </div>
                            <button type="submit" 
                                    class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="fas fa-lock mr-2"></i>Cifrar y Subir
                            </button>
                        </form>
                    </div>

                    <!-- Document List -->
                    <div class="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-bold text-gray-800">
                                <i class="fas fa-list mr-2"></i>Documentos Recientes
                            </h3>
                            <button id="refreshBtn" 
                                    class="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <div id="documentList" class="space-y-3">
                            <!-- Documentos se cargarán dinámicamente -->
                        </div>
                    </div>
                </div>

                <!-- QR Code Section -->
                <div class="mt-6 bg-white p-6 rounded-xl shadow-lg">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">
                        <i class="fas fa-qrcode mr-2"></i>Autenticación QR
                    </h3>
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600">Escanea este código QR para verificación adicional</p>
                            <canvas id="qrCode" class="mt-3"></canvas>
                        </div>
                        <div class="text-right">
                            <button id="generateQR" 
                                    class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                                Generar QR
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </main>

        <!-- Footer -->
        <footer class="bg-gray-800 text-white py-8 mt-12">
            <div class="container mx-auto px-4 text-center">
                <p>&copy; 2024 DocuSentinel Pro. Seguridad y confianza en cada documento.</p>
                <div class="mt-4 flex justify-center space-x-4">
                    <span class="bg-green-600 px-3 py-1 rounded-full text-sm">
                        <i class="fas fa-shield-alt mr-1"></i>AES-256-GCM
                    </span>
                    <span class="bg-blue-600 px-3 py-1 rounded-full text-sm">
                        <i class="fas fa-key mr-1"></i>RSA-4096
                    </span>
                    <span class="bg-purple-600 px-3 py-1 rounded-full text-sm">
                        <i class="fas fa-mobile-alt mr-1"></i>MFA
                    </span>
                </div>
            </div>
        </footer>
    </div>

    <!-- JavaScript Principal -->
    <script src="/static/app.js"></script>
</body>
</html>
EOF

# Crear archivo JavaScript principal
print_message $BLUE "📝 Creando archivo JavaScript principal..."
cat > $BUILD_DIR/static/app.js << 'EOF'
// DocuSentinel Pro - Frontend JavaScript para Netlify
class DocuSentinelApp {
    constructor() {
        this.apiUrl = '/.netlify/functions/api';
        this.token = localStorage.getItem('token');
        this.user = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.loadTheme();
    }

    setupEventListeners() {
        // Login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // MFA
        const mfaForm = document.getElementById('mfaForm');
        if (mfaForm) {
            mfaForm.addEventListener('submit', (e) => this.handleMFA(e));
        }

        // Upload
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Theme
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Refresh
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDocuments());
        }

        // QR Code
        const generateQR = document.getElementById('generateQR');
        if (generateQR) {
            generateQR.addEventListener('click', () => this.generateQRCode());
        }
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const result = await this.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (result.requiresMFA) {
                document.getElementById('mfaSection').classList.remove('hidden');
            } else {
                this.setAuth(result.token, result.user);
            }
        } catch (error) {
            alert('Error de login: ' + error.message);
        }
    }

    async handleMFA(e) {
        e.preventDefault();
        const code = document.getElementById('mfaCode').value;

        try {
            const result = await this.apiCall('/auth/verify-mfa', {
                method: 'POST',
                body: JSON.stringify({ code })
            });

            this.setAuth(result.token, result.user);
        } catch (error) {
            alert('Error MFA: ' + error.message);
        }
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userRole').textContent = user.role;
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        
        this.loadDashboard();
    }

    checkAuth() {
        if (this.token) {
            this.loadDashboard();
        }
    }

    async loadDashboard() {
        try {
            await this.loadDocuments();
            this.generateQRCode();
        } catch (error) {
            console.error('Dashboard error:', error);
        }
    }

    async loadDocuments() {
        try {
            const documents = await this.apiCall('/documents');
            this.displayDocuments(documents);
            this.updateStats(documents);
        } catch (error) {
            console.error('Documents error:', error);
        }
    }

    displayDocuments(documents) {
        const list = document.getElementById('documentList');
        list.innerHTML = '';

        documents.slice(0, 5).forEach(doc => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
            item.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-file-alt text-blue-600 mr-3"></i>
                    <div>
                        <p class="font-medium text-gray-800">${doc.title}</p>
                        <p class="text-sm text-gray-600">${new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        ${doc.accessLevel}
                    </span>
                    <button onclick="app.verifyDocument('${doc.id}')" 
                            class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-check-circle"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    }

    updateStats(documents) {
        document.getElementById('docCount').textContent = documents.length;
        document.getElementById('verifiedCount').textContent = 
            documents.filter(d => d.verified).length;
    }

    async handleUpload(e) {
        e.preventDefault();
        const title = document.getElementById('docTitle').value;
        const accessLevel = document.getElementById('accessLevel').value;
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Por favor selecciona un archivo');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileData = e.target.result;
                
                const result = await this.apiCall('/documents', {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        accessLevel,
                        file: {
                            name: file.name,
                            type: file.type,
                            data: fileData
                        }
                    })
                });

                alert('Documento subido exitosamente');
                e.target.reset();
                this.loadDocuments();
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            alert('Error al subir: ' + error.message);
        }
    }

    async verifyDocument(id) {
        try {
            const result = await this.apiCall(`/documents/${id}/verify`, {
                method: 'POST'
            });
            alert('Documento verificado exitosamente');
            this.loadDocuments();
        } catch (error) {
            alert('Error al verificar: ' + error.message);
        }
    }

    generateQRCode() {
        const canvas = document.getElementById('qrCode');
        const data = {
            user: this.user?.name,
            timestamp: Date.now(),
            token: this.token?.substring(0, 10)
        };
        
        QRCode.toCanvas(canvas, JSON.stringify(data), {
            width: 200,
            margin: 2
        }, function (error) {
            if (error) console.error('QR Error:', error);
        });
    }

    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('dark');
        
        if (isDark) {
            body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    }

    loadTheme() {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark');
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        
        document.getElementById('userInfo').classList.add('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
        document.getElementById('dashboardSection').classList.add('hidden');
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('mfaSection').classList.add('hidden');
    }
}

// Inicializar la aplicación
const app = new DocuSentinelApp();
EOF

# Hacer el script ejecutable
chmod +x deploy-netlify.sh

print_message $GREEN "✅ Script de despliegue para Netlify creado exitosamente!"
print_message $YELLOW "📋 Resumen de archivos creados:"
print_message $BLUE "  - deploy-netlify.sh (este script)"
print_message $BLUE "  - netlify/functions/api.js (función serverless)"
print_message $BLUE "  - netlify.toml (configuración de Netlify)"
print_message $BLUE "  - dist/index.html (frontend adaptado)"
print_message $BLUE "  - dist/static/app.js (JavaScript principal)"

print_message $YELLOW "🚀 Para desplegar en Netlify:"
print_message $BLUE "  1. Asegúrate de tener una cuenta en Netlify"
print_message $BLUE "  2. Ejecuta: ./deploy-netlify.sh"
print_message $BLUE "  3. Sigue las instrucciones del script"

print_message $GREEN "✨ DocuSentinel Pro está listo para desplegar en Netlify!"