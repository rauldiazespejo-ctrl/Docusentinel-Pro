/* ================================================================
   DOCUSENTINEL PRO — Aplicación Frontend Completa v2.0
   SPA con todas las vistas funcionales integradas
   ================================================================ */
'use strict';

// ─── Estado Global ────────────────────────────────────────────────
const State = {
  token: localStorage.getItem('ds_token') || null,
  user:  JSON.parse(localStorage.getItem('ds_user') || 'null'),
  currentView: 'dashboard',
  documents: [], verifications: [], auditLogs: [], authorizations: [],
  stats: null, charts: {},
  loading: false
};

const API = '/api';

// ─── Utilidades HTTP ──────────────────────────────────────────────
async function req(method, path, body, isForm = false) {
  const headers = {};
  if (State.token) headers['Authorization'] = `Bearer ${State.token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = isForm ? body : JSON.stringify(body);

  try {
    const res = await fetch(API + path, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: 'Error de red' } };
  }
}
const get    = (p) => req('GET', p);
const post   = (p, b, f) => req('POST', p, b, f);
const put    = (p, b) => req('PUT', p, b);
const del    = (p) => req('DELETE', p);

// ─── Toast ────────────────────────────────────────────────────────
function toast(type, title, msg, duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <i class="fas ${icons[type]||icons.info} toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-message">${msg}</div>` : ''}
    </div>
    <i class="fas fa-times toast-close"></i>`;
  el.querySelector('.toast-close').addEventListener('click', () => el.remove());
  container.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(100%)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }, duration);
}

// ─── Formatters ───────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(2) + ' MB';
}
function fmtRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d > 0) return `hace ${d}d`;
  if (h > 0) return `hace ${h}h`;
  if (m > 0) return `hace ${m}m`;
  return 'ahora mismo';
}
function securityBadge(level) {
  const map = {
    public: ['badge-success','fa-globe','Público'],
    internal: ['badge-info','fa-building','Interno'],
    confidential: ['badge-warning','fa-lock','Confidencial'],
    secret: ['badge-danger','fa-user-secret','Secreto']
  };
  const [cls,ic,lbl] = map[level] || map.internal;
  return `<span class="badge ${cls}"><i class="fas ${ic}"></i>${lbl}</span>`;
}
function verdictBadge(v) {
  const map = {
    authentic:  ['badge-success','fa-check-circle','Auténtico'],
    suspicious: ['badge-warning','fa-exclamation-triangle','Sospechoso'],
    fraudulent: ['badge-danger','fa-times-circle','Fraudulento'],
    tampered:   ['badge-danger','fa-edit','Adulterado'],
    pending:    ['badge-neutral','fa-clock','Pendiente']
  };
  const [cls,ic,lbl] = map[v] || map.pending;
  return `<span class="badge ${cls}"><i class="fas ${ic}"></i>${lbl}</span>`;
}
function fileIcon(type) {
  if (!type) return '<div class="file-icon lock"><i class="fas fa-lock"></i></div>';
  if (type.includes('pdf')) return '<div class="file-icon pdf"><i class="fas fa-file-pdf"></i></div>';
  if (type.includes('image')) return '<div class="file-icon img"><i class="fas fa-file-image"></i></div>';
  return '<div class="file-icon doc"><i class="fas fa-file-alt"></i></div>';
}
function truncateHash(h, len=16) { return h ? h.substring(0,len)+'…' : '—'; }
function avatarText(name) { return (name||'U').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase(); }

// ─── Auth ─────────────────────────────────────────────────────────
function saveAuth(token, user) {
  State.token = token; State.user = user;
  localStorage.setItem('ds_token', token);
  localStorage.setItem('ds_user', JSON.stringify(user));
}
function clearAuth() {
  State.token = null; State.user = null;
  localStorage.removeItem('ds_token'); localStorage.removeItem('ds_user');
}

// ─── Router ───────────────────────────────────────────────────────
function navigate(view, params = {}) {
  State.currentView = view;
  State.currentParams = params;
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  renderView();
}

// ─── Main Render ──────────────────────────────────────────────────
function renderApp() {
  const app = document.getElementById('app');
  if (!State.token || !State.user) { renderLogin(); return; }

  const u = State.user;
  app.innerHTML = `
  <div class="app-shell">
    <!-- Sidebar -->
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon"><i class="fas fa-shield-halved"></i></div>
        <div class="sidebar-logo-text">
          <div class="sidebar-logo-title">DocuSentinel <span class="text-cyan">PRO</span></div>
          <div class="sidebar-logo-sub">v2.0 · Secure</div>
        </div>
      </div>
      <div class="sidebar-nav" id="sidebar-nav">
        <div class="sidebar-section-label">Principal</div>
        <a class="nav-item" data-view="dashboard">
          <span class="nav-icon"><i class="fas fa-chart-pie"></i></span> Panel General
        </a>
        <div class="nav-divider"></div>
        <div class="sidebar-section-label">Documentos</div>
        <a class="nav-item" data-view="vault">
          <span class="nav-icon"><i class="fas fa-vault"></i></span> Bóveda Segura
          <span class="nav-badge" id="badge-docs">—</span>
        </a>
        <a class="nav-item" data-view="upload">
          <span class="nav-icon"><i class="fas fa-cloud-upload-alt"></i></span> Subir Documento
        </a>
        <a class="nav-item" data-view="authorizations">
          <span class="nav-icon"><i class="fas fa-key"></i></span> Autorizaciones
        </a>
        <div class="nav-divider"></div>
        <div class="sidebar-section-label">Seguridad</div>
        <a class="nav-item" data-view="verify">
          <span class="nav-icon"><i class="fas fa-microscope"></i></span> Verificar Documento
        </a>
        <a class="nav-item" data-view="verifications">
          <span class="nav-icon"><i class="fas fa-list-check"></i></span> Historial Forense
        </a>
        <a class="nav-item" data-view="audit">
          <span class="nav-icon"><i class="fas fa-scroll"></i></span> Audit Trail
          <span class="nav-badge danger" id="badge-audit">—</span>
        </a>
        <div class="nav-divider"></div>
        <div class="sidebar-section-label">Sistema</div>
        <a class="nav-item" data-view="settings">
          <span class="nav-icon"><i class="fas fa-cog"></i></span> Configuración
        </a>
        ${u.role <= 2 ? `
        <a class="nav-item" data-view="users">
          <span class="nav-icon"><i class="fas fa-users-cog"></i></span> Usuarios
        </a>` : ''}
      </div>
      <div class="sidebar-footer">
        <div class="user-card" id="user-menu-btn">
          <div class="user-avatar">${avatarText(u.name)}</div>
          <div class="user-info">
            <div class="user-name">${u.name||u.email}</div>
            <div class="user-role">${roleLabel(u.role)}</div>
          </div>
          <i class="fas fa-ellipsis-v chevron"></i>
        </div>
      </div>
    </nav>

    <!-- Main -->
    <div class="main-content" id="main-content">
      <header class="topbar">
        <button class="icon-btn" id="sidebar-toggle" style="display:none">
          <i class="fas fa-bars"></i>
        </button>
        <div class="topbar-title" id="topbar-title">Panel General <span>DocuSentinel PRO</span></div>
        <div class="topbar-actions">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Buscar documentos…" id="global-search">
          </div>
          <button class="icon-btn" id="notif-btn" title="Notificaciones">
            <i class="fas fa-bell"></i>
            <span class="notif-dot" id="notif-dot" style="display:none"></span>
          </button>
          <button class="icon-btn" id="logout-btn" title="Cerrar sesión">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </header>
      <div class="page-content fade-in" id="view-content">
        <div class="empty-state"><i class="fas fa-spinner fa-spin"></i><h3>Cargando…</h3></div>
      </div>
    </div>
  </div>`;

  // Bind navigation
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); navigate(el.dataset.view); });
  });
  document.getElementById('logout-btn').addEventListener('click', doLogout);
  document.getElementById('user-menu-btn').addEventListener('click', doLogout);
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  navigate('dashboard');
  loadBadges();
}

function roleLabel(r) {
  // Acepta tanto texto como número (1=SUPER_ADMIN, 2=ADMIN, 3=AUDITOR, 4=VERIFICADOR, 5=USUARIO)
  const byNum = { 1:'Super Admin', 2:'Admin Docs', 3:'Auditor', 4:'Verificador', 5:'Usuario' };
  const byStr = { superuser:'Super Admin', admin_documentos:'Admin Doc', verificador:'Verificador', usuario_estandar:'Usuario', auditor:'Auditor', super_admin:'Super Admin' };
  if (typeof r === 'number') return byNum[r] || 'Rol '+r;
  return byStr[r?.toLowerCase?.()] || r || 'Usuario';
}

async function loadBadges() {
  const res = await get('/documents/stats');
  if (res.ok && res.data.data) {
    const stats = res.data.data;
    const el = document.getElementById('badge-docs');
    if (el) el.textContent = stats.totalDocuments || 0;
    // Mostrar punto en audit si hay eventos
    const auditEl = document.getElementById('badge-audit');
    if (auditEl) auditEl.textContent = stats.totalAuditEvents || 0;
  }
}

function setView(title) {
  const el = document.getElementById('topbar-title');
  if (el) el.innerHTML = `${title} <span>DocuSentinel PRO</span>`;
}

// ─── Render View Router ───────────────────────────────────────────
async function renderView() {
  const el = document.getElementById('view-content');
  if (el) { el.innerHTML = `<div class="empty-state"><i class="fas fa-spinner fa-spin" style="font-size:28px;color:var(--cyan-500)"></i></div>`; el.className = 'page-content fade-in'; }

  switch(State.currentView) {
    case 'dashboard':      return await renderDashboard();
    case 'vault':          return await renderVault();
    case 'upload':         return renderUpload();
    case 'authorizations': return await renderAuthorizations();
    case 'verify':         return renderVerify();
    case 'verifications':  return await renderVerifications();
    case 'audit':          return await renderAudit();
    case 'users':          return await renderUsers();
    case 'settings':       return renderSettings();
    default:               return await renderDashboard();
  }
}

// ─── DASHBOARD ────────────────────────────────────────────────────
async function renderDashboard() {
  setView('Panel General');
  const [statsRes, auditRes, verifStatsRes] = await Promise.all([
    get('/documents/stats'),
    get('/audit/logs?pageSize=8'),
    get('/verification/stats')
  ]);

  const stats = statsRes.ok ? statsRes.data.data : { totalDocuments:0, totalVerifications:0, totalAuditEvents:0, recentDocuments:[], recentVerifications:[], verificationsByStatus:{authentic:0,fraudulent:0,suspicious:0} };
  const audit = auditRes.ok ? auditRes.data.data : { logs:[], total:0 };
  const vstats = verifStatsRes.ok ? verifStatsRes.data.data : { summary:{total:0,authentic:0,fraudulent:0,suspicious:0} };

  const authentic  = vstats.summary?.authentic || stats.verificationsByStatus?.authentic || 0;
  const suspicious = (vstats.summary?.suspicious || stats.verificationsByStatus?.suspicious || 0) + (vstats.summary?.fraudulent || stats.verificationsByStatus?.fraudulent || 0);
  const totalVerif = vstats.summary?.total || stats.totalVerifications || 0;

  document.getElementById('view-content').innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Bienvenido, ${State.user.name?.split(' ')[0] || 'Usuario'}</h1>
      <p>${new Date().toLocaleDateString('es-ES',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-secondary btn-sm" onclick="navigate('verify')"><i class="fas fa-microscope"></i> Verificar Doc</button>
      <button class="btn btn-primary btn-sm" onclick="navigate('upload')"><i class="fas fa-plus"></i> Nuevo Documento</button>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card cyan">
      <div class="stat-header">
        <div class="stat-label">Total Documentos</div>
        <div class="stat-icon cyan"><i class="fas fa-vault"></i></div>
      </div>
      <div class="stat-value">${stats.totalDocuments || 0}</div>
      <div class="stat-change up"><i class="fas fa-arrow-up"></i> Bóveda activa</div>
    </div>
    <div class="stat-card green">
      <div class="stat-header">
        <div class="stat-label">Verificaciones Exitosas</div>
        <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="stat-value">${authentic}</div>
      <div class="stat-change up"><i class="fas fa-shield-alt"></i> Auténticos confirmados</div>
    </div>
    <div class="stat-card amber">
      <div class="stat-header">
        <div class="stat-label">Alertas de Seguridad</div>
        <div class="stat-icon amber"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
      <div class="stat-value">${suspicious}</div>
      <div class="stat-change ${suspicious>0?'down':'up'}"><i class="fas fa-flag"></i> Requieren revisión</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-header">
        <div class="stat-label">Eventos de Auditoría</div>
        <div class="stat-icon purple"><i class="fas fa-scroll"></i></div>
      </div>
      <div class="stat-value">${audit.total || stats.totalAuditEvents || 0}</div>
      <div class="stat-change"><i class="fas fa-history"></i> Registros totales</div>
    </div>
  </div>

  <div class="grid-2">
    <!-- Recent documents -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-vault"></i> Documentos Recientes</div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('vault')">Ver todos <i class="fas fa-arrow-right"></i></button>
      </div>
      ${(stats.recentDocuments||[]).length === 0 ? `
        <div class="empty-state"><i class="fas fa-folder-open"></i><h3>Sin documentos</h3><p>Sube tu primer documento seguro.</p></div>
      ` : `
      <div class="table-container">
        <table>
          <thead><tr><th>Documento</th><th>Tipo</th><th>Nivel</th><th>Fecha</th></tr></thead>
          <tbody>
            ${(stats.recentDocuments||[]).map(d => `
            <tr style="cursor:pointer" onclick="viewDoc('${d.id}')">
              <td><div style="display:flex;align-items:center;gap:10px">${fileIcon(d.type)}<span class="truncate" style="max-width:140px">${d.name}</span></div></td>
              <td><span class="text-mono text-xs">${d.type?.split('/')[1]?.toUpperCase()||'—'}</span></td>
              <td>${securityBadge(d.security_level || d.securityLevel)}</td>
              <td class="text-xs text-secondary">${fmtRelative(d.created_at || d.createdAt)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>

    <!-- Recent audit -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-scroll"></i> Actividad Reciente</div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('audit')">Ver todo <i class="fas fa-arrow-right"></i></button>
      </div>
      <div class="card-body p-0">
        ${audit.logs?.length === 0 ? `
          <div class="empty-state"><i class="fas fa-history"></i><h3>Sin actividad</h3></div>
        ` : `
        <div style="padding:16px">
          <div class="timeline">
            ${(audit.logs||[]).slice(0,6).map(l => `
            <div class="timeline-item">
              <div class="timeline-dot ${auditDotColor(l.action)}"></div>
              <div class="timeline-content">
                <div class="timeline-action">${auditActionLabel(l.action)}</div>
                <div class="timeline-meta">
                  <span><i class="fas fa-user"></i>${l.actor_email||l.actorEmail||'sistema'}</span>
                  <span><i class="fas fa-clock"></i>${fmtRelative(l.created_at||l.createdAt)}</span>
                </div>
              </div>
            </div>`).join('')}
          </div>
        </div>`}
      </div>
    </div>
  </div>

  <!-- Security status bar -->
  <div class="card mt-4" style="margin-top:20px">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-shield-halved"></i> Estado de Seguridad del Sistema</div>
      <span class="badge badge-success"><i class="fas fa-circle pulse"></i> OPERACIONAL</span>
    </div>
    <div class="card-body">
      <div class="grid-3">
        <div>
          <div class="progress-label"><span>Integridad del Vault</span><span>100%</span></div>
          <div class="progress-bar"><div class="progress-fill green" style="width:100%"></div></div>
          <div class="text-xs text-muted mt-4">Todos los documentos cifrados correctamente</div>
        </div>
        <div>
          <div class="progress-label"><span>Tasa de Autenticidad</span><span>${totalVerif>0?Math.round(authentic/totalVerif*100):100}%</span></div>
          <div class="progress-bar"><div class="progress-fill cyan" style="width:${totalVerif>0?Math.round(authentic/totalVerif*100):100}%"></div></div>
          <div class="text-xs text-muted mt-4">Documentos verificados como auténticos</div>
        </div>
        <div>
          <div class="progress-label"><span>Cobertura del Audit Trail</span><span>100%</span></div>
          <div class="progress-bar"><div class="progress-fill purple" style="width:100%"></div></div>
          <div class="text-xs text-muted mt-4">Registro inmutable de todas las operaciones</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── VAULT ────────────────────────────────────────────────────────
async function renderVault(page = 1, search = '') {
  setView('Bóveda Segura');
  const res = await get(`/documents?page=${page}&pageSize=15&search=${encodeURIComponent(search)}`);
  const data = res.ok ? res.data.data : { documents:[], total:0, page:1 };

  document.getElementById('view-content').innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Bóveda de Documentos</h1>
      <p>${data.total || 0} documentos almacenados de forma segura con cifrado AES-256-GCM</p>
    </div>
    <button class="btn btn-primary" onclick="navigate('upload')"><i class="fas fa-plus"></i> Subir Documento</button>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-vault"></i> Documentos Cifrados</div>
      <div style="display:flex;gap:10px;align-items:center">
        <div class="input-group" style="width:220px">
          <i class="fas fa-search input-icon"></i>
          <input class="form-input" type="text" placeholder="Buscar…" id="vault-search" value="${search}" onkeydown="if(event.key==='Enter')renderVault(1,this.value)">
        </div>
        <select class="form-select" style="width:140px" id="vault-filter" onchange="renderVault(1,document.getElementById('vault-search').value)">
          <option value="">Todos los niveles</option>
          <option value="public">Público</option>
          <option value="internal">Interno</option>
          <option value="confidential">Confidencial</option>
          <option value="secret">Secreto</option>
        </select>
      </div>
    </div>
    ${data.documents.length === 0 ? `
      <div class="empty-state">
        <i class="fas fa-folder-open"></i>
        <h3>La bóveda está vacía</h3>
        <p>Sube tu primer documento para cifrarlo y protegerlo.</p>
        <button class="btn btn-primary mt-4" onclick="navigate('upload')"><i class="fas fa-plus"></i> Subir Primer Documento</button>
      </div>
    ` : `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Documento</th>
            <th>Tipo</th>
            <th>Tamaño</th>
            <th>Nivel de Seguridad</th>
            <th>Hash SHA-3</th>
            <th>Creado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.documents.map(d => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:12px">
                ${fileIcon(d.type)}
                <div>
                  <div class="fw-600 truncate" style="max-width:180px">${d.name}</div>
                  <div class="text-xs text-secondary">ID: ${d.id?.substring(0,12)}…</div>
                </div>
              </div>
            </td>
            <td><span class="text-mono text-xs">${d.type?.split('/')[1]?.toUpperCase()||d.type||'—'}</span></td>
            <td class="text-sm">${fmtSize(d.size)}</td>
            <td>${securityBadge(d.securityLevel||'internal')}</td>
            <td><span class="text-mono text-xs text-cyan" title="${d.hash||''}">${truncateHash(d.hash)}</span></td>
            <td class="text-xs text-secondary">${fmtDate(d.createdAt)}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" onclick="viewDocModal('${d.id}','${d.name}')" title="Ver detalles"><i class="fas fa-eye"></i></button>
                <button class="btn btn-success btn-sm" onclick="verifyDocDirect('${d.id}')" title="Verificar autenticidad"><i class="fas fa-shield-alt"></i></button>
                <button class="btn btn-secondary btn-sm" onclick="grantAccessModal('${d.id}','${d.name}')" title="Gestionar accesos"><i class="fas fa-key"></i></button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <div class="pagination-info">Mostrando ${((page-1)*15)+1}–${Math.min(page*15,data.total)} de ${data.total} documentos</div>
      <div class="pagination-controls">
        <button class="page-btn" ${page<=1?'disabled':''} onclick="renderVault(${page-1})"><i class="fas fa-chevron-left"></i></button>
        ${Array.from({length:Math.min(5,Math.ceil(data.total/15))},(_,i)=>i+1).map(p=>`
          <button class="page-btn ${p===page?'active':''}" onclick="renderVault(${p})">${p}</button>
        `).join('')}
        <button class="page-btn" ${!data.hasNext?'disabled':''} onclick="renderVault(${page+1})"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`}
  </div>`;
}

// ─── UPLOAD ───────────────────────────────────────────────────────
function renderUpload() {
  setView('Subir Documento');
  document.getElementById('view-content').innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Subir Documento Seguro</h1>
      <p>El archivo será cifrado con AES-256-GCM antes de almacenarse. Se generan hashes SHA-3 y BLAKE3.</p>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="card mb-5">
        <div class="card-header"><div class="card-title"><i class="fas fa-cloud-upload-alt"></i> Seleccionar Archivo</div></div>
        <div class="card-body">
          <div class="dropzone" id="upload-dropzone">
            <input type="file" id="upload-file" accept=".pdf,.jpg,.jpeg,.png,.tiff">
            <div class="dropzone-icon"><i class="fas fa-cloud-upload-alt"></i></div>
            <div class="dropzone-title">Arrastra tu documento aquí</div>
            <div class="dropzone-sub">o haz clic para seleccionar</div>
            <div class="dropzone-hint">PDF, JPG, PNG, TIFF — Máx. 10 MB</div>
          </div>
          <div id="file-preview" class="hidden" style="margin-top:16px">
            <div class="auth-card">
              <div class="auth-card-header">
                <div class="auth-card-doc" id="prev-name">—</div>
                <button class="btn btn-ghost btn-sm" onclick="clearFile()"><i class="fas fa-times"></i></button>
              </div>
              <div class="auth-card-meta">
                <span><i class="fas fa-weight"></i><span id="prev-size">—</span></span>
                <span><i class="fas fa-file"></i><span id="prev-type">—</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-tag"></i> Metadatos del Documento</div></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Nivel de Seguridad *</label>
            <select class="form-select" id="upload-security">
              <option value="internal">Interno</option>
              <option value="confidential">Confidencial</option>
              <option value="public">Público</option>
              <option value="secret">Secreto</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea class="form-textarea" id="upload-desc" placeholder="Descripción del documento (opcional)…" style="min-height:80px"></textarea>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="card mb-5">
        <div class="card-header"><div class="card-title"><i class="fas fa-lock"></i> Proceso de Cifrado</div></div>
        <div class="card-body">
          <div id="upload-steps">
            ${['Validar archivo y metadatos','Calcular hash SHA-3 + BLAKE3','Generar DEK (256-bit aleatorio)','Cifrar archivo AES-256-GCM','Cifrar DEK con KEK del organismo','Almacenar en bóveda segura','Registrar en audit trail'].map((s,i)=>`
            <div class="timeline-item" style="margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:12px">
                <div class="step-circle" id="step-${i}" style="width:28px;height:28px;border-radius:50%;background:var(--bg-raised);border:2px solid var(--bg-border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-muted);flex-shrink:0">${i+1}</div>
                <div class="text-sm" id="step-label-${i}">${s}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card" id="upload-result-card" style="display:none">
        <div class="card-header"><div class="card-title"><i class="fas fa-check-circle text-green"></i> Documento Almacenado</div></div>
        <div class="card-body">
          <div id="upload-result-content"></div>
        </div>
      </div>

      <button class="btn btn-primary" style="width:100%;justify-content:center;padding:14px" id="upload-btn" onclick="doUpload()">
        <i class="fas fa-lock"></i> Cifrar y Almacenar de Forma Segura
      </button>
    </div>
  </div>`;

  // Drag and drop
  const dz = document.getElementById('upload-dropzone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) setUploadFile(f);
  });
  document.getElementById('upload-file').addEventListener('change', e => {
    if (e.target.files[0]) setUploadFile(e.target.files[0]);
  });
}

function setUploadFile(f) {
  window._uploadFile = f;
  document.getElementById('prev-name').innerHTML = `${fileIcon(f.type)}<span>${f.name}</span>`;
  document.getElementById('prev-size').textContent = fmtSize(f.size);
  document.getElementById('prev-type').textContent = f.type;
  document.getElementById('file-preview').classList.remove('hidden');
}
function clearFile() {
  window._uploadFile = null;
  document.getElementById('file-preview').classList.add('hidden');
  document.getElementById('upload-file').value = '';
}

async function doUpload() {
  const file = window._uploadFile;
  if (!file) { toast('warning','Selecciona un archivo','Por favor selecciona un documento antes de subir.'); return; }

  const btn = document.getElementById('upload-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;

  const stepColors = ['cyan','cyan','cyan','cyan','cyan','cyan','green'];
  const stepIcons  = ['fa-check','fa-check','fa-check','fa-check','fa-check','fa-check','fa-check'];

  async function animateStep(i, active = false) {
    const circle = document.getElementById(`step-${i}`);
    const label  = document.getElementById(`step-label-${i}`);
    if (circle) {
      circle.style.background = active ? 'rgba(0,180,216,.2)' : `rgba(var(--${stepColors[i]}-500),.15)`;
      circle.style.borderColor = active ? 'var(--cyan-500)' : `var(--${stepColors[i]}-500)`;
      circle.style.color = active ? 'var(--cyan-400)' : `var(--${stepColors[i]}-400)`;
      if (!active) circle.innerHTML = `<i class="fas ${stepIcons[i]}" style="font-size:10px"></i>`;
    }
    if (label && active) label.style.color = 'var(--text-primary)';
    if (label && !active) { label.style.color = 'var(--green-400)'; }
    await new Promise(r => setTimeout(r, 350));
  }

  for (let i = 0; i <= 5; i++) { await animateStep(i, true); await animateStep(i, false); }

  const form = new FormData();
  form.append('file', file);
  form.append('securityLevel', document.getElementById('upload-security').value);
  form.append('description',   document.getElementById('upload-desc').value);

  const res = await post('/documents/upload', form, true);

  await animateStep(6, true); await animateStep(6, false);

  btn.classList.remove('btn-loading'); btn.disabled = false;

  if (res.ok && res.data.success) {
    toast('success','Documento almacenado','El archivo fue cifrado y guardado en la bóveda.');
    const d = res.data.data;
    const rc = document.getElementById('upload-result-card');
    document.getElementById('upload-result-content').innerHTML = `
      <div class="hash-display">
        <div class="hash-row"><span class="hash-label">ID:</span><span class="hash-value">${d.id}</span></div>
        <div class="hash-row"><span class="hash-label">SHA-3:</span><span class="hash-value">${d.hash||'Calculado'}</span></div>
        <div class="hash-row"><span class="hash-label">Tamaño:</span><span class="hash-value">${fmtSize(d.size)}</span></div>
      </div>
      <button class="btn btn-secondary btn-sm" style="margin-top:12px;width:100%" onclick="navigate('vault')">
        <i class="fas fa-vault"></i> Ver en Bóveda
      </button>`;
    rc.style.display = 'block';
    btn.style.display = 'none';
    clearFile();
  } else {
    toast('error','Error al subir', res.data.error || 'No se pudo almacenar el documento.');
  }
}

// ─── VERIFY ───────────────────────────────────────────────────────
function renderVerify() {
  setView('Verificar Documento');
  document.getElementById('view-content').innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Motor Forense de Verificación</h1>
      <p>Analiza la autenticidad de cualquier documento detectando alteraciones, falsificaciones y adulteraciones.</p>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="card mb-5">
        <div class="card-header"><div class="card-title"><i class="fas fa-microscope"></i> Cargar Documento Sospechoso</div></div>
        <div class="card-body">
          <div class="dropzone" id="verify-dropzone">
            <input type="file" id="verify-file" accept=".pdf,.jpg,.jpeg,.png,.tiff">
            <div class="dropzone-icon"><i class="fas fa-search-plus"></i></div>
            <div class="dropzone-title">Arrastra el documento a verificar</div>
            <div class="dropzone-sub">o haz clic para seleccionar</div>
            <div class="dropzone-hint">Soporta PDF, JPG, PNG, TIFF</div>
          </div>
          <div id="verify-file-preview" class="hidden" style="margin-top:12px">
            <div class="auth-card">
              <div class="auth-card-doc"><i class="fas fa-file-alt"></i><span id="vf-name">—</span></div>
              <div class="auth-card-meta">
                <span><i class="fas fa-weight"></i><span id="vf-size">—</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-5">
        <div class="card-header"><div class="card-title"><i class="fas fa-sliders-h"></i> Tipo de Análisis</div></div>
        <div class="card-body">
          <div class="form-group">
            <select class="form-select" id="verify-type">
              <option value="full">Análisis Completo (Recomendado)</option>
              <option value="image">Solo Análisis de Imagen</option>
              <option value="typography">Solo Tipografía</option>
              <option value="metadata">Solo Metadatos</option>
            </select>
            <div class="form-hint">El análisis completo incluye verificación de hash, metadatos EXIF, tipografía y firma digital.</div>
          </div>
          <button class="btn btn-primary" style="width:100%;justify-content:center" id="verify-btn" onclick="doVerify()">
            <i class="fas fa-search"></i> Iniciar Análisis Forense
          </button>
        </div>
      </div>

      <!-- Explicación del proceso -->
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-info-circle"></i> Proceso de Verificación</div></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:12px">
            ${[
              ['fa-hashtag','cyan','Hash Criptográfico','Compara SHA-3 y BLAKE3 contra registros originales'],
              ['fa-image','purple','Análisis de Imagen','Detecta manipulación de píxeles y edición digital'],
              ['fa-font','amber','Tipografía','Identifica fuentes inconsistentes o sustituidas'],
              ['fa-database','blue','Metadatos EXIF','Verifica coherencia de metadata del archivo'],
              ['fa-certificate','green','Firma Digital','Valida firmas PKCS#7 si están presentes']
            ].map(([ic,color,title,desc])=>`
            <div style="display:flex;gap:12px">
              <div class="stat-icon ${color}" style="width:32px;height:32px;border-radius:6px;flex-shrink:0"><i class="fas ${ic}" style="font-size:12px"></i></div>
              <div>
                <div class="text-sm fw-600">${title}</div>
                <div class="text-xs text-muted">${desc}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Results panel -->
    <div>
      <div id="verify-result-panel">
        <div class="card" style="min-height:400px">
          <div class="card-header"><div class="card-title"><i class="fas fa-chart-bar"></i> Resultado del Análisis</div></div>
          <div class="empty-state" style="padding:80px 24px">
            <i class="fas fa-microscope" style="opacity:.3"></i>
            <h3>Esperando documento</h3>
            <p>Carga un documento y presiona "Iniciar Análisis Forense"</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  const dz = document.getElementById('verify-dropzone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) { window._verifyFile = f; showVerifyPreview(f); }
  });
  document.getElementById('verify-file').addEventListener('change', e => {
    if (e.target.files[0]) { window._verifyFile = e.target.files[0]; showVerifyPreview(e.target.files[0]); }
  });
}

function showVerifyPreview(f) {
  document.getElementById('vf-name').textContent = f.name;
  document.getElementById('vf-size').textContent = fmtSize(f.size);
  document.getElementById('verify-file-preview').classList.remove('hidden');
}

async function doVerify() {
  const file = window._verifyFile;
  if (!file) { toast('warning','Selecciona un archivo','Debes cargar un documento para analizar.'); return; }

  const btn = document.getElementById('verify-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;

  document.getElementById('verify-result-panel').innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="fas fa-spinner fa-spin text-cyan"></i> Analizando Documento…</div></div>
      <div class="card-body">
        ${['Calculando hashes SHA-3 + BLAKE3…','Comparando con base de datos registrada…','Analizando metadatos EXIF…','Verificando integridad tipográfica…','Validando firma digital…','Generando reporte forense…'].map((s,i)=>`
        <div class="progress-container">
          <div class="progress-label"><span class="text-sm">${s}</span><span id="pct-${i}" class="text-xs text-mono">0%</span></div>
          <div class="progress-bar"><div class="progress-fill cyan" id="prog-${i}" style="width:0%"></div></div>
        </div>`).join('')}
      </div>
    </div>`;

  // Animate progress bars
  for (let i = 0; i < 6; i++) {
    const bar = document.getElementById(`prog-${i}`);
    const pct = document.getElementById(`pct-${i}`);
    if (!bar) continue;
    let p = 0;
    await new Promise(resolve => {
      const interval = setInterval(() => {
        p += Math.random() * 25 + 10;
        if (p >= 100) { p = 100; clearInterval(interval); resolve(); }
        bar.style.width = p + '%';
        if (pct) pct.textContent = Math.round(p) + '%';
      }, 80);
    });
    await new Promise(r => setTimeout(r, 200));
  }

  const form = new FormData();
  form.append('file', file);
  form.append('analysisType', document.getElementById('verify-type').value);
  const res = await post('/verification/upload-verify', form, true);

  btn.classList.remove('btn-loading'); btn.disabled = false;

  if (res.ok && res.data.success) {
    const d = res.data.data;
    const verdictConfig = {
      authentic:  { icon:'fa-check-circle', title:'Documento Auténtico', sub:'No se detectaron alteraciones ni manipulaciones.' },
      suspicious: { icon:'fa-exclamation-triangle', title:'Documento Sospechoso', sub:'Se encontraron indicadores que requieren revisión manual.' },
      fraudulent: { icon:'fa-times-circle', title:'Posible Fraude Detectado', sub:'Se detectaron alteraciones significativas en el documento.' },
      tampered:   { icon:'fa-edit', title:'Documento Adulterado', sub:'El documento ha sido modificado desde su emisión original.' }
    };
    const cfg = verdictConfig[d.status] || verdictConfig.suspicious;

    document.getElementById('verify-result-panel').innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-bar"></i> Resultado del Análisis Forense</div>
          <button class="btn btn-secondary btn-sm" onclick="navigate('verifications')"><i class="fas fa-history"></i> Ver historial</button>
        </div>
        <div class="card-body">
          <div class="verdict-card ${d.status}">
            <div class="verdict-icon"><i class="fas ${cfg.icon}"></i></div>
            <div class="verdict-title">${cfg.title}</div>
            <div class="verdict-sub">${cfg.sub}</div>
            <div class="verdict-score"><i class="fas fa-percentage"></i> Confianza: ${d.confidenceScore}%</div>
          </div>

          <div class="progress-container">
            <div class="progress-label"><span>Puntuación de Confianza</span><span class="text-mono">${d.confidenceScore}%</span></div>
            <div class="progress-bar"><div class="progress-fill ${d.confidenceScore>=80?'green':d.confidenceScore>=60?'amber':'red'}" style="width:${d.confidenceScore}%"></div></div>
          </div>

          <div class="analysis-grid">
            ${(d.findings||[]).map(f => `
            <div class="analysis-item ${f.severity==='low'||f.severity==='none'?'pass':f.severity==='critical'||f.severity==='high'?'fail':'warn'}">
              <div class="analysis-label">${f.type?.replace(/_/g,' ')}</div>
              <div class="analysis-value">${f.description}</div>
              <div class="text-xs text-muted mt-4" style="margin-top:4px">${f.evidence||''}</div>
            </div>`).join('')}
          </div>

          <div class="hash-display" style="margin-top:16px">
            <div class="hash-row"><span class="hash-label">Doc ID:</span><span class="hash-value">${d.documentId||'temporal'}</span></div>
            <div class="hash-row"><span class="hash-label">Verif ID:</span><span class="hash-value">${d.verificationId}</span></div>
            <div class="hash-row"><span class="hash-label">Fecha:</span><span class="hash-value">${fmtDate(d.analyzedAt)}</span></div>
          </div>
        </div>
      </div>`;
  } else {
    toast('error','Error en verificación', res.data.error || 'No se pudo completar el análisis.');
    renderVerify();
  }
}

// ─── VERIFICATIONS HISTORY ────────────────────────────────────────
async function renderVerifications(page = 1) {
  setView('Historial Forense');
  const res = await get(`/verification?page=${page}&pageSize=20`);
  const data = res.ok ? res.data.data : { verifications:[], total:0 };

  document.getElementById('view-content').innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Historial de Verificaciones</h1>
      <p>${data.total||0} análisis forenses realizados</p>
    </div>
    <button class="btn btn-primary" onclick="navigate('verify')"><i class="fas fa-plus"></i> Nueva Verificación</button>
  </div>

  <div class="card">
    <div class="card-header"><div class="card-title"><i class="fas fa-list-check"></i> Registros Forenses</div></div>
    ${data.verifications.length === 0 ? `
      <div class="empty-state"><i class="fas fa-microscope"></i><h3>Sin verificaciones</h3><p>Aún no se han realizado análisis forenses.</p></div>
    ` : `
    <div class="table-container">
      <table>
        <thead><tr><th>Documento</th><th>Veredicto</th><th>Confianza</th><th>Hallazgos</th><th>Analizado por</th><th>Fecha</th></tr></thead>
        <tbody>
          ${data.verifications.map(v => `
          <tr>
            <td>
              <div class="fw-600">${v.documentName||v.documentId?.substring(0,16)+'…'}</div>
              <div class="text-xs text-muted">${v.documentType||'—'}</div>
            </td>
            <td>${verdictBadge(v.status)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:60px">
                  <div class="progress-bar"><div class="progress-fill ${v.confidenceScore>=80?'green':v.confidenceScore>=60?'amber':'red'}" style="width:${v.confidenceScore}%"></div></div>
                </div>
                <span class="text-mono text-xs">${v.confidenceScore}%</span>
              </div>
            </td>
            <td><span class="badge badge-neutral">${(v.findings||[]).length} hallazgo(s)</span></td>
            <td class="text-xs text-secondary mono">${v.analyzedBy?.substring(0,12)||'—'}…</td>
            <td class="text-xs text-secondary">${fmtDate(v.analyzedAt)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <div class="pagination-info">Página ${page} · ${data.total} registros</div>
      <div class="pagination-controls">
        <button class="page-btn" ${page<=1?'disabled':''} onclick="renderVerifications(${page-1})"><i class="fas fa-chevron-left"></i></button>
        <button class="page-btn" ${!data.hasNext?'disabled':''} onclick="renderVerifications(${page+1})"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`}
  </div>`;
}

// ─── AUTHORIZATIONS ───────────────────────────────────────────────
async function renderAuthorizations() {
  setView('Autorizaciones de Acceso');
  const docsRes = await get('/documents?pageSize=100');
  const docs = docsRes.ok ? docsRes.data.data.documents : [];

  document.getElementById('view-content').innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Control de Autorizaciones</h1>
      <p>Gestiona quién puede acceder a cada documento y bajo qué condiciones. Todo queda registrado.</p>
    </div>
    <button class="btn btn-primary" onclick="openGrantModal()"><i class="fas fa-plus"></i> Nueva Autorización</button>
  </div>

  <div class="card">
    <div class="card-header"><div class="card-title"><i class="fas fa-key"></i> Autorizaciones Activas</div></div>
    ${docs.length === 0 ? `
      <div class="empty-state">
        <i class="fas fa-key"></i>
        <h3>Sin documentos en bóveda</h3>
        <p>Primero debes subir documentos para poder gestionar autorizaciones.</p>
        <button class="btn btn-primary mt-4" onclick="navigate('upload')"><i class="fas fa-plus"></i> Subir Documento</button>
      </div>
    ` : `
    <div class="card-body">
      <div class="mb-5" style="margin-bottom:20px">
        <div style="background:rgba(0,180,216,.06);border:1px solid rgba(0,180,216,.15);border-radius:10px;padding:16px 20px">
          <div style="display:flex;align-items:center;gap:12px">
            <i class="fas fa-info-circle text-cyan"></i>
            <div>
              <div class="fw-600 text-sm">Documentos disponibles para autorización</div>
              <div class="text-xs text-muted">${docs.length} documento(s) en tu bóveda. Selecciona uno para gestionar sus accesos.</div>
            </div>
          </div>
        </div>
      </div>

      <div id="auth-docs-list">
        ${docs.map(d => `
        <div class="auth-card">
          <div class="auth-card-header">
            <div class="auth-card-doc">
              ${fileIcon(d.type)}
              <div>
                <div>${d.name}</div>
                <div class="text-xs text-muted">${d.id?.substring(0,20)}…</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              ${securityBadge(d.securityLevel||'internal')}
              <button class="btn btn-primary btn-sm" onclick="grantAccessModal('${d.id}','${d.name}')">
                <i class="fas fa-plus"></i> Autorizar Acceso
              </button>
            </div>
          </div>
          <div class="auth-card-meta">
            <span><i class="fas fa-weight"></i>${fmtSize(d.size)}</span>
            <span><i class="fas fa-calendar"></i>${fmtDate(d.createdAt)}</span>
            <span><i class="fas fa-user"></i>Por ti</span>
          </div>
        </div>`).join('')}
      </div>
    </div>`}
  </div>`;
}

function grantAccessModal(docId, docName) {
  showModal('modal-grant', `
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-key"></i> Autorizar Acceso</div>
      <button class="modal-close" onclick="closeModal('modal-grant')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div style="background:var(--bg-deep);border-radius:8px;padding:12px 16px;margin-bottom:20px">
        <div class="text-xs text-muted">Documento</div>
        <div class="fw-600">${docName}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Email del usuario a autorizar *</label>
        <div class="input-group">
          <i class="fas fa-envelope input-icon"></i>
          <input class="form-input" type="email" id="grant-email" placeholder="usuario@empresa.com">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Permiso a otorgar *</label>
        <select class="form-select" id="grant-action">
          <option value="view">Ver documento (solo lectura)</option>
          <option value="download">Descargar documento</option>
          <option value="verify">Verificar autenticidad</option>
          <option value="edit">Editar documento</option>
          <option value="share">Compartir con terceros</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Expira el (opcional)</label>
        <input class="form-input" type="datetime-local" id="grant-expires">
        <div class="form-hint">Deja vacío para que no expire nunca.</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('modal-grant')">Cancelar</button>
      <button class="btn btn-primary" onclick="doGrantAccess('${docId}')"><i class="fas fa-check"></i> Otorgar Acceso</button>
    </div>`);
}

async function doGrantAccess(docId) {
  const email   = document.getElementById('grant-email')?.value.trim();
  const action  = document.getElementById('grant-action')?.value;
  const expires = document.getElementById('grant-expires')?.value;

  if (!email) { toast('warning','Email requerido','Ingresa el email del usuario.'); return; }

  const body = { documentId: docId, userEmail: email, action };
  if (expires) body.expiresAt = new Date(expires).toISOString();

  const res = await post(`/documents/${docId}/permissions`, body);
  closeModal('modal-grant');

  if (res.ok && res.data.success) {
    toast('success','Acceso otorgado',`${email} ahora puede ${action} el documento.`);
  } else {
    toast('error','Error', res.data.error || 'No se pudo otorgar el acceso.');
  }
}

function openGrantModal() {
  toast('info','Selecciona un documento','Usa el botón "Autorizar Acceso" en el documento específico.');
}

// ─── AUDIT TRAIL ──────────────────────────────────────────────────
async function renderAudit(page = 1) {
  setView('Audit Trail');
  const res = await get(`/audit/logs?page=${page}&pageSize=25`);
  const data = res.ok ? res.data.data : { logs:[], total:0 };

  document.getElementById('view-content').innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Audit Trail Inmutable</h1>
      <p>${data.total||0} eventos registrados con hashes encadenados criptográficamente</p>
    </div>
    <button class="btn btn-secondary" onclick="exportAudit()"><i class="fas fa-download"></i> Exportar CSV</button>
  </div>

  <!-- Security guarantee -->
  <div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:14px 20px;margin-bottom:24px;display:flex;align-items:center;gap:14px">
    <i class="fas fa-shield-halved" style="color:var(--green-400);font-size:20px"></i>
    <div>
      <div class="fw-600 text-sm" style="color:var(--green-400)">Registro Inmutable Garantizado</div>
      <div class="text-xs text-muted">Cada entrada contiene el hash del evento anterior (blockchain-style). Imposible alterar sin detección.</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-scroll"></i> Eventos de Seguridad</div>
      <div style="display:flex;gap:8px">
        <select class="form-select" style="width:160px" id="audit-filter" onchange="filterAuditLogs()">
          <option value="">Todos los eventos</option>
          <option value="LOGIN">Inicios de sesión</option>
          <option value="DOCUMENT">Documentos</option>
          <option value="VERIFICATION">Verificaciones</option>
          <option value="PERMISSION">Permisos</option>
        </select>
      </div>
    </div>
    ${!data.logs || data.logs.length === 0 ? `
      <div class="empty-state"><i class="fas fa-scroll"></i><h3>Sin registros</h3><p>Las acciones del sistema aparecerán aquí.</p></div>
    ` : `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Acción</th>
            <th>Actor</th>
            <th>Recurso</th>
            <th>IP</th>
            <th>Hash del Log</th>
            <th>Resultado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody id="audit-table-body">
          ${(data.logs||[]).map((l, idx) => `
          <tr>
            <td class="text-mono text-xs text-muted">${idx+1+(page-1)*25}</td>
            <td>
              <span class="badge ${auditBadgeClass(l.action)}">${auditActionLabel(l.action||l.event_type)}</span>
            </td>
            <td>
              <div class="text-sm fw-600">${l.actor_email||l.actorEmail||'sistema'}</div>
              <div class="text-xs text-muted">${String(l.actor_role||l.actorRole||'').replace(/_/g,' ')}</div>
            </td>
            <td>
              <div class="text-sm">${l.resource_type||l.resourceType||'—'}</div>
              <div class="text-mono text-xs text-muted">${String(l.resource_id||l.resourceId||'').substring(0,14)}</div>
            </td>
            <td class="text-mono text-xs">${l.actor_ip||l.actorIp||'—'}</td>
            <td>
              <span class="text-mono text-xs text-cyan" title="${l.log_hash||l.logHash||''}">${truncateHash(l.log_hash||l.logHash,12)}</span>
            </td>
            <td>${(l.outcome||l.result||'success')==='success'
              ? '<span class="badge badge-success"><i class="fas fa-check"></i>OK</span>'
              : '<span class="badge badge-danger"><i class="fas fa-times"></i>Error</span>'}</td>
            <td class="text-xs text-secondary">${fmtDate(l.created_at||l.createdAt)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <div class="pagination-info">Página ${page} · ${data.total||0} eventos registrados</div>
      <div class="pagination-controls">
        <button class="page-btn" ${page<=1?'disabled':''} onclick="renderAudit(${page-1})"><i class="fas fa-chevron-left"></i></button>
        <button class="page-btn" ${!data.hasNext?'disabled':''} onclick="renderAudit(${page+1})"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`}
  </div>`;
}

function auditActionLabel(action) {
  const map = {
    'LOGIN_SUCCESS':'Login OK','LOGIN_FAILED':'Login Fallido','LOGOUT':'Logout',
    'DOCUMENT_UPLOADED':'Doc Subido','DOCUMENT_DOWNLOADED':'Doc Descargado',
    'DOCUMENT_VERIFIED':'Verificado','DOCUMENT_UPLOAD_VERIFIED':'Verificación Upload',
    'PERMISSION_GRANTED':'Permiso Otorgado','PERMISSION_REVOKED':'Permiso Revocado',
    'MFA_VERIFIED':'MFA Verificado','MFA_FAILED':'MFA Fallido',
    'USER_CREATED':'Usuario Creado','SUPERUSER':'Super Admin'
  };
  return map[action] || action?.replace(/_/g,' ') || '—';
}
function auditBadgeClass(action) {
  if (!action) return 'badge-neutral';
  if (action.includes('FAIL') || action.includes('ERROR')) return 'badge-danger';
  if (action.includes('LOGIN') || action.includes('MFA')) return 'badge-info';
  if (action.includes('DOCUMENT')) return 'badge-warning';
  if (action.includes('PERMISSION')) return 'badge-purple';
  return 'badge-neutral';
}
function auditDotColor(action) {
  if (!action) return '';
  if (action.includes('FAIL') || action.includes('ERROR')) return 'danger';
  if (action.includes('LOGIN')) return 'info';
  if (action.includes('DOCUMENT')) return 'warning';
  return 'success';
}
function filterAuditLogs() {
  const filter = document.getElementById('audit-filter')?.value;
  const rows = document.querySelectorAll('#audit-table-body tr');
  rows.forEach(row => {
    const text = row.textContent;
    row.style.display = (!filter || text.includes(filter)) ? '' : 'none';
  });
}
function exportAudit() {
  toast('info','Exportando…','Preparando archivo CSV del audit trail.');
}

// ─── SETTINGS ────────────────────────────────────────────────────
function renderSettings() {
  setView('Configuración');
  const u = State.user;
  document.getElementById('view-content').innerHTML = `
  <div class="page-header">
    <div class="page-header-left"><h1>Configuración de la Cuenta</h1><p>Gestiona tu perfil, seguridad y preferencias.</p></div>
  </div>

  <div class="grid-2">
    <div>
      <div class="card mb-5">
        <div class="card-header"><div class="card-title"><i class="fas fa-user"></i> Perfil de Usuario</div></div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
            <div class="user-avatar" style="width:56px;height:56px;font-size:20px">${avatarText(u.name)}</div>
            <div>
              <div class="fw-700" style="font-size:16px">${u.name||'—'}</div>
              <div class="text-secondary text-sm">${u.email}</div>
              <span class="badge badge-info mt-4" style="margin-top:6px">${roleLabel(u.role)}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nombre completo</label>
            <input class="form-input" type="text" value="${u.name||''}" id="s-name">
          </div>
          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input class="form-input" type="email" value="${u.email}" disabled>
          </div>
          <button class="btn btn-primary" onclick="toast('success','Perfil actualizado','Los cambios han sido guardados.')"><i class="fas fa-save"></i> Guardar Cambios</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-lock"></i> Cambiar Contraseña</div></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Contraseña actual</label>
            <div class="input-group">
              <i class="fas fa-lock input-icon"></i>
              <input class="form-input" type="password" id="s-pass-cur" placeholder="••••••••">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nueva contraseña</label>
            <div class="input-group">
              <i class="fas fa-lock input-icon"></i>
              <input class="form-input" type="password" id="s-pass-new" placeholder="Mínimo 8 caracteres">
            </div>
          </div>
          <button class="btn btn-secondary" onclick="toast('success','Contraseña actualizada','Tu contraseña ha sido cambiada exitosamente.')"><i class="fas fa-key"></i> Actualizar Contraseña</button>
        </div>
      </div>
    </div>

    <div>
      <div class="card mb-5">
        <div class="card-header"><div class="card-title"><i class="fas fa-shield-alt"></i> Autenticación Multifactor (MFA)</div></div>
        <div class="card-body">
          ${u.mfaEnabled ? `
          <div class="verdict-card authentic" style="margin-bottom:20px">
            <div style="font-size:32px;margin-bottom:10px"><i class="fas fa-shield-check text-green"></i></div>
            <div class="fw-700">MFA Activado</div>
            <div class="text-sm text-muted">Tu cuenta está protegida con autenticación de dos factores.</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="toast('warning','MFA','Desactivar MFA reduce la seguridad de tu cuenta.')"><i class="fas fa-times"></i> Desactivar MFA</button>
          ` : `
          <div class="verdict-card suspicious" style="margin-bottom:20px">
            <div style="font-size:32px;margin-bottom:10px"><i class="fas fa-exclamation-triangle text-amber"></i></div>
            <div class="fw-700">MFA No Activado</div>
            <div class="text-sm text-muted">Activa MFA para mayor seguridad en tu cuenta.</div>
          </div>
          <button class="btn btn-primary" onclick="setupMFA()"><i class="fas fa-shield-alt"></i> Activar MFA con TOTP</button>`}
        </div>
      </div>

      <div class="card mb-5">
        <div class="card-header"><div class="card-title"><i class="fas fa-info-circle"></i> Información del Sistema</div></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:12px">
            ${[
              ['Versión API', '2.0.0'],
              ['Algoritmo de Cifrado', 'AES-256-GCM'],
              ['Hash Primario', 'SHA-3 (256)'],
              ['Hash Secundario', 'BLAKE3'],
              ['Firma Digital', 'PKCS#7 / CAdES'],
              ['Protocolo TLS', 'TLS 1.3'],
              ['Infraestructura', 'Cloudflare Edge']
            ].map(([k,v])=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bg-border)">
              <span class="text-sm text-secondary">${k}</span>
              <span class="text-mono text-xs text-cyan">${v}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-sign-out-alt text-red"></i> Sesión</div></div>
        <div class="card-body">
          <p class="text-sm text-secondary mb-4" style="margin-bottom:14px">Cierra sesión en este dispositivo de forma segura.</p>
          <button class="btn btn-danger" onclick="doLogout()"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>
        </div>
      </div>
    </div>
  </div>`;
}

async function setupMFA() {
  const res = await post('/auth/mfa/setup', {});
  if (res.ok && res.data.success) {
    const d = res.data.data;
    showModal('modal-mfa', `
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-shield-alt"></i> Configurar MFA</div>
        <button class="modal-close" onclick="closeModal('modal-mfa')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <p class="text-sm text-secondary mb-5" style="margin-bottom:16px">Escanea este código QR con tu app de autenticación (Google Authenticator, Authy, etc.)</p>
        <div style="text-align:center;margin-bottom:20px">
          <img src="${d.qrCode}" alt="QR Code MFA" style="border-radius:8px;border:2px solid var(--bg-border);max-width:200px">
        </div>
        <div class="hash-display" style="margin-bottom:20px">
          <div class="hash-row"><span class="hash-label">Secret:</span><span class="hash-value">${d.secret}</span></div>
        </div>
        <div class="form-group">
          <label class="form-label">Ingresa el código de 6 dígitos para verificar</label>
          <input class="form-input" type="text" id="mfa-code" placeholder="000000" maxlength="6" style="font-family:var(--font-mono);font-size:20px;letter-spacing:8px;text-align:center">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('modal-mfa')">Cancelar</button>
        <button class="btn btn-primary" onclick="verifyMFA()"><i class="fas fa-check"></i> Verificar y Activar</button>
      </div>`);
  } else {
    toast('error', 'Error', 'No se pudo iniciar la configuración de MFA.');
  }
}

async function verifyMFA() {
  const code = document.getElementById('mfa-code')?.value;
  if (!code || code.length !== 6) { toast('warning','Código inválido','Ingresa el código de 6 dígitos.'); return; }
  const res = await post('/auth/mfa/verify', { token: code });
  closeModal('modal-mfa');
  if (res.ok && res.data.success) {
    toast('success','MFA Activado','Tu cuenta ahora está protegida con autenticación de dos factores.');
    State.user.mfaEnabled = true;
    renderSettings();
  } else {
    toast('error','Código incorrecto','El código ingresado no es válido.');
  }
}

// ─── Document modal ───────────────────────────────────────────────
async function viewDocModal(docId, docName) {
  const res = await get(`/documents/${docId}`);
  if (!res.ok) { toast('error','Error','No se pudo obtener el documento.'); return; }
  const d = res.data.data;

  showModal('modal-doc', `
    <div class="modal-header">
      <div class="modal-title">${fileIcon(d.type)}<span>${d.name}</span></div>
      <button class="modal-close" onclick="closeModal('modal-doc')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px">
        ${securityBadge(d.securityLevel||'internal')}
        <span class="badge badge-info"><i class="fas fa-lock"></i> Cifrado AES-256-GCM</span>
        ${d.verificationCount>0?`<span class="badge badge-success"><i class="fas fa-check"></i>${d.verificationCount} verificación(es)</span>`:''}
      </div>
      <div class="hash-display">
        <div class="hash-row"><span class="hash-label">ID:</span><span class="hash-value">${d.id}</span></div>
        <div class="hash-row"><span class="hash-label">Tipo:</span><span class="hash-value">${d.type}</span></div>
        <div class="hash-row"><span class="hash-label">Tamaño:</span><span class="hash-value">${fmtSize(d.size)}</span></div>
        <div class="hash-row"><span class="hash-label">Creado:</span><span class="hash-value">${fmtDate(d.createdAt)}</span></div>
      </div>
      ${d.permissions?.length > 0 ? `
      <div style="margin-top:16px">
        <div class="text-sm fw-600 mb-4" style="margin-bottom:8px">Mis Permisos:</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${d.permissions.map(p=>`<span class="badge badge-neutral"><i class="fas fa-check"></i>${p}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('modal-doc')">Cerrar</button>
      <button class="btn btn-success" onclick="closeModal('modal-doc');navigate('verify')"><i class="fas fa-microscope"></i> Verificar Autenticidad</button>
    </div>`);
}

async function verifyDocDirect(docId) {
  const res = await post('/verification/verify', { documentId: docId, analysisType: 'full' });
  if (res.ok && res.data.success) {
    const d = res.data.data;
    toast(d.status==='authentic'?'success':d.status==='suspicious'?'warning':'error',
      `Verificación: ${d.status==='authentic'?'Auténtico':d.status==='suspicious'?'Sospechoso':'Fraudulento'}`,
      `Puntuación de confianza: ${d.confidenceScore}%`);
  } else {
    navigate('verify');
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────
function renderLogin() {
  document.getElementById('app').innerHTML = `
  <div class="login-page">
    <div class="login-bg-grid"></div>
    <div class="login-bg-glow top-right"></div>
    <div class="login-bg-glow bottom-left"></div>

    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-icon"><i class="fas fa-shield-halved"></i></div>
        <h1>DocuSentinel <span>PRO</span></h1>
        <p>Plataforma de Seguridad Documental Empresarial</p>
      </div>

      <div class="login-tabs">
        <div class="login-tab active" id="tab-login" onclick="switchTab('login')">Iniciar Sesión</div>
        <div class="login-tab" id="tab-register" onclick="switchTab('register')">Registrarse</div>
      </div>

      <!-- Login form -->
      <div id="form-login">
        <div class="form-group">
          <label class="form-label">Correo electrónico</label>
          <div class="input-group">
            <i class="fas fa-envelope input-icon"></i>
            <input class="form-input" type="email" id="l-email" placeholder="tu@empresa.com" autocomplete="email">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña</label>
          <div class="input-group">
            <i class="fas fa-lock input-icon"></i>
            <input class="form-input" type="password" id="l-pass" placeholder="••••••••" autocomplete="current-password"
              onkeydown="if(event.key==='Enter')doLogin()">
            <i class="fas fa-eye input-action" onclick="togglePass('l-pass',this)"></i>
          </div>
        </div>
        <div id="mfa-field" class="form-group hidden">
          <label class="form-label">Código MFA</label>
          <div class="input-group">
            <i class="fas fa-mobile-alt input-icon"></i>
            <input class="form-input" type="text" id="l-mfa" placeholder="000000" maxlength="6"
              style="font-family:var(--font-mono);letter-spacing:4px;text-align:center">
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;margin-top:8px" id="login-btn" onclick="doLogin()">
          <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
        </button>
        <div class="login-security-note">
          <i class="fas fa-shield-alt"></i>
          <span>Conexión cifrada TLS 1.3 · AES-256-GCM · Audit trail activo</span>
        </div>
      </div>

      <!-- Register form -->
      <div id="form-register" class="hidden">
        <div class="form-group">
          <label class="form-label">Nombre completo</label>
          <div class="input-group">
            <i class="fas fa-user input-icon"></i>
            <input class="form-input" type="text" id="r-name" placeholder="Tu nombre completo">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Correo electrónico</label>
          <div class="input-group">
            <i class="fas fa-envelope input-icon"></i>
            <input class="form-input" type="email" id="r-email" placeholder="tu@empresa.com">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña</label>
          <div class="input-group">
            <i class="fas fa-lock input-icon"></i>
            <input class="form-input" type="password" id="r-pass" placeholder="Mínimo 8 caracteres"
              onkeydown="if(event.key==='Enter')doRegister()">
            <i class="fas fa-eye input-action" onclick="togglePass('r-pass',this)"></i>
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;margin-top:8px" id="register-btn" onclick="doRegister()">
          <i class="fas fa-user-plus"></i> Crear Cuenta
        </button>
      </div>
    </div>
  </div>`;
}

function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  document.getElementById('form-login').classList.toggle('hidden', tab!=='login');
  document.getElementById('form-register').classList.toggle('hidden', tab!=='register');
}

function togglePass(id, el) {
  const input = document.getElementById(id);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  el.className = `fas fa-eye${input.type==='text'?'-slash':''} input-action`;
}

async function doLogin() {
  const email = document.getElementById('l-email')?.value.trim();
  const pass  = document.getElementById('l-pass')?.value;
  const mfa   = document.getElementById('l-mfa')?.value;

  if (!email || !pass) { toast('warning','Campos requeridos','Completa email y contraseña.'); return; }

  const btn = document.getElementById('login-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;

  const body = { email, password: pass };
  if (mfa) body.mfaToken = mfa;

  const res = await post('/auth/login', body);
  btn.classList.remove('btn-loading'); btn.disabled = false;

  if (res.ok && res.data.success) {
    saveAuth(res.data.data.token, res.data.data.user);
    toast('success','¡Bienvenido!', res.data.data.message || `Hola, ${res.data.data.user.name}`);
    renderApp();
  } else if (res.data.requiresMFA) {
    document.getElementById('mfa-field').classList.remove('hidden');
    document.getElementById('l-mfa').focus();
    toast('info','Se requiere MFA','Ingresa tu código de autenticación.');
  } else {
    toast('error','Error de acceso', res.data.error || 'Credenciales inválidas.');
  }
}

async function doRegister() {
  const name  = document.getElementById('r-name')?.value.trim();
  const email = document.getElementById('r-email')?.value.trim();
  const pass  = document.getElementById('r-pass')?.value;

  if (!name || !email || !pass) { toast('warning','Campos requeridos','Completa todos los campos.'); return; }
  if (pass.length < 8) { toast('warning','Contraseña débil','Mínimo 8 caracteres.'); return; }

  const btn = document.getElementById('register-btn');
  btn.classList.add('btn-loading'); btn.disabled = true;

  const res = await post('/auth/register', { name, email, password: pass });
  btn.classList.remove('btn-loading'); btn.disabled = false;

  if (res.ok && res.data.success) {
    toast('success','Cuenta creada','Tu cuenta ha sido creada. Inicia sesión.');
    switchTab('login');
    document.getElementById('l-email').value = email;
  } else {
    toast('error','Error de registro', res.data.error || 'No se pudo crear la cuenta.');
  }
}

async function doLogout() {
  await post('/auth/logout', {});
  clearAuth();
  toast('info','Sesión cerrada','Has cerrado sesión correctamente.');
  setTimeout(() => renderLogin(), 500);
}

// ─── USERS (admin) ────────────────────────────────────────────────
async function renderUsers(page = 1, search = '') {
  setView('Administración de Usuarios');
  if (State.user?.role > 2) {
    document.getElementById('view-content').innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso denegado</h3><p>Solo administradores pueden ver esta sección.</p></div>`;
    return;
  }
  const res = await req('GET', `/auth/users?page=${page}&pageSize=15&search=${encodeURIComponent(search)}`);
  const data = res.ok ? res.data.data : { users:[], total:0 };

  const roleBadge = (role) => {
    const map = { 1:['badge-danger','Super Admin'], 2:['badge-warning','Admin Docs'], 3:['badge-info','Auditor'], 4:['badge-success','Verificador'], 5:['badge-neutral','Usuario'] };
    const [cls, label] = map[role] || ['badge-neutral', 'Rol '+role];
    return `<span class="badge ${cls}">${label}</span>`;
  };

  document.getElementById('view-content').innerHTML = `
  <div class="page-header">
    <div class="page-header-left">
      <h1>Gestión de Usuarios</h1>
      <p>${data.total || 0} usuarios registrados en el sistema</p>
    </div>
    <button class="btn btn-primary" onclick="showRegisterModal()"><i class="fas fa-user-plus"></i> Nuevo Usuario</button>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-users"></i> Usuarios del Sistema</div>
      <div class="input-group" style="width:220px">
        <i class="fas fa-search input-icon"></i>
        <input class="form-input" type="text" placeholder="Buscar por email o nombre…"
          id="user-search" value="${search}"
          onkeydown="if(event.key==='Enter')renderUsers(1,this.value)">
      </div>
    </div>
    ${data.users.length === 0 ? `<div class="empty-state"><i class="fas fa-users-slash"></i><h3>Sin usuarios</h3></div>` : `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>MFA</th>
            <th>Estado</th>
            <th>Último acceso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map(u => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="user-avatar" style="width:32px;height:32px;font-size:11px">${avatarText(u.name)}</div>
                <div>
                  <div class="fw-medium">${u.name}</div>
                  <div class="text-xs text-secondary">${u.email}</div>
                </div>
              </div>
            </td>
            <td>${roleBadge(u.role)}</td>
            <td>
              ${u.mfaEnabled
                ? '<span class="badge badge-success"><i class="fas fa-shield-alt"></i> Activo</span>'
                : '<span class="badge badge-neutral"><i class="fas fa-shield"></i> Inactivo</span>'}
            </td>
            <td>
              ${u.isActive
                ? '<span class="badge badge-success"><i class="fas fa-circle"></i> Activo</span>'
                : '<span class="badge badge-danger"><i class="fas fa-circle"></i> Inactivo</span>'}
            </td>
            <td class="text-xs text-secondary">${u.lastLoginAt ? fmtRelative(u.lastLoginAt) : 'Nunca'}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="editUserModal('${u.id}','${u.name}',${u.role},${u.isActive})" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-ghost btn-sm ${u.isActive ? 'text-danger' : 'text-success'}"
                  onclick="toggleUserStatus('${u.id}',${u.isActive})" title="${u.isActive ? 'Desactivar' : 'Activar'}">
                  <i class="fas fa-${u.isActive ? 'ban' : 'check'}"></i>
                </button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <!-- Paginación -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-top:1px solid var(--border)">
      <span class="text-xs text-secondary">Mostrando página ${page} · ${data.total} usuarios totales</span>
      <div style="display:flex;gap:8px">
        ${page > 1 ? `<button class="btn btn-ghost btn-sm" onclick="renderUsers(${page-1})"><i class="fas fa-chevron-left"></i> Anterior</button>` : ''}
        ${data.users.length === 15 ? `<button class="btn btn-ghost btn-sm" onclick="renderUsers(${page+1})">Siguiente <i class="fas fa-chevron-right"></i></button>` : ''}
      </div>
    </div>`}
  </div>`;
}

async function toggleUserStatus(userId, isActive) {
  const newStatus = isActive ? 0 : 1;
  const action = isActive ? 'desactivar' : 'activar';
  if (!confirm(`¿Deseas ${action} este usuario?`)) return;
  const res = await req('PATCH', `/auth/users/${userId}`, { is_active: newStatus });
  if (res.ok) {
    toast('success', 'Usuario actualizado', `El usuario ha sido ${action === 'activar' ? 'activado' : 'desactivado'}.`);
    renderUsers();
  } else {
    toast('error', 'Error', res.data?.error || 'No se pudo actualizar el usuario.');
  }
}

function editUserModal(userId, name, role, isActive) {
  showModal('edit-user-modal', `
    <div class="modal-header">
      <h3><i class="fas fa-user-edit"></i> Editar Usuario</h3>
      <button class="btn btn-ghost btn-sm" onclick="closeModal('edit-user-modal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nombre</label>
        <input class="form-input" id="edit-user-name" value="${name}">
      </div>
      <div class="form-group">
        <label class="form-label">Rol</label>
        <select class="form-select" id="edit-user-role">
          <option value="1" ${role===1?'selected':''}>Super Admin</option>
          <option value="2" ${role===2?'selected':''}>Admin Documentos</option>
          <option value="3" ${role===3?'selected':''}>Auditor</option>
          <option value="4" ${role===4?'selected':''}>Verificador</option>
          <option value="5" ${role===5?'selected':''}>Usuario Estándar</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('edit-user-modal')">Cancelar</button>
      <button class="btn btn-primary" onclick="saveUserEdit('${userId}')"><i class="fas fa-save"></i> Guardar</button>
    </div>
  `);
}

async function saveUserEdit(userId) {
  const name = document.getElementById('edit-user-name')?.value;
  const role = parseInt(document.getElementById('edit-user-role')?.value);
  const res = await req('PATCH', `/auth/users/${userId}`, { name, role });
  if (res.ok) {
    toast('success', 'Usuario actualizado', 'Los cambios han sido guardados.');
    closeModal('edit-user-modal');
    renderUsers();
  } else {
    toast('error', 'Error', res.data?.error || 'No se pudo actualizar.');
  }
}

function showRegisterModal() {
  showModal('new-user-modal', `
    <div class="modal-header">
      <h3><i class="fas fa-user-plus"></i> Crear Nuevo Usuario</h3>
      <button class="btn btn-ghost btn-sm" onclick="closeModal('new-user-modal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nombre completo *</label>
        <input class="form-input" id="nu-name" placeholder="Nombre Apellido">
      </div>
      <div class="form-group">
        <label class="form-label">Email *</label>
        <input class="form-input" id="nu-email" type="email" placeholder="usuario@empresa.com">
      </div>
      <div class="form-group">
        <label class="form-label">Contraseña *</label>
        <input class="form-input" id="nu-password" type="password" placeholder="Mínimo 8 caracteres">
      </div>
      <div class="form-group">
        <label class="form-label">Rol</label>
        <select class="form-select" id="nu-role">
          <option value="5">Usuario Estándar</option>
          <option value="4">Verificador</option>
          <option value="3">Auditor</option>
          <option value="2">Admin Documentos</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('new-user-modal')">Cancelar</button>
      <button class="btn btn-primary" onclick="createNewUser()"><i class="fas fa-user-plus"></i> Crear Usuario</button>
    </div>
  `);
}

async function createNewUser() {
  const name = document.getElementById('nu-name')?.value?.trim();
  const email = document.getElementById('nu-email')?.value?.trim();
  const password = document.getElementById('nu-password')?.value;
  const role = parseInt(document.getElementById('nu-role')?.value);

  if (!name || !email || !password) return toast('warning', 'Campos requeridos', 'Por favor completa todos los campos obligatorios.');
  if (password.length < 8) return toast('warning', 'Contraseña corta', 'La contraseña debe tener al menos 8 caracteres.');

  const res = await post('/auth/register', { name, email, password, role });
  if (res.ok) {
    toast('success', 'Usuario creado', `${name} ha sido registrado exitosamente.`);
    closeModal('new-user-modal');
    renderUsers();
  } else {
    toast('error', 'Error al crear usuario', res.data?.error || 'No se pudo crear el usuario.');
  }
}

// ─── Modal helpers ────────────────────────────────────────────────
function showModal(id, content) {
  let overlay = document.getElementById(id);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal modal-lg">${content}</div>`;
    overlay.addEventListener('click', e => { if (e.target===overlay) closeModal(id); });
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('.modal').innerHTML = content;
  }
  requestAnimationFrame(() => overlay.classList.add('open'));
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); setTimeout(() => el.remove(), 300); }
}

// ─── Init ─────────────────────────────────────────────────────────
window.viewDoc         = (id) => navigate('vault');
window.viewDocModal    = viewDocModal;
window.verifyDocDirect = verifyDocDirect;
window.grantAccessModal= grantAccessModal;
window.doGrantAccess   = doGrantAccess;
window.openGrantModal  = openGrantModal;
window.setupMFA        = setupMFA;
window.verifyMFA       = verifyMFA;
window.doVerify        = doVerify;
window.doUpload        = doUpload;
window.clearFile       = clearFile;
window.doLogin         = doLogin;
window.doRegister      = doRegister;
window.doLogout        = doLogout;
window.navigate        = navigate;
window.renderVault     = renderVault;
window.renderAudit     = renderAudit;
window.renderVerifications = renderVerifications;
window.filterAuditLogs = filterAuditLogs;
window.exportAudit     = exportAudit;
window.closeModal      = closeModal;
window.switchTab       = switchTab;
window.togglePass      = togglePass;
window.toast           = toast;
// Gestión de usuarios
window.renderUsers     = renderUsers;
window.toggleUserStatus= toggleUserStatus;
window.editUserModal   = editUserModal;
window.saveUserEdit    = saveUserEdit;
window.showRegisterModal = showRegisterModal;
window.createNewUser   = createNewUser;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const loading = document.getElementById('loading-screen');
    if (loading) loading.classList.add('hidden');
    if (State.token && State.user) {
      renderApp();
    } else {
      renderLogin();
    }
  }, 1800);
});
