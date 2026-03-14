/**
 * Adaptador de R2 Storage que implementa la interfaz R2Bucket de Cloudflare
 * Almacena archivos en memoria (para Vercel) o en sistema de archivos local
 */
export class R2Adapter {
  private store: Map<string, { body: ArrayBuffer; metadata: any }> = new Map();

  async put(key: string, body: ArrayBuffer | ReadableStream | string, options?: any): Promise<void> {
    let buffer: ArrayBuffer;
    if (typeof body === 'string') {
      buffer = new TextEncoder().encode(body).buffer;
    } else if (body instanceof ArrayBuffer) {
      buffer = body;
    } else {
      // ReadableStream
      const reader = (body as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      buffer = result.buffer;
    }
    this.store.set(key, {
      body: buffer,
      metadata: options?.httpMetadata || {}
    });
  }

  async get(key: string): Promise<{ body: ReadableStream; arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: any } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    const buffer = entry.body;
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        }
      }),
      arrayBuffer: async () => buffer,
      httpMetadata: entry.metadata
    };
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options?: { prefix?: string; limit?: number }): Promise<{ objects: { key: string }[] }> {
    const objects: { key: string }[] = [];
    for (const key of this.store.keys()) {
      if (!options?.prefix || key.startsWith(options.prefix)) {
        objects.push({ key });
      }
      if (options?.limit && objects.length >= options.limit) break;
    }
    return { objects };
  }

  async head(key: string): Promise<{ key: string; httpMetadata?: any } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    return { key, httpMetadata: entry.metadata };
  }
}

// Singleton global
const globalR2 = new R2Adapter();
export { globalR2 };
