import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  boolean,
  integer,
  text,
  date,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { titulosPagar, formasPagamento } from './financeiro.js';

// ──────────────────────────────────────────
// 1. COLABORADORES
// ──────────────────────────────────────────
export const colaboradores = pgTable(
  'colaboradores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    nome: varchar('nome', { length: 255 }).notNull(),
    cpf: varchar('cpf', { length: 14 }),
    telefone: varchar('telefone', { length: 30 }),
    email: varchar('email', { length: 255 }),
    tipo: varchar('tipo', { length: 20 }).notNull(), // 'socio' | 'colaborador_fixo'
    vinculo: varchar('vinculo', { length: 20 }).notNull().default('informal'), // 'informal' | 'mei' | 'clt'
    cargo: varchar('cargo', { length: 100 }),
    salarioBase: numeric('salario_base', { precision: 12, scale: 2 }).notNull(),
    participacaoLucros: numeric('participacao_lucros', { precision: 5, scale: 2 }).default('0'),
    chavePix: varchar('chave_pix', { length: 100 }),
    dataAdmissao: date('data_admissao'),
    ativo: boolean('ativo').default(true),
    userId: uuid('user_id'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => ({
    tenantIdx: index('idx_colaboradores_tenant_id').on(t.tenantId),
  }),
);

// ──────────────────────────────────────────
// 2. FOLHA_PAGAMENTOS
// ──────────────────────────────────────────
export const folhaPagamentos = pgTable(
  'folha_pagamentos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    competencia: varchar('competencia', { length: 7 }).notNull(), // '2026-09'
    status: varchar('status', { length: 20 }).notNull().default('rascunho'), // 'rascunho' | 'fechada' | 'paga'
    totalBruto: numeric('total_bruto', { precision: 12, scale: 2 }).default('0'),
    totalDescontos: numeric('total_descontos', { precision: 12, scale: 2 }).default('0'),
    totalLiquido: numeric('total_liquido', { precision: 12, scale: 2 }).default('0'),
    totalHorasExtras: numeric('total_horas_extras', { precision: 12, scale: 2 }).default('0'),
    totalBonus: numeric('total_bonus', { precision: 12, scale: 2 }).default('0'),
    receitaMes: numeric('receita_mes', { precision: 12, scale: 2 }).default('0'),
    custosMes: numeric('custos_mes', { precision: 12, scale: 2 }).default('0'),
    lucroDistribuivel: numeric('lucro_distribuivel', { precision: 12, scale: 2 }).default('0'),
    fechadaEm: timestamp('fechada_em'),
    fechadaPor: uuid('fechada_por'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => ({
    uniqTenantCompetencia: unique('uniq_folha_tenant_competencia').on(t.tenantId, t.competencia),
    tenantCompetenciaIdx: index('idx_folha_tenant_competencia').on(t.tenantId, t.competencia),
  }),
);

// ──────────────────────────────────────────
// 3. FOLHA_ITENS
// ──────────────────────────────────────────
export const folhaItens = pgTable('folha_itens', {
  id: uuid('id').defaultRandom().primaryKey(),
  folhaId: uuid('folha_id')
    .references(() => folhaPagamentos.id, { onDelete: 'cascade' })
    .notNull(),
  colaboradorId: uuid('colaborador_id')
    .references(() => colaboradores.id)
    .notNull(),
  salarioBase: numeric('salario_base', { precision: 12, scale: 2 }).notNull(),
  diasTrabalhados: integer('dias_trabalhados').default(30),
  faltasDias: numeric('faltas_dias', { precision: 4, scale: 1 }).default('0'),
  valorFaltas: numeric('valor_faltas', { precision: 12, scale: 2 }).default('0'),
  horasFaltaMinutos: integer('horas_falta_minutos').default(0),
  valorFaltaHoras: numeric('valor_falta_horas', { precision: 12, scale: 2 }).default('0'),
  horasExtrasQtd: numeric('horas_extras_qtd', { precision: 6, scale: 2 }).default('0'),
  horasExtrasTipo: varchar('horas_extras_tipo', { length: 10 }).default('50'), // '50' | '100'
  horasExtrasPrevistas: numeric('horas_extras_previstas', { precision: 6, scale: 2 }).default('0'),
  valorHorasExtras: numeric('valor_horas_extras', { precision: 12, scale: 2 }).default('0'),
  valorHorasExtrasPrevisto: numeric('valor_horas_extras_previsto', {
    precision: 12,
    scale: 2,
  }).default('0'),
  bonusProducao: numeric('bonus_producao', { precision: 12, scale: 2 }).default('0'),
  adiantamento: numeric('adiantamento', { precision: 12, scale: 2 }).default('0'),
  outrosDescontos: numeric('outros_descontos', { precision: 12, scale: 2 }).default('0'),
  outrosDescricao: text('outros_descricao'),
  valorLiquido: numeric('valor_liquido', { precision: 12, scale: 2 }).notNull(),
  valorLiquidoPrevisto: numeric('valor_liquido_previsto', { precision: 12, scale: 2 }),
  tituloPagarId: uuid('titulo_pagar_id').references(() => titulosPagar.id),
});

// ──────────────────────────────────────────
// 4. ADIANTAMENTOS
// ──────────────────────────────────────────
export const adiantamentos = pgTable(
  'adiantamentos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    colaboradorId: uuid('colaborador_id')
      .references(() => colaboradores.id, { onDelete: 'cascade' })
      .notNull(),
    valor: numeric('valor', { precision: 12, scale: 2 }).notNull(),
    data: date('data').notNull(),
    competenciaDesconto: varchar('competencia_desconto', { length: 7 }).notNull(),
    formaPagamentoId: uuid('forma_pagamento_id').references(() => formasPagamento.id),
    observacao: text('observacao'),
    status: varchar('status', { length: 20 }).default('pendente'), // 'pendente' | 'descontado' | 'cancelado'
    descontadoEmFolhaId: uuid('descontado_em_folha_id').references(() => folhaPagamentos.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    tenantCompetenciaIdx: index('idx_adiantamentos_tenant_competencia').on(
      t.tenantId,
      t.competenciaDesconto,
    ),
  }),
);

// ──────────────────────────────────────────
// 5. PRESENCAS
// ──────────────────────────────────────────
export const presencas = pgTable(
  'presencas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    colaboradorId: uuid('colaborador_id')
      .references(() => colaboradores.id, { onDelete: 'cascade' })
      .notNull(),
    data: date('data').notNull(),
    status: varchar('status', { length: 30 }).notNull(), // 'presente' | 'falta' | 'falta_justificada' | 'meio_periodo' | 'ferias' | 'atestado'
    observacao: text('observacao'),
    horaSaida: varchar('hora_saida', { length: 5 }), // HH:MM ex: '13:00'
    horaRetorno: varchar('hora_retorno', { length: 5 }), // HH:MM ex: '14:34'
    horasFaltaMinutos: integer('horas_falta_minutos').default(0), // automático: retorno - saída em minutos
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqTenantColabData: unique('uniq_presencas_tenant_colab_data').on(
      t.tenantId,
      t.colaboradorId,
      t.data,
    ),
    tenantColabDataIdx: index('idx_presencas_tenant_colab_data').on(
      t.tenantId,
      t.colaboradorId,
      t.data,
    ),
  }),
);
