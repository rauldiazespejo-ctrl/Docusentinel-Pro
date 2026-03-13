-- Datos de prueba para DocuSentinel Pro

-- Usuarios de prueba (contraseña: Test123!)
INSERT OR IGNORE INTO users (id, email, name, role, password_hash, mfa_enabled, is_active) VALUES 
  ('admin-001', 'admin@docusentinel.com', 'Administrador Principal', 1, '$2a$12$LQv3c1yqBWLQVdltOqUCaOStxbaSOKRjUuKTPJ7z3KJzJXJ9J1jRy', 1, 1),
  ('auditor-001', 'auditor@docusentinel.com', 'Auditor de Seguridad', 3, '$2a$12$LQv3c1yqBWLQVdltOqUCaOStxbaSOKRjUuKTPJ7z3KJzJXJ9J1jRy', 1, 1),
  ('verifier-001', 'verifier@docusentinel.com', 'Verificador de Documentos', 4, '$2a$12$LQv3c1yqBWLQVdltOqUCaOStxbaSOKRjUuKTPJ7z3KJzJXJ9J1jRy', 1, 1),
  ('user-001', 'user@docusentinel.com', 'Usuario Estándar', 5, '$2a$12$LQv3c1yqBWLQVdltOqUCaOStxbaSOKRjUuKTPJ7z3KJzJXJ9J1jRy', 1, 1);

-- Documentos de prueba (datos cifrados simulados)
INSERT OR IGNORE INTO documents (id, name, type, size, hash, encrypted_data, encryption_key_id, metadata, security_level, created_by) VALUES 
  ('doc-001', 'Contrato_Confidencial.pdf', 'application/pdf', 2048576, 'sha256:a1b2c3d4e5f6', 'ENCRYPTED_DATA_001', 'key-001', '{"title":"Contrato de Confidencialidad","description":"Acuerdo de confidencialidad empresarial","category":"legal","securityLevel":"confidential"}', 'confidential', 'admin-001'),
  ('doc-002', 'Factura_Proveedor.pdf', 'application/pdf', 1024000, 'sha256:f6e5d4c3b2a1', 'ENCRYPTED_DATA_002', 'key-002', '{"title":"Factura de Proveedor","description":"Documento financiero mensual","category":"financial","securityLevel":"internal"}', 'internal', 'auditor-001'),
  ('doc-003', 'DNI_Juan_Perez.jpg', 'image/jpeg', 512000, 'sha256:1a2b3c4d5e6f', 'ENCRYPTED_DATA_003', 'key-003', '{"title":"Documento de Identidad","description":"DNI de Juan Pérez","category":"identity","securityLevel":"confidential"}', 'confidential', 'verifier-001');

-- Permisos de prueba
INSERT OR IGNORE INTO permissions (id, user_id, document_id, action, granted_by) VALUES 
  ('perm-001', 'auditor-001', 'doc-001', 'view', 'admin-001'),
  ('perm-002', 'verifier-001', 'doc-003', 'verify', 'admin-001'),
  ('perm-003', 'user-001', 'doc-002', 'view', 'auditor-001');

-- Sesiones de prueba (expiran en 24 horas)
INSERT OR IGNORE INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent) VALUES 
  ('session-001', 'admin-001', 'HASH_TOKEN_ADMIN_001', datetime('now', '+1 day'), '192.168.1.100', 'Mozilla/5.0 Test Browser'),
  ('session-002', 'auditor-001', 'HASH_TOKEN_AUDITOR_001', datetime('now', '+1 day'), '192.168.1.101', 'Mozilla/5.0 Test Browser'),
  ('session-003', 'verifier-001', 'HASH_TOKEN_VERIFIER_001', datetime('now', '+1 day'), '192.168.1.102', 'Mozilla/5.0 Test Browser');

-- Registros de auditoría de prueba
INSERT OR IGNORE INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, previous_hash, current_hash) VALUES 
  ('audit-001', 'admin-001', 'LOGIN_SUCCESS', 'user', 'admin-001', '{"method":"password","mfa_verified":true}', '192.168.1.100', 'Mozilla/5.0 Test Browser', 'GENESIS', 'SHA256_HASH_001'),
  ('audit-002', 'auditor-001', 'DOCUMENT_VIEW', 'document', 'doc-001', '{"action":"view","result":"success"}', '192.168.1.101', 'Mozilla/5.0 Test Browser', 'SHA256_HASH_001', 'SHA256_HASH_002'),
  ('audit-003', 'verifier-001', 'VERIFICATION_REQUEST', 'document', 'doc-003', '{"type":"authenticity_check","status":"pending"}', '192.168.1.102', 'Mozilla/5.0 Test Browser', 'SHA256_HASH_002', 'SHA256_HASH_003');