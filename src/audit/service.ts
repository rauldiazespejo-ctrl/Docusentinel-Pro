import { AuditLog } from '../types';
import { EncryptionService } from '../encryption/service';

/**
 * Servicio de auditoría con logs encadenados criptográficamente
 * Implementa un sistema de append-only log con sellado temporal
 */
export class AuditService {
  private encryptionService: EncryptionService;
  
  constructor() {
    this.encryptionService = new EncryptionService();
  }

  /**
   * Registra un evento de auditoría con hash encadenado
   */
  async logEvent(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    db: D1Database,
    actorEmail?: string
  ): Promise<AuditLog> {
    try {
      // Obtener el hash del log anterior
      const previousLog = await this.getLastLog(db);
      const previousHash = previousLog ? previousLog.currentHash : 'GENESIS';
      
      // Crear log
      const logId = this.generateUUID();
      const timestamp = new Date();
      
      // Crear string para hash
      const logData = {
        id: logId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress,
        userAgent,
        timestamp: timestamp.toISOString(),
        previousHash
      };
      
      // Generar hash actual
      const currentHash = await this.generateLogHash(logData);
      
      // Crear objeto de log
      const auditLog: AuditLog = {
        id: logId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress,
        userAgent,
        timestamp,
        previousHash,
        currentHash
      };
      
      // Insertar en base de datos
      await this.insertLog(auditLog, db);
      
      return auditLog;
    } catch (error) {
      console.error('Error al registrar evento de auditoría:', error);
      throw new Error(`Error al registrar evento: ${error.message}`);
    }
  }

  /**
   * Obtiene el último log registrado
   */
  private async getLastLog(db: D1Database): Promise<AuditLog | null> {
    try {
      const result = await db.prepare(`
        SELECT * FROM audit_logs 
        ORDER BY timestamp DESC 
        LIMIT 1
      `).first();
      
      if (!result) return null;
      
      return {
        id: result.id as string,
        userId: result.user_id as string,
        action: result.action as string,
        resourceType: result.resource_type as string,
        resourceId: result.resource_id as string,
        details: JSON.parse(result.details as string || '{}'),
        ipAddress: result.ip_address as string,
        userAgent: result.user_agent as string,
        timestamp: new Date(result.timestamp as string),
        previousHash: result.previous_hash as string,
        currentHash: result.current_hash as string
      };
    } catch (error) {
      console.error('Error al obtener último log:', error);
      return null;
    }
  }

  /**
   * Inserta un log en la base de datos
   */
  private async insertLog(log: AuditLog, db: D1Database): Promise<void> {
    await db.prepare(`
      INSERT INTO audit_logs (
        id, user_id, action, resource_type, resource_id, details,
        ip_address, user_agent, timestamp, previous_hash, current_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      log.id,
      log.userId,
      log.action,
      log.resourceType,
      log.resourceId,
      JSON.stringify(log.details),
      log.ipAddress,
      log.userAgent,
      log.timestamp.toISOString(),
      log.previousHash,
      log.currentHash
    ).run();
  }

  /**
   * Genera hash criptográfico de un log
   */
  private async generateLogHash(logData: any): Promise<string> {
    const logString = JSON.stringify(logData, Object.keys(logData).sort());
    return await this.encryptionService.hashData(logString);
  }

  /**
   * Verifica la integridad de la cadena de logs
   */
  async verifyChainIntegrity(db: D1Database): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Obtener todos los logs ordenados por timestamp
      const logs = await db.prepare(`
        SELECT * FROM audit_logs 
        ORDER BY timestamp ASC
      `).all();
      
      if (!logs.results || logs.results.length === 0) {
        return { isValid: true, errors };
      }
      
      let previousHash = 'GENESIS';
      
      for (let i = 0; i < logs.results.length; i++) {
        const log = logs.results[i];
        const logData = {
          id: log.id,
          userId: log.user_id,
          action: log.action,
          resourceType: log.resource_type,
          resourceId: log.resource_id,
          details: JSON.parse(log.details as string || '{}'),
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          timestamp: log.timestamp,
          previousHash: log.previous_hash
        };
        
        // Verificar que previous_hash coincida
        if (log.previous_hash !== previousHash) {
          errors.push(`Log ${log.id}: previous_hash no coincide. Esperado: ${previousHash}, Actual: ${log.previous_hash}`);
        }
        
        // Verificar que el hash actual sea correcto
        const expectedHash = await this.generateLogHash(logData);
        if (log.current_hash !== expectedHash) {
          errors.push(`Log ${log.id}: current_hash inválido. Esperado: ${expectedHash}, Actual: ${log.current_hash}`);
        }
        
        previousHash = log.current_hash;
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Error al verificar cadena: ${error.message}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Busca logs con información de usuario (JOIN con tabla users)
   */
  async searchLogsWithUsers(
    db: D1Database,
    filters: {
      userId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      ipAddress?: string;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: any[]; total: number }> {
    try {
      // Construir cláusulas WHERE dinámicas
      const conditions: string[] = ['1=1'];
      const filterParams: any[] = [];

      if (filters.userId) { conditions.push('al.user_id = ?'); filterParams.push(filters.userId); }
      if (filters.action) { conditions.push('al.action = ?'); filterParams.push(filters.action); }
      if (filters.resourceType) { conditions.push('al.resource_type = ?'); filterParams.push(filters.resourceType); }
      if (filters.resourceId) { conditions.push('al.resource_id = ?'); filterParams.push(filters.resourceId); }
      if (filters.startDate) { conditions.push('al.timestamp >= ?'); filterParams.push(filters.startDate.toISOString()); }
      if (filters.endDate) { conditions.push('al.timestamp <= ?'); filterParams.push(filters.endDate.toISOString()); }
      if (filters.ipAddress) { conditions.push('al.ip_address = ?'); filterParams.push(filters.ipAddress); }

      const whereClause = 'WHERE ' + conditions.join(' AND ');

      // Siempre incluimos limit y offset al final de los params
      const countParams = [...filterParams];
      const queryParams = [...filterParams, limit, offset];

      // COUNT query
      const countStmt = db.prepare(`SELECT COUNT(*) as count FROM audit_logs al ${whereClause}`);
      const countResult = countParams.length > 0
        ? await countStmt.bind(...countParams).first()
        : await countStmt.first();
      const total = (countResult?.count as number) || 0;

      // Main query - siempre tiene al menos limit y offset
      const mainQuery = `
        SELECT al.*,
               u.email as actor_email,
               u.name as actor_name,
               u.role as actor_role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.timestamp DESC
        LIMIT ? OFFSET ?`;

      const queryResults = await db.prepare(mainQuery).bind(...queryParams).all();

      const logs = queryResults.results.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        actorEmail: row.actor_email || (row.user_id === 'superuser' ? 'rauldiazespejo@gmail.com' : row.user_id),
        actorName: row.actor_name || (row.user_id === 'superuser' ? 'Raul Diaz Espejo' : 'Sistema'),
        actorRole: row.actor_role,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: (() => { try { return JSON.parse(row.details || '{}'); } catch { return {}; } })(),
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: new Date(row.timestamp),
        previousHash: row.previous_hash,
        currentHash: row.current_hash
      }));

      return { logs, total };
    } catch (error) {
      console.error('Error al buscar logs con usuarios:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Busca logs con filtros
   */
  async searchLogs(
    db: D1Database,
    filters: {
      userId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      ipAddress?: string;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];
      
      // Aplicar filtros
      if (filters.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
      }
      
      if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
      }
      
      if (filters.resourceType) {
        query += ' AND resource_type = ?';
        params.push(filters.resourceType);
      }
      
      if (filters.resourceId) {
        query += ' AND resource_id = ?';
        params.push(filters.resourceId);
      }
      
      if (filters.startDate) {
        query += ' AND timestamp >= ?';
        params.push(filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        query += ' AND timestamp <= ?';
        params.push(filters.endDate.toISOString());
      }
      
      if (filters.ipAddress) {
        query += ' AND ip_address = ?';
        params.push(filters.ipAddress);
      }
      
      // Contar total
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countResult = params.length > 0
        ? await db.prepare(countQuery).bind(...params).first()
        : await db.prepare(countQuery).first();
      const total = countResult?.count as number || 0;
      
      // Agregar orden y límite
      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      const allParams = [...params, limit, offset];
      
      // Ejecutar consulta
      const results = await db.prepare(query).bind(...allParams).all();
      
      const logs: AuditLog[] = results.results.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: JSON.parse(row.details || '{}'),
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: new Date(row.timestamp),
        previousHash: row.previous_hash,
        currentHash: row.current_hash
      }));
      
      return { logs, total };
    } catch (error) {
      console.error('Error al buscar logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getAuditStats(db: D1Database, startDate?: Date, endDate?: Date): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByResource: Record<string, number>;
    uniqueUsers: number;
    integrityStatus: { isValid: boolean; errors: string[] };
  }> {
    try {
      let dateFilter = '';
      const params: any[] = [];
      
      if (startDate || endDate) {
        dateFilter = ' WHERE 1=1';
        if (startDate) {
          dateFilter += ' AND timestamp >= ?';
          params.push(startDate.toISOString());
        }
        if (endDate) {
          dateFilter += ' AND timestamp <= ?';
          params.push(endDate.toISOString());
        }
      }
      
      // Total de eventos
      const totalResult = params.length > 0
        ? await db.prepare(`SELECT COUNT(*) as total FROM audit_logs${dateFilter}`).bind(...params).first()
        : await db.prepare(`SELECT COUNT(*) as total FROM audit_logs${dateFilter}`).first();
      const totalEvents = totalResult?.total as number || 0;
      
      // Eventos por acción
      const actionResults = params.length > 0
        ? await db.prepare(`SELECT action, COUNT(*) as count FROM audit_logs${dateFilter} GROUP BY action ORDER BY count DESC`).bind(...params).all()
        : await db.prepare(`SELECT action, COUNT(*) as count FROM audit_logs${dateFilter} GROUP BY action ORDER BY count DESC`).all();
      
      const eventsByAction: Record<string, number> = {};
      actionResults.results.forEach((row: any) => {
        eventsByAction[row.action] = row.count;
      });
      
      // Eventos por tipo de recurso
      const resourceResults = params.length > 0
        ? await db.prepare(`SELECT resource_type, COUNT(*) as count FROM audit_logs${dateFilter} GROUP BY resource_type ORDER BY count DESC`).bind(...params).all()
        : await db.prepare(`SELECT resource_type, COUNT(*) as count FROM audit_logs${dateFilter} GROUP BY resource_type ORDER BY count DESC`).all();
      
      const eventsByResource: Record<string, number> = {};
      resourceResults.results.forEach((row: any) => {
        eventsByResource[row.resource_type] = row.count;
      });
      
      // Usuarios únicos
      const uniqueResult = params.length > 0
        ? await db.prepare(`SELECT COUNT(DISTINCT user_id) as unique_users FROM audit_logs${dateFilter}`).bind(...params).first()
        : await db.prepare(`SELECT COUNT(DISTINCT user_id) as unique_users FROM audit_logs${dateFilter}`).first();
      const uniqueUsers = uniqueResult?.unique_users as number || 0;
      
      // Estado de integridad
      const integrityStatus = await this.verifyChainIntegrity(db);
      
      return {
        totalEvents,
        eventsByAction,
        eventsByResource,
        uniqueUsers,
        integrityStatus
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        totalEvents: 0,
        eventsByAction: {},
        eventsByResource: {},
        uniqueUsers: 0,
        integrityStatus: { isValid: false, errors: [error.message] }
      };
    }
  }

  /**
   * Genera un UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}