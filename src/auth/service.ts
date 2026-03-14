import { SUPERUSER_CONFIG } from '../config/superuser';

/**
 * Servicio de autenticación - Producción
 * Usa Web Crypto API nativa (compatible con Cloudflare Workers)
 */
export class AuthService {

  // ─── TOTP ────────────────────────────────────────────────────────

  async generateTOTPSecret(email: string): Promise<{ secret: string; qrCode: string }> {
    const secret = this.generateBase32Secret();
    const issuer = 'DocuSentinel PRO';
    const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
    return { secret, qrCode };
  }

  async verifyTOTP(token: string, secret: string): Promise<boolean> {
    if (!token || !secret) return false;
    token = token.replace(/\s/g, '');
    if (!/^\d{6}$/.test(token)) return false;

    const currentStep = Math.floor(Date.now() / 1000 / 30);
    // Allow ±1 time window
    for (let i = -1; i <= 1; i++) {
      const expected = await this.generateTOTPToken(secret, currentStep + i);
      if (this.safeCompare(token, expected)) return true;
    }
    return false;
  }

  private async generateTOTPToken(secret: string, timeStep: number): Promise<string> {
    const keyBytes = this.base32Decode(secret);
    const counter = new Uint8Array(8);
    const view = new DataView(counter.buffer);
    // Big-endian 64-bit counter
    view.setUint32(0, Math.floor(timeStep / 2 ** 32), false);
    view.setUint32(4, timeStep >>> 0, false);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, counter);
    const hash = new Uint8Array(sig);
    const offset = hash[hash.length - 1] & 0x0f;
    const code = (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    ) % 1000000;
    return code.toString().padStart(6, '0');
  }

  private generateBase32Secret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    let result = '';
    for (const b of bytes) result += chars[b % 32];
    return result;
  }

  private base32Decode(base32: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = base32.toUpperCase().replace(/=+$/, '');
    let bits = 0, value = 0;
    const output: number[] = [];
    for (const char of clean) {
      const idx = chars.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(output);
  }

  // ─── PASSWORD ────────────────────────────────────────────────────

  /**
   * Hash de contraseña con PBKDF2-SHA256 (Web Crypto API nativa)
   * Formato: pbkdf2:salt_hex:iterations:hash_hex
   */
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100000;

    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password),
      'PBKDF2', false, ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial, 256
    );

    const saltHex = this.bufToHex(salt);
    const hashHex = this.bufToHex(new Uint8Array(bits));
    return `pbkdf2:${saltHex}:${iterations}:${hashHex}`;
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      // Soporte para hashes legacy bcrypt del seed (formato $2a$...)
      if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
        // bcrypt no disponible en Workers; comparación directa para seed de demo
        // En producción real, usar bcrypt worker externo o rehashear en primer login
        return false; // Los usuarios del seed no podrán loguearse (solo superuser y nuevos registros)
      }

      if (!storedHash.startsWith('pbkdf2:')) return false;
      const parts = storedHash.split(':');
      if (parts.length !== 4) return false;

      const [, saltHex, iterStr, hashHex] = parts;
      const iterations = parseInt(iterStr);
      const salt = this.hexToBuf(saltHex);
      const expectedHash = this.hexToBuf(hashHex);

      const keyMaterial = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password),
        'PBKDF2', false, ['deriveBits']
      );

      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        keyMaterial, 256
      );

      const computedHash = new Uint8Array(bits);
      return this.safeCompare(
        this.bufToHex(computedHash),
        this.bufToHex(expectedHash)
      );
    } catch {
      return false;
    }
  }

  // ─── JWT ─────────────────────────────────────────────────────────

  async generateJWT(payload: any, secret: string, expiresIn = 86400): Promise<string> {
    const header = this.b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const body = this.b64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresIn }));
    const sig = await this.hmacSign(`${header}.${body}`, secret);
    return `${header}.${body}.${sig}`;
  }

  async verifyJWT(token: string, secret: string): Promise<any> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Token inválido');

    const [header, body, sig] = parts;
    const expectedSig = await this.hmacSign(`${header}.${body}`, secret);
    if (!this.safeCompare(sig, expectedSig)) throw new Error('Firma inválida');

    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expirado');
    }
    return payload;
  }

  private async hmacSign(data: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    return this.b64url(new Uint8Array(sig));
  }

  // ─── HASH ────────────────────────────────────────────────────────

  async hashData(data: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return this.bufToHex(new Uint8Array(buf));
  }

  async hashBuffer(buffer: ArrayBuffer): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', buffer);
    return this.bufToHex(new Uint8Array(buf));
  }

  // ─── SUPERUSER ───────────────────────────────────────────────────

  async authenticateSuperuser(email: string, password: string): Promise<{ user: any; token: string } | null> {
    const defaultPass = 'DocuSentinel@2024!Admin';
    return this.authenticateSuperuserWithPassword(email, password, defaultPass,
      'docusentinel-dev-secret-change-in-production-minimum-32-chars');
  }

  async authenticateSuperuserWithPassword(email: string, password: string, expectedPassword: string, jwtSecret: string): Promise<{ user: any; token: string } | null> {
    if (email !== SUPERUSER_CONFIG.email || password !== expectedPassword) return null;
    const token = await this.generateJWT(
      { userId: 'superuser', email, role: 1, name: SUPERUSER_CONFIG.name, isSuperuser: true },
      jwtSecret
    );
    return {
      user: { id: 'superuser', email, name: SUPERUSER_CONFIG.name, role: 1, mfaEnabled: false },
      token
    };
  }

  // ─── UTILS ───────────────────────────────────────────────────────

  private b64url(data: string | Uint8Array): string {
    const str = data instanceof Uint8Array
      ? String.fromCharCode(...data)
      : data;
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private bufToHex(buf: Uint8Array): string {
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private hexToBuf(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  }

  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return result === 0;
  }
}
