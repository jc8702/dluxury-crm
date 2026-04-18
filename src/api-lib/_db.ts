import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || '';

if (!dbUrl && typeof window === 'undefined') {
  console.warn('⚠️ ATENÇÃO: DATABASE_URL não encontrada. Banco de dados desativado.');
}

// O neon() aceita a string vazia mas vai falhar na query, 
// o que é melhor que quebrar o import de todo o servidor.
export const sql = neon(dbUrl);


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

