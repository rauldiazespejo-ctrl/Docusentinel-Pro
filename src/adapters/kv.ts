/**
 * Adaptador de KV Storage que implementa la interfaz KVNamespace de Cloudflare
 * usando Map en memoria (para Vercel Edge) o persistencia en fichero
 */
export class KVAdapter {
  private store: Map<string, { value: string; expires?: number }> = new Map();

  async get(key: string, options?: any): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    if (options?.type === 'json') {
      try { return JSON.parse(entry.value); } catch { return entry.value as any; }
    }
    return entry.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number; expiration?: number }): Promise<void> {
    let expires: number | undefined;
    if (options?.expirationTtl) {
      expires = Date.now() + options.expirationTtl * 1000;
    } else if (options?.expiration) {
      expires = options.expiration * 1000;
    }
    this.store.set(key, { value: typeof value === 'string' ? value : JSON.stringify(value), expires });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }> {
    const keys: { name: string }[] = [];
    for (const key of this.store.keys()) {
      if (!options?.prefix || key.startsWith(options.prefix)) {
        keys.push({ name: key });
      }
      if (options?.limit && keys.length >= options.limit) break;
    }
    return { keys };
  }
}

// Singleton global para que persista entre requests en el mismo proceso
const globalKV = new KVAdapter();
export { globalKV };
