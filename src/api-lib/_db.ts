import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.APP_JWT_SECRET || 'dluxury-industrial-secret-2024';

// Exportação simples e direta para evitar problemas de Proxy em ambiente Serverless
export const sql = dbUrl ? neon(dbUrl) : ((strings: any) => {
  throw new Error('DATABASE_URL não configurada no ambiente.');
}) as any;

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
  // BYPASS DE SEGURANÇA (Modo Desenvolvimento/Teste)
  // Como a tela de login foi removida, liberamos o acesso automático.
  return { 
    authorized: true, 
    user: { id: 'admin-bypass', name: 'Administrador (Bypass)', role: 'admin' }, 
    error: null 
  };
};

