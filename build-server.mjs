import * as esbuild from 'esbuild'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Build en formato ESM con better-sqlite3 como externo
await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: resolve(__dirname, 'dist-server/server.mjs'),
  external: [
    'fsevents',
    'better-sqlite3',
    'bcryptjs',
    // Node built-ins - keep external
    'node:fs',
    'node:path',
    'node:url',
    'node:module',
    'node:crypto',
    'node:stream',
    'node:buffer',
    'node:util',
    'node:events',
    'node:os',
    'node:http',
    'node:https',
    'node:net',
    'node:tls',
    'node:zlib'
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  logLevel: 'info',
  sourcemap: false,
  minify: false,
  treeShaking: true,
})

console.log('✅ Server build completado: dist-server/server.mjs')
