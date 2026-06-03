import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const statusProspeccaoEnum = pgEnum('status_prospeccao', [
  'novo_contato',
  'primeiro_contato_feito',
  'aguardando_retorno',
  'visita_agendada',
  'proposta_enviada',
  'negociacao',
  'ganho',
  'perdido',
  'desqualificado',
]);

export const origemProspeccaoEnum = pgEnum('origem_prospeccao', [
  'indicacao',
  'instagram',
  'google',
  'tiktok',
  'facebook',
  'feira',
  'passante',
  'whatsapp',
  'ligacao_ativa',
  'outro',
]);

export const temperaturaLeadEnum = pgEnum('temperatura_lead', ['frio', 'morno', 'quente']);

/**
 * Tabela principal de leads/prospecções
 */
export const prospeccoes = pgTable('prospeccoes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),

  // Dados do lead
  nome: varchar('nome', { length: 255 }).notNull(),
  telefone: varchar('telefone', { length: 30 }),
  email: varchar('email', { length: 255 }),
  cidade: varchar('cidade', { length: 100 }),
  uf: varchar('uf', { length: 2 }),

  // Qualificação
  status: varchar('status', { length: 50 }).default('novo_contato').notNull(),
  temperatura: varchar('temperatura', { length: 20 }).default('frio'),
  origem: varchar('origem', { length: 50 }).default('outro'),
  interesse: text('interesse'), // descrição do que o lead quer
  orcamentoEstimado: numeric('orcamento_estimado', { precision: 12, scale: 2 }),
  prazoDesejadoDias: integer('prazo_desejado_dias'),

  // Rastreamento
  responsavelId: varchar('responsavel_id', { length: 100 }),
  responsavelNome: varchar('responsavel_nome', { length: 255 }),
  clienteId: uuid('cliente_id'), // preenchido quando convertido
  projetoId: uuid('projeto_id'), // preenchido quando convertido

  // Qualificação BANT
  budget: boolean('budget').default(false), // Tem budget?
  authority: boolean('authority').default(false), // É o decisor?
  need: boolean('need').default(false), // Tem necessidade clara?
  timeline: boolean('timeline').default(false), // Tem prazo definido?

  // Meta
  motivoPerda: text('motivo_perda'),
  concorrentePerdeu: varchar('concorrente_perdeu', { length: 255 }),
  observacoes: text('observacoes'),
  convertidoEm: timestamp('convertido_em', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

/**
 * Histórico de interações com o lead
 */
export const interacoesProspeccao = pgTable('interacoes_prospeccao', {
  id: uuid('id').defaultRandom().primaryKey(),
  prospeccaoId: uuid('prospeccao_id')
    .notNull()
    .references(() => prospeccoes.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),

  tipo: varchar('tipo', { length: 50 }).notNull(), // 'ligacao', 'whatsapp', 'email', 'visita', 'reuniao', 'outro'
  titulo: varchar('titulo', { length: 255 }),
  descricao: text('descricao'),
  statusAnterior: varchar('status_anterior', { length: 50 }),
  statusNovo: varchar('status_novo', { length: 50 }),
  realizadoPor: varchar('realizado_por', { length: 255 }),
  dataInteracao: timestamp('data_interacao', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
