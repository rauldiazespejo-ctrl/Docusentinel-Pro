// Configuración de desarrollo local sin Cloudflare
// Este archivo configura una versión simplificada para desarrollo local

export interface LocalDB {
  users: any[];
  documents: any[];
  permissions: any[];
  audit_logs: any[];
  verifications: any[];
  sessions: any[];
}

// Base de datos en memoria para desarrollo
export const localDB: LocalDB = {
  users: [
    {
      id: 'admin-001',
      email: 'admin@docusentinel.com',
      name: 'Administrador Principal',
      role: 1,
      password_hash: '$2a$12$LQv3c1yqBWLQVdltOqUCaOStxbaSOKRjUuKTPJ7z3KJzJXJ9J1jRy',
      mfa_enabled: true,
      mfa_secret: 'JBSWY3DPEHPK3PXP',
      mfa_type: 'totp',
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }
  ],
  documents: [],
  permissions: [],
  audit_logs: [],
  verifications: [],
  sessions: []
};

// Simulación de servicios de Cloudflare para desarrollo
export class LocalServices {
  static async simulateD1Query(query: string, params: any[] = []) {
    // Simular respuesta de D1
    return {
      results: [],
      success: true
    };
  }

  static async simulateKVGet(key: string) {
    // Simular respuesta de KV
    return null;
  }

  static async simulateKVPut(key: string, value: string) {
    // Simular guardado en KV
    return true;
  }

  static async simulateR2Put(key: string, data: ArrayBuffer) {
    // Simular guardado en R2
    return { key };
  }

  static async simulateR2Get(key: string) {
    // Simular obtención de R2
    return null;
  }
}

// Variables de entorno para desarrollo
export const localEnv = {
  JWT_SECRET: 'development-jwt-secret-change-in-production',
  ENCRYPTION_KEY: 'development-encryption-key-change-in-production',
  MFA_SECRET: 'development-mfa-secret-change-in-production'
};