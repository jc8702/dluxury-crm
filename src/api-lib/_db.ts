import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || '';

// Criamos uma função proxy para o sql para evitar o crash no import top-level
// O neon() do @neondatabase/serverless retorna uma função de query.
let _sqlInstance: any = null;

export const sql = (strings: any, ...values: any[]) => {
  if (!dbUrl) {
    console.error('❌ ERRO CRÍTICO: DATABASE_URL não está configurada na Vercel.');
    throw new Error('Configuração de Banco de Dados ausente.');
  }
  if (!_sqlInstance) {
    _sqlInstance = neon(dbUrl);
  }
  return _sqlInstance(strings, ...values);
};


import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.APP_JWT_SECRET || 'dluxury-industrial-secret-2024';

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

