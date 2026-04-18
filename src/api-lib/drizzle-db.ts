import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../db/schema/planos-de-corte.js';

const databaseUrl = process.env.DATABASE_URL?.replace(/"/g, '') || '';

if (!databaseUrl) {
  console.warn('DATABASE_URL ausente no ambiente Vercel.');
}

const client = neon(databaseUrl);
export const db = drizzle(client, { schema });
