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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf','image/jpeg','image/jpg','image/png','image/tiff'];

const permissionSchema = z.object({
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  action: z.enum(['view','download','edit','delete','share','verify']),
  expiresAt: z.string().datetime().optional()
});

function getIP(c: any) { return c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'; }
function getUA(c: any) { return c.req.header('User-Agent') || 'unknown'; }

// ─── GET / ─────────────────────────────────────────────────────────
documents.get('/', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const page     = Math.max(1, parseInt(c.req.query('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '10')));
    const search   = c.req.query('search') || '';
    const offset   = (page - 1) * pageSize;

    let whereClause = '(d.created_by = ? OR p.user_id = ?)';
    const params: any[] = [user.id, user.id];

    if (search) {
      whereClause += ' AND (d.name LIKE ? OR d.type LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT d.id, d.name, d.type, d.size, d.hash, d.security_level, d.created_by, d.created_at,
             GROUP_CONCAT(DISTINCT p.action) as permissions,
             COUNT(DISTINCT v.id) as verification_count
      FROM documents d
      LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = ? AND (p.expires_at IS NULL OR p.expires_at > ?)
      LEFT JOIN verifications v ON d.id = v.document_id
      WHERE ${whereClause}
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?`;

    const now = new Date().toISOString();
    const allParams = [user.id, now, ...params, pageSize, offset];
    const results = await c.env.DB.prepare(query).bind(...allParams).all();

    // Count
    const countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM documents d
      LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = ? AND (p.expires_at IS NULL OR p.expires_at > ?)
      WHERE ${whereClause}`;
    const countParams = [user.id, now, ...params.slice(0, search ? 4 : 2)];
    const countRow = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const total = (countRow?.total as number) || 0;

    const docs = results.results.map((d: any) => ({
      id: d.id, name: d.name, type: d.type, size: d.size, hash: d.hash,
      securityLevel: d.security_level,
      permissions: d.permissions ? d.permissions.split(',') : [],
      verificationCount: d.verification_count || 0,
      createdBy: d.created_by, createdAt: d.created_at
    }));

    return c.json({ success:true, data:{ documents: docs, total, page, pageSize, hasNext: docs.length === pageSize, hasPrev: page > 1 } });
  } catch (err) {
    console.error('List docs error:', err);
    return c.json({ success:false, error:'Error al obtener documentos' }, 500);
  }
});

// ─── POST /upload ──────────────────────────────────────────────────
documents.post('/upload', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const ip = getIP(c); const ua = getUA(c);

    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const securityLevel = (formData.get('securityLevel') as string) || 'internal';
    const description   = (formData.get('description') as string)   || '';

    if (!file) return c.json({ success:false, error:'Archivo requerido' }, 400);
    if (file.size > MAX_FILE_SIZE) return c.json({ success:false, error:'El archivo excede 10 MB' }, 400);
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ success:false, error:'Tipo no permitido. Use PDF, JPG, PNG o TIFF' }, 400);
    }

    // Leer contenido
    const arrayBuffer = await file.arrayBuffer();

    // Hash SHA-256 del archivo original
    const hashHex = await encryptionService.hashBuffer(arrayBuffer);

    // Cifrar con AES-256-GCM
    const { ciphertext, iv, keyHex } = await encryptionService.encryptBuffer(arrayBuffer);

    // Guardar en R2 (datos cifrados)
    const documentId = crypto.randomUUID();
    const r2Key = `documents/${documentId}`;
    await c.env.R2.put(r2Key, ciphertext, {
      httpMetadata: { contentType: 'application/octet-stream' },
      customMetadata: { originalName: file.name, originalType: file.type, iv }
    });

    // Metadatos en DB (NO guardamos la clave, solo el IV; en producción, la clave se cifraría con KEK)
    const metadata = JSON.stringify({ description, securityLevel, originalType: file.type });
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO documents (id, name, type, size, hash, encrypted_data, encryption_key_id, metadata, security_level, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      documentId, file.name, file.type, file.size, hashHex,
      iv,           // encrypted_data = IV (datos están en R2)
      keyHex,       // encryption_key_id = clave AES cifrada/dev (en prod, se guardaría en KMS)
      metadata, securityLevel, user.id, now, now
    ).run();

    await auditService.logEvent(user.id,'DOCUMENT_UPLOADED','document',documentId,
      { name: file.name, type: file.type, size: file.size, hash: hashHex, encrypted: true },
      ip, ua, c.env.DB);

    return c.json({ success:true, data:{ id: documentId, name: file.name, type: file.type, size: file.size, hash: hashHex, createdAt: now } });

  } catch (err) {
    console.error('Upload error:', err);
    return c.json({ success:false, error:'Error al subir documento' }, 500);
  }
});

// ─── GET /stats ────────────────────────────────────────────────────
// IMPORTANTE: debe ir ANTES de /:id
documents.get('/stats', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');

    const totalDocs = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM documents WHERE created_by = ?`
    ).bind(user.id).first();

    const totalVerifs = await c.env.DB.prepare(
      `SELECT COUNT(*) as total, AVG(confidence_score) as avg_score FROM verifications`
    ).first();

    const authentic = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM verifications WHERE status='authentic'`
    ).first();
    const fraudulent = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM verifications WHERE status='fraudulent'`
    ).first();
    const suspicious = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM verifications WHERE status='suspicious'`
    ).first();

    const totalAudit = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM audit_logs`
    ).first();

    const recentDocs = await c.env.DB.prepare(
      `SELECT id, name, type, size, created_at FROM documents ORDER BY created_at DESC LIMIT 5`
    ).all();

    const recentVerifs = await c.env.DB.prepare(
      `SELECT v.id, v.status, v.confidence_score, v.analyzed_at, d.name as doc_name
       FROM verifications v LEFT JOIN documents d ON v.document_id = d.id
       ORDER BY v.analyzed_at DESC LIMIT 5`
    ).all();

    return c.json({ success: true, data: {
      totalDocuments: (totalDocs?.total as number) || 0,
      totalVerifications: (totalVerifs?.total as number) || 0,
      avgConfidenceScore: Math.round(((totalVerifs?.avg_score as number) || 0) * 100) / 100,
      verificationsByStatus: {
        authentic: (authentic?.c as number) || 0,
        fraudulent: (fraudulent?.c as number) || 0,
        suspicious: (suspicious?.c as number) || 0
      },
      totalAuditEvents: (totalAudit?.total as number) || 0,
      recentDocuments: recentDocs.results,
      recentVerifications: recentVerifs.results
    }});
  } catch (err) {
    console.error('Stats error:', err);
    return c.json({ success: false, error: 'Error al obtener estadísticas' }, 500);
  }
});

// ─── GET /:id ──────────────────────────────────────────────────────
documents.get('/:id', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const documentId = c.req.param('id');
    const now = new Date().toISOString();

    const doc = await c.env.DB.prepare(`
      SELECT d.*, GROUP_CONCAT(DISTINCT p.action) as permissions,
             COUNT(DISTINCT v.id) as verification_count
      FROM documents d
      LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = ? AND (p.expires_at IS NULL OR p.expires_at > ?)
      WHERE d.id = ? AND (d.created_by = ? OR p.user_id = ?)
      GROUP BY d.id
    `).bind(user.id, now, documentId, user.id, user.id).first();

    if (!doc) return c.json({ success:false, error:'Documento no encontrado o sin permisos' }, 404);

    return c.json({ success:true, data:{
      id: doc.id, name: doc.name, type: doc.type, size: doc.size, hash: doc.hash,
      securityLevel: doc.security_level,
      permissions: doc.permissions ? (doc.permissions as string).split(',') : [],
      verificationCount: doc.verification_count || 0,
      createdBy: doc.created_by, createdAt: doc.created_at, updatedAt: doc.updated_at
    }});
  } catch (err) {
    console.error('Get doc error:', err);
    return c.json({ success:false, error:'Error al obtener documento' }, 500);
  }
});

// ─── GET /:id/download ─────────────────────────────────────────────
documents.get('/:id/download', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const documentId = c.req.param('id');
    const ip = getIP(c); const ua = getUA(c);
    const now = new Date().toISOString();

    // Verificar permiso de descarga (creador o permiso download)
    const doc = await c.env.DB.prepare(`
      SELECT * FROM documents
      WHERE id = ? AND (
        created_by = ?
        OR id IN (SELECT document_id FROM permissions WHERE user_id = ? AND action = 'download' AND (expires_at IS NULL OR expires_at > ?))
      )
    `).bind(documentId, user.id, user.id, now).first();

    if (!doc) return c.json({ success:false, error:'Sin permisos de descarga' }, 403);

    // Obtener datos cifrados de R2
    const r2Key = `documents/${documentId}`;
    const r2Object = await c.env.R2.get(r2Key);

    if (!r2Object) return c.json({ success:false, error:'Archivo no encontrado en almacenamiento' }, 404);

    const ciphertext = await r2Object.arrayBuffer();
    const iv      = (doc.encrypted_data as string);
    const keyHex  = (doc.encryption_key_id as string);

    // Descifrar
    const plaintext = await encryptionService.decryptBuffer(ciphertext, keyHex, iv);

    await auditService.logEvent(user.id,'DOCUMENT_DOWNLOADED','document',documentId,
      { name: doc.name, size: doc.size },ip,ua,c.env.DB);

    return new Response(plaintext, {
      headers: {
        'Content-Type': doc.type as string,
        'Content-Disposition': `attachment; filename="${doc.name}"`,
        'Content-Length': String((plaintext as ArrayBuffer).byteLength)
      }
    });
  } catch (err) {
    console.error('Download error:', err);
    return c.json({ success:false, error:'Error al descargar documento' }, 500);
  }
});

// ─── POST /:id/permissions ─────────────────────────────────────────
documents.post('/:id/permissions', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const documentId = c.req.param('id');
    const ip = getIP(c); const ua = getUA(c);
    const body = await c.req.json();
    const validated = permissionSchema.parse(body);

    // Solo dueño del doc o admin puede otorgar permisos
    const doc = await c.env.DB.prepare(
      `SELECT * FROM documents WHERE id = ? AND (created_by = ? OR ? <= 2)`
    ).bind(documentId, user.id, user.role).first();

    if (!doc) return c.json({ success:false, error:'Documento no encontrado o sin permisos' }, 404);

    // Resolver userId si viene por email
    let targetUserId = validated.userId;
    if (!targetUserId && validated.userEmail) {
      const target = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(validated.userEmail).first();
      if (!target) return c.json({ success:false, error:'Usuario no encontrado' }, 404);
      targetUserId = target.id as string;
    }
    if (!targetUserId) return c.json({ success:false, error:'Especifica userId o userEmail' }, 400);

    const permId = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = validated.expiresAt ? new Date(validated.expiresAt).toISOString() : null;

    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO permissions (id, user_id, document_id, action, granted_by, granted_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(permId, targetUserId, documentId, validated.action, user.id, now, expiresAt).run();

    await auditService.logEvent(user.id,'PERMISSION_GRANTED','permission',permId,
      { documentId, targetUserId, action: validated.action },ip,ua,c.env.DB);

    return c.json({ success:true, data:{ id:permId, userId:targetUserId, documentId, action:validated.action, grantedAt:now, expiresAt } });
  } catch (err: any) {
    if (err?.issues) return c.json({ success:false, error:'Datos inválidos' }, 400);
    console.error('Permissions error:', err);
    return c.json({ success:false, error:'Error al asignar permisos' }, 500);
  }
});

// ─── DELETE /:id/permissions/:permId ───────────────────────────────
documents.delete('/:id/permissions/:permId', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const { id: documentId, permId } = c.req.param() as any;
    const ip = getIP(c); const ua = getUA(c);

    const doc = await c.env.DB.prepare(
      `SELECT * FROM documents WHERE id = ? AND (created_by = ? OR ? <= 2)`
    ).bind(documentId, user.id, user.role).first();

    if (!doc) return c.json({ success:false, error:'Sin permisos' }, 403);

    await c.env.DB.prepare(`DELETE FROM permissions WHERE id = ? AND document_id = ?`)
      .bind(permId, documentId).run();

    await auditService.logEvent(user.id,'PERMISSION_REVOKED','permission',permId,
      { documentId },ip,ua,c.env.DB);

    return c.json({ success:true, message:'Permiso revocado' });
  } catch (err) {
    return c.json({ success:false, error:'Error al revocar permiso' }, 500);
  }
});

export default documents;
