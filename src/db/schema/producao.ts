import { pgTable, uuid, varchar, integer, text, timestamp, boolean, date, time, serial } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { orcamentos } from './engenharia-orcamentos.js'; // Tabela orcamentos_pro

// 1. Ordens de Produção (ordens_prod)
export const ordensProd = pgTable('ordens_prod', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  orcamentoId: uuid('orcamento_id').references(() => orcamentos.id, { onDelete: 'cascade' }).notNull(),
  numeroOp: varchar('numero_op', { length: 50 }).unique().notNull(),
  status: varchar('status', { length: 50 }).default('planejamento').notNull(), // planejamento, medição, projeto, produção, montagem, entrega, concluído
  prioridade: integer('prioridade').default(5), // 1=urgente, 5=normal, 9=baixa
  dataInicio: date('data_inicio'),
  dataPrazo: date('data_prazo'),
  dataConclusao: date('data_conclusao'),
  observacoes: text('observacoes'),
  responsavelId: uuid('responsavel_id'), // ID do usuário responsável (tabela users)
  environment: varchar('environment', { length: 100 }), // Ambiente físico/Setor
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2. Etapas de Produção (etapas_prod_kanban)
export const etapasProdKanban = pgTable('etapas_prod_kanban', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  operacaoProdId: uuid('operacao_prod_id').references(() => ordensProd.id, { onDelete: 'cascade' }).notNull(),
  etapaNumero: integer('etapa_numero').notNull(),
  etapaNome: varchar('etapa_nome', { length: 100 }).notNull(),
  statusKanban: varchar('status_kanban', { length: 50 }).default('a_fazer').notNull(), // a_fazer, em_progresso, bloqueado, concluído
  ordemDisplay: integer('ordem_display').default(0),
  dataInicio: date('data_inicio'),
  dataConclusao: date('data_conclusao'),
  responsavelId: uuid('responsavel_id'), // ID do usuário responsável
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 3. Movimento Kanban (movimento_kanban)
export const movimentoKanban = pgTable('movimento_kanban', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  etapaKanbanId: integer('etapa_kanban_id').references(() => etapasProdKanban.id, { onDelete: 'cascade' }).notNull(),
  statusAnterior: varchar('status_anterior', { length: 50 }),
  statusNovo: varchar('status_novo', { length: 50 }),
  usuarioId: uuid('usuario_id'),
  timestampMovimento: timestamp('timestamp_movimento', { withTimezone: true }).defaultNow(),
  nota: text('nota'),
});

// 4. Eventos Calendário (eventos_calendario)
export const eventosCalendario = pgTable('eventos_calendario', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id').notNull(),
  tipoEvento: varchar('tipo_evento', { length: 50 }).notNull(), // 'orcamento', 'prazo_entrega', 'lembrete_compra', 'tarefa', 'reuniao'
  titulo: varchar('titulo', { length: 255 }).notNull(),
  descricao: text('descricao'),
  dataEvento: date('data_evento').notNull(),
  horaEvento: time('hora_evento'),
  orcamentoId: uuid('orcamento_id').references(() => orcamentos.id, { onDelete: 'set null' }),
  operacaoProdId: uuid('operacao_prod_id').references(() => ordensProd.id, { onDelete: 'set null' }),
  corCategoria: varchar('cor_categoria', { length: 20 }).default('#3B82F6'),
  concluido: boolean('concluido').default(false),
  notificacaoDiasAntes: integer('notificacao_dias_antes').default(0),
  notificacaoEnviada: boolean('notificacao_enviada').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 5. Notificações Calendário (notificacoes_calendario)
export const notificacoesCalendario = pgTable('notificacoes_calendario', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  eventoCalendarioId: integer('evento_calendario_id').references(() => eventosCalendario.id, { onDelete: 'cascade' }).notNull(),
  tipoNotificacao: varchar('tipo_notificacao', { length: 50 }), // 'push', 'email', 'sms'
  mensagem: text('mensagem'),
  enviadoEm: timestamp('enviado_em', { withTimezone: true }).defaultNow(),
  lido: boolean('lido').default(false),
});
