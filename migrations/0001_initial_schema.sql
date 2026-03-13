-- Migración inicial: Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role INTEGER NOT NULL DEFAULT 5,
  password_hash TEXT NOT NULL,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret TEXT,
  mfa_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para usuarios
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  hash TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  metadata TEXT, -- JSON
  security_level TEXT DEFAULT 'internal',
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Índices para documentos
CREATE INDEX idx_documents_name ON documents(name);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_security_level ON documents(security_level);

-- Tabla de permisos
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  action TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- Índices para permisos
CREATE INDEX idx_permissions_user ON permissions(user_id);
CREATE INDEX idx_permissions_document ON permissions(document_id);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_expires ON permissions(expires_at);

-- Tabla única de auditoría con hash encadenado
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details TEXT, -- JSON
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices para auditoría
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

-- Tabla de verificaciones
CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  findings TEXT, -- JSON
  analyzed_by TEXT NOT NULL,
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (analyzed_by) REFERENCES users(id)
);

-- Índices para verificaciones
CREATE INDEX idx_verifications_document ON verifications(document_id);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_verifications_confidence ON verifications(confidence_score);
CREATE INDEX idx_verifications_analyzed_at ON verifications(analyzed_at);

-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices para sesiones
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Tabla de intentos de acceso fallidos
CREATE TABLE IF NOT EXISTS failed_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  attempt_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para intentos fallidos
CREATE INDEX idx_failed_email ON failed_attempts(email);
CREATE INDEX idx_failed_ip ON failed_attempts(ip_address);
CREATE INDEX idx_failed_created ON failed_attempts(created_at);