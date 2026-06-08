import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { logger } from './logger.js';

const dbUrl = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.APP_JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('APP_JWT_SECRET environment variable is required');
}

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
  if (Array.isArray(strings) && (strings as any).raw) {
    return _neonInstance(strings as any, ...values);
  }

  // Se for chamado como função (legado ou raw string)
  let params = values;
  if (values.length === 1 && Array.isArray(values[0])) {
    params = values[0];
  }
  return _neonInstance.query(strings, params);
};

// Atribuição de propriedades dinâmicas
(sqlInstance as any).query = (strings: any, ...values: any[]) => {
  if (!_neonInstance) _neonInstance = neon(dbUrl);
  let params = values;
  if (values.length === 1 && Array.isArray(values[0])) {
    params = values[0];
  }
  return _neonInstance.query(strings, params);
};

import { db } from './drizzle-db.js';
import { sql as drizzleSql } from 'drizzle-orm';

// Atribuição de propriedades dinâmicas
(sqlInstance as any).begin = async (callback: (tx: any) => Promise<any>) => {
  if (!db) {
    throw new Error('drizzle db instance not initialized for transactions.');
  }

  return await db.transaction(async (drizzleTx: any) => {
    const tx = async (strings: any, ...values: any[]) => {
      if (Array.isArray(strings) && (strings as any).raw) {
        const query = drizzleSql(strings as any, ...values);
        const result = await drizzleTx.execute(query);
        return result.rows || result;
      }

      let params = values;
      if (values.length === 1 && Array.isArray(values[0])) {
        params = values[0];
      }

      // Quando usado como função bruta (tx('SELECT...', [param]))
      // No Neon serverless, tx.session.client é a PoolClient ou usamos tx.execute(sql.raw(strings))
      // Mas o params.length > 0 exige bind seguro
      if (params.length === 0) {
        const result = await drizzleTx.execute(drizzleSql.raw(strings));
        return result.rows || result;
      } else {
        // Se precisar suportar raw SQL com parametros, converte para template manualmente
        let text = strings;
        params.forEach((p: any, i: number) => {
          text = text.replace('$' + (i + 1), '$$' + (i + 1)); // Drizzle usa syntax diferente? Não, SQL puro.
        });
        throw new Error(
          'Raw queries com parâmetros não são suportados dentro do transaction wrapper (use tagged template tx`...`)',
        );
      }
    };

    // Suporte caso alguém use tx.join
    (tx as any).join = (values: any[], separator?: any) =>
      drizzleSql.join(values, separator || drizzleSql`, `);

    return await callback(tx);
  });
};

(sqlInstance as any).join = (values: any[], separator?: any) =>
  drizzleSql.join(values, separator || drizzleSql`, `);

export const sql = sqlInstance as any as SqlClient;

export const extractAndVerifyToken = (req: any) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'Token não fornecido ou inválido' };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;

    return { user: decoded, error: null };
  } catch {
    return { user: null, error: 'Sessão expirada ou inválida' };
  }
};
export const validateAuth = (req: any) => {
  const { user, error } = extractAndVerifyToken(req);
  if (error) {
    return { authorized: false, user: null, error };
  }
  if (!user) {
    return { authorized: false, user: null, error: 'Token inválido' };
  }
  return {
    authorized: true,
    user,
    error: null,
  };
};

/**
 * Resolve o tenant a partir do domínio da requisição (Host header).
 * 1. Verifica dominio_personalizado (match exato)
 * 2. Verifica subdominio (ex: artemadeira.dominioapp.com)
 * Retorna o tenant ou null se não encontrado.
 */
export async function resolveTenantByDomain(
  host: string,
): Promise<{ id: string; nome: string; subdominio: string | null } | null> {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase().trim();

  // 1. Match exato por dominio_personalizado
  const byDomain = await sql`
    SELECT id, nome, subdominio FROM tenants 
    WHERE LOWER(dominio_personalizado) = ${hostname} 
    LIMIT 1
  `;
  if (byDomain.length > 0) return byDomain[0];

  // 2. Match por subdominio (extrai o prefixo do domínio principal)
  const appDomain = process.env.APP_DOMAIN || 'dluxury-crm.vercel.app';
  if (hostname.endsWith('.' + appDomain)) {
    const subdomain = hostname.slice(0, -(appDomain.length + 1));
    if (subdomain) {
      const bySub = await sql`
        SELECT id, nome, subdominio FROM tenants 
        WHERE LOWER(subdominio) = ${subdomain} 
        LIMIT 1
      `;
      if (bySub.length > 0) return bySub[0];
    }
  }

  return null;
}

/**
 * Registra uma ação no audit_log
 */
export async function auditLog(
  entity_type: string,
  entity_id: string,
  action: string,
  user_id: string | null,
  data_before: any = null,
  data_after: any = null,
) {
  try {
    await sql`
      INSERT INTO audit_logs (entity_type, entity_id, action, user_id, data_before, data_after)
      VALUES (${entity_type}, ${entity_id}, ${action}, ${user_id}, ${JSON.stringify(data_before)}, ${JSON.stringify(data_after)})
    `;
  } catch (e: any) {
    logger.error('Audit Log Error:', e.message);
  }
}
