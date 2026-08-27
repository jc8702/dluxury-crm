import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../db/schema/index.js';

neonConfig.webSocketConstructor = ws;

let _dbInstance: any = null;

export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    if (prop === 'then') return undefined;
    if (!_dbInstance) {
      const databaseUrl = (
        (typeof process !== 'undefined' ? process.env?.DATABASE_URL : '') ||
        (import.meta as any).env?.VITE_DATABASE_URL ||
        ''
      ).replace(/"/g, '');
      if (databaseUrl) {
        const pool = new Pool({ connectionString: databaseUrl });
        _dbInstance = drizzle(pool, { schema });
      }
    }
    if (!_dbInstance) {
      throw new Error('drizzle db instance not initialized for transactions.');
    }
    return Reflect.get(_dbInstance, prop, receiver);
  },
}) as any;
