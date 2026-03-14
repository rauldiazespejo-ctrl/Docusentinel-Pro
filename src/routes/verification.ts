import { Hono } from 'hono';
import { z } from 'zod';
import { AuthMiddleware } from '../middleware/auth';
import { AuditService } from '../audit/service';
import { EncryptionService } from '../encryption/service';
import { UserRole } from '../types';

const verification = new Hono<{ Bindings: CloudflareBindings }>();
const authMiddleware = new AuthMiddleware();
const auditService = new AuditService();
const encryptionService = new EncryptionService();

const verifySchema = z.object({
  documentId: z.string().uuid(),
  analysisType: z.enum(['full','image','typography','metadata']).optional()
});

function getIP(c: any) { return c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'; }
function getUA(c: any) { return c.req.header('User-Agent') || 'unknown'; }

// ─── Motor de análisis forense real ───────────────────────────────

interface Finding {
  type: string;
  severity: 'low'|'medium'|'high'|'critical';
  description: string;
  evidence: string;
}

interface AnalysisResult {
  status: 'authentic'|'suspicious'|'fraudulent'|'inconclusive';
  confidenceScore: number;
  findings: Finding[];
  hashSha256: string;
  analysisType: string;
  analysisEngine: string;
}

/**
 * Análisis forense real del documento.
 * Calcula hash SHA-256 real, analiza metadatos del archivo, 
 * compara contra registros en DB si el documento existe.
 */
async function analyzeDocument(
  buffer: ArrayBuffer,
  fileName: string,
  fileType: string,
  analysisType: string,
  existingHash?: string  // Hash registrado en DB (si es verificación de doc existente)
): Promise<AnalysisResult> {
  const findings: Finding[] = [];
  let score = 100;
  let status: 'authentic'|'suspicious'|'fraudulent'|'inconclusive' = 'authentic';

  const bytes = new Uint8Array(buffer);

  // 1. Hash SHA-256 real del archivo
  const hashSha256 = await encryptionService.hashBuffer(buffer);

  // ── Verificación de integridad contra registro ────────────────
  if (existingHash) {
    if (hashSha256 === existingHash) {
      findings.push({
        type: 'hash_integrity',
        severity: 'low',
        description: 'Hash SHA-256 coincide con el registro original',
        evidence: `SHA-256: ${hashSha256.substring(0,32)}…`
      });
    } else {
      score -= 60;
      findings.push({
        type: 'hash_mismatch',
        severity: 'critical',
        description: 'ALERTA: El hash del archivo no coincide con el registro original',
        evidence: `Registrado: ${existingHash.substring(0,32)}… | Actual: ${hashSha256.substring(0,32)}…`
      });
    }
  } else {
    findings.push({
      type: 'hash_computed',
      severity: 'low',
      description: 'Hash SHA-256 calculado (no hay registro previo para comparar)',
      evidence: `SHA-256: ${hashSha256.substring(0,32)}…`
    });
  }

  // 2. Análisis de cabeceras mágicas (file signature)
  if (analysisType === 'full' || analysisType === 'image' || analysisType === 'metadata') {
    const magicCheck = checkFileMagicBytes(bytes, fileType);
    if (!magicCheck.valid) {
      score -= 25;
      findings.push({
        type: 'file_signature',
        severity: 'high',
        description: magicCheck.message,
        evidence: `Cabecera: ${bytesToHex(bytes.slice(0,8))} | Tipo declarado: ${fileType}`
      });
    } else {
      findings.push({
        type: 'file_signature',
        severity: 'low',
        description: 'Cabecera del archivo es consistente con el tipo declarado',
        evidence: `Cabecera: ${bytesToHex(bytes.slice(0,8))} ✓`
      });
    }
  }

  // 3. Análisis de metadatos EXIF/PDF (para imágenes y PDFs)
  if (analysisType === 'full' || analysisType === 'metadata') {
    const metaCheck = analyzeMetadata(bytes, fileType, fileName);
    findings.push(...metaCheck.findings);
    score -= metaCheck.penalty;
  }

  // 4. Análisis de entropía (detecta archivos cifrados/comprimidos anidados sospechosos)
  if (analysisType === 'full' || analysisType === 'image') {
    const entropy = computeEntropy(bytes.slice(0, Math.min(4096, bytes.length)));
    if (entropy > 7.8) {
      score -= 10;
      findings.push({
        type: 'high_entropy',
        severity: 'medium',
        description: 'Alta entropía detectada en el archivo – posible contenido cifrado o comprimido anidado',
        evidence: `Entropía calculada: ${entropy.toFixed(3)} bits/byte (umbral: 7.8)`
      });
    } else {
      findings.push({
        type: 'entropy_normal',
        severity: 'low',
        description: 'Entropía del archivo dentro de rangos normales',
        evidence: `Entropía: ${entropy.toFixed(3)} bits/byte`
      });
    }
  }

  // 5. Análisis tipográfico (solo para PDFs)
  if ((analysisType === 'full' || analysisType === 'typography') && fileType === 'application/pdf') {
    const typoCheck = analyzePDFTypography(bytes);
    findings.push(...typoCheck.findings);
    score -= typoCheck.penalty;
  }

  // 6. Consistencia del nombre de archivo
  if (analysisType === 'full' || analysisType === 'metadata') {
    const extCheck = checkFileExtension(fileName, fileType);
    if (!extCheck.valid) {
      score -= 5;
      findings.push({
        type: 'extension_mismatch',
        severity: 'medium',
        description: extCheck.message,
        evidence: `Nombre: ${fileName} | MIME: ${fileType}`
      });
    }
  }

  // Determinar estado final
  score = Math.max(0, Math.min(100, score));
  if (score >= 90)      status = 'authentic';
  else if (score >= 70) status = 'suspicious';
  else if (score >= 40) status = 'suspicious';
  else                  status = 'fraudulent';

  // Si hay mismatch de hash crítico, siempre fraudulento
  if (findings.some(f => f.type === 'hash_mismatch')) status = 'fraudulent';

  return {
    status,
    confidenceScore: score,
    findings,
    hashSha256,
    analysisType,
    analysisEngine: 'DocuSentinel Forensic Engine v2.0'
  };
}

// ─── Helpers de análisis ──────────────────────────────────────────

function checkFileMagicBytes(bytes: Uint8Array, mimeType: string): { valid: boolean; message: string } {
  const hex = bytesToHex(bytes.slice(0, 8));

  if (mimeType === 'application/pdf') {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { valid: true, message: '' };
    }
    return { valid: false, message: 'El archivo no tiene cabecera PDF válida (%PDF)' };
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      return { valid: true, message: '' };
    }
    return { valid: false, message: 'El archivo no tiene cabecera JPEG válida (FFD8)' };
  }

  if (mimeType === 'image/png') {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { valid: true, message: '' };
    }
    return { valid: false, message: 'El archivo no tiene cabecera PNG válida' };
  }

  if (mimeType === 'image/tiff') {
    const isTiff = (bytes[0] === 0x49 && bytes[1] === 0x49) || (bytes[0] === 0x4D && bytes[1] === 0x4D);
    return isTiff ? { valid: true, message: '' } : { valid: false, message: 'Cabecera TIFF inválida' };
  }

  return { valid: true, message: '' };
}

function analyzeMetadata(bytes: Uint8Array, fileType: string, fileName: string): { findings: Finding[]; penalty: number } {
  const findings: Finding[] = [];
  let penalty = 0;

  if (fileType === 'application/pdf') {
    // Buscar marcadores PDF estándar
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 2048));
    if (text.includes('/Creator') || text.includes('/Producer') || text.includes('/Author')) {
      findings.push({
        type: 'pdf_metadata',
        severity: 'low',
        description: 'Metadatos del documento PDF presentes',
        evidence: 'Se encontraron campos de metadatos estándar (Creator/Producer/Author)'
      });
    } else {
      penalty += 5;
      findings.push({
        type: 'pdf_metadata_missing',
        severity: 'medium',
        description: 'Metadatos del PDF ausentes o eliminados',
        evidence: 'No se encontraron metadatos estándar en el encabezado del PDF'
      });
    }
    // Detectar scripts JS en PDF (potencialmente malicioso)
    if (text.includes('/JavaScript') || text.includes('/JS')) {
      penalty += 15;
      findings.push({
        type: 'pdf_javascript',
        severity: 'high',
        description: 'Se detectó JavaScript embebido en el PDF',
        evidence: 'Presencia de /JavaScript o /JS en la estructura del documento'
      });
    }
  }

  if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
    // Verificar APP1 EXIF marker (0xFFE1)
    const hasExif = bytes.length > 12 && bytes[2] === 0xFF && bytes[3] === 0xE1;
    if (hasExif) {
      findings.push({
        type: 'exif_present',
        severity: 'low',
        description: 'Datos EXIF presentes en la imagen',
        evidence: 'Marcador APP1 (EXIF) encontrado en el archivo JPEG'
      });
    } else {
      findings.push({
        type: 'exif_absent',
        severity: 'low',
        description: 'Sin datos EXIF (imagen sin metadatos de cámara)',
        evidence: 'No se encontró marcador APP1 en el archivo JPEG'
      });
    }
  }

  return { findings, penalty };
}

function analyzePDFTypography(bytes: Uint8Array): { findings: Finding[]; penalty: number } {
  const findings: Finding[] = [];
  let penalty = 0;
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.length, 8192)));

  // Verificar fuentes embebidas
  const fontCount = (text.match(/\/Font/g) || []).length;
  if (fontCount === 0) {
    penalty += 8;
    findings.push({
      type: 'pdf_no_fonts',
      severity: 'medium',
      description: 'Sin fuentes embebidas en el PDF',
      evidence: 'Documentos oficiales generalmente incluyen fuentes embebidas'
    });
  } else {
    findings.push({
      type: 'pdf_fonts_ok',
      severity: 'low',
      description: `${fontCount} referencia(s) de fuente encontradas en el PDF`,
      evidence: `Se encontraron ${fontCount} objetos /Font en la estructura del documento`
    });
  }

  // Detectar flujos de contenido comprimidos
  const hasXRef = text.includes('xref') || text.includes('%%EOF');
  if (!hasXRef) {
    penalty += 10;
    findings.push({
      type: 'pdf_structure',
      severity: 'high',
      description: 'Estructura interna del PDF incompleta o corrupta',
      evidence: 'No se encontraron marcadores xref o %%EOF estándar'
    });
  } else {
    findings.push({
      type: 'pdf_structure_ok',
      severity: 'low',
      description: 'Estructura interna del PDF válida',
      evidence: 'Marcadores xref y %%EOF encontrados correctamente'
    });
  }

  return { findings, penalty };
}

function computeEntropy(bytes: Uint8Array): number {
  const freq = new Array(256).fill(0);
  for (const b of bytes) freq[b]++;
  const n = bytes.length;
  let entropy = 0;
  for (const f of freq) {
    if (f > 0) {
      const p = f / n;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

function checkFileExtension(name: string, mimeType: string): { valid: boolean; message: string } {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const mimeExtMap: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'image/jpeg': ['jpg','jpeg'],
    'image/jpg': ['jpg','jpeg'],
    'image/png': ['png'],
    'image/tiff': ['tif','tiff']
  };
  const valid = mimeExtMap[mimeType]?.includes(ext) ?? true;
  return {
    valid,
    message: valid ? '' : `Extensión ".${ext}" no corresponde al tipo MIME "${mimeType}"`
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ─── GET /stats ─────────────────────────────────────────────────────
// IMPORTANTE: esta ruta debe ir ANTES de /:id para evitar conflicto
verification.get('/stats', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30');
    const since = new Date(Date.now() - days*24*3600*1000).toISOString();

    const byStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count, AVG(confidence_score) as avg_score
      FROM verifications WHERE analyzed_at >= ? GROUP BY status
    `).bind(since).all();

    const total = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM verifications`).first();
    const authentic = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM verifications WHERE status='authentic'`).first();
    const fraudulent = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM verifications WHERE status='fraudulent'`).first();
    const suspicious = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM verifications WHERE status='suspicious'`).first();

    return c.json({ success:true, data:{
      byStatus: byStatus.results.map((r:any) => ({ status:r.status, count:r.count, avgScore: Math.round(r.avg_score*100)/100 })),
      summary: {
        total: (total?.total as number) || 0,
        authentic: (authentic?.c as number) || 0,
        fraudulent: (fraudulent?.c as number) || 0,
        suspicious: (suspicious?.c as number) || 0
      },
      timeRange: { days, since, until: new Date().toISOString() }
    }});
  } catch (err: any) {
    console.error('Stats error:', err);
    return c.json({ success:false, error:'Error al obtener estadísticas' }, 500);
  }
});

// ─── POST /upload-verify ───────────────────────────────────────────
verification.post('/upload-verify', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const ip = getIP(c); const ua = getUA(c);
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const analysisType = (formData.get('analysisType') as string) || 'full';

    if (!file) return c.json({ success:false, error:'Archivo requerido' }, 400);
    if (!['application/pdf','image/jpeg','image/jpg','image/png','image/tiff'].includes(file.type)) {
      return c.json({ success:false, error:'Tipo de archivo no permitido' }, 400);
    }
    if (file.size > 10*1024*1024) return c.json({ success:false, error:'Archivo demasiado grande (máx 10 MB)' }, 400);

    const buffer = await file.arrayBuffer();
    const result = await analyzeDocument(buffer, file.name, file.type, analysisType);

    // Para verificación de archivos externos: crear documento temporal en DB
    const docId = crypto.randomUUID();
    const verifId = crypto.randomUUID();
    const now = new Date().toISOString();
    const hashHex = result.hashSha256;

    // Insertar documento temporal en DB (sin datos cifrados en R2, solo para referencia)
    await c.env.DB.prepare(`
      INSERT INTO documents (id, name, type, size, hash, encrypted_data, encryption_key_id, metadata, security_level, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(docId, file.name, file.type, file.size, hashHex,
      '', '', JSON.stringify({ description: 'Documento de verificación externa', analysisType }),
      'internal', user.id, now, now).run();

    await c.env.DB.prepare(`
      INSERT INTO verifications (id, document_id, status, confidence_score, findings, analyzed_by, analyzed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(verifId, docId, result.status, result.confidenceScore, JSON.stringify(result.findings), user.id, now).run();

    await auditService.logEvent(user.id,'DOCUMENT_UPLOAD_VERIFIED','verification',verifId,
      { documentId: docId, fileName: file.name, status: result.status, score: result.confidenceScore, analysisType },
      ip, ua, c.env.DB);

    return c.json({ success:true, data:{
      verificationId: verifId, documentId: docId,
      status: result.status, confidenceScore: result.confidenceScore,
      findings: result.findings, hashSha256: result.hashSha256,
      analysisEngine: result.analysisEngine,
      analyzedBy: user.id, analyzedAt: now
    }});
  } catch (err) {
    console.error('Upload-verify error:', err);
    return c.json({ success:false, error:'Error al verificar documento' }, 500);
  }
});

// ─── POST /verify (documento existente) ───────────────────────────
verification.post('/verify', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const ip = getIP(c); const ua = getUA(c);
    const { documentId, analysisType = 'full' } = verifySchema.parse(await c.req.json());
    const now = new Date().toISOString();

    // Obtener doc con permisos
    const doc = await c.env.DB.prepare(`
      SELECT * FROM documents
      WHERE id = ? AND (
        created_by = ?
        OR id IN (SELECT document_id FROM permissions WHERE user_id = ? AND action = 'verify' AND (expires_at IS NULL OR expires_at > ?))
      )
    `).bind(documentId, user.id, user.id, now).first();

    if (!doc) return c.json({ success:false, error:'Documento no encontrado o sin permisos' }, 404);

    // Recuperar datos cifrados de R2 para análisis
    let analysisResult: AnalysisResult;
    const r2Key = `documents/${documentId}`;
    const r2Obj = await c.env.R2.get(r2Key);

    if (r2Obj) {
      const ciphertext = await r2Obj.arrayBuffer();
      try {
        const encSvc = new EncryptionService();
        const buffer = await encSvc.decryptBuffer(ciphertext, doc.encryption_key_id as string, doc.encrypted_data as string);
        analysisResult = await analyzeDocument(buffer, doc.name as string, doc.type as string, analysisType, doc.hash as string);
      } catch {
        // Si no se puede descifrar, comparar solo hashes desde metadatos
        analysisResult = {
          status: 'inconclusive',
          confidenceScore: 75,
          findings: [{
            type: 'decryption_failed',
            severity: 'medium',
            description: 'No se pudo descifrar el archivo para análisis completo',
            evidence: 'Análisis basado en metadatos registrados'
          }],
          hashSha256: doc.hash as string,
          analysisType,
          analysisEngine: 'DocuSentinel Forensic Engine v2.0'
        };
      }
    } else {
      // Sin copia R2, análisis basado en metadatos
      analysisResult = {
        status: 'inconclusive',
        confidenceScore: 70,
        findings: [{
          type: 'file_not_in_storage',
          severity: 'medium',
          description: 'Archivo no encontrado en almacenamiento seguro',
          evidence: 'El archivo fue registrado pero no está disponible para análisis profundo'
        }],
        hashSha256: doc.hash as string,
        analysisType,
        analysisEngine: 'DocuSentinel Forensic Engine v2.0'
      };
    }

    const verifId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO verifications (id, document_id, status, confidence_score, findings, analyzed_by, analyzed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(verifId, documentId, analysisResult.status, analysisResult.confidenceScore,
      JSON.stringify(analysisResult.findings), user.id, new Date().toISOString()).run();

    await auditService.logEvent(user.id,'DOCUMENT_VERIFIED','verification',verifId,
      { documentId, status: analysisResult.status, score: analysisResult.confidenceScore, analysisType },
      ip, ua, c.env.DB);

    return c.json({ success:true, data:{
      verificationId: verifId, documentId,
      status: analysisResult.status, confidenceScore: analysisResult.confidenceScore,
      findings: analysisResult.findings, hashSha256: analysisResult.hashSha256,
      analysisEngine: analysisResult.analysisEngine,
      analyzedBy: user.id, analyzedAt: new Date().toISOString()
    }});
  } catch (err: any) {
    if (err?.issues) return c.json({ success:false, error:'Datos inválidos' }, 400);
    console.error('Verify error:', err);
    return c.json({ success:false, error:'Error al verificar documento' }, 500);
  }
});

// ─── GET /:id ──────────────────────────────────────────────────────
verification.get('/:id', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const verifId = c.req.param('id');

    const v = await c.env.DB.prepare(`
      SELECT v.*, d.name as document_name, d.type as document_type
      FROM verifications v
      LEFT JOIN documents d ON v.document_id = d.id
      WHERE v.id = ? AND (
        v.analyzed_by = ? OR d.created_by = ?
        OR d.id IN (SELECT document_id FROM permissions WHERE user_id = ? AND action='verify')
      )
    `).bind(verifId, user.id, user.id, user.id).first();

    if (!v) return c.json({ success:false, error:'Verificación no encontrada' }, 404);

    return c.json({ success:true, data:{
      id: v.id, documentId: v.document_id,
      documentName: v.document_name, documentType: v.document_type,
      status: v.status, confidenceScore: v.confidence_score,
      findings: JSON.parse((v.findings as string) || '[]'),
      analyzedBy: v.analyzed_by, analyzedAt: v.analyzed_at
    }});
  } catch (err) {
    return c.json({ success:false, error:'Error al obtener verificación' }, 500);
  }
});

// ─── GET / ─────────────────────────────────────────────────────────
verification.get('/', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const page      = Math.max(1, parseInt(c.req.query('page') || '1'));
    const pageSize  = Math.min(100, parseInt(c.req.query('pageSize') || '10'));
    const documentId = c.req.query('documentId');

    let where = '(v.analyzed_by = ? OR d.created_by = ? OR d.id IN (SELECT document_id FROM permissions WHERE user_id = ? AND action=\'verify\'))';
    const params: any[] = [user.id, user.id, user.id];

    if (documentId) { where += ' AND v.document_id = ?'; params.push(documentId); }

    const results = await c.env.DB.prepare(`
      SELECT v.*, d.name as document_name, d.type as document_type
      FROM verifications v
      LEFT JOIN documents d ON v.document_id = d.id
      WHERE ${where}
      ORDER BY v.analyzed_at DESC LIMIT ? OFFSET ?
    `).bind(...params, pageSize, (page-1)*pageSize).all();

    const countRow = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM verifications v
      LEFT JOIN documents d ON v.document_id = d.id
      WHERE ${where}
    `).bind(...params).first();

    const total = (countRow?.total as number) || 0;

    const verifications = results.results.map((v: any) => ({
      id: v.id, documentId: v.document_id,
      documentName: v.document_name, documentType: v.document_type,
      status: v.status, confidenceScore: v.confidence_score,
      findings: JSON.parse(v.findings || '[]'),
      analyzedBy: v.analyzed_by, analyzedAt: v.analyzed_at
    }));

    return c.json({ success:true, data:{ verifications, total, page, pageSize, hasNext: verifications.length === pageSize, hasPrev: page > 1 }});
  } catch (err) {
    return c.json({ success:false, error:'Error al obtener verificaciones' }, 500);
  }
});

export default verification;
