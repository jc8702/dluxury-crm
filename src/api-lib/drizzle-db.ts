import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../db/schema/index.js';
import { logger } from './logger.js';

neonConfig.webSocketConstructor = ws;

const databaseUrl = (
  (typeof process !== 'undefined' ? process.env?.DATABASE_URL : '') ||
  (import.meta as any).env?.VITE_DATABASE_URL ||
  ''
).replace(/"/g, '');

// Detecção de runtime sem citar globais de browser: este módulo também é
// importado por código de cliente (src/lib/db.ts, RetalhosRepository) e um
// `typeof window` aqui seria um erro de lint (no-restricted-globals) por ser
// exatamente o padrão que esconde ReferenceError no servidor.
const isServerRuntime = typeof process !== 'undefined' && !!process.versions?.node;

if (!databaseUrl && isServerRuntime) {
  logger.warn('DATABASE_URL ausente no ambiente de servidor.');
}

// Inicializa apenas se houver URL.
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
export const db = pool ? drizzle(pool, { schema }) : (null as any);
