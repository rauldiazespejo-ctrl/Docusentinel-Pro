import { Hono } from 'hono';
import { z } from 'zod';
import { AuthMiddleware } from '../middleware/auth';
import { EncryptionService } from '../encryption/service';
import { AuditService } from '../audit/service';
import { UserRole } from '../types';

const documents = new Hono<{ Bindings: CloudflareBindings }>();
const authMiddleware = new AuthMiddleware();
const encryptionService = new EncryptionService();
const auditService = new AuditService();

// Esquemas de validación
const uploadSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1),
  size: z.number().positive(),
  securityLevel: z.enum(['public', 'internal', 'confidential', 'secret']).optional(),
  metadata: z.object({}).optional()
});

const permissionSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['view', 'download', 'edit', 'delete', 'share', 'verify']),
  expiresAt: z.string().datetime().optional()
});

/**
 * Obtener lista de documentos
 */
documents.get('/', 
  authMiddleware.authenticate.bind(authMiddleware),
  async (c) => {
    try {
      const user = c.get('user');
      const page = parseInt(c.req.query('page') || '1');
      const pageSize = parseInt(c.req.query('pageSize') || '10');
      const search = c.req.query('search') || '';
      
      // Construir consulta con permisos
      let query = `
        SELECT d.*, 
               GROUP_CONCAT(DISTINCT p.action) as permissions,
               COUNT(DISTINCT v.id) as verification_count
        FROM documents d
        LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = ?
        LEFT JOIN verifications v ON d.id = v.document_id
        WHERE (d.created_by = ? OR p.user_id = ?)
      `;
      
      const params = [user.id, user.id, user.id];
      
      if (search) {
        query += ` AND (d.name LIKE ? OR d.type LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      
      query += ` GROUP BY d.id ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const results = await c.env.DB.prepare(query).bind(...params).all();
      
      // Obtener total
      const countQuery = `
        SELECT COUNT(DISTINCT d.id) as total
        FROM documents d
        LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = ?
        WHERE (d.created_by = ? OR p.user_id = ?)
        ${search ? 'AND (d.name LIKE ? OR d.type LIKE ?)' : ''}
      `;
      
      const countParams = [user.id, user.id, user.id];
      if (search) {
        countParams.push(`%${search}%`, `%${search}%`);
      }
      
      const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
      const total = countResult?.total as number || 0;
      
      // Formatear resultados
      const documents = results.results.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        securityLevel: doc.security_level,
        permissions: doc.permissions ? doc.permissions.split(',') : [],
        verificationCount: doc.verification_count,
        createdAt: doc.created_at,
        createdBy: doc.created_by
      }));
      
      return c.json({
        success: true,
        data: {
          documents,
          total,
          page,
          pageSize,
          hasNext: documents.length === pageSize,
          hasPrev: page > 1
        }
      });
      
    } catch (error) {
      console.error('Error al obtener documentos:', error);
      return c.json({
        success: false,
        error: 'Error al obtener documentos'
      }, 500);
    }
  }
);

/**
 * Subir nuevo documento
 */
documents.post('/upload',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireMFA(),
  async (c) => {
    try {
      const user = c.get('user');
      const formData = await c.req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return c.json({
          success: false,
          error: 'Archivo requerido'
        }, 400);
      }
      
      // Validar tamaño de archivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return c.json({
          success: false,
          error: 'El archivo excede el tamaño máximo permitido (10MB)'
        }, 400);
      }
      
      // Validar tipo de archivo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/tiff'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        return c.json({
          success: false,
          error: 'Tipo de archivo no permitido. Use PDF, JPG, PNG o TIFF'
        }, 400);
      }
      
      // Leer archivo
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);
      
      // Generar hash del archivo
      const hash = await encryptionService.hashData(file.name + file.size + file.type);
      
      // Encriptar archivo
      const documentId = crypto.randomUUID();
      const encryptedData = await encryptionService.encryptData(
        btoa(String.fromCharCode(...fileData)),
        `doc-key-${documentId}`
      );
      
      // Guardar en R2
      const key = `documents/${documentId}/${file.name}`;
      await c.env.R2.put(key, new Uint8Array(atob(encryptedData.encryptedData)));
      
      // Guardar metadata en base de datos
      await c.env.DB.prepare(`
        INSERT INTO documents (id, name, type, size, hash, encrypted_data, encryption_key_id, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        documentId,
        file.name,
        file.type,
        file.size,
        hash,
        encryptedData.encryptedData,
        encryptedData.keyId,
        user.id,
        new Date().toISOString()
      ).run();
      
      // Registrar auditoría
      const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
      
      await auditService.logEvent(
        user.id,
        'DOCUMENT_UPLOADED',
        'document',
        documentId,
        {
          name: file.name,
          type: file.type,
          size: file.size,
          encrypted: true
        },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );
      
      return c.json({
        success: true,
        data: {
          id: documentId,
          name: file.name,
          type: file.type,
          size: file.size,
          hash: hash,
          createdBy: user.id,
          createdAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error al subir documento:', error);
      return c.json({
        success: false,
        error: 'Error al subir documento'
      }, 500);
    }
  }
);

/**
 * Obtener documento específico
 */
documents.get('/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requirePermission('view', 'document'),
  async (c) => {
    try {
      const documentId = c.req.param('id');
      const user = c.get('user');
      
      // Obtener documento
      const document = await c.env.DB.prepare(`
        SELECT d.*, 
               GROUP_CONCAT(DISTINCT p.action) as permissions
        FROM documents d
        LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = ?
        WHERE d.id = ? AND (d.created_by = ? OR p.user_id = ?)
        GROUP BY d.id
      `).bind(user.id, documentId, user.id, user.id).first();
      
      if (!document) {
        return c.json({
          success: false,
          error: 'Documento no encontrado o sin permisos'
        }, 404);
      }
      
      return c.json({
        success: true,
        data: {
          id: document.id,
          name: document.name,
          type: document.type,
          size: document.size,
          securityLevel: document.security_level,
          permissions: document.permissions ? document.permissions.split(',') : [],
          createdBy: document.created_by,
          createdAt: document.created_at,
          updatedAt: document.updated_at
        }
      });
      
    } catch (error) {
      console.error('Error al obtener documento:', error);
      return c.json({
        success: false,
        error: 'Error al obtener documento'
      }, 500);
    }
  }
);

/**
 * Descargar documento
 */
documents.get('/:id/download',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requirePermission('download', 'document'),
  async (c) => {
    try {
      const documentId = c.req.param('id');
      const user = c.get('user');
      
      // Obtener documento
      const document = await c.env.DB.prepare(`
        SELECT * FROM documents WHERE id = ? AND (created_by = ? OR id IN (
          SELECT document_id FROM permissions WHERE user_id = ? AND action = 'download'
        ))
      `).bind(documentId, user.id, user.id).first();
      
      if (!document) {
        return c.json({
          success: false,
          error: 'Documento no encontrado o sin permisos de descarga'
        }, 404);
      }
      
      // Desencriptar documento
      const decryptedData = await encryptionService.decryptData(
        document.encrypted_data,
        document.encryption_key_id,
        'iv-placeholder' // En producción, usar IV real
      );
      
      // Convertir a ArrayBuffer
      const fileData = new Uint8Array(atob(decryptedData.data));
      
      // Registrar auditoría
      const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
      
      await auditService.logEvent(
        user.id,
        'DOCUMENT_DOWNLOADED',
        'document',
        documentId,
        {
          name: document.name,
          size: document.size,
          decrypted: true
        },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );
      
      // Devolver archivo
      return new Response(fileData, {
        headers: {
          'Content-Type': document.type,
          'Content-Disposition': `attachment; filename="${document.name}"`,
          'Content-Length': fileData.length.toString()
        }
      });
      
    } catch (error) {
      console.error('Error al descargar documento:', error);
      return c.json({
        success: false,
        error: 'Error al descargar documento'
      }, 500);
    }
  }
);

/**
 * Asignar permisos a documento
 */
documents.post('/:id/permissions',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.ADMIN_DOCUMENTOS),
  async (c) => {
    try {
      const documentId = c.req.param('id');
      const user = c.get('user');
      const body = await c.req.json();
      const validatedData = permissionSchema.parse(body);
      
      // Verificar que el documento existe y el usuario es el creador o admin
      const document = await c.env.DB.prepare(`
        SELECT * FROM documents WHERE id = ? AND (created_by = ? OR ? <= ?)
      `).bind(
        documentId, 
        user.id, 
        user.role, 
        UserRole.ADMIN_DOCUMENTOS
      ).first();
      
      if (!document) {
        return c.json({
          success: false,
          error: 'Documento no encontrado o sin permisos'
        }, 404);
      }
      
      // Crear permiso
      const permissionId = crypto.randomUUID();
      const expiresAt = validatedData.expiresAt ? 
        new Date(validatedData.expiresAt).toISOString() : null;
      
      await c.env.DB.prepare(`
        INSERT INTO permissions (id, user_id, document_id, action, granted_by, granted_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        permissionId,
        validatedData.userId,
        documentId,
        validatedData.action,
        user.id,
        new Date().toISOString(),
        expiresAt
      ).run();
      
      // Registrar auditoría
      const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
      
      await auditService.logEvent(
        user.id,
        'PERMISSION_GRANTED',
        'permission',
        permissionId,
        {
          documentId,
          userId: validatedData.userId,
          action: validatedData.action,
          grantedBy: user.id
        },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );
      
      return c.json({
        success: true,
        data: {
          id: permissionId,
          userId: validatedData.userId,
          documentId,
          action: validatedData.action,
          grantedBy: user.id,
          grantedAt: new Date().toISOString(),
          expiresAt: expiresAt
        }
      });
      
    } catch (error) {
      console.error('Error al asignar permisos:', error);
      return c.json({
        success: false,
        error: 'Error al asignar permisos'
      }, 500);
    }
  }
);

export default documents;