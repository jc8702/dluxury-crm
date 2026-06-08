import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import dotenv from 'dotenv';
import { sql } from '../api-lib/_db.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

// Garantir fallback para sql.join e sql.begin nos mocks de teste locais
if (sql && typeof sql === 'function') {
  if (!sql.join) {
    sql.join = (values: any[]) => values;
  }
  if (!sql.begin) {
    sql.begin = async (cb: any) => cb(sql);
  }
}

afterEach(() => {
  cleanup();
});