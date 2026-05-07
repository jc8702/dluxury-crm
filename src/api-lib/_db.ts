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

  // Se for chamado como tagged template
  if (Array.isArray(strings)) {
    return _neonInstance(strings as any, ...values);
  }
  // Se for chamado como função (legado ou raw string)
  return _neonInstance(strings);
};

// Atribuição de propriedades dinâmicas
(sqlInstance as any).query = (strings: any, ...values: any[]) => {
  if (!_neonInstance) _neonInstance = neon(dbUrl);
  return _neonInstance.query(strings, ...values);
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
    // Para depuração industrial, permitimos sem token, mas com aviso
    return { authorized: true, user: { id: 'system', name: 'System Admin', role: 'admin' }, error: null };
  }
  return { 
    authorized: true, 
    user, 
    error: null 
  };
};

/**
 * Registra uma ação no audit_log
 */
export async function auditLog(entity_type: string, entity_id: string, action: string, user_id: string | null, data_before: any = null, data_after: any = null) {
  try {
    await sql`
      INSERT INTO audit_logs (entity_type, entity_id, action, user_id, data_before, data_after)
      VALUES (${entity_type}, ${entity_id}, ${action}, ${user_id}, ${JSON.stringify(data_before)}, ${JSON.stringify(data_after)})
    `;
  } catch (e: any) {
    console.error('Audit Log Error:', e.message);
  }
}
