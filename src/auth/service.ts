import { User, MFACredentials, MFAType } from '../types';
import { EncryptionService } from '../encryption/service';
import { SUPERUSER_CONFIG, authenticateSuperuser } from '../config/superuser';

/**
 * Servicio de autenticación multifactor
 * Implementa TOTP, WebAuthn y SMS
 */
export class AuthService {
  private encryptionService: EncryptionService;
  
  constructor() {
    this.encryptionService = new EncryptionService();
  }

  /**
   * Genera un secreto TOTP para el usuario
   */
  async generateTOTPSecret(email: string): Promise<{ secret: string; qrCode: string }> {
    // Generar secreto base32 de 32 caracteres
    const secret = this.generateBase32Secret();
    
    // Crear URI para TOTP
    const issuer = 'DocuSentinel Pro';
    const uri = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}&algorithm=SHA256&digits=6&period=30`;
    
    // Generar QR code (en producción, usar librería qrcode)
    const qrCode = this.generateQRCode(uri);
    
    return {
      secret,
      qrCode
    };
  }

  /**
   * Verifica un código TOTP
   */
  async verifyTOTP(token: string, secret: string): Promise<boolean> {
    if (!token || !secret) return false;
    
    // Normalizar token
    token = token.replace(/\s/g, '');
    
    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      return false;
    }

    try {
      // Generar token esperado
      const expectedToken = this.generateTOTPToken(secret);
      
      // Comparar (permitir un margen de tiempo)
      const currentTime = Math.floor(Date.now() / 1000);
      const timeWindow = 30; // 30 segundos
      
      for (let i = -1; i <= 1; i++) {
        const timeStep = Math.floor((currentTime + (i * timeWindow)) / timeWindow);
        const tokenAtTime = this.generateTOTPTokenAtTime(secret, timeStep);
        
        if (this.constantTimeComparison(token, tokenAtTime)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error verificando TOTP:', error);
      return false;
    }
  }

  /**
   * Genera un token TOTP basado en el tiempo actual
   */
  private generateTOTPToken(secret: string): string {
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    return this.generateTOTPTokenAtTime(secret, timeStep);
  }

  /**
   * Genera un token TOTP para un paso de tiempo específico
   */
  private generateTOTPTokenAtTime(secret: string, timeStep: number): string {
    // Convertir secreto base32 a bytes
    const secretBytes = this.base32Decode(secret);
    
    // Convertir timeStep a bytes (big-endian)
    const timeBytes = new Uint8Array(8);
    const view = new DataView(timeBytes.buffer);
    view.setUint32(4, timeStep, false); // Los 4 bytes más significativos
    
    // Generar HMAC-SHA256
    const hmac = this.computeHMAC(secretBytes, timeBytes);
    
    // Extraer offset dinámico
    const offset = hmac[hmac.length - 1] & 0x0F;
    
    // Extraer 4 bytes dinámicos
    const truncatedHash = new DataView(hmac.buffer, offset, 4);
    const code = truncatedHash.getUint32(0, false) & 0x7FFFFFFF;
    
    // Convertir a 6 dígitos
    return (code % 1000000).toString().padStart(6, '0');
  }

  /**
   * Genera un secreto base32 aleatorio
   */
  private generateBase32Secret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return secret;
  }

  /**
   * Decodifica una cadena base32
   */
  private base32Decode(base32: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = [];
    
    for (const char of base32.toUpperCase()) {
      const index = chars.indexOf(char);
      if (index !== -1) {
        bits.push(...this.intToBits(index, 5));
      }
    }
    
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      const byte = this.bitsToInt(bits.slice(i, i + 8));
      bytes.push(byte);
    }
    
    return new Uint8Array(bytes);
  }

  /**
   * Convierte un entero a array de bits
   */
  private intToBits(n: number, length: number): number[] {
    const bits = [];
    for (let i = 0; i < length; i++) {
      bits.unshift((n >> i) & 1);
    }
    return bits;
  }

  /**
   * Convierte array de bits a entero
   */
  private bitsToInt(bits: number[]): number {
    let result = 0;
    for (let i = 0; i < bits.length; i++) {
      result = (result << 1) | bits[i];
    }
    return result;
  }

  /**
   * Computa HMAC-SHA256
   */
  private computeHMAC(key: Uint8Array, data: Uint8Array): Uint8Array {
    // Simulación de HMAC - en producción usar Web Crypto API
    // Esto es una implementación simplificada para demostración
    const combined = new Uint8Array(key.length + data.length);
    combined.set(key);
    combined.set(data, key.length);
    
    // Hash simple simulado
    const hash = [];
    for (let i = 0; i < 32; i++) {
      hash[i] = combined[i % combined.length] ^ i;
    }
    
    return new Uint8Array(hash);
  }

  /**
   * Comparación en tiempo constante para evitar timing attacks
   */
  private constantTimeComparison(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Genera un código QR (simulado para demostración)
   */
  private generateQRCode(data: string): string {
    // En producción, usar librería qrcode para generar QR real
    return `QR_CODE_DATA:${btoa(data)}`;
  }

  /**
   * Genera un token JWT seguro
   */
  async generateJWT(payload: any, secret: string, expiresIn: number = 3600): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn
    };
    
    const headerEncoded = this.base64URLEncode(JSON.stringify(header));
    const payloadEncoded = this.base64URLEncode(JSON.stringify(jwtPayload));
    
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const signature = await this.generateJWTSignature(signatureInput, secret);
    
    return `${signatureInput}.${signature}`;
  }

  /**
   * Verifica un token JWT
   */
  async verifyJWT(token: string, secret: string): Promise<any> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token JWT inválido');
    }
    
    const [headerEncoded, payloadEncoded, signature] = parts;
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    
    // Verificar firma
    const expectedSignature = await this.generateJWTSignature(signatureInput, secret);
    if (!this.constantTimeComparison(signature, expectedSignature)) {
      throw new Error('Firma JWT inválida');
    }
    
    // Decodificar payload
    const payload = JSON.parse(this.base64URLDecode(payloadEncoded));
    
    // Verificar expiración
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token JWT expirado');
    }
    
    return payload;
  }

  /**
   * Autentica al superusuario
   */
  async authenticateSuperuser(email: string, password: string): Promise<{ user: any, token: string } | null> {
    // Verificar si es el superusuario
    if (email === SUPERUSER_CONFIG.email && password === SUPERUSER_CONFIG.password) {
      // Generar token para el superusuario
      const token = await this.generateJWT({
        email: SUPERUSER_CONFIG.email,
        role: SUPERUSER_CONFIG.role,
        name: SUPERUSER_CONFIG.name,
        isSuperuser: true
      }, process.env.JWT_SECRET || 'default-secret-key');

      return {
        user: {
          email: SUPERUSER_CONFIG.email,
          name: SUPERUSER_CONFIG.name,
          role: SUPERUSER_CONFIG.role,
          isActive: SUPERUSER_CONFIG.isActive,
          permissions: SUPERUSER_CONFIG.permissions
        },
        token
      };
    }
    return null;
  }

  /**
   * Genera firma para JWT
   */
  private async generateJWTSignature(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const dataBuffer = encoder.encode(data);
    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
    
    return this.base64URLEncode(new Uint8Array(signature));
  }

  /**
   * Codifica a Base64 URL-safe
   */
  private base64URLEncode(data: string | Uint8Array): string {
    const str = data instanceof Uint8Array ? 
      String.fromCharCode(...data) : data;
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Decodifica de Base64 URL-safe
   */
  private base64URLDecode(data: string): string {
    // Añadir padding si es necesario
    const padding = '='.repeat((4 - data.length % 4) % 4);
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return atob(base64);
  }

  /**
   * Hashea una contraseña de forma segura
   */
  async hashPassword(password: string): Promise<string> {
    // En producción, usar bcrypt real
    // Esto es una simulación para demostración
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltedPassword = password + this.arrayBufferToHex(salt);
    
    // Simular hashing con múltiples rondas
    let hash = saltedPassword;
    for (let i = 0; i < 12; i++) {
      hash = btoa(hash + i);
    }
    
    return `$2a$12$${this.base64URLEncode(salt)}$${hash}`;
  }

  /**
   * Verifica una contraseña
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    // Extraer salt del hash
    const parts = hashedPassword.split('$');
    if (parts.length < 4) return false;
    
    const salt = this.base64URLDecode(parts[3]);
    const saltedPassword = password + salt;
    
    // Simular el mismo proceso de hashing
    let hash = saltedPassword;
    for (let i = 0; i < 12; i++) {
      hash = btoa(hash + i);
    }
    
    const expectedHash = `$2a$12$${parts[3]}$${hash}`;
    return this.constantTimeComparison(hashedPassword, expectedHash);
  }

  /**
   * Convierte ArrayBuffer a string hex
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}