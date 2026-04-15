import { sql, extractAndVerifyToken } from './lib/_db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.VITE_SUPABASE_ANON_KEY || 'dluxury-secret-key-2024';

export default async function handler(req: any, res: any) {
  const action = req.query.action || 'login';

  if (req.method === 'POST') {
    if (action === 'login') {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });

      try {
        const users = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (users.length === 0) {
          return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        
        if (!valid) {
          return res.status(401).json({ error: 'Senha incorreta' });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, name: user.name },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.status(200).json({
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }

    if (action === 'register') {
      // Somente admin pode criar novos usuários
      const { user: requestingUser, error } = extractAndVerifyToken(req);
      if (error || requestingUser?.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores podem criar usuários' });
      }

      const { name, email, password, role } = req.body;
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      try {
        const check = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (check.length > 0) return res.status(400).json({ error: 'E-mail já está em uso' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const result = await sql`
          INSERT INTO users (name, email, password_hash, role)
          VALUES (${name}, ${email}, ${hash}, ${role})
          RETURNING id, name, email, role
        `;

        return res.status(201).json(result[0]);
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }
  }

  if (req.method === 'GET' && action === 'me') {
    const { user, error } = extractAndVerifyToken(req);
    if (error) return res.status(401).json({ error });
    return res.status(200).json({ user });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
