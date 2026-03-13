import { Hono } from 'hono';
import { z } from 'zod';
import { AuthMiddleware } from '../middleware/auth';
import { AuditService } from '../audit/service';

const verification = new Hono<{ Bindings: CloudflareBindings }>();
const authMiddleware = new AuthMiddleware();
const auditService = new AuditService();

// Esquemas de validación
const verifySchema = z.object({
  documentId: z.string().uuid(),
  analysisType: z.enum(['full', 'image', 'typography', 'metadata']).optional()
});

const uploadVerifySchema = z.object({
  analysisType: z.enum(['full', 'image', 'typography', 'metadata']).optional()
});

/**
 * Verificar autenticidad de documento existente
 */
verification.post('/verify',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requirePermission('verify', 'document'),
  async (c) => {
    try {
      const user = c.get('user');
      const body = await c.req.json();
      const validatedData = verifySchema.parse(body);
      
      const { documentId, analysisType = 'full' } = validatedData;
      
      // Verificar que el documento existe
      const document = await c.env.DB.prepare(`
        SELECT * FROM documents WHERE id = ? AND (created_by = ? OR id IN (
          SELECT document_id FROM permissions WHERE user_id = ? AND action = 'verify'
        ))
      `).bind(documentId, user.id, user.id).first();
      
      if (!document) {
        return c.json({
          success: false,
          error: 'Documento no encontrado o sin permisos de verificación'
        }, 404);
      }
      
      // Simular análisis de documento (en producción, esto usaría IA real)
      const analysisResult = await simulateDocumentAnalysis(document, analysisType);
      
      // Crear registro de verificación
      const verificationId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO verifications (id, document_id, status, confidence_score, findings, analyzed_by, analyzed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        verificationId,
        documentId,
        analysisResult.status,
        analysisResult.confidenceScore,
        JSON.stringify(analysisResult.findings),
        user.id,
        new Date().toISOString()
      ).run();
      
      // Registrar auditoría
      const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
      
      await auditService.logEvent(
        user.id,
        'DOCUMENT_VERIFIED',
        'verification',
        verificationId,
        {
          documentId,
          status: analysisResult.status,
          confidenceScore: analysisResult.confidenceScore,
          analysisType
        },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );
      
      return c.json({
        success: true,
        data: {
          verificationId,
          documentId,
          status: analysisResult.status,
          confidenceScore: analysisResult.confidenceScore,
          findings: analysisResult.findings,
          analyzedBy: user.id,
          analyzedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error al verificar documento:', error);
      return c.json({
        success: false,
        error: 'Error al verificar autenticidad del documento'
      }, 500);
    }
  }
);

/**
 * Subir y verificar documento
 */
verification.post('/upload-verify',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requirePermission('verify', 'document'),
  async (c) => {
    try {
      const user = c.get('user');
      const formData = await c.req.formData();
      const file = formData.get('file') as File;
      const analysisType = formData.get('analysisType') as string || 'full';
      
      if (!file) {
        return c.json({
          success: false,
          error: 'Archivo requerido'
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
      
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return c.json({
          success: false,
          error: 'El archivo excede el tamaño máximo permitido (10MB)'
        }, 400);
      }
      
      // Crear documento temporal
      const documentId = crypto.randomUUID();
      const document = {
        id: documentId,
        name: file.name,
        type: file.type,
        size: file.size,
        created_at: new Date().toISOString()
      };
      
      // Simular análisis de documento
      const analysisResult = await simulateDocumentAnalysis(document, analysisType);
      
      // Crear registro de verificación
      const verificationId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO verifications (id, document_id, status, confidence_score, findings, analyzed_by, analyzed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        verificationId,
        documentId,
        analysisResult.status,
        analysisResult.confidenceScore,
        JSON.stringify(analysisResult.findings),
        user.id,
        new Date().toISOString()
      ).run();
      
      // Registrar auditoría
      const clientIP = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For') || 
                       'unknown';
      
      await auditService.logEvent(
        user.id,
        'DOCUMENT_UPLOAD_VERIFIED',
        'verification',
        verificationId,
        {
          documentId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          status: analysisResult.status,
          confidenceScore: analysisResult.confidenceScore,
          analysisType
        },
        clientIP,
        c.req.header('User-Agent') || 'unknown',
        c.env.DB
      );
      
      return c.json({
        success: true,
        data: {
          verificationId,
          documentId,
          status: analysisResult.status,
          confidenceScore: analysisResult.confidenceScore,
          findings: analysisResult.findings,
          analyzedBy: user.id,
          analyzedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error al verificar documento subido:', error);
      return c.json({
        success: false,
        error: 'Error al verificar autenticidad del documento'
      }, 500);
    }
  }
);

/**
 * Obtener resultado de verificación
 */
verification.get('/:id',
  authMiddleware.authenticate.bind(authMiddleware),
  async (c) => {
    try {
      const verificationId = c.req.param('id');
      const user = c.get('user');
      
      // Obtener verificación
      const verification = await c.env.DB.prepare(`
        SELECT v.*, d.name as document_name, d.type as document_type
        FROM verifications v
        JOIN documents d ON v.document_id = d.id
        WHERE v.id = ? AND (v.analyzed_by = ? OR d.created_by = ? OR d.id IN (
          SELECT document_id FROM permissions WHERE user_id = ? AND action = 'verify'
        ))
      `).bind(verificationId, user.id, user.id, user.id).first();
      
      if (!verification) {
        return c.json({
          success: false,
          error: 'Verificación no encontrada o sin permisos'
        }, 404);
      }
      
      return c.json({
        success: true,
        data: {
          id: verification.id,
          documentId: verification.document_id,
          documentName: verification.document_name,
          documentType: verification.document_type,
          status: verification.status,
          confidenceScore: verification.confidence_score,
          findings: JSON.parse(verification.findings || '[]'),
          analyzedBy: verification.analyzed_by,
          analyzedAt: verification.analyzed_at
        }
      });
      
    } catch (error) {
      console.error('Error al obtener verificación:', error);
      return c.json({
        success: false,
        error: 'Error al obtener resultado de verificación'
      }, 500);
    }
  }
);

/**
 * Obtener historial de verificaciones
 */
verification.get('/',
  authMiddleware.authenticate.bind(authMiddleware),
  async (c) => {
    try {
      const user = c.get('user');
      const page = parseInt(c.req.query('page') || '1');
      const pageSize = parseInt(c.req.query('pageSize') || '10');
      const documentId = c.req.query('documentId');
      
      // Construir consulta
      let query = `
        SELECT v.*, d.name as document_name, d.type as document_type
        FROM verifications v
        JOIN documents d ON v.document_id = d.id
        WHERE (v.analyzed_by = ? OR d.created_by = ? OR d.id IN (
          SELECT document_id FROM permissions WHERE user_id = ? AND action = 'verify'
        ))
      `;
      
      const params = [user.id, user.id, user.id];
      
      if (documentId) {
        query += ' AND v.document_id = ?';
        params.push(documentId);
      }
      
      query += ' ORDER BY v.analyzed_at DESC LIMIT ? OFFSET ?';
      params.push(pageSize, (page - 1) * pageSize);
      
      const results = await c.env.DB.prepare(query).bind(...params).all();
      
      // Obtener total
      let countQuery = `
        SELECT COUNT(*) as total
        FROM verifications v
        JOIN documents d ON v.document_id = d.id
        WHERE (v.analyzed_by = ? OR d.created_by = ? OR d.id IN (
          SELECT document_id FROM permissions WHERE user_id = ? AND action = 'verify'
        ))
      `;
      
      const countParams = [user.id, user.id, user.id];
      if (documentId) {
        countQuery += ' AND v.document_id = ?';
        countParams.push(documentId);
      }
      
      const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
      const total = countResult?.total as number || 0;
      
      // Formatear resultados
      const verifications = results.results.map((v: any) => ({
        id: v.id,
        documentId: v.document_id,
        documentName: v.document_name,
        documentType: v.document_type,
        status: v.status,
        confidenceScore: v.confidence_score,
        findings: JSON.parse(v.findings || '[]'),
        analyzedBy: v.analyzed_by,
        analyzedAt: v.analyzed_at
      }));
      
      return c.json({
        success: true,
        data: {
          verifications,
          total,
          page,
          pageSize,
          hasNext: verifications.length === pageSize,
          hasPrev: page > 1
        }
      });
      
    } catch (error) {
      console.error('Error al obtener verificaciones:', error);
      return c.json({
        success: false,
        error: 'Error al obtener historial de verificaciones'
      }, 500);
    }
  }
);

/**
 * Obtener estadísticas de verificación
 */
verification.get('/stats',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(UserRole.VERIFICADOR),
  async (c) => {
    try {
      const user = c.get('user');
      const days = parseInt(c.req.query('days') || '30');
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      // Estadísticas generales
      const statsResult = await c.env.DB.prepare(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(confidence_score) as avg_confidence
        FROM verifications
        WHERE analyzed_at >= ?
        GROUP BY status
      `).bind(since.toISOString()).all();
      
      // Verificaciones por usuario
      const userStatsResult = await c.env.DB.prepare(`
        SELECT 
          analyzed_by,
          COUNT(*) as count,
          AVG(confidence_score) as avg_confidence
        FROM verifications
        WHERE analyzed_at >= ?
        GROUP BY analyzed_by
        ORDER BY count DESC
      `).bind(since.toISOString()).all();
      
      // Documentos más verificados
      const documentStatsResult = await c.env.DB.prepare(`
        SELECT 
          document_id,
          COUNT(*) as verification_count,
          AVG(confidence_score) as avg_confidence
        FROM verifications
        WHERE analyzed_at >= ?
        GROUP BY document_id
        ORDER BY verification_count DESC
        LIMIT 10
      `).bind(since.toISOString()).all();
      
      const stats = {
        byStatus: statsResult.results.map((row: any) => ({
          status: row.status,
          count: row.count,
          avgConfidence: Math.round(row.avg_confidence * 100) / 100
        })),
        byUser: userStatsResult.results.map((row: any) => ({
          userId: row.analyzed_by,
          count: row.count,
          avgConfidence: Math.round(row.avg_confidence * 100) / 100
        })),
        byDocument: documentStatsResult.results.map((row: any) => ({
          documentId: row.document_id,
          verificationCount: row.verification_count,
          avgConfidence: Math.round(row.avg_confidence * 100) / 100
        })),
        timeRange: {
          days: days,
          since: since.toISOString(),
          until: new Date().toISOString()
        }
      };
      
      return c.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return c.json({
        success: false,
        error: 'Error al obtener estadísticas de verificación'
      }, 500);
    }
  }
);

/**
 * Función para simular análisis de documento con IA
 * En producción, esto usaría modelos reales de ML/AI
 */
async function simulateDocumentAnalysis(document: any, analysisType: string) {
  // Simular diferentes resultados basados en el tipo de análisis
  const analysisResults = {
    full: {
      status: Math.random() > 0.1 ? 'authentic' : 'suspicious',
      confidenceScore: Math.floor(Math.random() * 20) + 80, // 80-100%
      findings: [
        {
          type: 'image_analysis',
          severity: 'low',
          description: 'Análisis de imagen completado sin anomalías detectadas',
          evidence: 'Consistencia en patrones de ruido y compresión'
        },
        {
          type: 'typography_check',
          severity: 'low',
          description: 'Fuentes y formato consistentes con documentos oficiales',
          evidence: 'Fuentes reconocidas y espaciado apropiado'
        },
        {
          type: 'metadata_analysis',
          severity: 'low',
          description: 'Metadatos EXIF presentes y consistentes',
          evidence: 'Fecha y dispositivo de origen verificados'
        }
      ]
    },
    image: {
      status: Math.random() > 0.2 ? 'authentic' : 'suspicious',
      confidenceScore: Math.floor(Math.random() * 25) + 75, // 75-100%
      findings: [
        {
          type: 'image_manipulation',
          severity: Math.random() > 0.8 ? 'medium' : 'low',
          description: 'Análisis de manipulación de imagen',
          evidence: 'Sin inconsistencias detectadas en patrones de ruido'
        }
      ]
    },
    typography: {
      status: Math.random() > 0.15 ? 'authentic' : 'suspicious',
      confidenceScore: Math.floor(Math.random() * 30) + 70, // 70-100%
      findings: [
        {
          type: 'typography_inconsistency',
          severity: Math.random() > 0.85 ? 'high' : 'low',
          description: 'Análisis tipográfico',
          evidence: 'Fuentes consistentes con estándares oficiales'
        }
      ]
    },
    metadata: {
      status: Math.random() > 0.05 ? 'authentic' : 'suspicious',
      confidenceScore: Math.floor(Math.random() * 15) + 85, // 85-100%
      findings: [
        {
          type: 'metadata_anomaly',
          severity: 'low',
          description: 'Análisis de metadatos EXIF',
          evidence: 'Metadatos presentes y consistentes'
        }
      ]
    }
  };
  
  // Agregar variabilidad aleatoria
  const baseResult = analysisResults[analysisType] || analysisResults.full;
  
  // Simular casos de fraude (5% de probabilidad)
  if (Math.random() < 0.05) {
    baseResult.status = 'fraudulent';
    baseResult.confidenceScore = Math.floor(Math.random() * 30) + 40; // 40-70%
    baseResult.findings.push({
      type: 'security_feature_missing',
      severity: 'critical',
      description: 'Elementos de seguridad ausentes o alterados',
      evidence: 'Ausencia de características de seguridad esperadas'
    });
  }
  
  return baseResult;
}

export default verification;