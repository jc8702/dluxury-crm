import { pgTable, uuid, varchar, timestamp, decimal, jsonb, integer, text, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientes } from './crm.js';
import { planosDeCorte } from './planos-de-corte.js';

// --- GESTÃO DE SKUs ---

export const skuEngenharia = pgTable('sku_engenharia', {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 20 }).unique().notNull(),
    nome: varchar('nome', { length: 200 }).notNull(),
    categoria: varchar('categoria', { length: 50 }),
    tipoProduto: varchar('tipo_produto', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const skuMontagem = pgTable('sku_montagem', {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 20 }).unique().notNull(),
    nome: varchar('nome', { length: 200 }).notNull(),
    unidadeMedida: varchar('unidade_medida', { length: 10 }).default('UN'),
    tempoMontagemMin: integer('tempo_montagem_min'),
    complexidade: varchar('complexidade', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow(),
});

export const skuComponente = pgTable('sku_componente', {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 20 }).unique().notNull(),
    nome: varchar('nome', { length: 200 }).notNull(),
    tipo: varchar('tipo', { length: 50 }), // Chapa, Ferragem, Acabamento
    unidadeMedida: varchar('unidade_medida', { length: 10 }),
    dimensoes: jsonb('dimensoes'), // {largura, altura, espessura}
    precoUnitario: decimal('preco_unitario', { precision: 10, scale: 2 }),
    estoqueAtual: decimal('estoque_atual', { precision: 10, scale: 3 }),
    createdAt: timestamp('created_at').defaultNow(),
});

// --- ESTRUTURA BOM (Bill of Materials) ---

export const bomEngenhariaMontagem = pgTable('bom_engenharia_montagem', {
    id: uuid('id').primaryKey().defaultRandom(),
    skuEngenhariaId: uuid('sku_engenharia_id').references(() => skuEngenharia.id, { onDelete: 'cascade' }),
    skuMontagemId: uuid('sku_montagem_id').references(() => skuMontagem.id),
    quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
    ordemProducao: integer('ordem_production'),
    observacoes: text('observacoes'),
});

export const bomMontagemComponente = pgTable('bom_montagem_componente', {
    id: uuid('id').primaryKey().defaultRandom(),
    skuMontagemId: uuid('sku_montagem_id').references(() => skuMontagem.id, { onDelete: 'cascade' }),
    skuComponenteId: uuid('sku_componente_id').references(() => skuComponente.id),
    quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
    perdaPercentual: decimal('perda_percentual', { precision: 5, scale: 2 }).default('5.00'),
    observacoes: text('observacoes'),
});

// --- MÓDULO DE ORÇAMENTOS ---

export const orcamentos = pgTable('orcamentos_pro', {
    id: uuid('id').primaryKey().defaultRandom(),
    numeroOrcamento: varchar('numero_orcamento', { length: 30 }).unique().notNull(),
    clienteId: integer('cliente_id').references(() => clientes.id),
    projetoId: uuid('projeto_id').references(() => planosDeCorte.id),
    dataOrcamento: timestamp('data_orcamento').defaultNow(),
    validadeDias: integer('validade_dias').default(15),
    prazoEntregaDias: integer('prazo_entrega_dias'),
    descritivoPagamento: text('descritivo_pagamento'),
    condicoesComerciais: text('condicoes_comerciais'),
    margemLucroPercentual: decimal('margem_lucro_percentual', { precision: 5, scale: 2 }),
    taxaFinanceiraPercentual: decimal('taxa_financeira_percentual', { precision: 5, scale: 2 }).default('0'),
    descontoPercentual: decimal('desconto_percentual', { precision: 5, scale: 2 }).default('0'),
    valorTotalCusto: decimal('valor_total_custo', { precision: 12, scale: 2 }),
    valorTotalVenda: decimal('valor_total_venda', { precision: 12, scale: 2 }),
    status: varchar('status', { length: 20 }).default('RASCUNHO'),
    arquivoSketchupUrl: text('arquivo_sketchup_url'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const orcamentoItens = pgTable('orcamento_itens', {
    id: uuid('id').primaryKey().defaultRandom(),
    orcamentoId: uuid('orcamento_id').references(() => orcamentos.id, { onDelete: 'cascade' }),
    skuEngenhariaId: uuid('sku_engenharia_id').references(() => skuEngenharia.id),
    nomeCustomizado: varchar('nome_customizado', { length: 255 }),
    quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
    largura: varchar('largura', { length: 20 }),
    altura: varchar('altura', { length: 20 }),
    espessura: varchar('espessura', { length: 20 }),
    custoUnitarioCalculado: decimal('custo_unitario_calculado', { precision: 12, scale: 2 }),
    precoVendaUnitario: decimal('preco_venda_unitario', { precision: 12, scale: 2 }),
    observacoes: text('observacoes'),
});

export const orcamentoListaExplodida = pgTable('orcamento_lista_explodida', {
    id: uuid('id').primaryKey().defaultRandom(),
    orcamentoItemId: uuid('orcamento_item_id').references(() => orcamentoItens.id, { onDelete: 'cascade' }),
    skuComponenteId: uuid('sku_componente_id').references(() => skuComponente.id),
    quantidadeCalculada: decimal('quantidade_calculada', { precision: 10, scale: 3 }),
    quantidadeAjustada: decimal('quantidade_ajustada', { precision: 10, scale: 3 }),
    custoUnitario: decimal('custo_unitario', { precision: 10, scale: 2 }),
    origem: varchar('origem', { length: 20 }).default('BOM'),
    editado: boolean('editado').default(false),
    observacoes: text('observacoes'),
});

// Relacionamentos
export const skuEngenhariaRelations = relations(skuEngenharia, ({ many }) => ({
    montagens: many(bomEngenhariaMontagem),
}));

export const skuMontagemRelations = relations(skuMontagem, ({ many }) => ({
    engenharia: many(bomEngenhariaMontagem),
    componentes: many(bomMontagemComponente),
}));

export const orcamentosRelations = relations(orcamentos, ({ many }) => ({
    itens: many(orcamentoItens),
}));

export const orcamentoItensRelations = relations(orcamentoItens, ({ one, many }) => ({
    orcamento: one(orcamentos, { fields: [orcamentoItens.orcamentoId], references: [orcamentos.id] }),
    listaExplodida: many(orcamentoListaExplodida),
}));
export const orcamentoListaExplodidaRelations = relations(orcamentoListaExplodida, ({ one }) => ({ 
    item: one(orcamentoItens, { fields: [orcamentoListaExplodida.orcamentoItemId], references: [orcamentoItens.id] }), 
    componente: one(skuComponente, { fields: [orcamentoListaExplodida.skuComponenteId], references: [skuComponente.id] }),
}));
