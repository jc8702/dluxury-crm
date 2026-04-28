import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema/planos-de-corte.js';

const databaseUrl = (
  (typeof process !== 'undefined' ? process.env?.DATABASE_URL : '') || 
  (import.meta as any).env?.VITE_DATABASE_URL || 
  ''
).replace(/"/g, '');

if (!databaseUrl && typeof window === 'undefined') {
  console.warn('DATABASE_URL ausente no ambiente de servidor.');
}

// Inicializa apenas se houver URL. No frontend (browser), databaseUrl será vazia
// mas o Repositório irá redirecionar para a API, então não há problema em 'db' ser null.
export const db = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null as any;
