import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DATABASE_URL=["']?(.+?)["']?(\n|$)/);
      if (match) dbUrl = match[1];
    }
  } catch (err) {
    console.error('Error reading .env manually:', err);
  }
}

if (!dbUrl) {
  throw new Error('DATABASE_URL is missing in environment variables and .env file');
}

export const sql = neon(dbUrl);


import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.VITE_SUPABASE_ANON_KEY || 'dluxury-secret-key-2024';

export const extractAndVerifyToken = (req: any) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'Token não fornecido ou inválido' };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return { user: decoded, error: null };
  } catch (e: any) {
    return { user: null, error: 'Sessão expirada ou inválida' };
  }
};

export const validateAuth = (req: any) => {
  const { user, error } = extractAndVerifyToken(req);
  if (error) {
    return { authorized: false, error };
  }
  return { authorized: true, user, error: null };
};
