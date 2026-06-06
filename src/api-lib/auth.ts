import { sql } from './_db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { withTenantSql } from './db/withTenant.js';

const JWT_SECRET: string = process.env.APP_JWT_SECRET ?? '';
if (!JWT_SECRET) {
  throw new Error('APP_JWT_SECRET environment variable is required');
}

// =====================================================================
// Public: login (does NOT need a tenant context — user is acquiring one)
// =====================================================================

async function handleLogin(req: any, res: any): Promise<any> {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
  }
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Formato inválido' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254) {
    return res.status(400).json({ success: false, error: 'Email muito longo' });
  }
  const tenantFromDomain = req.tenantFromDomain;
  if (tenantFromDomain) {
    const users = await sql`
      SELECT u.id, u.name, u.email, u.role, u.password_hash, u.tenant_id, t.plano_tier
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = ${normalizedEmail} AND u.tenant_id = ${tenantFromDomain.id}::uuid
    `;
    if (users.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: 'Usuário não encontrado neste domínio' });
    }
    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }
    const planoTier = (user.plano_tier as string | null) || 'basic';
    const tenantId = String(user.tenant_id);
    const tokenPayload = {
      id: String(user.id),
      email: String(user.email),
      role: String(user.role),
      name: String(user.name),
      tenantId,
      planoTier,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({
      success: true,
      data: {
        token,
        tenant: tenantFromDomain,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId,
          planoTier,
        },
      },
    });
  }

  // Fallback: login sem domínio específico (dev / domínio principal)
  const users = await sql`
    SELECT u.id, u.name, u.email, u.role, u.password_hash, u.tenant_id, t.plano_tier
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email = ${normalizedEmail}
  `;
  if (users.length === 0) {
    return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
  }
  const user = users[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Senha incorreta' });
  }
  const planoTier = (user.plano_tier as string | null) || 'basic';
  const tenantId = String(user.tenant_id);
  const tokenPayload = {
    id: String(user.id),
    email: String(user.email),
    role: String(user.role),
    name: String(user.name),
    tenantId,
    planoTier,
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
  return res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        planoTier,
      },
    },
  });
}

// =====================================================================
// Protected: register a new user in the same tenant (admin only)
// =====================================================================

const registerHandler: TenantHandler = async (req, res) => {
  if (req.tenantUser.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ success: false, error: 'Campos obrigatórios: name, email, password, role' });
  }
  const tdb = withTenantSql({ tenantId: req.tenantId }, sql as any);
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const result = await tdb.query`
    INSERT INTO users (name, email, password_hash, role, tenant_id)
    VALUES (${name}, ${email}, ${hash}, ${role}, ${tdb.tenantId}::uuid)
    RETURNING id, name, email, role, tenant_id
  `;
  return res.status(201).json({ success: true, data: result[0] });
};

const registerWithTenant = withTenant(registerHandler);

// =====================================================================
// Protected: GET /api/auth?action=me
// =====================================================================

const meHandler: TenantHandler = async (req, res) => {
  const tdb = withTenantSql({ tenantId: req.tenantId }, sql as any);
  const tenantRes = await tdb.query`
    SELECT plano_tier, subdominio FROM tenants WHERE id = ${tdb.tenantId}::uuid LIMIT 1
  `;
  const planoTier = tenantRes[0]?.plano_tier || 'basic';
  const subdominio = tenantRes[0]?.subdominio || '';
  const enrichedUser = {
    id: req.tenantUser.id,
    email: req.tenantUser.email,
    role: req.tenantUser.role,
    name: req.tenantUser.name,
    tenantId: req.tenantId,
    planoTier,
    subdominio,
  };
  return res.status(200).json({ success: true, data: { user: enrichedUser } });
};

const meWithTenant = withTenant(meHandler);

// =====================================================================
// Dispatcher
// =====================================================================

export async function handleAuth(req: any, res: any): Promise<any> {
  try {
    const action = req.query.action || 'login';
    if (req.method === 'POST') {
      if (action === 'login') {
        return await handleLogin(req, res);
      }
      if (action === 'register') {
        return await registerWithTenant(req, res);
      }
    }
    if (req.method === 'GET' && action === 'me') {
      return await meWithTenant(req, res);
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// =====================================================================
// Users CRUD (admin only) — uses withTenant for every action
// =====================================================================

const usersListHandler: TenantHandler = async (req, res) => {
  if (req.tenantUser.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  const tdb = withTenantSql({ tenantId: req.tenantId }, sql as any);
  const result = await tdb.query`
    SELECT id, name, email, role, created_at, tenant_id
    FROM users
    WHERE tenant_id = ${tdb.tenantId}
    ORDER BY name ASC
  `;
  return res.status(200).json({ success: true, data: result });
};

const usersUpdateHandler: TenantHandler = async (req, res) => {
  if (req.tenantUser.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  const { id } = req.query;
  const { name, email, role, password } = req.body;
  const targetId = id || req.tenantUser.id;
  if (!targetId) {
    return res.status(400).json({ success: false, error: 'ID do usuário não identificado' });
  }
  const tdb = withTenantSql({ tenantId: req.tenantId }, sql as any);
  if (password) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    await tdb.query`
      UPDATE users SET password_hash = ${hash}
      WHERE id = ${targetId}::uuid AND tenant_id = ${tdb.tenantId}::uuid
    `;
  }
  const result = await tdb.query`
    UPDATE users SET
      name = COALESCE(${name}, name),
      email = COALESCE(${email}, email),
      role = COALESCE(${role}, role)
    WHERE id = ${targetId}::uuid AND tenant_id = ${tdb.tenantId}::uuid
    RETURNING id, name, email, role
  `;
  if (result.length === 0) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado no seu tenant' });
  }
  return res.status(200).json({ success: true, data: result[0] });
};

const usersDeleteHandler: TenantHandler = async (req, res) => {
  if (req.tenantUser.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  const { id } = req.query;
  const tdb = withTenantSql({ tenantId: req.tenantId }, sql as any);
  await tdb.query`
    DELETE FROM users WHERE id = ${id}::uuid AND tenant_id = ${tdb.tenantId}::uuid
  `;
  return res.status(200).json({ success: true });
};

const usersListWithTenant = withTenant(usersListHandler);
const usersUpdateWithTenant = withTenant(usersUpdateHandler);
const usersDeleteWithTenant = withTenant(usersDeleteHandler);

export async function handleUsers(req: any, res: any): Promise<any> {
  try {
    if (req.method === 'GET') return await usersListWithTenant(req, res);
    if (req.method === 'PATCH') return await usersUpdateWithTenant(req, res);
    if (req.method === 'DELETE') return await usersDeleteWithTenant(req, res);
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
