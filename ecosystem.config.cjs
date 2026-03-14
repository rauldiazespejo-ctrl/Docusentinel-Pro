module.exports = {
  apps: [
    {
      name: 'docusentinel-pro',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=docusentinel-pro --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        CLOUDFLARE_API_TOKEN: 'wR4EdifJQVqR1cbGnq9pJ8-jcRI55ZfihlDuiTFw'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
