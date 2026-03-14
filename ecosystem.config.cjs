module.exports = {
  apps: [
    {
      name: 'docusentinel-pro',
      script: 'dist-server/server.mjs',
      interpreter: 'node',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATA_DIR: '/home/user/webapp/data',
        MIGRATIONS_DIR: '/home/user/webapp/migrations',
        PUBLIC_DIR: '/home/user/webapp/public',
        JWT_SECRET: 'docusentinel-jwt-secret-produccion-2024-seguro-min32chars',
        ENCRYPTION_KEY: 'docusentinel-encryption-key-prod-2024-32bytes!!',
        SUPERUSER_PASSWORD: 'DocuSentinel@2024!Admin'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
