import { EncryptionResult, DecryptionResult } from '../types';

/**
 * Servicio de encriptación híbrida AES-256-GCM + RSA-4096
 * Adaptado para Cloudflare Workers usando Web Crypto API
 */
export class EncryptionService {
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12; // 96 bits para AES-GCM
  
  /**
   * Genera un par de claves RSA para el intercambio seguro
   */
  async generateRSAKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Genera una clave AES-256-GCM para cifrado simétrico
   */
  async generateAESKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encripta datos sensibles usando AES-256-GCM
   */
  async encryptData(data: string, keyId: string): Promise<EncryptionResult> {
    try {
      // Generar clave AES para este documento
      const aesKey = await this.generateAESKey();
      
      // Generar IV aleatorio
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Convertir datos a ArrayBuffer
      const dataBuffer = new TextEncoder().encode(data);
      
      // Encriptar
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        aesKey,
        dataBuffer
      );

      // Exportar clave AES para almacenamiento
      const exportedKey = await crypto.subtle.exportKey('raw', aesKey);
      
      // Encriptar la clave AES con clave maestra (simulado)
      const encryptedKey = await this.encryptKey(exportedKey, keyId);

      return {
        encryptedData: this.arrayBufferToBase64(encryptedData),
        keyId: keyId,
        iv: this.arrayBufferToBase64(iv),
        algorithm: this.ALGORITHM
      };
    } catch (error) {
      throw new Error(`Error al encriptar datos: ${error.message}`);
    }
  }

  /**
   * Desencripta datos usando AES-256-GCM
   */
  async decryptData(encryptedData: string, keyId: string, iv: string): Promise<DecryptionResult> {
    try {
      // Obtener clave AES desencriptada
      const aesKeyData = await this.decryptKey(keyId);
      
      // Importar clave AES
      const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyData,
        { name: this.ALGORITHM, length: this.KEY_LENGTH },
        false,
        ['decrypt']
      );

      // Convertir datos de entrada
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
      const ivBuffer = this.base64ToArrayBuffer(iv);

      // Desencriptar
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: ivBuffer
        },
        aesKey,
        encryptedBuffer
      );

      // Convertir a string
      const decryptedText = new TextDecoder().decode(decryptedData);

      return {
        data: decryptedText,
        keyId: keyId,
        algorithm: this.ALGORITHM
      };
    } catch (error) {
      throw new Error(`Error al desencriptar datos: ${error.message}`);
    }
  }

  /**
   * Encripta una clave simétrica con la clave maestra (simulado)
   */
  private async encryptKey(keyData: ArrayBuffer, keyId: string): Promise<ArrayBuffer> {
    // En producción, esto usaría una clave maestra real almacenada en HSM/Vault
    // Por ahora, simulamos con una función hash
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keyId),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('salt-' + keyId),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    return await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      keyData
    );
  }

  /**
   * Desencripta una clave simétrica con la clave maestra (simulado)
   */
  private async decryptKey(keyId: string): Promise<ArrayBuffer> {
    // En producción, esto recuperaría la clave real del almacenamiento seguro
    // Por ahora, simulamos generando la misma clave
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keyId),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('salt-' + keyId),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Simulamos el proceso de desencriptación
    // En producción, aquí se desencriptaría la clave real
    return await crypto.subtle.exportKey('raw', derivedKey);
  }

  /**
   * Genera hash SHA-256 de un string
   */
  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * Convierte ArrayBuffer a Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convierte Base64 a ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convierte ArrayBuffer a Hex
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Verifica la integridad de datos con HMAC
   */
  async verifyIntegrity(data: string, signature: string, key: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signatureBuffer = this.base64ToArrayBuffer(signature);
      const dataBuffer = encoder.encode(data);

      return await crypto.subtle.verify(
        'HMAC',
        cryptoKey,
        signatureBuffer,
        dataBuffer
      );
    } catch (error) {
      return false;
    }
  }
}