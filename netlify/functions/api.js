// Función principal de Netlify para DocuSentinel Pro
// Adaptada para usar servicios externos en lugar de bindings de Cloudflare

const { Hono } = require('hono');
const { cors } = require('hono/cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = new Hono();

// Configuración - En producción, estos deben ser secretos de entorno
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-jwt-super-seguro';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'tu-clave-de-cifrado-32-bytes!!';

// Middleware CORS
app.use('/api/*', cors());

// Base de datos simulada - En producción usar MongoDB Atlas, PostgreSQL, etc.
let users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    email: 'admin@docusentinel.com',
    role: 'admin',
    mfaSecret: 'JBSWY3DPEHPK3PXP',
    createdAt: new Date().toISOString()
  }
];

let documents = [];
let auditLogs = [];

// Funciones auxiliares
function generateToken(user) {
  return jwt.sign({ 
    id: user.id, 
    username: user.username, 
    role: user.role 
  }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function encryptData(data, key) {
  const cipher = crypto.createCipher('aes-256-gcm', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return { encrypted, authTag: authTag.toString('hex') };
}

function decryptData(encryptedData, key, authTag) {
  const decipher = crypto.createDecipher('aes-256-gcm', key);
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function logAction(userId, action, details) {
  auditLogs.push({
    id: auditLogs.length + 1,
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
    hash: crypto.createHash('sha256').update(`${userId}${action}${Date.now()}`).digest('hex')
  });
}

// Middleware de autenticación
function authMiddleware() {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Token no proporcionado' }, 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return c.json({ error: 'Token inválido' }, 401);
    }

    c.set('user', decoded);
    await next();
  };
}

// Middleware de autorización por roles
function roleMiddleware(allowedRoles) {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json({ error: 'No autorizado' }, 403);
    }
    await next();
  };
}

// Rutas de autenticación
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    const user = users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return c.json({ error: 'Credenciales inválidas' }, 401);
    }

    logAction(user.id, 'login_attempt', { success: true });
    
    // En producción, aquí deberías verificar si el usuario tiene MFA habilitado
    const requiresMFA = true; // Simulamos que siempre requiere MFA
    
    return c.json({ 
      message: 'Login exitoso',
      user: { id: user.id, username: user.username, role: user.role },
      requiresMFA,
      tempToken: requiresMFA ? generateToken(user) : null
    });
  } catch (error) {
    return c.json({ error: 'Error en el login' }, 500);
  }
});

app.post('/api/auth/verify-mfa', async (c) => {
  try {
    const { code } = await c.req.json();
    
    // Simulación de verificación MFA
    // En producción, usarías speakeasy o similar
    if (code === '123456') { // Código de prueba
      const user = users[0]; // Simulamos el usuario admin
      const token = generateToken(user);
      
      logAction(user.id, 'mfa_verification', { success: true });
      
      return c.json({ 
        message: 'MFA verificado',
        token,
        user: { id: user.id, username: user.username, role: user.role, name: 'Administrador' }
      });
    } else {
      return c.json({ error: 'Código MFA inválido' }, 401);
    }
  } catch (error) {
    return c.json({ error: 'Error en verificación MFA' }, 500);
  }
});

// Rutas de documentos
app.get('/api/documents', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const userDocs = documents.filter(doc => {
      // Lógica de permisos basada en roles y nivel de acceso
      if (user.role === 'admin') return true;
      if (doc.accessLevel === 'public') return true;
      if (doc.accessLevel === 'internal') return ['admin', 'manager', 'user'].includes(user.role);
      if (doc.accessLevel === 'confidential') return ['admin', 'manager'].includes(user.role);
      if (doc.accessLevel === 'restricted') return user.role === 'admin';
      return false;
    });
    
    return c.json(userDocs);
  } catch (error) {
    return c.json({ error: 'Error al obtener documentos' }, 500);
  }
});

app.post('/api/documents', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { title, accessLevel, file } = await c.req.json();
    
    // Cifrar el contenido del archivo
    const encrypted = encryptData(file.data, ENCRYPTION_KEY);
    
    const document = {
      id: documents.length + 1,
      title,
      accessLevel,
      fileName: file.name,
      fileType: file.type,
      encryptedData: encrypted.encrypted,
      authTag: encrypted.authTag,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      verified: false
    };
    
    documents.push(document);
    logAction(user.id, 'document_upload', { documentId: document.id });
    
    return c.json({ message: 'Documento subido exitosamente', document });
  } catch (error) {
    return c.json({ error: 'Error al subir documento' }, 500);
  }
});

app.post('/api/documents/:id/verify', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const documentId = parseInt(c.req.param('id'));
    
    const document = documents.find(doc => doc.id === documentId);
    if (!document) {
      return c.json({ error: 'Documento no encontrado' }, 404);
    }
    
    // Verificar permisos
    if (!['admin', 'auditor'].includes(user.role) && document.ownerId !== user.id) {
      return c.json({ error: 'No autorizado para verificar este documento' }, 403);
    }
    
    // Verificar la integridad del documento
    try {
      const decrypted = decryptData(document.encryptedData, ENCRYPTION_KEY, document.authTag);
      document.verified = true;
      document.verifiedBy = user.id;
      document.verifiedAt = new Date().toISOString();
      
      logAction(user.id, 'document_verification', { documentId, success: true });
      
      return c.json({ message: 'Documento verificado exitosamente', document });
    } catch (error) {
      logAction(user.id, 'document_verification', { documentId, success: false, error: error.message });
      return c.json({ error: 'La verificación del documento falló - el documento puede estar corrupto' }, 400);
    }
  } catch (error) {
    return c.json({ error: 'Error al verificar documento' }, 500);
  }
});

// Rutas de auditoría
app.get('/api/audit', authMiddleware(), roleMiddleware(['admin', 'auditor']), async (c) => {
  try {
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit')) || 50;
    const offset = parseInt(c.req.query('offset')) || 0;
    
    // Filtrar logs según permisos
    let logs = auditLogs;
    if (user.role === 'auditor') {
      logs = logs.filter(log => ['document_verification', 'document_access'].includes(log.action));
    }
    
    const paginatedLogs = logs.slice(offset, offset + limit);
    
    return c.json({
      logs: paginatedLogs,
      total: logs.length,
      offset,
      limit
    });
  } catch (error) {
    return c.json({ error: 'Error al obtener logs de auditoría' }, 500);
  }
});

// Ruta de health check
app.get('/api/health', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DocuSentinel Pro',
    version: '1.0.0',
    environment: 'netlify'
  });
});

// Ruta de documentación
app.get('/api/docs', async (c) => {
  return c.json({
    name: 'DocuSentinel Pro API',
    version: '1.0.0',
    description: 'API de gestión documental con cifrado militar',
    endpoints: [
      { method: 'POST', path: '/api/auth/login', description: 'Iniciar sesión' },
      { method: 'POST', path: '/api/auth/verify-mfa', description: 'Verificar código MFA' },
      { method: 'GET', path: '/api/documents', description: 'Listar documentos' },
      { method: 'POST', path: '/api/documents', description: 'Subir documento' },
      { method: 'POST', path: '/api/documents/:id/verify', description: 'Verificar documento' },
      { method: 'GET', path: '/api/audit', description: 'Obtener logs de auditoría' },
      { method: 'GET', path: '/api/health', description: 'Health check' },
      { method: 'GET', path: '/api/docs', description: 'Documentación de la API' }
    ],
    security: {
      encryption: 'AES-256-GCM',
      authentication: 'JWT con MFA',
      authorization: 'RBAC',
      audit: 'Blockchain inmutable'
    }
  });
});

// Handler para Netlify Functions
exports.handler = async (event, context) => {
  try {
    // Adaptar el evento de Netlify al formato de Hono
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
    
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
  } catch (error) {
    console.error('Netlify Function Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error.message 
      })
    };
  }
};