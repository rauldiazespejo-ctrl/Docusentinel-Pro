import { Hono } from 'hono';
import { z } from 'zod';
import { UserRole } from '../types';
import { AuthService } from '../auth/service';
import { AuditService } from '../audit/service';
import { AuthMiddleware } from '../middleware/auth';
import { SUPERUSER_CONFIG } from '../config/superuser';

const auth = new Hono<{ Bindings: CloudflareBindings }>();
const authService = new AuthService();
const auditService = new AuditService();
const authMiddleware = new AuthMiddleware();

// ─── Esquemas ──────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  mfaToken: z.string().optional()
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).optional()
});

const mfaSchema = z.object({
  token: z.string().length(6).regex(/^\d{6}$/)
});

function getIP(c: any): string {
  return c.req.header('CF-Connecting-IP') ||
         c.req.header('X-Forwarded-For') ||
         'unknown';
}
function getUA(c: any): string {
  return c.req.header('User-Agent') || 'unknown';
}

// ─── POST /login ───────────────────────────────────────────────────
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, mfaToken } = loginSchema.parse(body);
    const ip = getIP(c);
    const ua = getUA(c);
    const jwtSecret = c.env.JWT_SECRET || 'docusentinel-dev-secret-change-in-production-minimum-32-chars';

    // ── Superusuario ──────────────────────────────────────────────
    if (email === SUPERUSER_CONFIG.email) {
      // Soporte para contraseña via env var (producción) o config default (dev)
      const superPassword = (c.env as any).SUPERUSER_PASSWORD || SUPERUSER_CONFIG.password;
      const result = await authService.authenticateSuperuserWithPassword(email, password, superPassword, jwtSecret);
      if (!result) {
        await auditService.logEvent('superuser','LOGIN_FAILED','user',email,{ reason:'bad_password' },ip,ua,c.env.DB);
        return c.json({ success:false, error:'Credenciales inválidas' }, 401);
      }
      // El superusuario no tiene fila en tabla users → no creamos sesión en DB para evitar FK error
      // El token JWT es autocontenido y se valida por firma
      await auditService.logEvent('superuser','LOGIN_SUCCESS','session','superuser',{ method:'superuser' },ip,ua,c.env.DB);
      return c.json({ success:true, data:{ token: result.token, user: result.user } });
    }

    // ── Usuario regular ───────────────────────────────────────────
    const user = await c.env.DB.prepare(
      `SELECT * FROM users WHERE email = ? AND is_active = 1`
    ).bind(email).first();

    if (!user) {
      await auditService.logEvent('anonymous','LOGIN_FAILED','user',email,{ reason:'user_not_found' },ip,ua,c.env.DB);
      return c.json({ success:false, error:'Credenciales inválidas' }, 401);
    }

    const pwOk = await authService.verifyPassword(password, user.password_hash as string);
    if (!pwOk) {
      await auditService.logEvent(user.id as string,'LOGIN_FAILED','user',user.id as string,{ reason:'bad_password' },ip,ua,c.env.DB);
      return c.json({ success:false, error:'Credenciales inválidas' }, 401);
    }

    // MFA
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return c.json({ success:false, error:'Se requiere token MFA', requiresMFA:true }, 400);
      }
      const mfaOk = await authService.verifyTOTP(mfaToken, user.mfa_secret as string);
      if (!mfaOk) {
        await auditService.logEvent(user.id as string,'MFA_FAILED','user',user.id as string,{ reason:'bad_token' },ip,ua,c.env.DB);
        return c.json({ success:false, error:'Token MFA inválido' }, 401);
      }
    }

    // Generar token
    const token = await authService.generateJWT(
      { userId: user.id, email: user.email, role: user.role, mfaVerified: Boolean(user.mfa_enabled) },
      jwtSecret
    );

    // Crear sesión
    const sessId = crypto.randomUUID();
    const tokenHash = await authService.hashData(token);
    const expires = new Date(Date.now() + 24*3600*1000);
    await c.env.DB.prepare(
      `INSERT INTO sessions (id,user_id,token_hash,expires_at,ip_address,user_agent) VALUES (?,?,?,?,?,?)`
    ).bind(sessId, user.id, tokenHash, expires.toISOString(), ip, ua).run();

    // Actualizar last_login
    await c.env.DB.prepare(`UPDATE users SET last_login_at=? WHERE id=?`)
      .bind(new Date().toISOString(), user.id).run();

    await auditService.logEvent(user.id as string,'LOGIN_SUCCESS','session',sessId,{ method:'password', mfa: Boolean(user.mfa_enabled) },ip,ua,c.env.DB);

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mfaEnabled: Boolean(user.mfa_enabled)
        }
      }
    });

  } catch (err: any) {
    if (err?.issues) return c.json({ success:false, error:'Datos inválidos' }, 400);
    console.error('Login error:', err);
    return c.json({ success:false, error:'Error interno' }, 500);
  }
});

// ─── POST /register ────────────────────────────────────────────────
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, password, role = UserRole.USUARIO_ESTANDAR } = registerSchema.parse(body);
    const ip = getIP(c);
    const ua = getUA(c);

    const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
    if (existing) return c.json({ success:false, error:'El usuario ya existe' }, 400);

    const passwordHash = await authService.hashPassword(password);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO users (id,email,name,role,password_hash,is_active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)`
    ).bind(userId, email, name, role, passwordHash, now, now).run();

    await auditService.logEvent(userId,'USER_CREATED','user',userId,{ email, name, role },ip,ua,c.env.DB);

    return c.json({ success:true, message:'Usuario creado exitosamente', data:{ userId, email, name } });

  } catch (err: any) {
    if (err?.issues) return c.json({ success:false, error:'Datos inválidos' }, 400);
    console.error('Register error:', err);
    return c.json({ success:false, error:'Error al registrar usuario' }, 500);
  }
});

// ─── GET /profile ──────────────────────────────────────────────────
auth.get('/profile', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    return c.json({
      success: true,
      data: {
        id: user.id, email: user.email, name: user.name,
        role: user.role, mfaEnabled: user.mfaEnabled, createdAt: user.createdAt
      }
    });
  } catch (err) {
    return c.json({ success:false, error:'Error al obtener perfil' }, 500);
  }
});

// ─── POST /mfa/setup ───────────────────────────────────────────────
auth.post('/mfa/setup', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const ip = getIP(c); const ua = getUA(c);

    const { secret, qrCode } = await authService.generateTOTPSecret(user.email);

    await c.env.DB.prepare(`UPDATE users SET mfa_secret=?, mfa_type='totp', mfa_enabled=0 WHERE id=?`)
      .bind(secret, user.id).run();

    await auditService.logEvent(user.id,'MFA_SETUP_INITIATED','user',user.id,{ type:'totp' },ip,ua,c.env.DB);

    return c.json({ success:true, data:{ secret, qrCode } });
  } catch (err) {
    console.error('MFA setup error:', err);
    return c.json({ success:false, error:'Error al configurar MFA' }, 500);
  }
});

// ─── POST /mfa/verify ──────────────────────────────────────────────
auth.post('/mfa/verify', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const ip = getIP(c); const ua = getUA(c);
    const { token } = mfaSchema.parse(await c.req.json());

    // Obtener secreto actualizado desde DB
    const dbUser = await c.env.DB.prepare(`SELECT mfa_secret FROM users WHERE id=?`).bind(user.id).first();
    const secret = dbUser?.mfa_secret as string;

    const isValid = await authService.verifyTOTP(token, secret);
    if (!isValid) {
      await auditService.logEvent(user.id,'MFA_VERIFICATION_FAILED','user',user.id,{},ip,ua,c.env.DB);
      return c.json({ success:false, error:'Token MFA inválido' }, 400);
    }

    await c.env.DB.prepare(`UPDATE users SET mfa_enabled=1 WHERE id=?`).bind(user.id).run();
    await auditService.logEvent(user.id,'MFA_VERIFIED','user',user.id,{},ip,ua,c.env.DB);

    return c.json({ success:true, message:'MFA activado exitosamente' });
  } catch (err: any) {
    if (err?.issues) return c.json({ success:false, error:'Token inválido' }, 400);
    return c.json({ success:false, error:'Error al verificar MFA' }, 500);
  }
});

// ─── POST /logout ──────────────────────────────────────────────────
auth.post('/logout', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const ip = getIP(c); const ua = getUA(c);
    const token = authMiddleware.extractToken(c);

    if (token) {
      const tokenHash = await authService.hashData(token);
      await c.env.DB.prepare(`DELETE FROM sessions WHERE user_id=? AND token_hash=?`)
        .bind(user.id, tokenHash).run();
    }

    await auditService.logEvent(user.id,'LOGOUT','session',user.id,{},ip,ua,c.env.DB);
    return c.json({ success:true, message:'Sesión cerrada exitosamente' });
  } catch (err) {
    return c.json({ success:false, error:'Error al cerrar sesión' }, 500);
  }
});

// ─── POST /change-password ─────────────────────────────────────────
auth.post('/change-password', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const ip = getIP(c); const ua = getUA(c);
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return c.json({ success:false, error:'Datos inválidos' }, 400);
    }

    const dbUser = await c.env.DB.prepare(`SELECT password_hash FROM users WHERE id=?`).bind(user.id).first();
    const valid = await authService.verifyPassword(currentPassword, dbUser?.password_hash as string);
    if (!valid) return c.json({ success:false, error:'Contraseña actual incorrecta' }, 401);

    const newHash = await authService.hashPassword(newPassword);
    await c.env.DB.prepare(`UPDATE users SET password_hash=?, updated_at=? WHERE id=?`)
      .bind(newHash, new Date().toISOString(), user.id).run();

    await auditService.logEvent(user.id,'PASSWORD_CHANGED','user',user.id,{},ip,ua,c.env.DB);
    return c.json({ success:true, message:'Contraseña actualizada exitosamente' });
  } catch (err) {
    return c.json({ success:false, error:'Error al cambiar contraseña' }, 500);
  }
});

// ─── PUT /profile ─────────────────────────────────────────────────
auth.put('/profile', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    const ip = getIP(c); const ua = getUA(c);
    const { name } = await c.req.json();
    if (!name || name.trim().length < 2) return c.json({ success:false, error:'Nombre inválido' }, 400);

    await c.env.DB.prepare(`UPDATE users SET name=?, updated_at=? WHERE id=?`)
      .bind(name.trim(), new Date().toISOString(), user.id).run();

    await auditService.logEvent(user.id,'PROFILE_UPDATED','user',user.id,{ name },ip,ua,c.env.DB);
    return c.json({ success:true, message:'Perfil actualizado', data:{ name: name.trim() } });
  } catch (err) {
    return c.json({ success:false, error:'Error al actualizar perfil' }, 500);
  }
});

// ─── DELETE /users/:id (admin) ─────────────────────────────────────
auth.delete('/users/:id', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const actor = c.get('user');
    if (actor.role > 2) return c.json({ success: false, error: 'Permisos insuficientes' }, 403);
    const userId = c.req.param('id');
    if (userId === actor.id) return c.json({ success: false, error: 'No puedes eliminarte a ti mismo' }, 400);
    const ip = getIP(c); const ua = getUA(c);

    const target = await c.env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first();
    if (!target) return c.json({ success: false, error: 'Usuario no encontrado' }, 404);

    // Eliminar sesiones del usuario
    await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
    // Desactivar (no borrar para mantener integridad del audit)
    await c.env.DB.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), userId).run();

    await auditService.logEvent(actor.id, 'USER_DELETED', 'user', userId,
      { email: target.email }, ip, ua, c.env.DB);

    return c.json({ success: true, message: 'Usuario desactivado correctamente' });
  } catch (err) {
    return c.json({ success: false, error: 'Error al eliminar usuario' }, 500);
  }
});

// ─── GET /users (admin) ───────────────────────────────────────────
auth.get('/users', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const user = c.get('user');
    if (user.role > 2) return c.json({ success: false, error: 'Permisos insuficientes' }, 403);

    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const pageSize = Math.min(50, parseInt(c.req.query('pageSize') || '20'));
    const search = c.req.query('search') || '';
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const params: any[] = [];
    if (search) {
      where += ' AND (email LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const results = await c.env.DB.prepare(
      `SELECT id, email, name, role, mfa_enabled, is_active, last_login_at, created_at
       FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all();

    const countRow = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM users WHERE ${where}`
    ).bind(...params).first();

    return c.json({ success: true, data: {
      users: results.results.map((u: any) => ({
        id: u.id, email: u.email, name: u.name, role: u.role,
        mfaEnabled: Boolean(u.mfa_enabled), isActive: Boolean(u.is_active),
        lastLoginAt: u.last_login_at, createdAt: u.created_at
      })),
      total: (countRow?.total as number) || 0,
      page, pageSize
    }});
  } catch (err) {
    console.error('List users error:', err);
    return c.json({ success: false, error: 'Error al listar usuarios' }, 500);
  }
});

// ─── PATCH /users/:id (admin - cambiar rol/estado) ─────────────────
auth.patch('/users/:id', authMiddleware.authenticate.bind(authMiddleware), async (c) => {
  try {
    const actor = c.get('user');
    if (actor.role > 2) return c.json({ success: false, error: 'Permisos insuficientes' }, 403);

    const userId = c.req.param('id');
    const body = await c.req.json();
    const ip = getIP(c); const ua = getUA(c);

    const allowedFields = ['role', 'is_active', 'name'];
    const updates: string[] = [];
    const params: any[] = [];

    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(body[f]);
      }
    }

    if (updates.length === 0) return c.json({ success: false, error: 'Nada que actualizar' }, 400);

    updates.push('updated_at = ?');
    params.push(new Date().toISOString(), userId);

    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    await auditService.logEvent(actor.id, 'USER_UPDATED', 'user', userId,
      { changes: body }, ip, ua, c.env.DB);

    return c.json({ success: true, message: 'Usuario actualizado' });
  } catch (err) {
    return c.json({ success: false, error: 'Error al actualizar usuario' }, 500);
  }
});

export default auth;
