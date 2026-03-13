// DocuSentinel Pro - Frontend JavaScript

class DocuSentinelApp {
  constructor() {
    this.apiBase = '/api';
    this.token = localStorage.getItem('token');
    this.currentUser = null;
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuth();
    this.initDemo();
  }

  bindEvents() {
    // Botones principales
    const loginBtn = document.getElementById('loginBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const demoBtn = document.getElementById('demoBtn');
    const selectFileBtn = document.getElementById('selectFileBtn');

    if (loginBtn) loginBtn.addEventListener('click', () => this.showLoginModal());
    if (getStartedBtn) getStartedBtn.addEventListener('click', () => this.showLoginModal());
    if (demoBtn) demoBtn.addEventListener('click', () => this.toggleDemo());
    if (selectFileBtn) selectFileBtn.addEventListener('click', () => this.selectFile());

    // Modal de login
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target);
      }
    });
  }

  checkAuth() {
    if (this.token) {
      this.validateToken();
    }
  }

  async validateToken() {
    try {
      const response = await fetch(`${this.apiBase}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        this.currentUser = result.data;
        this.updateUIForAuth();
      } else {
        this.logout();
      }
    } catch (error) {
      console.error('Error validando token:', error);
      this.logout();
    }
  }

  updateUIForAuth() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn && this.currentUser) {
      loginBtn.innerHTML = `
        <i class="fas fa-user mr-2"></i>
        ${this.currentUser.name}
      `;
      loginBtn.onclick = () => this.showUserMenu();
    }
  }

  showLoginModal() {
    const modal = this.createModal(`
      <div class="bg-white rounded-xl max-w-md w-full mx-4">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold text-gray-800">Iniciar Sesión</h3>
            <button class="text-gray-400 hover:text-gray-600" onclick="app.closeModal(this.closest('.modal'))">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="p-6">
          <form id="loginForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="email" class="form-input" placeholder="usuario@ejemplo.com" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" id="password" class="form-input" placeholder="••••••••" required>
            </div>
            <div id="mfaSection" class="hidden">
              <label class="block text-sm font-medium text-gray-700 mb-1">Código MFA</label>
              <input type="text" id="mfaToken" class="form-input" placeholder="123456" maxlength="6">
            </div>
            <button type="submit" class="w-full btn btn-primary">
              <i class="fas fa-sign-in-alt mr-2"></i>
              Iniciar Sesión
            </button>
          </form>
          <div class="mt-4 text-center">
            <p class="text-sm text-gray-600">
              ¿No tienes cuenta? 
              <a href="#" class="text-blue-600 hover:text-blue-800 font-medium">Regístrate aquí</a>
            </p>
          </div>
        </div>
      </div>
    `);

    // Bind form submit
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', (e) => this.handleLogin(e));
  }

  async handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const mfaToken = document.getElementById('mfaToken').value;

    try {
      const response = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, mfaToken })
      });

      const result = await response.json();

      if (result.success) {
        this.token = result.data.token;
        this.currentUser = result.data.user;
        localStorage.setItem('token', this.token);
        
        this.closeModal(document.querySelector('.modal'));
        this.updateUIForAuth();
        this.showAlert('success', '¡Bienvenido! Has iniciado sesión exitosamente.');
      } else if (result.requiresMFA) {
        document.getElementById('mfaSection').classList.remove('hidden');
        this.showAlert('info', 'Por favor ingresa tu código MFA');
      } else {
        this.showAlert('danger', result.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error('Error en login:', error);
      this.showAlert('danger', 'Error al conectar con el servidor');
    }
  }

  showUserMenu() {
    const menu = `
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48">
        <div class="px-4 py-2 border-b border-gray-100">
          <p class="font-medium text-gray-800">${this.currentUser.name}</p>
          <p class="text-sm text-gray-600">${this.currentUser.email}</p>
        </div>
        <button class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm" onclick="app.showProfile()">
          <i class="fas fa-user mr-2"></i>Perfil
        </button>
        <button class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm" onclick="app.showSettings()">
          <i class="fas fa-cog mr-2"></i>Configuración
        </button>
        <div class="border-t border-gray-100 mt-2 pt-2">
          <button class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600" onclick="app.logout()">
            <i class="fas fa-sign-out-alt mr-2"></i>Cerrar Sesión
          </button>
        </div>
      </div>
    `;

    this.showDropdown(menu, event.target);
  }

  async logout() {
    if (this.token) {
      try {
        await fetch(`${this.apiBase}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    }

    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('token');
    
    location.reload();
  }

  toggleDemo() {
    const demoSection = document.getElementById('demoSection');
    const demoBtn = document.getElementById('demoBtn');
    
    if (demoSection.classList.contains('hidden')) {
      demoSection.classList.remove('hidden');
      demoSection.classList.add('fade-in');
      demoBtn.textContent = 'Ocultar Demo';
    } else {
      demoSection.classList.add('hidden');
      demoBtn.textContent = 'Ver Demo';
    }
  }

  selectFile() {
    const input = document.getElementById('fileInput');
    input.click();
  }

  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const resultDiv = document.getElementById('verificationResult');
    
    // Mostrar estado de carga
    resultDiv.innerHTML = `
      <div class="text-center">
        <div class="loading mx-auto mb-4"></div>
        <p>Analizando documento...</p>
        <p class="text-sm text-gray-500">${file.name}</p>
      </div>
    `;

    try {
      // Simular análisis de documento
      await this.simulateDocumentAnalysis(file);
    } catch (error) {
      console.error('Error al analizar documento:', error);
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          Error al analizar el documento: ${error.message}
        </div>
      `;
    }
  }

  async simulateDocumentAnalysis(file) {
    // Simular proceso de análisis
    await new Promise(resolve => setTimeout(resolve, 3000));

    const resultDiv = document.getElementById('verificationResult');
    
    // Resultado simulado
    const confidence = Math.floor(Math.random() * 30) + 70; // 70-100%
    const isAuthentic = confidence > 85;
    
    let statusIcon, statusColor, statusText;
    
    if (isAuthentic) {
      statusIcon = 'fa-check-circle';
      statusColor = 'text-green-500';
      statusText = 'Documento Auténtico';
    } else {
      statusIcon = 'fa-exclamation-triangle';
      statusColor = 'text-yellow-500';
      statusText = 'Revisión Requerida';
    }

    resultDiv.innerHTML = `
      <div class="text-center">
        <i class="fas ${statusIcon} text-4xl ${statusColor} mb-4"></i>
        <h4 class="text-xl font-semibold mb-2">${statusText}</h4>
        <div class="mb-4">
          <div class="flex justify-between text-sm text-gray-600 mb-1">
            <span>Nivel de Confianza</span>
            <span>${confidence}%</span>
          </div>
          <div class="progress">
            <div class="progress-bar ${confidence > 85 ? 'progress-bar-success' : 'progress-bar-warning'}" style="width: ${confidence}%"></div>
          </div>
        </div>
        <p class="text-gray-600 text-sm">
          ${isAuthentic ? 'El documento ha sido verificado exitosamente.' : 'Se han detectado algunas inconsistencias que requieren revisión manual.'}
        </p>
        <button class="btn btn-primary mt-4" onclick="app.showDetailedReport()">
          Ver Reporte Detallado
        </button>
      </div>
    `;
  }

  showDetailedReport() {
    const report = `
      <div class="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold text-gray-800">Reporte de Verificación</h3>
            <button class="text-gray-400 hover:text-gray-600" onclick="app.closeModal(this.closest('.modal'))">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div class="space-y-6">
            <div>
              <h4 class="font-semibold text-gray-800 mb-2">Análisis de Imagen</h4>
              <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-600">✓ No se detectaron manipulaciones en la imagen</p>
                <p class="text-sm text-gray-600">✓ Compresión JPEG consistente</p>
                <p class="text-sm text-gray-600">✓ Ruido de imagen natural</p>
              </div>
            </div>
            
            <div>
              <h4 class="font-semibold text-gray-800 mb-2">Análisis Tipográfico</h4>
              <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-600">✓ Fuentes consistentes con documentos oficiales</p>
                <p class="text-sm text-gray-600">✓ Espaciado y kerning normales</p>
                <p class="text-sm text-gray-600">✓ Tamaños de fuente apropiados</p>
              </div>
            </div>
            
            <div>
              <h4 class="font-semibold text-gray-800 mb-2">Análisis de Metadatos</h4>
              <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-600">✓ EXIF data presente y consistente</p>
                <p class="text-sm text-gray-600">✓ Fecha de creación verificada</p>
                <p class="text-sm text-gray-600">✓ Dispositivo de origen identificado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.createModal(report);
  }

  createModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = content;
    
    document.body.appendChild(modal);
    
    // Auto-focus en el primer input si existe
    const firstInput = modal.querySelector('input, button');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  closeModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  showDropdown(content, target) {
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute z-50 mt-2';
    dropdown.innerHTML = content;
    
    const rect = target.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(dropdown);
    
    // Cerrar al hacer clic fuera
    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target) && e.target !== target) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    };
    
    setTimeout(() => document.addEventListener('click', closeDropdown), 100);
  }

  showAlert(type, message) {
    const alertClass = {
      success: 'alert-success',
      danger: 'alert-danger',
      warning: 'alert-warning',
      info: 'alert-info'
    }[type];

    const alert = document.createElement('div');
    alert.className = `alert ${alertClass} fixed top-4 right-4 z-50 max-w-sm`;
    alert.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2">${message}</span>
        <button class="ml-auto" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    document.body.appendChild(alert);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 5000);
  }

  initDemo() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
  }

  showProfile() {
    // Implementar vista de perfil
    this.showAlert('info', 'Función de perfil en desarrollo');
  }

  showSettings() {
    // Implementar configuración
    this.showAlert('info', 'Función de configuración en desarrollo');
  }
}

// Inicializar aplicación
const app = new DocuSentinelApp();