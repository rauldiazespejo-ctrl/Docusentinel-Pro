/**
 * Adaptador de base de datos usando better-sqlite3 (síncrono, sin módulos nativos problemáticos)
 * Implementa la interfaz D1Database de Cloudflare
 */
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

interface D1Result {
  results?: any[];
  success: boolean;
  error?: string;
  meta: {
    last_row_id?: number;
    changes?: number;
    duration?: number;
  };
}

export class SQLiteAdapter {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  prepare(sql: string): SQLitePreparedStatement {
    return new SQLitePreparedStatement(this.db, sql)
  }

  exec(sql: string): void {
    const statements = sql.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
    for (const stmt of statements) {
      try {
        this.db.exec(stmt)
      } catch (e: any) {
        if (!e.message?.includes('already exists') && !e.message?.includes('duplicate column')) {
          console.error('SQL exec error:', e.message?.substring(0, 100))
        }
      }
    }
  }

  async batch(statements: SQLitePreparedStatement[]): Promise<D1Result[]> {
    const results: D1Result[] = []
    const batchFn = this.db.transaction(() => {
      for (const stmt of statements) {
        results.push(stmt.runSync())
      }
    })
    batchFn()
    return results
  }
}

class SQLitePreparedStatement {
  private db: Database.Database
  private sql: string
  private params: any[] = []

  constructor(db: Database.Database, sql: string) {
    this.db = db
    this.sql = sql
  }

  bind(...values: any[]): SQLitePreparedStatement {
    const stmt = new SQLitePreparedStatement(this.db, this.sql)
    stmt.params = values
    return stmt
  }

  async first<T = any>(column?: string): Promise<T | null> {
    try {
      const stmt = this.db.prepare(this.sql)
      const row = stmt.get(...this.params) as any
      if (!row) return null
      if (column) return row[column] ?? null
      return row as T
    } catch (e: any) {
      console.error('SQLite first() error:', e.message?.substring(0, 100))
      return null
    }
  }

  runSync(): D1Result {
    try {
      const stmt = this.db.prepare(this.sql)
      const info = stmt.run(...this.params)
      return {
        success: true,
        results: [],
        meta: {
          last_row_id: Number(info.lastInsertRowid),
          changes: info.changes,
          duration: 0
        }
      }
    } catch (e: any) {
      console.error('SQLite runSync() error:', e.message?.substring(0, 100))
      throw e
    }
  }

  async run(): Promise<D1Result> {
    return this.runSync()
  }

  async all<T = any>(): Promise<{ results: T[]; success: boolean; meta: any }> {
    try {
      const stmt = this.db.prepare(this.sql)
      const rows = stmt.all(...this.params) as T[]
      return {
        results: rows,
        success: true,
        meta: { duration: 0 }
      }
    } catch (e: any) {
      console.error('SQLite all() error:', e.message?.substring(0, 100))
      return { results: [], success: false, meta: {} }
    }
  }
}
