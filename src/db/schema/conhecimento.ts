import { pgTable, uuid, varchar, text, timestamp, customType } from 'drizzle-orm/pg-core';

// Mapeamento customizado de vetor de dimensão 768 para pgvector do Neon
const vector768 = customType<{ data: number[] }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string) {
    if (typeof value !== 'string') return [];
    return value.substring(1, value.length - 1).split(',').map(Number);
  }
});

export const conhecimentoMarcenaria = pgTable('conhecimento_marcenaria', {
  id: uuid('id').primaryKey().defaultRandom(),
  titulo: varchar('titulo', { length: 255 }).notNull(),
  conteudo: text('conteudo').notNull(),
  categoria: varchar('categoria', { length: 100 }).notNull(),
  embedding: vector768('embedding').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
