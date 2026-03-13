import { Hono } from 'hono';
import { z } from 'zod';
import { UserRole } from '../types';
import { AuthService } from '../auth/service';
import { AuditService } from '../audit/service';
import { AuthMiddleware } from '../middleware/auth';
import { SUPERUSER_CONFIG } from '../config/superuser';

const auth = new Hono<{ Bindings: CloudflareBindings }>();
const authService = new AuthService();
const auditService = new AuditService();
const authMiddleware = new AuthMiddleware();

// Esquemas de validación
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  mfaToken: z.string().optional()
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).optional()
});

const mfaSchema = z.object({
  token: z.string().length(6).regex(/^\d{6}$/)
});

/**
 * Ruta de login
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = loginSchema.parse(body);
    
    const { email, password, mfaToken } = validatedData;
    
    // Primero verificar si es el superusuario
    if (email === SUPERUSER_CONFIG.email) {
      const superuserAuth = await authService.authenticateSuperuser(email, password);
      
      if (superuserAuth) {
        // Login exitoso del superusuario
        const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
        
        await auditService.logEvent(
          'superuser',
          'LOGIN_SUCCESS',
          'user',
          email,
          { role: 'superuser', method: 'standard' },
          clientIP,
          c.req.header('User-Agent') || 'unknown',
          c.env.DB
        );
        
        return c.json({
          success: true,
          data: {
            user: superuserAuth.user,
            token: superuserAuth.token,
            message: 'Bienvenido Raul Azespejo - Superusuario'
          }
        });
      } else {
        // Login fallido del superusuario
        const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
        
        await auditService.logEvent(
          'superuser',
          'LOGIN_FAILED',
          'user',
          email,
          { reason: 'invalid_superuser_password' },
          clientIP,
          c.req.header('User-Agent') || 'unknown',
          c.env.DB
        );
        
        return c.json({
          success: false,
          error: 'Credenciales de superusuario inválidas'
        }, 401);
      }
    }
    
    // Si no es superusuario, continuar con el flujo normal de usuario regular
    // Buscar usuario en base de datos
    const user = await c.env.DB.prepare(`
      SELECT * FROM users WHERE email = ? AND is_active = 1
    `).bind(email).first();
    
    if (!user) {
      // Registrar intento fallido
      const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
      
      await auditService.logEvent(
        'anonymous',
        'LOGIN_FAILED',
        'user',
        email,
        { reason: 'user_not_found' },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );
      
      return c.json({
        success: false,
        error: 'Credenciales inválidas'
      }, 401);
    }
    
    // Verificar contraseña
    const isPasswordValid = await authService.verifyPassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      // Registrar intento fallido
      const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
      
      await auditService.logEvent(
        user.id,
        'LOGIN_FAILED',
        'user',
        user.id,
        { reason: 'invalid_password' },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );
      
      return c.json({
        success: false,
        error: 'Credenciales inválidas'
      }, 401);
    }
    
    // Verificar MFA si está habilitado
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return c.json({
          success: false,
          error: 'Se requiere token MFA',
          requiresMFA: true
        }, 400);
      }
      
      const isMFAValid = await authService.verifyTOTP(mfaToken, user.mfa_secret);
      
      if (!isMFAValid) {
        // Registrar intento MFA fallido
        const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
        
        await auditService.logEvent(
          user.id,
          'MFA_FAILED',
          'user',
          user.id,
          { reason: 'invalid_token' },
          clientIP,
          c.req.header('User-Agent') || 'unknown',
          c.env.DB
        );
        
        return c.json({
          success: false,
          error: 'Token MFA inválido'
        }, 401);
      }
    }
    
    if (!isPasswordValid) {
      // Registrar intento fallido
      const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
      
      await auditService.logEvent(
        user.id,
        'LOGIN_FAILED',
        'user',
        user.id,
        { reason: 'invalid_password' },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );
      
      return c.json({
        success: false,
        error: 'Credenciales inválidas'
      }, 401);
    }
    
    // Verificar MFA si está habilitado
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return c.json({
          success: false,
          error: 'Se requiere token MFA',
          requiresMFA: true
        }, 400);
      }
      
      const isMFAValid = await authService.verifyTOTP(mfaToken, user.mfa_secret);
      
      if (!isMFAValid) {
        // Registrar intento MFA fallido
        const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
        
        await auditService.logEvent(
          user.id,
          'MFA_FAILED',
          'user',
          user.id,
          { reason: 'invalid_token' },
          clientIP,
          c.req.header('User-Agent') || 'unknown',
          c.env.DB
        );
        
        return c.json({
          success: false,
          error: 'Token MFA inválido'
        }, 401);
      }
    }
    
    // Generar token JWT
    const jwtSecret = c.env.JWT_SECRET || 'default-secret-change-in-production';
    const token = await authService.generateJWT(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        mfaVerified: user.mfa_enabled
      },
      jwtSecret,
      24 * 3600 // 24 horas
    );
    
    // Crear sesión
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 horas
    const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
    
    // Hash del token para almacenamiento
    const tokenHash = await authService.hashData(token);
    
    await c.env.DB.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      user.id,
      tokenHash,
      expiresAt.toISOString(),
      clientIP,
      c.req.header('User-Agent') || 'unknown'
    ).run();
    
    // Registrar login exitoso
    await auditService.logEvent(
      user.id,
      'LOGIN_SUCCESS',
      'session',
      sessionId,
      { 
        method: 'password',
        mfa_used: user.mfa_enabled,
        session_id: sessionId
      },
      clientIP,
      c.req.header('User-Agent') || 'unknown',
      c.env.DB
    );
    
    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mfaEnabled: Boolean(user.mfa_enabled)
        }
      }
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    return c.json({
      success: false,
      error: 'Error al procesar login'
    }, 500);
  }
});

/**
 * Ruta de registro
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = registerSchema.parse(body);
    
    const { email, name, password, role = UserRole.USUARIO_ESTANDAR } = validatedData;
    
    // Verificar si el usuario ya existe
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first();
    
    if (existingUser) {
      return c.json({
        success: false,
        error: 'El usuario ya existe'
      }, 400);
    }
    
    // Hash de contraseña
    const passwordHash = await authService.hashPassword(password);
    
    // Crear usuario
    const userId = crypto.randomUUID();
    const now = new Date();
    
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      email,
      name,
      role,
      passwordHash,
      now.toISOString(),
      now.toISOString()
    ).run();
    
    // Registrar creación de usuario
    const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
    
    await auditService.logEvent(
      userId,
      'USER_CREATED',
      'user',
      userId,
      { 
        email,
        name,
        role,
        created_by: 'self'
      },
      clientIP,
      c.req.header('User-Agent') || 'unknown',
      c.env.DB
    );
    
    return c.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        userId,
        email,
        name
      }
    });
    
  } catch (error) {
    console.error('Error en registro:', error);
    return c.json({
      success: false,
      error: 'Error al registrar usuario'
    }, 500);
  }
});

/**
 * Ruta para obtener perfil de usuario
 */
auth.get('/profile', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    
    return c.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return c.json({
      success: false,
      error: 'Error al obtener perfil'
    }, 500);
  }
});

/**
 * Ruta para configurar MFA
 */
auth.post('/mfa/setup', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    
    // Generar secreto TOTP
    const { secret, qrCode } = await authService.generateTOTPSecret(user.email);
    
    // Actualizar usuario con secreto MFA
    await c.env.DB.prepare(`
      UPDATE users 
      SET mfa_secret = ?, mfa_type = 'totp', mfa_enabled = 0
      WHERE id = ?
    `).bind(secret, user.id).run();
    
    // Registrar configuración de MFA
    const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
    
    await auditService.logEvent(
      user.id,
      'MFA_SETUP_INITIATED',
      'user',
      user.id,
      { 
        mfa_type: 'totp',
        setup_method: 'manual'
      },
      clientIP,
      c.req.header('User-Agent') || 'unknown',
      c.env.DB
    );
    
    return c.json({
      success: true,
      data: {
        secret,
        qrCode,
        backupCodes: [] // En producción, generar códigos de respaldo
      }
    });
    
  } catch (error) {
    console.error('Error al configurar MFA:', error);
    return c.json({
      success: false,
      error: 'Error al configurar MFA'
    }, 500);
  }
});

/**
 * Ruta para verificar MFA
 */
auth.post('/mfa/verify', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const validatedData = mfaSchema.parse(body);
    const { token } = validatedData;
    
    // Verificar token TOTP
    const isValid = await authService.verifyTOTP(token, user.mfaSecret);
    
    if (!isValid) {
      // Registrar intento fallido
      const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
      
      await auditService.logEvent(
        user.id,
        'MFA_VERIFICATION_FAILED',
        'user',
        user.id,
        { 
          mfa_type: 'totp',
          failure_reason: 'invalid_token'
        },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );
      
      return c.json({
        success: false,
        error: 'Token MFA inválido'
      }, 400);
    }
    
    // Habilitar MFA
    await c.env.DB.prepare(`
      UPDATE users 
      SET mfa_enabled = 1
      WHERE id = ?
    `).bind(user.id).run();
    
    // Registrar verificación exitosa
    const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
    
    await auditService.logEvent(
      user.id,
      'MFA_VERIFIED',
      'user',
      user.id,
      { 
        mfa_type: 'totp',
        verified: true
      },
      clientIP,
      c.req.header('User-Agent') || 'unknown',
      c.env.DB
    );
    
    return c.json({
      success: true,
      message: 'MFA verificado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al verificar MFA:', error);
    return c.json({
      success: false,
      error: 'Error al verificar MFA'
    }, 500);
  }
});

/**
 * Ruta de logout
 */
auth.post('/logout', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const token = authMiddleware.extractToken(c);
    
    if (token) {
      // Eliminar sesión
      const tokenHash = await authService.hashData(token);
      await c.env.DB.prepare(`
        DELETE FROM sessions 
        WHERE user_id = ? AND token_hash = ?
      `).bind(user.id, tokenHash).run();
    }
    
    // Registrar logout
    const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
    
    await auditService.logEvent(
      user.id,
      'LOGOUT',
      'session',
      user.id,
      { method: 'user_initiated' },
      clientIP,
      c.req.header('User-Agent') || 'unknown',
      c.env.DB
    );
    
    return c.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
    
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return c.json({
      success: false,
      error: 'Error al cerrar sesión'
    }, 500);
  }
});

export default auth;