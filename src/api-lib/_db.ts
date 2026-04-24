import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const dbUrl = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.APP_JWT_SECRET || 'dluxury-industrial-secret-2024';

let _neonInstance: any = null;

// Interface para satisfazer o TypeScript no Vercel/Financeiro
interface SqlClient {
  (strings: any, ...values: any[]): Promise<any>;
  begin: (callback: (tx: any) => Promise<any>) => Promise<any>;
}

const sqlInstance = (strings: any, ...values: any[]) => {
  if (!dbUrl) {
    throw new Error('DATABASE_URL ausente no ambiente Vercel.');
  }
  if (!_neonInstance) {
    _neonInstance = neon(dbUrl);
  }

  // NÃO normalizar - manter casing original
  if (Array.isArray(strings)) {
    return _neonInstance(strings, ...values);
  }
  return _neonInstance(strings);
};

// Atribuição de propriedades dinâmicas
(sqlInstance as any).begin = async (callback: (tx: any) => Promise<any>) => {
  return await callback(sqlInstance);
};

export const sql = sqlInstance as any as SqlClient;

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
    return { authorized: false, user: null, error };
  }
  return { 
    authorized: true, 
    user, 
    error: null 
  };
};
