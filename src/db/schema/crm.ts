import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const clientes = pgTable('clients', {
  id: integer('id').primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 20 }),
  cnpj: varchar('cnpj', { length: 20 }),
  telefone: varchar('telefone', { length: 30 }),
  email: varchar('email', { length: 255 }),
  endereco: text('endereco'),
  bairro: varchar('bairro', { length: 100 }),
  cidade: varchar('cidade', { length: 100 }),
  uf: varchar('uf', { length: 2 }),
  tipoImovel: varchar('tipo_imovel', { length: 20 }).default('casa'),
  comodosInteresse: text('comodos_interesse'),
  origem: varchar('origem', { length: 50 }),
  observacoes: text('observacoes'),
  status: varchar('status', { length: 20 }).default('ativo'),
  razaoSocial: varchar('razao_social', { length: 255 }),
  municipio: varchar('municipio', { length: 100 }),
  situacaoCadastral: varchar('situacao_cadastral', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
