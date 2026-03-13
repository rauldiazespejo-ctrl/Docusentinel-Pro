import { Context, Next } from 'hono';
import { User, UserRole } from '../types';
import { AuthService } from '../auth/service';
import { AuditService } from '../audit/service';

/**
 * Middleware de autenticación y autorización
 * Verifica JWT, gestiona sesiones y registra auditoría
 */
export class AuthMiddleware {
  private authService: AuthService;
  private auditService: AuditService;

  constructor() {
    this.authService = new AuthService();
    this.auditService = new AuditService();
  }

  /**
   * Middleware principal de autenticación
   */
  async authenticate(c: Context, next: Next) {
    try {
      const token = this.extractToken(c);
      
      if (!token) {
        return c.json({ 
          success: false, 
          error: 'Token de autenticación requerido' 
        }, 401);
      }

      // Verificar token JWT
      const jwtSecret = c.env.JWT_SECRET || 'default-secret-change-in-production';
      const payload = await this.authService.verifyJWT(token, jwtSecret);
      
      // Obtener usuario de la base de datos
      const user = await this.getUserById(payload.userId, c.env.DB);
      
      if (!user || !user.isActive) {
        return c.json({ 
          success: false, 
          error: 'Usuario no encontrado o inactivo' 
        }, 401);
      }

      // Verificar sesión activa
      const sessionValid = await this.validateSession(token, user.id, c.env.DB);
      if (!sessionValid) {
        return c.json({ 
          success: false, 
          error: 'Sesión expirada o inválida' 
        }, 401);
      }

      // Agregar usuario al contexto
      c.set('user', user);
      c.set('userId', user.id);
      
      // Registrar acceso exitoso
      const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
      
      await this.auditService.logEvent(
        user.id,
        'AUTH_SUCCESS',
        'session',
        user.id,
        { method: 'JWT', userAgent: c.req.header('User-Agent') },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );

      await next();
    } catch (error) {
      console.error('Error de autenticación:', error);
      
      // Registrar intento fallido
      const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
      
      await this.auditService.logEvent(
        'anonymous',
        'AUTH_FAILED',
        'session',
        'unknown',
        { error: error.message, userAgent: c.req.header('User-Agent') },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );

      return c.json({ 
        success: false, 
        error: 'Autenticación fallida' 
      }, 401);
    }
  }

  /**
   * Middleware de autorización basado en roles
   */
  requireRole(minRoleLevel: UserRole) {
    return async (c: Context, next: Next) => {
      try {
        const user = c.get('user') as User;
        
        if (!user) {
          return c.json({ 
            success: false, 
            error: 'Usuario no autenticado' 
          }, 401);
        }

        if (user.role > minRoleLevel) {
          // Registrar intento de acceso no autorizado
          const clientIP = c.req.header('CF-Connecting-IP') || 
                         c.req.header('X-Forwarded-For') || 
                         'unknown';
          
          await this.auditService.logEvent(
            user.id,
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            'permission',
            user.id,
            { 
              requiredRole: minRoleLevel,
              userRole: user.role,
              resource: c.req.path,
              method: c.req.method
            },
            clientIP,
            c.req.header('User-Agent') || 'unknown',
            c.env.DB
          );

          return c.json({ 
            success: false, 
            error: 'Permisos insuficientes' 
          }, 403);
        }

        await next();
      } catch (error) {
        console.error('Error de autorización:', error);
        return c.json({ 
          success: false, 
          error: 'Error de autorización' 
        }, 500);
      }
    };
  }

  /**
   * Middleware de autorización para acciones específicas
   */
  requirePermission(action: string, resourceType: string) {
    return async (c: Context, next: Next) => {
      try {
        const user = c.get('user') as User;
        const resourceId = c.req.param('id') || c.req.param('documentId');
        
        if (!user) {
          return c.json({ 
            success: false, 
            error: 'Usuario no autenticado' 
          }, 401);
        }

        // Super admin tiene todos los permisos
        if (user.role === UserRole.SUPER_ADMIN) {
          await next();
          return;
        }

        // Verificar permiso específico
        const hasPermission = await this.checkPermission(
          user.id,
          action,
          resourceType,
          resourceId,
          c.env.DB
        );

        if (!hasPermission) {
          // Registrar intento de acceso no autorizado
          const clientIP = c.req.header('CF-Connecting-IP') || 
                         c.req.header('X-Forwarded-For') || 
                         'unknown';
          
          await this.auditService.logEvent(
            user.id,
            'PERMISSION_DENIED',
            'permission',
            resourceId || 'unknown',
            { 
              action,
              resourceType,
              resourceId,
              userRole: user.role
            },
            clientIP,
            c.req.header('User-Agent') || 'unknown',
            c.env.DB
          );

          return c.json({ 
            success: false, 
            error: 'No tiene permisos para realizar esta acción' 
          }, 403);
        }

        await next();
      } catch (error) {
        console.error('Error de permisos:', error);
        return c.json({ 
          success: false, 
          error: 'Error al verificar permisos' 
        }, 500);
      }
    };
  }

  /**
   * Middleware para verificar MFA
   */
  requireMFA() {
    return async (c: Context, next: Next) => {
      try {
        const user = c.get('user') as User;
        
        if (!user) {
          return c.json({ 
            success: false, 
            error: 'Usuario no autenticado' 
          }, 401);
        }

        // Si el usuario no tiene MFA habilitado, permitir acceso pero registrar
        if (!user.mfaEnabled) {
          console.warn(`Usuario ${user.email} accediendo sin MFA habilitado`);
          await next();
          return;
        }

        // Verificar que el token incluya el claim de MFA
        const token = this.extractToken(c);
        const jwtSecret = c.env.JWT_SECRET || 'default-secret-change-in-production';
        const payload = await this.authService.verifyJWT(token, jwtSecret);
        
        if (!payload.mfaVerified) {
          return c.json({ 
            success: false, 
            error: 'Se requiere verificación MFA' 
          }, 403);
        }

        await next();
      } catch (error) {
        console.error('Error de MFA:', error);
        return c.json({ 
          success: false, 
          error: 'Error al verificar MFA' 
        }, 500);
      }
    };
  }

  /**
   * Middleware de rate limiting
   */
  rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
    return async (c: Context, next: Next) => {
      try {
        const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
        
        const key = `rate_limit:${clientIP}`;
        const current = await c.env.KV.get(key);
        const count = current ? parseInt(current) : 0;
        
        if (count >= maxRequests) {
          // Registrar intento bloqueado por rate limit
          await this.auditService.logEvent(
            'anonymous',
            'RATE_LIMIT_EXCEEDED',
            'security',
            clientIP,
            { 
              clientIP,
              requests: count,
              maxRequests,
              windowMs
            },
            clientIP,
            c.req.header('User-Agent') || 'unknown',
            c.env.DB
          );

          return c.json({ 
            success: false, 
            error: 'Límite de solicitudes excedido' 
          }, 429);
        }
        
        // Incrementar contador
        await c.env.KV.put(key, (count + 1).toString(), { expirationTtl: Math.ceil(windowMs / 1000) });
        
        await next();
      } catch (error) {
        console.error('Error de rate limit:', error);
        await next(); // Permitir acceso en caso de error
      }
    };
  }

  /**
   * Extrae el token JWT del header
   */
  private extractToken(c: Context): string | null {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
  }

  /**
   * Obtiene usuario por ID
   */
  private async getUserById(userId: string, db: D1Database): Promise<User | null> {
    try {
      const result = await db.prepare(`
        SELECT * FROM users WHERE id = ? AND is_active = 1
      `).bind(userId).first();
      
      if (!result) return null;
      
      return {
        id: result.id as string,
        email: result.email as string,
        name: result.name as string,
        role: result.role as UserRole,
        mfaEnabled: Boolean(result.mfa_enabled),
        mfaSecret: result.mfa_secret as string,
        isActive: Boolean(result.is_active),
        createdAt: new Date(result.created_at as string),
        updatedAt: new Date(result.updated_at as string)
      };
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }
  }

  /**
   * Valida sesión activa
   */
  private async validateSession(token: string, userId: string, db: D1Database): Promise<boolean> {
    try {
      // Hash del token para búsqueda
      const tokenHash = await this.authService.hashData(token);
      
      const result = await db.prepare(`
        SELECT * FROM sessions 
        WHERE user_id = ? AND token_hash = ? AND expires_at > ?
      `).bind(userId, tokenHash, new Date().toISOString()).first();
      
      return !!result;
    } catch (error) {
      console.error('Error al validar sesión:', error);
      return false;
    }
  }

  /**
   * Verifica permisos específicos
   */
  private async checkPermission(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string | undefined,
    db: D1Database
  ): Promise<boolean> {
    try {
      // Si no hay resourceId específico, verificar permisos generales
      if (!resourceId) {
        return await this.checkGeneralPermission(userId, action, resourceType, db);
      }

      // Verificar permisos específicos del documento
      const permission = await db.prepare(`
        SELECT * FROM permissions 
        WHERE user_id = ? AND document_id = ? AND action = ?
        AND (expires_at IS NULL OR expires_at > ?)
      `).bind(userId, resourceId, action, new Date().toISOString()).first();
      
      return !!permission;
    } catch (error) {
      console.error('Error al verificar permisos:', error);
      return false;
    }
  }

  /**
   * Verifica permisos generales por rol
   */
  private async checkGeneralPermission(
    userId: string,
    action: string,
    resourceType: string,
    db: D1Database
  ): Promise<boolean> {
    try {
      const user = await this.getUserById(userId, db);
      if (!user) return false;

      // Mapeo de permisos por rol
      const rolePermissions = {
        [UserRole.SUPER_ADMIN]: ['view', 'edit', 'delete', 'share', 'verify'],
        [UserRole.ADMIN_DOCUMENTOS]: ['view', 'edit', 'share', 'verify'],
        [UserRole.AUDITOR]: ['view'],
        [UserRole.VERIFICADOR]: ['view', 'verify'],
        [UserRole.USUARIO_ESTANDAR]: ['view']
      };

      const userPermissions = rolePermissions[user.role] || [];
      return userPermissions.includes(action);
    } catch (error) {
      console.error('Error al verificar permisos generales:', error);
      return false;
    }
  }
}