import { sql, extractAndVerifyToken } from './_db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.APP_JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('APP_JWT_SECRET environment variable is required');
}

export async function handleAuth(req: any, res: any): Promise<void> {
  try {
    const action = req.query.action || 'login';
    if (req.method === 'POST') {
      if (action === 'login') {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
        if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ success: false, error: 'Formato inválido' });
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail.length > 254) return res.status(400).json({ success: false, error: 'Email muito longo' });
        // Se a requisição veio de um domínio específico, restringe o login a usuários desse tenant
        const tenantFromDomain = req.tenantFromDomain;
        if (tenantFromDomain) {
          const users = await sql`
            SELECT u.id, u.name, u.email, u.role, u.password_hash, u.tenant_id, t.plano_tier 
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            WHERE u.email = ${normalizedEmail} AND u.tenant_id = ${tenantFromDomain.id}::uuid
          `;
          if (users.length === 0) return res.status(401).json({ success: false, error: 'Usuário não encontrado neste domínio' });
          const user = users[0];
          const valid = await bcrypt.compare(password, user.password_hash);
          if (!valid) return res.status(401).json({ success: false, error: 'Senha incorreta' });
          
          const planoTier = user.plano_tier || 'basic';
          const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenant_id, planoTier }, JWT_SECRET, { expiresIn: '7d' });
          return res.status(200).json({ success: true, data: { token, tenant: tenantFromDomain, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenant_id, planoTier } } });
        }

        // Fallback: login sem domínio específico (domínio principal ou dev)
        const users = await sql`
          SELECT u.id, u.name, u.email, u.role, u.password_hash, u.tenant_id, t.plano_tier 
          FROM users u
          JOIN tenants t ON u.tenant_id = t.id
          WHERE u.email = ${normalizedEmail}
        `;
        if (users.length === 0) return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success: false, error: 'Senha incorreta' });
        
        const planoTier = user.plano_tier || 'basic';
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenant_id, planoTier }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenant_id, planoTier } } });
      }
      if (action === 'register') {
        const { user: requestingUser, error } = extractAndVerifyToken(req);
        if (error || requestingUser?.role !== 'admin') return res.status(403).json({ success: false, error: 'Acesso negado' });
        const { name, email, password, role } = req.body;
        const tenantId = requestingUser.tenantId || '00000000-0000-0000-0000-000000000000';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const result = await sql`INSERT INTO users (name, email, password_hash, role, tenant_id) VALUES (${name}, ${email}, ${hash}, ${role}, ${tenantId}) RETURNING id, name, email, role, tenant_id`;
        return res.status(201).json({ success: true, data: result[0] });
      }
    }
    if (req.method === 'GET' && action === 'me') {
      const { user, error } = extractAndVerifyToken(req);
      if (error) return res.status(401).json({ success: false, error });
      
      // Buscar plano_tier do banco de dados para garantir valor atualizado
      const tenantRes = await sql`SELECT plano_tier FROM tenants WHERE id = ${user.tenantId}::uuid LIMIT 1`;
      const planoTier = tenantRes[0]?.plano_tier || 'basic';
      
      const enrichedUser = {
        ...user,
        planoTier
      };
      
      return res.status(200).json({ success: true, data: { user: enrichedUser } });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleUsers(req: any, res: any): Promise<void> {
  try {
    const { user: requestingUser, error } = extractAndVerifyToken(req);
    if (error || requestingUser?.role !== 'admin') return res.status(403).json({ success: false, error: 'Acesso negado' });
    
    if (req.method === 'GET') {
      const tenantId = requestingUser.tenantId || '00000000-0000-0000-0000-000000000000';
      const result = await sql`SELECT id, name, email, role, created_at, tenant_id FROM users WHERE tenant_id = ${tenantId} ORDER BY name ASC`;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { name, email, role, password } = req.body;
      const tenantId = requestingUser.tenantId || '00000000-0000-0000-0000-000000000000';
      // Se nenhum id for passado, atualiza o próprio usuário logado (self-update de perfil)
      const targetId = id || requestingUser.id;
      if (!targetId) return res.status(400).json({ success: false, error: 'ID do usuário não identificado' });
      // Se vier nova senha, gera hash e atualiza
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${targetId}::uuid AND tenant_id = ${tenantId}::uuid`;
      }
      const result = await sql`UPDATE users SET name = COALESCE(${name}, name), email = COALESCE(${email}, email), role = COALESCE(${role}, role) WHERE id = ${targetId}::uuid AND tenant_id = ${tenantId}::uuid RETURNING id, name, email, role`;
      if (result.length === 0) return res.status(404).json({ success: false, error: 'Usuário não encontrado no seu tenant' });
      return res.status(200).json({ success: true, data: result[0] });
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const tenantId = requestingUser.tenantId || '00000000-0000-0000-0000-000000000000';
      await sql`DELETE FROM users WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
