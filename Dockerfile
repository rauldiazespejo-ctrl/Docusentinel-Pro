# ─── DocuSentinel PRO - Dockerfile para Render.com ──────────────────────────
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema para better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

# Copiar package.json
COPY package*.json ./

# Instalar todas las dependencias (necesarias para compilar better-sqlite3)
RUN npm ci

# Copiar código fuente completo
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY public/ ./public/
COPY build-server.mjs ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Compilar el servidor Node.js
RUN node build-server.mjs

# Crear directorio de datos persistentes
RUN mkdir -p /data

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
ENV MIGRATIONS_DIR=/app/migrations
ENV PUBLIC_DIR=/app/public

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist-server/server.mjs"]
