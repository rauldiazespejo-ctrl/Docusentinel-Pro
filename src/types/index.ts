// Tipos principales de DocuSentinel Pro

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mfaEnabled: boolean;
  mfaSecret?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  SUPER_ADMIN = 1,
  ADMIN_DOCUMENTOS = 2,
  AUDITOR = 3,
  VERIFICADOR = 4,
  USUARIO_ESTANDAR = 5
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  hash: string;
  encryptedData: string;
  encryptionKeyId: string;
  metadata: DocumentMetadata;
  permissions: Permission[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  exifData?: Record<string, any>;
  securityLevel: SecurityLevel;
}

export enum SecurityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  SECRET = 'secret'
}

export interface Permission {
  id: string;
  userId: string;
  documentId: string;
  action: PermissionAction;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export enum PermissionAction {
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit',
  DELETE = 'delete',
  SHARE = 'share',
  VERIFY = 'verify'
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  previousHash: string;
  currentHash: string;
}

export interface VerificationResult {
  id: string;
  documentId: string;
  status: VerificationStatus;
  confidenceScore: number;
  findings: Finding[];
  analyzedAt: Date;
  analyzedBy: string;
}

export enum VerificationStatus {
  AUTHENTIC = 'authentic',
  SUSPICIOUS = 'suspicious',
  FRAUDULENT = 'fraudulent',
  INCONCLUSIVE = 'inconclusive'
}

export interface Finding {
  type: FindingType;
  severity: FindingSeverity;
  description: string;
  evidence?: string;
  location?: string;
}

export enum FindingType {
  IMAGE_MANIPULATION = 'image_manipulation',
  TYPOGRAPHY_INCONSISTENCY = 'typography_inconsistency',
  SIGNATURE_MISMATCH = 'signature_mismatch',
  METADATA_ANOMALY = 'metadata_anomaly',
  SECURITY_FEATURE_MISSING = 'security_feature_missing',
  PRINT_SCAN_DETECTED = 'print_scan_detected'
}

export enum FindingSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface MFACredentials {
  type: MFAType;
  secret: string;
  verified: boolean;
}

export enum MFAType {
  TOTP = 'totp',
  WEBAUTHN = 'webauthn',
  SMS = 'sms'
}

export interface EncryptionResult {
  encryptedData: string;
  keyId: string;
  iv: string;
  algorithm: string;
}

export interface DecryptionResult {
  data: string;
  keyId: string;
  algorithm: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Bindings de Cloudflare
export interface CloudflareBindings {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
}