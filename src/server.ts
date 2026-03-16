/**
 * Punto de entrada para Vercel/Node.js con mejor-sqlite3
 */
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import bcrypt from 'bcryptjs'

import authRoutes from './routes/auth.js'
import documentRoutes from './routes/documents.js'
import verificationRoutes from './routes/verification.js'
import auditRoutes from './routes/audit.js'

import { SQLiteAdapter } from './adapters/database.js'
import { globalKV } from './adapters/kv.js'
import { globalR2 } from './adapters/r2.js'

// ─── Inicializar base de datos ───────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || resolve(process.cwd(), 'data')
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, 'docusentinel.db')

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

const DB = new SQLiteAdapter(DB_PATH)

// ─── Inicializar schema ───────────────────────────────────────────────────────
async function initializeDatabase() {
  try {
    const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || resolve(process.cwd(), 'migrations')
    const migrations = ['0001_initial_schema.sql', '0002_add_actor_fields.sql']

    for (const migration of migrations) {
      const migPath = join(MIGRATIONS_DIR, migration)
      if (existsSync(migPath)) {
        const sql = readFileSync(migPath, 'utf-8')
        DB.exec(sql)
        console.log(`✅ Migration applied: ${migration}`)
      }
    }

    // Insertar superusuario si no existe
    const existing = await DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind('rauldiazespejo@gmail.com').first()

    if (!existing) {
      const passwordHash = await bcrypt.hash(
        process.env.SUPERUSER_PASSWORD || 'DocuSentinel@2024!Admin', 10
      )
      await DB.prepare(`
        INSERT OR IGNORE INTO users (id, email, name, role, password_hash, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind('superuser', 'rauldiazespejo@gmail.com', 'Raul Diaz Espejo', 1, passwordHash).run()
      console.log('✅ Superusuario creado')
    }

    console.log('✅ Base de datos inicializada correctamente en:', DB_PATH)
  } catch (e: any) {
    console.error('❌ Error inicializando DB:', e.message)
  }
}

// ─── Crear app ────────────────────────────────────────────────────────────────
const app = new Hono<{ Bindings: any }>()

// Middleware para inyectar bindings en cada request
app.use('*', async (c, next) => {
  const env = (c as any).env || {}
  ;(c as any).env = env
  env.DB = DB
  env.KV = globalKV
  env.R2 = globalR2
  env.JWT_SECRET = process.env.JWT_SECRET || 'docusentinel-jwt-secret-change-in-production-minimum-32-chars'
  env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'docusentinel-encryption-key-change-in-production-32b'
  env.SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD || 'DocuSentinel@2024!Admin'
  await next()
})

// Middleware global
app.use('*', logger())
app.use('*', cors({
  origin: ['*'],
  credentials: true,
  maxAge: 86400
}))

// Servir archivos estáticos
const PUBLIC_DIR = process.env.PUBLIC_DIR || resolve(process.cwd(), 'public')
app.use('/static/*', serveStatic({ root: PUBLIC_DIR }))

// Rutas de API
app.route('/api/auth', authRoutes)
app.route('/api/documents', documentRoutes)
app.route('/api/verification', verificationRoutes)
app.route('/api/audit', auditRoutes)

// Descarga directa del APK
app.get('/download/apk', (c) => {
  const apkPath = join(PUBLIC_DIR, 'DocuSentinel-PRO-v1.1.0.apk')
  if (!existsSync(apkPath)) {
    return c.json({ error: 'APK no disponible' }, 404)
  }
  const apkBuffer = readFileSync(apkPath)
  return new Response(apkBuffer, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="DocuSentinel-PRO-v1.1.0.apk"',
      'Content-Length': apkBuffer.length.toString()
    }
  })
})

// Health check
app.get('/health', (c) => {
  return c.json({
    success: true,
    status: 'operational',
    service: 'DocuSentinel PRO API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// SPA - catch all
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DocuSentinel PRO — Seguridad Documental Empresarial</title>
  <meta name="description" content="Plataforma empresarial de gestión documental con cifrado AES-256, control de accesos y verificación forense de autenticidad.">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link href="/static/styles.css" rel="stylesheet">
</head>
<body>
  <div id="app">
    <div id="loading-screen" class="loading-screen">
      <div class="loading-content">
        <div class="loading-logo"><i class="fas fa-shield-halved"></i></div>
        <div class="loading-text">DocuSentinel <span class="text-cyan">PRO</span></div>
        <div class="loading-bar"><div class="loading-bar-fill"></div></div>
        <div class="loading-status">Inicializando sistema seguro...</div>
      </div>
    </div>
  </div>
  <script src="/static/app.js"></script>
</body>
</html>`)
})

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10)

initializeDatabase().then(() => {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`🛡️  DocuSentinel PRO → http://0.0.0.0:${info.port}`)
  })
})

export default app
