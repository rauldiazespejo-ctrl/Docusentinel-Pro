-- Migración 002: Añadir campos de actor al audit_log para mejor trazabilidad

-- Añadir columnas de actor al audit_log
ALTER TABLE audit_logs ADD COLUMN actor_email TEXT DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN actor_role TEXT DEFAULT '';

-- Índice para búsqueda por email
CREATE INDEX IF NOT EXISTS idx_audit_actor_email ON audit_logs(actor_email);

-- Tabla de claves de cifrado
CREATE TABLE IF NOT EXISTS encryption_keys (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  key_type TEXT NOT NULL DEFAULT 'document',
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  encrypted_key_material TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_keys_status ON encryption_keys(status);
CREATE INDEX IF NOT EXISTS idx_keys_fingerprint ON encryption_keys(key_fingerprint);
