# 🛡️ DocuSentinel PRO — Arquitectura Técnica Completa
> **Versión:** 1.0.0 | **Fecha:** 2026-03-14 | **Autor:** Arquitecto Senior

---

## 📌 Resumen Ejecutivo

**DocuSentinel PRO** es una plataforma SaaS de seguridad documental empresarial con dos ejes:

| Funcionalidad | Descripción |
|---|---|
| 🔐 **Vault de Documentos** | Cifrado AES-256 + trazabilidad de accesos con firma digital |
| 🔍 **Verificador Forense** | Detección de falsificación/adulteración mediante hash + análisis de metadatos |

- **Usuarios esperados:** 500 – 50,000 usuarios concurrentes (modelo SaaS B2B)
- **Tipo de aplicación:** Web App (PWA) + REST API + Webhooks
- **Restricciones:** Ninguna impuesta — arquitectura recomendada desde cero

---

## 1. 🧱 Stack Tecnológico Recomendado

### Frontend
| Tecnología | Justificación |
|---|---|
| **Next.js 14** (App Router + TypeScript) | SSR para SEO corporativo + React Server Components reduce bundle size crítico en dashboards |
| **TailwindCSS + shadcn/ui** | Sistema de diseño consistente sin overhead; componentes accesibles para entornos empresariales |
| **TanStack Query v5** | Caché inteligente de queries + invalidación optimista para listas de documentos en tiempo real |
| **Web Crypto API** (cliente) | Cifrado en el navegador antes de subir = zero-knowledge architecture; nadie intercepta la llave |
| **PDF.js + Canvas API** | Renderizado seguro de documentos sin descargar el archivo original al disco |

### Backend
| Tecnología | Justificación |
|---|---|
| **Hono (Cloudflare Workers)** | Edge latency <50ms global; ideal para APIs de verificación en tiempo real sin cold starts |
| **Node.js 20 LTS** (servicios pesados) | Procesamiento de hash SHA-3/Blake3 y análisis de metadatos requiere runtime estable con streams |
| **tRPC v11** | Type-safety end-to-end sin codegen; contratos API validados en compile-time entre front y back |
| **BullMQ + Redis** | Cola de trabajos para análisis forense asíncrono sin bloquear la respuesta HTTP |
| **OpenSSL / Noble Crypto** | Librería de criptografía auditada para firmas digitales PKCS#7 y cifrado AES-256-GCM |

### Base de Datos
| Tecnología | Justificación |
|---|---|
| **PostgreSQL 16** (Supabase) | ACID completo para el audit trail inmutable; Row Level Security nativo para multi-tenancy |
| **Cloudflare D1** (edge queries) | Cache de metadatos de verificación distribuido globalmente; latencia mínima en consultas frecuentes |
| **Redis 7** (Upstash) | Sesiones, rate limiting, y cache de resultados de verificación con TTL configurable |
| **Cloudflare R2** | Almacenamiento de documentos cifrados con cero egress fees + presigned URLs temporales |

### Infraestructura
| Tecnología | Justificación |
|---|---|
| **Cloudflare Pages + Workers** | CDN + compute en el edge; DDoS protection nativa; despliega en 200+ PoPs automáticamente |
| **Supabase** (BaaS) | Auth JWT + PostgreSQL + Realtime; reduce 3 meses de desarrollo de infraestructura auth |
| **GitHub Actions** | CI/CD con matrix testing; integra secret scanning antes de cada deploy |
| **Sentry + PostHog** | Observabilidad de errores + analytics de producto sin enviar datos sensibles a terceros |

---

## 2. 📁 Estructura de Carpetas del Proyecto

```
docusentinel-pro/
│
├── 📁 apps/
│   ├── 📁 web/                          # Next.js 14 Frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx                    # Dashboard principal
│   │   │   │   ├── vault/
│   │   │   │   │   ├── page.tsx                # Listado de documentos
│   │   │   │   │   ├── [id]/page.tsx           # Detalle del documento
│   │   │   │   │   └── upload/page.tsx         # Subida con cifrado
│   │   │   │   ├── verify/
│   │   │   │   │   ├── page.tsx                # Verificador forense
│   │   │   │   │   └── report/[id]/page.tsx    # Reporte de verificación
│   │   │   │   ├── authorizations/
│   │   │   │   │   ├── page.tsx                # Listado de autorizaciones
│   │   │   │   │   └── [id]/page.tsx           # Detalle + logs de acceso
│   │   │   │   ├── audit/
│   │   │   │   │   └── page.tsx                # Audit trail completo
│   │   │   │   └── settings/
│   │   │   │       ├── page.tsx
│   │   │   │       └── keys/page.tsx           # Gestión de claves
│   │   │   ├── api/
│   │   │   │   └── trpc/[trpc]/route.ts        # tRPC gateway
│   │   │   ├── globals.css
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                             # shadcn/ui base components
│   │   │   ├── vault/
│   │   │   │   ├── DocumentCard.tsx
│   │   │   │   ├── EncryptUploader.tsx         # Cifra antes de subir
│   │   │   │   ├── AccessLog.tsx
│   │   │   │   └── AuthorizationModal.tsx
│   │   │   ├── verify/
│   │   │   │   ├── DropzoneVerifier.tsx
│   │   │   │   ├── ForensicReport.tsx
│   │   │   │   ├── TamperIndicator.tsx
│   │   │   │   └── MetadataViewer.tsx
│   │   │   ├── audit/
│   │   │   │   ├── AuditTimeline.tsx
│   │   │   │   └── ExportAuditPDF.tsx
│   │   │   └── shared/
│   │   │       ├── Navbar.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── TrustBadge.tsx
│   │   ├── lib/
│   │   │   ├── crypto/
│   │   │   │   ├── encrypt.ts                  # AES-256-GCM en browser
│   │   │   │   ├── decrypt.ts
│   │   │   │   ├── hash.ts                     # SHA-3 + Blake3 fingerprint
│   │   │   │   └── keyDerivation.ts            # PBKDF2 / Argon2
│   │   │   ├── api/
│   │   │   │   └── trpc-client.ts
│   │   │   └── utils/
│   │   │       ├── fileValidator.ts
│   │   │       └── formatters.ts
│   │   ├── hooks/
│   │   │   ├── useEncrypt.ts
│   │   │   ├── useVerify.ts
│   │   │   └── useAuditLog.ts
│   │   ├── stores/
│   │   │   └── sessionStore.ts                 # Zustand para sesión local
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── 📁 api/                          # Hono + Cloudflare Workers (Edge API)
│       ├── src/
│       │   ├── index.ts                        # Entry point Hono app
│       │   ├── routes/
│       │   │   ├── vault.ts                    # CRUD documentos cifrados
│       │   │   ├── verify.ts                   # Endpoints forenses
│       │   │   ├── authorizations.ts           # CRUD autorizaciones
│       │   │   ├── audit.ts                    # Lectura de audit trail
│       │   │   └── webhooks.ts                 # Notificaciones externas
│       │   ├── middleware/
│       │   │   ├── auth.ts                     # Verificación JWT Supabase
│       │   │   ├── rateLimit.ts                # Redis rate limiting
│       │   │   ├── tenantGuard.ts              # RLS multi-tenant
│       │   │   └── auditInterceptor.ts         # Log automático de accesos
│       │   ├── services/
│       │   │   ├── crypto/
│       │   │   │   ├── CryptoService.ts        # Orquestador de cifrado
│       │   │   │   └── KeyManager.ts           # Gestión de llaves por tenant
│       │   │   ├── forensic/
│       │   │   │   ├── ForensicEngine.ts       # Motor de análisis
│       │   │   │   ├── HashVerifier.ts         # Comparación de hashes
│       │   │   │   ├── MetadataAnalyzer.ts     # Análisis EXIF/PDF metadata
│       │   │   │   └── TamperDetector.ts       # Detección de adulteración
│       │   │   ├── storage/
│       │   │   │   ├── R2Storage.ts            # Cloudflare R2 adapter
│       │   │   │   └── PresignedUrl.ts         # URLs temporales seguras
│       │   │   ├── authorization/
│       │   │   │   ├── AuthorizationService.ts
│       │   │   │   └── AccessControl.ts        # RBAC + ABAC policies
│       │   │   └── audit/
│       │   │       ├── AuditService.ts
│       │   │       └── AuditExporter.ts        # Export PDF/CSV del trail
│       │   ├── db/
│       │   │   ├── schema.ts                   # Drizzle ORM schema
│       │   │   ├── migrations/
│       │   │   └── queries/
│       │   │       ├── documents.ts
│       │   │       ├── authorizations.ts
│       │   │       └── auditLogs.ts
│       │   └── types/
│       │       ├── bindings.ts                 # Cloudflare env bindings
│       │       └── models.ts
│       ├── wrangler.jsonc
│       ├── package.json
│       └── tsconfig.json
│
├── 📁 packages/                         # Monorepo shared packages
│   ├── 📁 crypto-core/                  # Shared crypto utilities
│   │   ├── src/
│   │   │   ├── algorithms.ts           # AES-256-GCM, ChaCha20-Poly1305
│   │   │   ├── fingerprint.ts          # Hash SHA-3 + BLAKE3
│   │   │   └── signatures.ts           # PKCS#7 / CAdES digital signatures
│   │   └── package.json
│   ├── 📁 shared-types/                 # TypeScript types compartidos
│   │   ├── src/
│   │   │   ├── document.types.ts
│   │   │   ├── authorization.types.ts
│   │   │   ├── audit.types.ts
│   │   │   └── verification.types.ts
│   │   └── package.json
│   └── 📁 ui-kit/                       # Componentes UI reutilizables
│       ├── src/
│       │   ├── SecurityBadge/
│       │   ├── HashDisplay/
│       │   └── TimelineItem/
│       └── package.json
│
├── 📁 infrastructure/
│   ├── 📁 db/
│   │   ├── migrations/                  # SQL migrations versionadas
│   │   ├── seeds/                       # Datos iniciales de prueba
│   │   └── schema.sql                   # Schema PostgreSQL completo
│   ├── 📁 cloudflare/
│   │   ├── d1-schema.sql               # Schema para D1 (edge cache)
│   │   └── r2-cors.json                # Configuración CORS para R2
│   └── 📁 scripts/
│       ├── deploy.sh
│       ├── migrate.sh
│       └── rotate-keys.sh              # Rotación programada de llaves
│
├── 📁 .github/
│   ├── workflows/
│   │   ├── ci.yml                      # Tests + lint + type-check
│   │   ├── deploy-staging.yml
│   │   ├── deploy-production.yml
│   │   └── security-scan.yml          # SAST + secret scanning
│   └── CODEOWNERS
│
├── 📁 docs/
│   ├── architecture/
│   │   ├── system-design.md
│   │   ├── crypto-protocol.md          # Protocolo de cifrado documentado
│   │   └── forensic-engine.md
│   ├── api/
│   │   └── openapi.yaml               # Especificación OpenAPI 3.1
│   └── security/
│       └── threat-model.md            # STRIDE threat modeling
│
├── turbo.json                          # Turborepo config
├── pnpm-workspace.yaml
└── package.json
```

---

## 3. 🗄️ Modelo de Datos

### Entidades Principales y Relaciones

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MODELO RELACIONAL                            │
│                                                                     │
│  organizations ──< users ──< sessions                               │
│       │                │                                            │
│       │                └──< document_authorizations >── documents   │
│       │                                                     │       │
│       └──< documents                                        │       │
│                │                                            │       │
│                ├──< document_versions                       │       │
│                ├──< verification_records                    │       │
│                └──< audit_logs ──────────────────────────────       │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Tabla: `organizations` (Multi-tenancy base)
```sql
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,          -- tenant identifier
  plan            TEXT NOT NULL DEFAULT 'starter', -- starter | pro | enterprise
  max_storage_gb  INTEGER DEFAULT 5,
  encryption_key_id TEXT,                        -- ref a KMS externo
  settings        JSONB DEFAULT '{}',            -- config personalizada
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ                    -- soft delete
);
```

### Tabla: `users`
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY,              -- sincronizado con Supabase Auth
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'viewer', -- owner | admin | editor | viewer
  avatar_url      TEXT,
  public_key      TEXT,                          -- llave pública PGP/RSA del usuario
  key_fingerprint TEXT,                          -- fingerprint de su llave pública
  mfa_enabled     BOOLEAN DEFAULT false,
  last_login_at   TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `documents` (Vault de documentos cifrados)
```sql
CREATE TABLE documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  owner_id            UUID NOT NULL REFERENCES users(id),
  
  -- Metadatos del archivo original
  original_filename   TEXT NOT NULL,
  original_mime_type  TEXT NOT NULL,
  original_size_bytes BIGINT NOT NULL,
  
  -- Cifrado
  storage_key         TEXT NOT NULL,             -- path en R2 del archivo cifrado
  encryption_algo     TEXT NOT NULL DEFAULT 'AES-256-GCM',
  iv                  TEXT NOT NULL,             -- Initialization Vector (base64)
  encrypted_dek       TEXT NOT NULL,             -- Data Encryption Key cifrada con KEK
  
  -- Integridad y verificación forense
  hash_sha3           TEXT NOT NULL,             -- SHA3-256 del archivo ORIGINAL
  hash_blake3         TEXT NOT NULL,             -- BLAKE3 como segundo factor
  hash_encrypted      TEXT NOT NULL,             -- Hash del archivo YA cifrado
  
  -- Firma digital (opcional pero recomendado)
  digital_signature   TEXT,                      -- Firma PKCS#7 del owner
  signature_valid     BOOLEAN,
  signed_at           TIMESTAMPTZ,
  
  -- Clasificación
  classification      TEXT DEFAULT 'confidential', -- public | internal | confidential | secret
  tags                TEXT[] DEFAULT '{}',
  description         TEXT,
  
  -- Estado
  status              TEXT DEFAULT 'active',     -- active | archived | revoked | deleted
  version_count       INTEGER DEFAULT 1,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

-- Índices críticos para performance
CREATE INDEX idx_documents_org     ON documents(organization_id);
CREATE INDEX idx_documents_hash    ON documents(hash_sha3);
CREATE INDEX idx_documents_owner   ON documents(owner_id);
CREATE INDEX idx_documents_status  ON documents(status);
```

### Tabla: `document_versions` (Control de versiones)
```sql
CREATE TABLE document_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id),
  version_number  INTEGER NOT NULL,
  storage_key     TEXT NOT NULL,                -- path en R2 de esta versión
  hash_sha3       TEXT NOT NULL,
  hash_blake3     TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  change_summary  TEXT,                         -- descripción del cambio
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);
```

### Tabla: `document_authorizations` (Control de acceso + trazabilidad)
```sql
CREATE TABLE document_authorizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id),
  granted_by      UUID NOT NULL REFERENCES users(id),   -- quien autoriza
  granted_to      UUID REFERENCES users(id),            -- usuario específico
  granted_to_email TEXT,                                -- para externos sin cuenta
  
  -- Permisos granulares
  permission      TEXT NOT NULL,                        -- read | download | edit | share | admin
  
  -- Restricciones temporales
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,                          -- NULL = sin expiración
  
  -- Restricciones de acceso adicionales
  max_accesses    INTEGER,                              -- NULL = ilimitado
  access_count    INTEGER DEFAULT 0,
  ip_whitelist    INET[],                               -- IPs permitidas (opcional)
  
  -- Token para acceso externo (sin cuenta)
  access_token    TEXT UNIQUE,                          -- token firmado para compartir
  token_expires_at TIMESTAMPTZ,
  
  -- Estado
  status          TEXT DEFAULT 'active',               -- active | revoked | expired
  revocation_reason TEXT,
  revoked_by      UUID REFERENCES users(id),
  revoked_at      TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_document  ON document_authorizations(document_id);
CREATE INDEX idx_auth_granted_to ON document_authorizations(granted_to);
CREATE INDEX idx_auth_token     ON document_authorizations(access_token);
```

### Tabla: `audit_logs` (Registro inmutable de accesos — append-only)
```sql
CREATE TABLE audit_logs (
  id              BIGSERIAL PRIMARY KEY,         -- BIGSERIAL no UUID para secuencialidad
  
  -- Qué se hizo
  action          TEXT NOT NULL,
  -- ENUM: document.view | document.download | document.upload |
  --       document.encrypt | document.decrypt | document.share |
  --       document.revoke | verification.run | authorization.create |
  --       authorization.revoke | user.login | user.logout | key.rotate
  
  -- Quién lo hizo
  actor_id        UUID REFERENCES users(id),
  actor_email     TEXT NOT NULL,
  actor_role      TEXT NOT NULL,
  actor_ip        INET NOT NULL,
  actor_user_agent TEXT,
  actor_country   TEXT,                          -- geolocalización IP
  
  -- Sobre qué
  resource_type   TEXT NOT NULL,                 -- document | authorization | user | key
  resource_id     UUID,
  organization_id UUID NOT NULL,
  
  -- Contexto de autorización
  authorization_id UUID REFERENCES document_authorizations(id),
  
  -- Resultado
  outcome         TEXT NOT NULL DEFAULT 'success', -- success | denied | error
  error_code      TEXT,
  
  -- Integridad del log (anti-tampering)
  log_hash        TEXT NOT NULL,                 -- hash de todos los campos
  previous_hash   TEXT,                          -- hash del registro anterior (blockchain-style)
  
  -- Metadatos adicionales
  metadata        JSONB DEFAULT '{}',
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
  -- SIN updated_at ni deleted_at — este tabla es APPEND-ONLY
);

-- Política: NUNCA actualizar ni borrar registros de audit_log
-- Implementar vía RLS en Supabase:
-- CREATE POLICY "audit_logs_no_delete" ON audit_logs FOR DELETE USING (false);
-- CREATE POLICY "audit_logs_no_update" ON audit_logs FOR UPDATE USING (false);

CREATE INDEX idx_audit_org      ON audit_logs(organization_id);
CREATE INDEX idx_audit_actor    ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_id);
CREATE INDEX idx_audit_action   ON audit_logs(action);
CREATE INDEX idx_audit_created  ON audit_logs(created_at DESC);
```

### Tabla: `verification_records` (Motor forense)
```sql
CREATE TABLE verification_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id),
  requested_by      UUID REFERENCES users(id),
  
  -- Archivo a verificar
  filename          TEXT NOT NULL,
  file_size_bytes   BIGINT NOT NULL,
  mime_type         TEXT NOT NULL,
  
  -- Hashes calculados del archivo RECIBIDO
  computed_sha3     TEXT NOT NULL,
  computed_blake3   TEXT NOT NULL,
  computed_md5      TEXT,                         -- legado, solo referencial
  
  -- Comparación con documento registrado
  reference_document_id UUID REFERENCES documents(id), -- puede ser NULL si no está en vault
  
  -- Resultados del análisis forense
  verdict           TEXT NOT NULL,
  -- authentic | tampered | suspicious | unknown | unregistered
  
  confidence_score  DECIMAL(5,2),                -- 0.00 - 100.00%
  
  -- Detalle de análisis
  hash_match        BOOLEAN,                      -- ¿coincide el hash?
  signature_valid   BOOLEAN,                      -- ¿firma digital válida?
  metadata_clean    BOOLEAN,                      -- ¿metadatos sin anomalías?
  
  -- Anomalías detectadas
  anomalies         JSONB DEFAULT '[]',
  -- [{ type: "metadata_mismatch", field: "Author", expected: "X", found: "Y" },
  --  { type: "pixel_manipulation", region: "top-right", confidence: 0.87 }]
  
  -- Metadatos extraídos del archivo
  extracted_metadata JSONB DEFAULT '{}',         -- EXIF, PDF metadata, etc.
  
  -- Reporte generado
  report_url        TEXT,                         -- PDF del reporte forense en R2
  
  processing_time_ms INTEGER,
  status            TEXT DEFAULT 'pending',       -- pending | processing | completed | error
  error_message     TEXT,
  
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_verif_org     ON verification_records(organization_id);
CREATE INDEX idx_verif_sha3    ON verification_records(computed_sha3);
CREATE INDEX idx_verif_verdict ON verification_records(verdict);
```

### Tabla: `encryption_keys` (Gestión de llaves)
```sql
CREATE TABLE encryption_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  key_type        TEXT NOT NULL,    -- master | document | signing | external
  algorithm       TEXT NOT NULL,    -- AES-256-GCM | RSA-4096 | Ed25519
  
  -- La llave NUNCA se almacena en texto plano
  -- Se almacena cifrada con la KEK del organization (o KMS externo)
  encrypted_key_material TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL UNIQUE,
  
  status          TEXT DEFAULT 'active',  -- active | rotated | revoked | compromised
  
  -- Metadata de rotación
  rotated_from    UUID REFERENCES encryption_keys(id),
  rotate_at       TIMESTAMPTZ,            -- programar rotación futura
  rotated_at      TIMESTAMPTZ,
  
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ             -- NULL = no expira
);
```

---

## 4. 🔐 Protocolo de Cifrado (Envelope Encryption)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ENVELOPE ENCRYPTION FLOW                          │
│                                                                      │
│  SUBIDA DE DOCUMENTO:                                                │
│                                                                      │
│  [Archivo Original]                                                  │
│       │                                                              │
│       ├─→ Hash SHA3-256 + BLAKE3 ──────────────────→ [Fingerprint]  │
│       │                                                              │
│       ├─→ Generar DEK (Data Encryption Key) 256 bits aleatorio      │
│       │                                                              │
│       ├─→ Cifrar Archivo con DEK (AES-256-GCM)                      │
│       │       → Genera: [Archivo Cifrado] + [IV]                    │
│       │                                                              │
│       └─→ Cifrar DEK con KEK del organization (AES-256-GCM)         │
│               → Genera: [Encrypted DEK]                             │
│                                                                      │
│  Almacenado en R2: [Archivo Cifrado]                                 │
│  Almacenado en DB: [IV] + [Encrypted DEK] + [Fingerprints]          │
│  KEK: Almacenado en KMS (nunca en DB ni código)                      │
│                                                                      │
│  DESCARGA AUTORIZADA:                                                │
│                                                                      │
│  [Solicitud con JWT válido + Authorization activa]                   │
│       │                                                              │
│       ├─→ Verificar autorización + registrar en audit_log           │
│       ├─→ Recuperar [Encrypted DEK] + [IV] de DB                    │
│       ├─→ Descifrar DEK con KEK (en KMS seguro)                     │
│       ├─→ Recuperar [Archivo Cifrado] de R2                         │
│       └─→ Descifrar con DEK + IV ──────────────→ [Archivo Original] │
│                                                                      │
│  VERIFICACIÓN FORENSE:                                               │
│                                                                      │
│  [Archivo Sospechoso]                                                │
│       ├─→ Calcular SHA3-256 + BLAKE3                                 │
│       ├─→ Comparar con hash registrado en DB                        │
│       ├─→ Analizar metadatos EXIF/PDF                               │
│       ├─→ Verificar firma digital (si existe)                       │
│       └─→ Generar Reporte de Verdito con confidence score           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. 🔄 Flujos Principales (Sequence Diagrams)

### Flujo A: Subida y Cifrado de Documento
```
Usuario          Browser          API Edge          R2 Storage        PostgreSQL
   │                │                │                  │                  │
   │─ Upload File ─→│                │                  │                  │
   │                │─ Hash(SHA3)   │                  │                  │
   │                │─ Encrypt(AES) │                  │                  │
   │                │─ POST /vault ─→│                  │                  │
   │                │                │─ Verify JWT ─────┤                  │
   │                │                │─ PUT encrypted ──→│                  │
   │                │                │                  │─ 200 OK ─────────│
   │                │                │─ INSERT document ─────────────────→ │
   │                │                │─ INSERT audit_log ────────────────→ │
   │                │                │─ 201 Created ──→ │                  │
   │←── Success ────│                │                  │                  │
```

### Flujo B: Verificación Forense
```
Usuario          Browser          API Edge          Queue (Redis)     Worker
   │                │                │                  │                │
   │─ Drop File ───→│                │                  │                │
   │                │─ Hash(SHA3+B3)│                  │                │
   │                │─ POST /verify ─→│                  │                │
   │                │                │─ Check DB hash ─────────────────→ │
   │                │                │─ Enqueue job ───→│                │
   │                │                │─ 202 Accepted ──→│                │
   │                │                │                  │─ Dequeue ─────→│
   │                │                │                  │                │─ Metadata Analysis
   │                │                │                  │                │─ Signature Check
   │                │                │                  │                │─ AI Anomaly Detect
   │                │                │─ WS: result ────────────────────→ │
   │←── Report ─────│                │                  │                │
```

---

## 6. ⚠️ Riesgos Técnicos y Mitigaciones

### Riesgo 1: 🔑 Compromiso de Claves de Cifrado
**Descripción:** Si un atacante obtiene las KEK (Key Encryption Keys), todos los documentos cifrados quedan expuestos retroactivamente. Es el riesgo catastrófico #1 para una plataforma de este tipo.

**Impacto:** Crítico — exposición masiva de datos confidenciales de todos los clientes.

**Mitigaciones:**
- **Envelope Encryption estricta:** Las KEK nunca se almacenan en la aplicación ni en la DB. Se delegan a un KMS dedicado (AWS KMS, Cloudflare Secrets, o HashiCorp Vault).
- **Rotación automática de llaves:** Script `rotate-keys.sh` ejecutado mensualmente via GitHub Actions. Cada documento re-cifra su DEK con la nueva KEK sin tocar el archivo almacenado.
- **Separación de ambientes:** KEK de producción y staging son completamente distintas, con acceso auditado.
- **Zero-knowledge architecture opcional:** Con cifrado del lado del cliente (Web Crypto API), el servidor nunca ve el plaintext — ni siquiera con acceso root a la BD pueden descifrar.

---

### Riesgo 2: 🧪 Evasión del Motor Forense (Falsos Negativos)
**Descripción:** Un atacante sofisticado podría modificar un documento Y recalcular su hash para registrarlo como "auténtico", especialmente si tiene acceso interno al sistema.

**Impacto:** Alto — la funcionalidad core de verificación quedaría comprometida.

**Mitigaciones:**
- **Hashes inmutables en primera carga:** El SHA3 + BLAKE3 se calculan y firman digitalmente en el momento de upload. El registro en `audit_logs` incluye el hash del log anterior (blockchain-style), haciendo cualquier modificación retroactiva detectable.
- **Múltiples vectores de verificación:** No solo hash; también firma digital PKCS#7 + análisis de metadatos EXIF + timestamp de creación del archivo. Un atacante necesita falsificar todos simultáneamente.
- **Timestamping externo (RFC 3161):** Integrar un TSA (Timestamp Authority) externo como Sectigo o GlobalSign que certifica cuándo se registró el documento originalmente.
- **Análisis de metadatos profundo:** `MetadataAnalyzer` extrae y compara creación, modificación, software usado, autor, GPS (en imágenes), versiones de PDF. La coherencia entre todos estos campos es difícil de falsificar.

---

### Riesgo 3: 📊 Escalabilidad del Audit Trail bajo Alta Carga
**Descripción:** En organizaciones grandes con miles de accesos diarios, la tabla `audit_logs` puede crecer a decenas de millones de registros en meses, degradando consultas de historial.

**Impacto:** Medio — degradación de performance en dashboards de auditoría, no pérdida de datos.

**Mitigaciones:**
- **Particionamiento temporal (PostgreSQL Partitioning):** Particionar `audit_logs` por mes (`PARTITION BY RANGE (created_at)`). Cada mes es una tabla separada; queries recientes son ultrarrápidas.
- **Archivado automático:** Logs > 12 meses se mueven a Cloudflare R2 como JSON comprimido (costo ~$0.015/GB) y se eliminan de PostgreSQL. Siguen disponibles para auditorías legales.
- **Índices selectivos + Materialized Views:** Vistas materializadas que pre-calculan estadísticas de acceso por documento/usuario, refrescadas cada hora, evitando full-scans en el dashboard.
- **Read replicas:** Supabase soporta réplicas de lectura. Las queries del dashboard apuntan a la réplica; solo escrituras van al primary.

---

## 7. 🔒 Consideraciones de Seguridad Adicionales

| Capa | Control |
|---|---|
| **Transport** | TLS 1.3 forzado; HSTS con preload; Certificate Pinning en apps móviles |
| **API** | Rate limiting por IP + por usuario; JWT con expiración de 1h + refresh tokens |
| **Uploads** | Validación de MIME type real (magic bytes, no extensión); max file size 100MB; virus scanning via ClamAV API |
| **Multi-tenancy** | Row Level Security en PostgreSQL; cada query lleva `organization_id`; imposible acceder a datos de otro tenant |
| **Secrets** | Todas las env vars en Cloudflare Secrets; rotación semestral; nunca en código ni logs |
| **Compliance** | Arquitectura lista para GDPR (right to erasure), SOC 2 Type II, ISO 27001 |

---

## 8. 📈 Estimación de Costos Mensuales (500 usuarios activos)

| Servicio | Uso estimado | Costo/mes |
|---|---|---|
| Cloudflare Pages/Workers | 10M requests | $5 (plan gratuito + $5 paid) |
| Cloudflare R2 | 500 GB almacenamiento | ~$7.50 |
| Supabase Pro | 8GB DB + Auth | $25 |
| Upstash Redis | 500K commands/día | $10 |
| Total estimado | | **~$47/mes** |

> Para 50,000 usuarios: ~$800/mes. Margen operativo excelente para SaaS B2B.

---

*Documento generado para DocuSentinel PRO v1.0 — Arquitectura lista para producción*
