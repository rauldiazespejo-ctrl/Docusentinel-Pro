import { EncryptionResult, DecryptionResult } from '../types';

/**
 * Servicio de encriptación AES-256-GCM
 * 100% Web Crypto API – compatible con Cloudflare Workers
 */
export class EncryptionService {
  private readonly ALGO = 'AES-GCM';
  private readonly KEY_BITS = 256;
  private readonly IV_BYTES = 12; // 96-bit IV para AES-GCM

  // ─── AES KEY ─────────────────────────────────────────────────────

  private async generateAESKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey({ name: this.ALGO, length: this.KEY_BITS }, true, ['encrypt','decrypt']);
  }

  private async keyFromHex(hex: string): Promise<CryptoKey> {
    const raw = this.hexToBytes(hex);
    return crypto.subtle.importKey('raw', raw, { name: this.ALGO, length: this.KEY_BITS }, false, ['decrypt']);
  }

  // ─── ENCRYPT BUFFER (producción) ─────────────────────────────────

  /**
   * Cifra un ArrayBuffer con AES-256-GCM.
   * Devuelve ciphertext (ArrayBuffer), IV (hex) y clave (hex).
   * En producción, la clave debería cifrarse con un KEK antes de almacenarse.
   */
  async encryptBuffer(plaintext: ArrayBuffer): Promise<{ ciphertext: ArrayBuffer; iv: string; keyHex: string }> {
    const key = await this.generateAESKey();
    const iv  = crypto.getRandomValues(new Uint8Array(this.IV_BYTES));

    const ciphertext = await crypto.subtle.encrypt({ name: this.ALGO, iv }, key, plaintext);

    const rawKey = await crypto.subtle.exportKey('raw', key);
    return {
      ciphertext,
      iv:     this.bytesToHex(iv),
      keyHex: this.bytesToHex(new Uint8Array(rawKey))
    };
  }

  /**
   * Descifra un ArrayBuffer cifrado con AES-256-GCM.
   */
  async decryptBuffer(ciphertext: ArrayBuffer, keyHex: string, ivHex: string): Promise<ArrayBuffer> {
    const key = await this.keyFromHex(keyHex);
    const iv  = this.hexToBytes(ivHex);
    return crypto.subtle.decrypt({ name: this.ALGO, iv }, key, ciphertext);
  }

  // ─── ENCRYPT STRING (legacy / compatibilidad) ─────────────────────

  async encryptData(data: string, keyId: string): Promise<EncryptionResult> {
    const encoder = new TextEncoder();
    const { ciphertext, iv, keyHex } = await this.encryptBuffer(encoder.encode(data).buffer);
    return {
      encryptedData: this.bytesToBase64(new Uint8Array(ciphertext)),
      keyId: keyHex,
      iv,
      algorithm: this.ALGO
    };
  }

  async decryptData(encryptedData: string, keyId: string, iv: string): Promise<DecryptionResult> {
    const cipherBytes = this.base64ToBytes(encryptedData).buffer;
    const plain = await this.decryptBuffer(cipherBytes, keyId, iv);
    return {
      data: new TextDecoder().decode(plain),
      keyId,
      algorithm: this.ALGO
    };
  }

  // ─── HASH ─────────────────────────────────────────────────────────

  async hashData(data: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return this.bytesToHex(new Uint8Array(buf));
  }

  async hashBuffer(buffer: ArrayBuffer): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', buffer);
    return this.bytesToHex(new Uint8Array(buf));
  }

  /** HMAC-SHA256 para verificar integridad */
  async verifyIntegrity(data: string, signature: string, key: string): Promise<boolean> {
    try {
      const cryptoKey = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(key),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
      );
      return crypto.subtle.verify('HMAC', cryptoKey, this.base64ToBytes(signature), new TextEncoder().encode(data));
    } catch {
      return false;
    }
  }

  // ─── RSA KEY PAIR (para futures KMS) ─────────────────────────────

  async generateRSAKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 4096, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' },
      true, ['encrypt','decrypt']
    );
  }

  // ─── HELPERS ──────────────────────────────────────────────────────

  bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  hexToBytes(hex: string): Uint8Array {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) out[i/2] = parseInt(hex.slice(i, i+2), 16);
    return out;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let str = '';
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str);
  }

  private base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
}
