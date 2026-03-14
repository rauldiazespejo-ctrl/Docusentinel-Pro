-- Datos de prueba para DocuSentinel Pro

-- Superusuario (autenticación vía config, no vía DB)
INSERT OR IGNORE INTO users (id, email, name, role, password_hash, mfa_enabled, is_active, created_at, updated_at) VALUES 
  ('superuser', 'rauldiazespejo@gmail.com', 'Raul Diaz Espejo', 1, 'SUPERUSER_NO_DB_AUTH', 0, 1, datetime('now'), datetime('now'));

-- Usuarios de prueba (para crear nuevos usuarios usa el registro con contraseña real PBKDF2)
-- Los siguientes tienen hash bcrypt legacy que NO funciona para login (solo para datos de muestra)
INSERT OR IGNORE INTO users (id, email, name, role, password_hash, mfa_enabled, is_active, created_at, updated_at) VALUES 
  ('admin-001', 'admin@docusentinel.com', 'Administrador Principal', 1, 'pbkdf2:placeholder:0:placeholder', 1, 1, datetime('now'), datetime('now')),
  ('auditor-001', 'auditor@docusentinel.com', 'Auditor de Seguridad', 3, 'pbkdf2:placeholder:0:placeholder', 0, 1, datetime('now'), datetime('now')),
  ('verifier-001', 'verifier@docusentinel.com', 'Verificador de Documentos', 4, 'pbkdf2:placeholder:0:placeholder', 0, 1, datetime('now'), datetime('now')),
  ('user-001', 'user@docusentinel.com', 'Usuario Estándar', 5, 'pbkdf2:placeholder:0:placeholder', 0, 1, datetime('now'), datetime('now'));

-- Documentos de prueba
INSERT OR IGNORE INTO documents (id, name, type, size, hash, encrypted_data, encryption_key_id, metadata, security_level, created_by) VALUES 
  ('doc-001', 'Contrato_Confidencial.pdf', 'application/pdf', 2048576, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60001', 'iv-placeholder-001', 'key-placeholder-001', '{"title":"Contrato de Confidencialidad","description":"Acuerdo de confidencialidad empresarial","category":"legal"}', 'confidential', 'admin-001'),
  ('doc-002', 'Factura_Proveedor.pdf', 'application/pdf', 1024000, 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a10002', 'iv-placeholder-002', 'key-placeholder-002', '{"title":"Factura de Proveedor","description":"Documento financiero mensual","category":"financial"}', 'internal', 'auditor-001'),
  ('doc-003', 'DNI_Juan_Perez.jpg', 'image/jpeg', 512000, '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f0003', 'iv-placeholder-003', 'key-placeholder-003', '{"title":"Documento de Identidad","description":"DNI de Juan Pérez","category":"identity"}', 'confidential', 'superuser');

-- Permisos de prueba
INSERT OR IGNORE INTO permissions (id, user_id, document_id, action, granted_by) VALUES 
  ('perm-001', 'auditor-001', 'doc-001', 'view', 'admin-001'),
  ('perm-002', 'verifier-001', 'doc-003', 'verify', 'superuser'),
  ('perm-003', 'user-001', 'doc-002', 'view', 'auditor-001');

-- Registros de auditoría de prueba
INSERT OR IGNORE INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, previous_hash, current_hash) VALUES 
  ('audit-001', 'superuser', 'LOGIN_SUCCESS', 'session', 'superuser', '{"method":"superuser"}', '127.0.0.1', 'System', 'GENESIS', 'hash_genesis_001'),
  ('audit-002', 'admin-001', 'DOCUMENT_UPLOADED', 'document', 'doc-001', '{"name":"Contrato_Confidencial.pdf","encrypted":true}', '127.0.0.1', 'System', 'hash_genesis_001', 'hash_genesis_002'),
  ('audit-003', 'verifier-001', 'DOCUMENT_VERIFIED', 'verification', 'verif-001', '{"status":"authentic","score":95}', '127.0.0.1', 'System', 'hash_genesis_002', 'hash_genesis_003');