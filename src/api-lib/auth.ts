import { sql, extractAndVerifyToken } from './_db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthenticatedUser, ApiResponse } from './types.js';

const JWT_SECRET = process.env.APP_JWT_SECRET || 'dluxury-industrial-secret-2024';

export async function handleAuth(req: any, res: any): Promise<void> {
  try {
    const action = req.query.action || 'login';
    if (req.method === 'POST') {
      if (action === 'login') {
        const { email, password } = req.body;
        const normalizedEmail = String(email).trim().toLowerCase();
        const users = await sql`SELECT * FROM users WHERE email = ${normalizedEmail}`;
        if (users.length === 0) return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success: false, error: 'Senha incorreta' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
      }
      if (action === 'register') {
        const { user: requestingUser, error } = extractAndVerifyToken(req);
        if (error || requestingUser?.role !== 'admin') return res.status(403).json({ success: false, error: 'Acesso negado' });
        const { name, email, password, role } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const result = await sql`INSERT INTO users (name, email, password_hash, role) VALUES (${name}, ${email}, ${hash}, ${role}) RETURNING id, name, email, role`;
        return res.status(201).json({ success: true, data: result[0] });
      }
    }
    if (req.method === 'GET' && action === 'me') {
      const { user, error } = extractAndVerifyToken(req);
      if (error) return res.status(401).json({ success: false, error });
      return res.status(200).json({ success: true, data: { user } });
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
      const result = await sql`SELECT id, name, email, role, created_at FROM users ORDER BY name ASC`;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { name, email, role } = req.body;
      const result = await sql`UPDATE users SET name = COALESCE(${name}, name), email = COALESCE(${email}, email), role = COALESCE(${role}, role) WHERE id = ${id} RETURNING id, name, email, role`;
      return res.status(200).json({ success: true, data: result[0] });
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await sql`DELETE FROM users WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
