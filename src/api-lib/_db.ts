import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.APP_JWT_SECRET || 'dluxury-industrial-secret-2024';

// Inicialização Lazy Total: O driver só é carregado no momento exato da query.
// Isso evita que erros na URL derrubem o servidor globalmente.
let _neonInstance: any = null;

export const sql = (strings: any, ...values: any[]) => {
  if (!dbUrl) {
    throw new Error('DATABASE_URL ausente no ambiente Vercel.');
  }
  if (!_neonInstance) {
    _neonInstance = neon(dbUrl);
  }
  return _neonInstance(strings, ...values);
};

// Adiciona suporte a transação (simulada via reuso da instância para compilar)
(sql as any).begin = async (callback: (tx: any) => Promise<any>) => {
  // O driver neon HTTP é stateless, então rodamos as queries individualmente mas 
  // usando a mesma interface sql para que o código de transação não quebre.
  return await callback(sql);
};

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

