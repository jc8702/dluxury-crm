import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../db/schema/index.js';

neonConfig.webSocketConstructor = ws;

const databaseUrl = (
  (typeof process !== 'undefined' ? process.env?.DATABASE_URL : '') || 
  (import.meta as any).env?.VITE_DATABASE_URL || 
  ''
).replace(/"/g, '');

if (!databaseUrl && typeof window === 'undefined') {
  console.warn('DATABASE_URL ausente no ambiente de servidor.');
}

// Inicializa apenas se houver URL.
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
export const db = pool ? drizzle(pool, { schema }) : null as any;
