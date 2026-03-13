import { defineConfig } from 'vite'
import build from '@hono/vite-build'

export default defineConfig({
  plugins: [
    build({
      entry: './src/index.tsx',
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
})