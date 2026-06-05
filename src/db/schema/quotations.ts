import { pgTable, uuid, varchar, timestamp, decimal, jsonb, integer, text, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { relations } from 'drizzle-orm';
import { clientes } from './crm.js';
import { planosDeCorte } from './planos-de-corte.js';
import { skuEngenharia, skuComponente } from './skus.js';

export const quotations = pgTable('quotations', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
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
    tokenAprovacao: varchar('token_aprovacao', { length: 255 }),
    urlAprovacao: text('url_aprovacao'),
    aprovadoEm: timestamp('aprovado_em'),
    aprovadoIp: varchar('aprovado_ip', { length: 45 }),
    aprovadoNome: varchar('aprovado_nome', { length: 255 }),
    recusadoEm: timestamp('recusado_em'),
    motivoRecusa: text('motivo_recusa'),
    deletedAt: timestamp('deleted_at'),
    materiaisConsumidos: jsonb('materiais_consumidos'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
    return {
        numeroOrcamentoIdx: index('idx_quotations_numero').on(table.numeroOrcamento),
        clienteIdIdx: index('idx_quotations_cliente').on(table.clienteId),
        statusIdx: index('idx_quotations_status').on(table.status),
        dataOrcamentoIdx: index('idx_quotations_data').on(table.dataOrcamento),
    };
});

export const quotationItems = pgTable('quotation_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'cascade' }),
    skuEngenhariaId: uuid('sku_engenharia_id').references(() => skuEngenharia.id),
    nomeCustomizado: varchar('nome_customizado', { length: 255 }),
    quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
    largura: varchar('largura', { length: 20 }),
    altura: varchar('altura', { length: 20 }),
    espessura: varchar('espessura', { length: 20 }),
    material: varchar('material', { length: 255 }),
    skuComponenteId: uuid('sku_componente_id').references(() => skuComponente.id),
    skuCodigo: varchar('sku_codigo', { length: 100 }),
    skuDescricao: text('sku_descricao'),
    unidadeMedida: varchar('unidade_medida', { length: 20 }).default('UN'),
    custoUnitarioCalculado: decimal('custo_unitario_calculado', { precision: 12, scale: 2 }),
    precoVendaUnitario: decimal('preco_venda_unitario', { precision: 12, scale: 2 }),
    
    // Novos campos para Precificação Dinâmica e Overrides
    custoBaseEstoque: decimal('custo_base_estoque', { precision: 12, scale: 2 }),
    custoSobrescrito: decimal('custo_sobrescrito', { precision: 12, scale: 2 }),
    precoVendaSobrescrito: decimal('preco_venda_sobrescrito', { precision: 12, scale: 2 }),
    markup: decimal('markup', { precision: 10, scale: 4 }),
    margemLucro: decimal('margem_lucro', { precision: 10, scale: 4 }),
    
    origemDados: varchar('origem_dados', { length: 50 }).default('CSV'),
    possuiOverride: boolean('possui_override').default(false),
    metadata: jsonb('metadata').default({}),
    
    observacoes: text('observacoes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
}, (table) => {
    return {
        quotationIdIdx: index('idx_quot_items_quotation').on(table.quotationId),
        skuEngIdIdx: index('idx_quot_items_sku_eng').on(table.skuEngenhariaId),
        skuCompIdIdx: index('idx_quot_items_sku_comp').on(table.skuComponenteId),
    };
});

export const quotationBom = pgTable('quotation_bom', {
    id: uuid('id').primaryKey().defaultRandom(),
    quotationItemId: uuid('quotation_item_id').references(() => quotationItems.id, { onDelete: 'cascade' }),
    skuComponenteId: uuid('sku_componente_id').references(() => skuComponente.id),
    quantidadeCalculada: decimal('quantidade_calculada', { precision: 10, scale: 3 }),
    quantidadeAjustada: decimal('quantidade_ajustada', { precision: 10, scale: 3 }),
    custoUnitario: decimal('custo_unitario', { precision: 10, scale: 2 }),
    origem: varchar('origem', { length: 20 }).default('BOM'),
    editado: boolean('editado').default(false),
    observacoes: text('observacoes'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
    return {
        itemIdIdx: index('idx_quot_bom_item').on(table.quotationItemId),
        skuCompIdIdx: index('idx_quot_bom_sku').on(table.skuComponenteId),
    };
});

// Relacionamentos
export const quotationsRelations = relations(quotations, ({ one, many }) => ({
    itens: many(quotationItems),
    cliente: one(clientes, { fields: [quotations.clienteId], references: [clientes.id] }),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one, many }) => ({
    quotation: one(quotations, { fields: [quotationItems.quotationId], references: [quotations.id] }),
    skuEngenharia: one(skuEngenharia, { fields: [quotationItems.skuEngenhariaId], references: [skuEngenharia.id] }),
    skuComponente: one(skuComponente, { fields: [quotationItems.skuComponenteId], references: [skuComponente.id] }),
    bom: many(quotationBom),
}));

export const quotationBomRelations = relations(quotationBom, ({ one }) => ({
    item: one(quotationItems, { fields: [quotationBom.quotationItemId], references: [quotationItems.id] }),
    componente: one(skuComponente, { fields: [quotationBom.skuComponenteId], references: [skuComponente.id] }),
}));
