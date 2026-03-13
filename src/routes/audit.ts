import { Hono } from 'hono';
import { z } from 'zod';
import { UserRole } from '../types';
import { AuthMiddleware } from '../middleware/auth';
import { AuditService } from '../audit/service';

const audit = new Hono<{ Bindings: CloudflareBindings }>();
const authMiddleware = new AuthMiddleware();
const auditService = new AuditService();

// Esquemas de validación
const searchSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ipAddress: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20)
});

/**
 * Obtener logs de auditoría (solo auditores y super admins)
 */
audit.get('/logs',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.AUDITOR),
  async (c) => {
    try {
      const query = Object.fromEntries(c.req.query());
      const validatedData = searchSchema.parse(query);
      
      const {
        userId,
        action,
        resourceType,
        resourceId,
        startDate,
        endDate,
        ipAddress,
        page,
        pageSize
      } = validatedData;
      
      // Construir filtros
      const filters: any = {};
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (resourceType) filters.resourceType = resourceType;
      if (resourceId) filters.resourceId = resourceId;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (ipAddress) filters.ipAddress = ipAddress;
      
      // Buscar logs
      const { logs, total } = await auditService.searchLogs(
        c.env.DB,
        filters,
        pageSize,
        (page - 1) * pageSize
      );
      
      return c.json({
        success: true,
        data: {
          logs,
          total,
          page,
          pageSize,
          hasNext: logs.length === pageSize,
          hasPrev: page > 1
        }
      });
      
    } catch (error) {
      console.error('Error al obtener logs:', error);
      return c.json({
        success: false,
        error: 'Error al obtener logs de auditoría'
      }, 500);
    }
  }
);

/**
 * Obtener estadísticas de auditoría
 */
audit.get('/stats',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.AUDITOR),
  async (c) => {
    try {
      const startDate = c.req.query('startDate') ? new Date(c.req.query('startDate')) : undefined;
      const endDate = c.req.query('endDate') ? new Date(c.req.query('endDate')) : undefined;
      
      const stats = await auditService.getAuditStats(c.env.DB, startDate, endDate);
      
      return c.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return c.json({
        success: false,
        error: 'Error al obtener estadísticas de auditoría'
      }, 500);
    }
  }
);

/**
 * Verificar integridad de la cadena de logs
 */
audit.get('/integrity',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.SUPER_ADMIN),
  async (c) => {
    try {
      const integrityStatus = await auditService.verifyChainIntegrity(c.env.DB);
      
      return c.json({
        success: true,
        data: integrityStatus
      });
      
    } catch (error) {
      console.error('Error al verificar integridad:', error);
      return c.json({
        success: false,
        error: 'Error al verificar integridad de logs'
      }, 500);
    }
  }
);

/**
 * Exportar logs de auditoría
 */
audit.get('/export',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.AUDITOR),
  async (c) => {
    try {
      const format = c.req.query('format') || 'json';
      const startDate = c.req.query('startDate') ? new Date(c.req.query('startDate')) : undefined;
      const endDate = c.req.query('endDate') ? new Date(c.req.query('endDate')) : undefined;
      
      // Obtener logs del período especificado
      const { logs } = await auditService.searchLogs(
        c.env.DB,
        { startDate, endDate },
        10000, // Máximo 10,000 registros para exportación
        0
      );
      
      if (format === 'csv') {
        // Generar CSV
        const csv = [
          'ID,Usuario,Acción,Tipo de Recurso,ID del Recurso,IP,Dirección,Agente de Usuario,Fecha y Hora,Hash Anterior,Hash Actual'
        ];
        
        logs.forEach(log => {
          csv.push([
            log.id,
            log.userId,
            log.action,
            log.resourceType,
            log.resourceId,
            log.ipAddress,
            log.userAgent,
            log.timestamp.toISOString(),
            log.previousHash,
            log.currentHash
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
        });
        
        const csvContent = csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        
        return new Response(blob, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
        
      } else {
        // JSON por defecto
        return c.json({
          success: true,
          data: {
            logs,
            exportedAt: new Date().toISOString(),
            count: logs.length
          }
        });
      }
      
    } catch (error) {
      console.error('Error al exportar logs:', error);
      return c.json({
        success: false,
        error: 'Error al exportar logs de auditoría'
      }, 500);
    }
  }
);

/**
 * Obtener tipos de acciones únicos
 */
audit.get('/actions',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.AUDITOR),
  async (c) => {
    try {
      const results = await c.env.DB.prepare(`
        SELECT DISTINCT action, COUNT(*) as count
        FROM audit_logs
        GROUP BY action
        ORDER BY count DESC
      `).all();
      
      const actions = results.results.map((row: any) => ({
        action: row.action,
        count: row.count
      }));
      
      return c.json({
        success: true,
        data: actions
      });
      
    } catch (error) {
      console.error('Error al obtener acciones:', error);
      return c.json({
        success: false,
        error: 'Error al obtener tipos de acciones'
      }, 500);
    }
  }
);

/**
 * Obtener tipos de recursos únicos
 */
audit.get('/resource-types',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.AUDITOR),
  async (c) => {
    try {
      const results = await c.env.DB.prepare(`
        SELECT DISTINCT resource_type, COUNT(*) as count
        FROM audit_logs
        GROUP BY resource_type
        ORDER BY count DESC
      `).all();
      
      const resourceTypes = results.results.map((row: any) => ({
        resourceType: row.resource_type,
        count: row.count
      }));
      
      return c.json({
        success: true,
        data: resourceTypes
      });
      
    } catch (error) {
      console.error('Error al obtener tipos de recursos:', error);
      return c.json({
        success: false,
        error: 'Error al obtener tipos de recursos'
      }, 500);
    }
  }
);

/**
 * Obtener actividad reciente
 */
audit.get('/recent',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.AUDITOR),
  async (c) => {
    try {
      const limit = parseInt(c.req.query('limit') || '50');
      const hours = parseInt(c.req.query('hours') || '24');
      
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const results = await c.env.DB.prepare(`
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.timestamp >= ?
        ORDER BY al.timestamp DESC
        LIMIT ?
      `).bind(since.toISOString(), limit).all();
      
      const recentActivity = results.results.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: JSON.parse(row.details || '{}'),
        ipAddress: row.ip_address,
        timestamp: row.timestamp
      }));
      
      return c.json({
        success: true,
        data: {
          recentActivity,
          timeRange: {
            start: since.toISOString(),
            end: new Date().toISOString()
          },
          count: recentActivity.length
        }
      });
      
    } catch (error) {
      console.error('Error al obtener actividad reciente:', error);
      return c.json({
        success: false,
        error: 'Error al obtener actividad reciente'
      }, 500);
    }
  }
);

/**
 * Obtener estadísticas de seguridad
 */
audit.get('/security-stats',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.AUDITOR),
  async (c) => {
    try {
      const hours = parseInt(c.req.query('hours') || '24');
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      // Contar eventos de seguridad
      const securityEvents = await c.env.DB.prepare(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE timestamp >= ? AND action IN ('LOGIN_FAILED', 'MFA_FAILED', 'AUTH_FAILED', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'PERMISSION_DENIED', 'RATE_LIMIT_EXCEEDED')
        GROUP BY action
      `).bind(since.toISOString()).all();
      
      // Contar intentos de acceso por IP
      const ipAttempts = await c.env.DB.prepare(`
        SELECT ip_address, COUNT(*) as attempts
        FROM audit_logs
        WHERE timestamp >= ? AND action IN ('LOGIN_FAILED', 'AUTH_FAILED')
        GROUP BY ip_address
        HAVING attempts >= 3
        ORDER BY attempts DESC
        LIMIT 10
      `).bind(since.toISOString()).all();
      
      // Contar usuarios bloqueados (múltiples intentos fallidos)
      const blockedUsers = await c.env.DB.prepare(`
        SELECT user_id, COUNT(*) as failed_attempts
        FROM audit_logs
        WHERE timestamp >= ? AND action = 'LOGIN_FAILED'
        GROUP BY user_id
        HAVING failed_attempts >= 3
        ORDER BY failed_attempts DESC
        LIMIT 10
      `).bind(since.toISOString()).all();
      
      const securityStats = {
        events: securityEvents.results.map((row: any) => ({
          action: row.action,
          count: row.count
        })),
        suspiciousIPs: ipAttempts.results.map((row: any) => ({
          ipAddress: row.ip_address,
          attempts: row.attempts
        })),
        blockedUsers: blockedUsers.results.map((row: any) => ({
          userId: row.user_id,
          failedAttempts: row.failed_attempts
        })),
        timeRange: {
          hours: hours,
          since: since.toISOString(),
          until: new Date().toISOString()
        }
      };
      
      return c.json({
        success: true,
        data: securityStats
      });
      
    } catch (error) {
      console.error('Error al obtener estadísticas de seguridad:', error);
      return c.json({
        success: false,
        error: 'Error al obtener estadísticas de seguridad'
      }, 500);
    }
  }
);

export default audit;