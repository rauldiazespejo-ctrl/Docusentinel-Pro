# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY public/ ./public/
COPY build-server.mjs ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Compilar el servidor
RUN node build-server.mjs

# ─── Production stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar archivos compilados y estáticos
COPY --from=builder /app/dist-server/server.mjs ./dist-server/server.mjs
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/public ./public

# Crear directorio de datos
RUN mkdir -p /data

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
ENV MIGRATIONS_DIR=/app/migrations
ENV PUBLIC_DIR=/app/public

# Exponer puerto
EXPOSE 3000

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S docusentinel -u 1001
RUN chown -R docusentinel:nodejs /data
USER docusentinel

# Comando de inicio
CMD ["node", "dist-server/server.mjs"]
