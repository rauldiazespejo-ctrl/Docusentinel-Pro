/**
 * Servidor proxy OAuth para completar el login de wrangler automáticamente
 * Expone el callback de OAuth en un puerto accesible externamente
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const PROXY_PORT = 8978
const WRANGLER_CALLBACK_PORT = 8976
const STATE_FILE = '/tmp/oauth_state.json'

let wranglerProcess = null
let oauthUrl = null

// Iniciar wrangler login y capturar la URL OAuth
function startWranglerLogin() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env }
    delete env.CLOUDFLARE_API_TOKEN // Remover token inválido
    
    wranglerProcess = spawn('npx', ['wrangler', 'login'], {
      env,
      cwd: '/home/user/webapp',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    
    let output = ''
    const captureOutput = (data) => {
      output += data.toString()
      const urlMatch = output.match(/https:\/\/dash\.cloudflare\.com\/oauth2\/auth\?[^\s\n]+/)
      if (urlMatch && !oauthUrl) {
        oauthUrl = urlMatch[0]
        writeFileSync(STATE_FILE, JSON.stringify({ oauthUrl, pid: wranglerProcess.pid }))
        console.log('✅ URL OAuth capturada')
        resolve(oauthUrl)
      }
    }
    
    wranglerProcess.stdout.on('data', captureOutput)
    wranglerProcess.stderr.on('data', captureOutput)
    
    wranglerProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Wrangler login completado exitosamente!')
        writeFileSync(STATE_FILE, JSON.stringify({ status: 'completed' }))
      } else {
        console.log(`wrangler login terminó con código ${code}`)
      }
    })
    
    // Timeout para capturar URL
    setTimeout(() => {
      if (!oauthUrl) {
        reject(new Error('Timeout esperando URL OAuth'))
      }
    }, 15000)
  })
}

// Servidor proxy que redirige el callback de Cloudflare al wrangler local
const server = createServer((req, res) => {
  if (req.url === '/') {
    // Página de inicio - mostrar estado
    const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf-8')) : {}
    
    if (state.status === 'completed') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`
        <html><head><title>OAuth Completado</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center">
          <h1>✅ Login Completado</h1>
          <p>Wrangler está autenticado. El despliegue continuará automáticamente.</p>
        </body></html>
      `)
      return
    }
    
    if (!oauthUrl) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`
        <html><head><title>Iniciando...</title>
        <meta http-equiv="refresh" content="2">
        </head>
        <body style="font-family:sans-serif;padding:40px;text-align:center">
          <h1>⏳ Iniciando autorización...</h1>
          <p>Recargando en 2 segundos...</p>
        </body></html>
      `)
      return
    }
    
    // Redirigir a Cloudflare OAuth con callback modificado
    const modifiedUrl = oauthUrl.replace(
      'redirect_uri=http%3A%2F%2Flocalhost%3A8976%2Foauth%2Fcallback',
      `redirect_uri=http%3A%2F%2Flocalhost%3A${PROXY_PORT}%2Foauth%2Fcallback`
    )
    
    res.writeHead(302, { 'Location': modifiedUrl })
    res.end()
    
  } else if (req.url?.startsWith('/oauth/callback')) {
    // Recibir el callback de Cloudflare y redirigirlo al wrangler local
    const callbackUrl = `http://localhost:${WRANGLER_CALLBACK_PORT}/oauth/callback${req.url.substring('/oauth/callback'.length)}`
    
    console.log(`🔄 Redirigiendo callback a wrangler: ${callbackUrl}`)
    
    // Hacer la solicitud al wrangler callback local
    const http = require('http')
    const callbackReq = http.get(callbackUrl, (callbackRes) => {
      let data = ''
      callbackRes.on('data', d => data += d)
      callbackRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`
          <html><head><title>Autorizacion Completada</title></head>
          <body style="font-family:sans-serif;padding:40px;text-align:center;background:#0a0f1e;color:white">
            <h1 style="color:#00e5ff">✅ Autorización completada</h1>
            <p>DocuSentinel PRO se está desplegando en Cloudflare Pages...</p>
            <p style="color:#666">Puedes cerrar esta ventana.</p>
          </body></html>
        `)
      })
    })
    
    callbackReq.on('error', (err) => {
      console.error('Error en callback redirect:', err.message)
      res.writeHead(500)
      res.end('Error: ' + err.message)
    })
    
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PROXY_PORT, '0.0.0.0', async () => {
  console.log(`🌐 Servidor proxy OAuth en http://0.0.0.0:${PROXY_PORT}`)
  
  try {
    await startWranglerLogin()
    console.log(`\n🔗 URL OAuth lista`)
    console.log(`   Visita http://localhost:${PROXY_PORT} para completar el login`)
  } catch (err) {
    console.error('Error iniciando wrangler login:', err.message)
  }
})
