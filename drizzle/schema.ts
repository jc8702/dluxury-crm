import { pgTable, serial, text, timestamp, foreignKey, uuid, jsonb, unique, numeric, boolean, integer, uniqueIndex, varchar, date, index, check, vector, time, pgView, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const tipoObjetivo = pgEnum("tipo_objetivo", ['medicao', 'apresentacao', 'instalacao', 'pos_venda', 'outro'])


export const systemLogs = pgTable("system_logs", {
	id: serial().primaryKey().notNull(),
	type: text().notNull(),
	severity: text().notNull(),
	message: text().notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const erpSimulations = pgTable("erp_simulations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clienteId: text("cliente_id"),
	clienteNome: text("cliente_nome"),
	dadosSimulacao: jsonb("dados_simulacao").notNull(),
	dadosInput: jsonb("dados_input").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	nome: text().default('Simulação').notNull(),
	tipo: text().default('generico'),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "erp_simulations_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	role: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "users_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("users_email_key").on(table.email),
]);

export const materiais = pgTable("materiais", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sku: text().notNull(),
	nome: text().notNull(),
	descricao: text(),
	categoriaId: text("categoria_id"),
	subcategoria: text(),
	unidadeCompra: text("unidade_compra").notNull(),
	unidadeUso: text("unidade_uso").notNull(),
	fatorConversao: numeric("fator_conversao", { precision: 10, scale:  4 }).default('1'),
	estoqueAtual: numeric("estoque_atual", { precision: 10, scale:  4 }).default('0'),
	estoqueMinimo: numeric("estoque_minimo", { precision: 10, scale:  4 }).default('0'),
	precoCusto: numeric("preco_custo", { precision: 10, scale:  2 }).default('0'),
	fornecedorPrincipal: text("fornecedor_principal"),
	observacoes: text(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	cfop: text(),
	ncm: text(),
	icms: numeric(),
	icmsSt: numeric("icms_st"),
	ipi: numeric(),
	pis: numeric(),
	cofins: numeric(),
	origem: integer().default(0),
	precoVenda: numeric("preco_venda"),
	margemLucro: numeric("margem_lucro"),
	larguraMm: numeric("largura_mm"),
	alturaMm: numeric("altura_mm"),
	marca: text(),
	tenantId: uuid("tenant_id"),
	fabricante: text(),
	leadTimeDias: integer("lead_time_dias"),
	categoriaTaxonomia: text("categoria_taxonomia"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "materiais_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("materiais_sku_key").on(table.sku),
]);

export const configuracoesPrecificacao = pgTable("configuracoes_precificacao", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fatorPerdaPadrao: numeric("fator_perda_padrao", { precision: 5, scale:  4 }).default('0.10'),
	markupPadrao: numeric("markup_padrao", { precision: 5, scale:  4 }).default('1.80'),
	aliquotaImposto: numeric("aliquota_imposto", { precision: 5, scale:  4 }).default('0.00'),
	moProducaoPctPadrao: numeric("mo_producao_pct_padrao", { precision: 5, scale:  4 }).default('0.30'),
	moInstalacaoPctPadrao: numeric("mo_instalacao_pct_padrao", { precision: 5, scale:  4 }).default('0.15'),
	margemMinimaAlerta: numeric("margem_minima_alerta", { precision: 5, scale:  4 }).default('0.25'),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	espessuraChapaPadrao: numeric("espessura_chapa_padrao").default('15'),
	recuoFundoPadrao: numeric("recuo_fundo_padrao").default('10'),
	tenantId: uuid("tenant_id"),
});

export const categoriasMaterial = pgTable("categorias_material", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: text().notNull(),
	slug: text().notNull(),
	icone: text(),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("categorias_material_slug_key").on(table.slug),
]);

export const inventory = pgTable("inventory", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	unit: text().notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	minQuantity: numeric("min_quantity", { precision: 10, scale:  2 }).default('0').notNull(),
	location: text(),
	price: numeric({ precision: 10, scale:  2 }).default('0'),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	sku: text(),
	description: text(),
	family: text(),
	subcategory: text(),
	supplierName: text("supplier_name"),
	supplierCode: text("supplier_code"),
	leadTimeDays: integer("lead_time_days").default(0),
	ncm: text(),
	cfop: text(),
	icms: numeric({ precision: 5, scale:  2 }).default('0'),
	ipi: numeric({ precision: 5, scale:  2 }).default('0'),
	pis: numeric({ precision: 5, scale:  2 }).default('0'),
	cofins: numeric({ precision: 5, scale:  2 }).default('0'),
	fiscalOrigin: text("fiscal_origin").default('0'),
	purchaseUnit: text("purchase_unit"),
	conversionFactor: numeric("conversion_factor", { precision: 10, scale:  4 }).default('1'),
	purchasePrice: numeric("purchase_price", { precision: 10, scale:  2 }).default('0'),
	currency: text().default('BRL'),
	maxQuantity: numeric("max_quantity", { precision: 10, scale:  2 }).default('0'),
	reorderPoint: numeric("reorder_point", { precision: 10, scale:  2 }).default('0'),
	minLot: numeric("min_lot", { precision: 10, scale:  2 }).default('1'),
	replenishmentPolicy: text("replenishment_policy").default('FOQ'),
	planningType: text("planning_type").default('MRP'),
	resupplyDays: integer("resupply_days").default(0),
});

export const fornecedores = pgTable("fornecedores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: text().notNull(),
	cnpj: text(),
	contato: text(),
	telefone: text(),
	email: text(),
	cidade: text(),
	estado: text(),
	observacoes: text(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "fornecedores_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const itensOrcamento = pgTable("itens_orcamento", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orcamentoId: uuid("orcamento_id"),
	descricao: text(),
	ambiente: text(),
	larguraCm: numeric("largura_cm", { precision: 10, scale:  2 }),
	alturaCm: numeric("altura_cm", { precision: 10, scale:  2 }),
	profundidadeCm: numeric("profundidade_cm", { precision: 10, scale:  2 }),
	material: text(),
	acabamento: text(),
	quantidade: integer().default(1),
	valorUnitario: numeric("valor_unitario", { precision: 12, scale:  2 }).default('0'),
	valorTotal: numeric("valor_total", { precision: 12, scale:  2 }).default('0'),
	cfop: text(),
	ncm: text(),
	icms: numeric(),
	icmsSt: numeric("icms_st"),
	ipi: numeric(),
	pis: numeric(),
	cofins: numeric(),
	origem: integer().default(0),
	erpProductId: uuid("erp_product_id"),
	erpParametros: jsonb("erp_parametros"),
	sku: text(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "itens_orcamento_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const historicoChamado = pgTable("historico_chamado", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chamadoId: uuid("chamado_id"),
	statusAnterior: text("status_anterior"),
	statusNovo: text("status_novo"),
	observacao: text(),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.chamadoId],
			foreignColumns: [chamadosGarantia.id],
			name: "historico_chamado_chamado_id_fkey"
		}).onDelete("cascade"),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey().notNull(),
	razaoSocial: text("razao_social").notNull(),
	cnpj: text(),
	historico: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	nomeFantasia: text("nome_fantasia"),
	porte: text(),
	dataAbertura: text("data_abertura"),
	cnaePrincipal: text("cnae_principal"),
	cnaeSecundario: text("cnae_secundario"),
	naturezaJuridica: text("natureza_juridica"),
	logradouro: text(),
	numero: text(),
	complemento: text(),
	cep: text(),
	bairro: text(),
	municipio: text(),
	uf: text(),
	email: text(),
	telefone: text(),
	situacaoCadastral: text("situacao_cadastral").default('ATIVA'),
	dataSituacaoCadastral: text("data_situacao_cadastral"),
	motivoSituacao: text("motivo_situacao"),
	codigoErp: text("codigo_erp"),
	frequenciaCompra: text("frequencia_compra").default('Mensal'),
	nome: text(),
	cpf: text(),
	endereco: text(),
	cidade: text(),
	tipoImovel: text("tipo_imovel"),
	comodosInteresse: text("comodos_interesse"),
	origem: text(),
	observacoes: text(),
	status: text().default('ativo'),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	uniqueIndex("clients_tenant_cnpj_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.cnpj.asc().nullsLast().op("uuid_ops")).where(sql`(cnpj IS NOT NULL)`),
	uniqueIndex("clients_tenant_cpf_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.cpf.asc().nullsLast().op("uuid_ops")).where(sql`(cpf IS NOT NULL)`),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "clients_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const eventosHistorico = pgTable("eventos_historico", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventoId: text("evento_id").notNull(),
	campoAlterado: text("campo_alterado").notNull(),
	valorAnterior: text("valor_anterior"),
	valorNovo: text("valor_novo"),
	alteradoPor: text("alterado_por").notNull(),
	observacao: text(),
	alteradoEm: timestamp("alterado_em", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const eventosAgenda = pgTable("eventos_agenda", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	titulo: text().notNull(),
	tipo: text().notNull(),
	dataInicio: timestamp("data_inicio", { withTimezone: true, mode: 'string' }).notNull(),
	dataFim: timestamp("data_fim", { withTimezone: true, mode: 'string' }),
	diaInteiro: boolean("dia_inteiro").default(false),
	clienteId: text("cliente_id"),
	projetoId: text("projeto_id"),
	visitaId: text("visita_id"),
	chamadoId: uuid("chamado_id"),
	responsavel: text().notNull(),
	local: text(),
	observacoes: text(),
	status: text().default('agendado'),
	cor: text(),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const skuComponente = pgTable("sku_componente", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	codigo: varchar({ length: 20 }).notNull(),
	nome: varchar({ length: 200 }).notNull(),
	tipo: varchar({ length: 50 }),
	unidadeMedida: varchar("unidade_medida", { length: 10 }),
	dimensoes: jsonb(),
	precoUnitario: numeric("preco_unitario", { precision: 10, scale:  2 }),
	estoqueAtual: numeric("estoque_atual", { precision: 10, scale:  3 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	unique("sku_componente_codigo_key").on(table.codigo),
]);

export const kanbanItems = pgTable("kanban_items", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	subtitle: text(),
	label: text(),
	status: text().notNull(),
	type: text().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	dateTime: timestamp("date_time", { withTimezone: true, mode: 'string' }),
	visitFormat: text("visit_format"),
	description: text(),
	contactName: text("contact_name"),
	contactRole: text("contact_role"),
	email: text(),
	phone: text(),
	city: text(),
	state: text(),
	value: numeric({ precision: 12, scale:  2 }),
	temperature: text(),
	visitDate: date("visit_date"),
	visitTime: text("visit_time"),
	visitType: text("visit_type"),
	observations: text(),
	projectId: integer("project_id"),
	tag: text(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [table.id],
			name: "kanban_items_project_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "kanban_items_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("kanban_items_tag_key").on(table.tag),
]);

export const planosCorte = pgTable("planos_corte", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: text().notNull(),
	status: text().default('rascunho'),
	kerfMm: numeric("kerf_mm", { precision: 5, scale:  2 }).default('3.0'),
	grupos: jsonb().default([]),
	pecas: jsonb().default([]),
	resultado: jsonb().default({}),
	orcamentoId: text("orcamento_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	visitaId: text("visita_id"),
	projetoId: text("projeto_id"),
	ordemProducaoId: text("ordem_producao_id"),
});

export const erpSkus = pgTable("erp_skus", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	skuCode: text("sku_code").notNull(),
	nome: text().notNull(),
	unidadeMedida: text("unidade_medida").notNull(),
	precoBase: numeric("preco_base", { precision: 12, scale:  4 }).default('0'),
	atributos: jsonb(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("erp_skus_sku_code_key").on(table.skuCode),
]);

export const erpProductBom = pgTable("erp_product_bom", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id"),
	skuId: uuid("sku_id"),
	componenteNome: text("componente_nome"),
	formulaQuantidade: text("formula_quantidade"),
	formulaPerda: text("formula_perda").default('1.10'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	nome: text(),
	codigoModelo: text("codigo_modelo"),
	descricao: text(),
	regrasCalculo: jsonb("regras_calculo").default([]),
	larguraPadrao: numeric("largura_padrao", { precision: 10, scale:  2 }).default('0'),
	alturaPadrao: numeric("altura_padrao", { precision: 10, scale:  2 }).default('0'),
	profundidadePadrao: numeric("profundidade_padrao", { precision: 10, scale:  2 }).default('0'),
	horasMoPadrao: numeric("horas_mo_padrao", { precision: 10, scale:  2 }).default('0'),
	valorHoraPadrao: numeric("valor_hora_padrao", { precision: 10, scale:  2 }).default('150'),
	precoMaterialM3Padrao: numeric("preco_material_m3_padrao", { precision: 12, scale:  2 }).default('0'),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	valorTotal: numeric("valor_total").default('0'),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.skuId],
			foreignColumns: [erpSkus.id],
			name: "erp_product_bom_sku_id_fkey"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "erp_product_bom_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("erp_product_bom_unique_code").on(table.codigoModelo),
	unique("erp_product_bom_codigo_modelo_unique").on(table.codigoModelo),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	action: text().notNull(),
	userId: text("user_id"),
	dataBefore: jsonb("data_before"),
	dataAfter: jsonb("data_after"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const projetoTipos = pgTable("projeto_tipos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	descricao: text(),
	regrasBom: jsonb("regras_bom").notNull(),
	dimensoesReferencia: jsonb("dimensoes_referencia"),
	regrasValidacao: jsonb("regras_validacao"),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("projeto_tipos_nome_key").on(table.nome),
	unique("projeto_tipos_slug_key").on(table.slug),
]);

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clientId: text("client_id"),
	clientName: text("client_name"),
	ambiente: text().notNull(),
	descricao: text(),
	valorEstimado: numeric("valor_estimado", { precision: 12, scale:  2 }),
	valorFinal: numeric("valor_final", { precision: 12, scale:  2 }),
	prazoEntrega: date("prazo_entrega"),
	status: text().default('lead').notNull(),
	etapaProducao: text("etapa_producao"),
	responsavel: text(),
	observacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	visitaId: text("visita_id"),
	orcamentoId: text("orcamento_id"),
	tag: text(),
	clienteNome: text("cliente_nome"),
	title: text(),
	titulo: text(),
	description: text(),
	observations: text(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	tenantId: uuid("tenant_id"),
	quotationId: text("quotation_id"),
}, (table) => [
	index("idx_projects_client_id").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("idx_projects_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_projects_tag").using("btree", table.tag.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "projects_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const erpFamilies = pgTable("erp_families", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: text().notNull(),
	categoriaId: text("categoria_id"),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.categoriaId],
			foreignColumns: [erpCategories.id],
			name: "erp_families_categoria_id_fkey"
		}),
]);

export const erpSubfamilies = pgTable("erp_subfamilies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: text().notNull(),
	familiaId: uuid("familia_id"),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.familiaId],
			foreignColumns: [erpFamilies.id],
			name: "erp_subfamilies_familia_id_fkey"
		}),
]);

export const planosDeCorte = pgTable("planos_de_corte", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	skuEngenharia: varchar("sku_engenharia", { length: 100 }),
	kerfMm: integer("kerf_mm").default(3),
	materiais: jsonb().notNull(),
	resultado: jsonb(),
	observacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	visitaId: uuid("visita_id"),
	projetoId: uuid("projeto_id"),
	orcamentoId: uuid("orcamento_id"),
	ordemProducaoId: uuid("ordem_producao_id"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	tenantId: uuid("tenant_id"),
	quotationId: text("quotation_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "planos_de_corte_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const erpProjectItems = pgTable("erp_project_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id"),
	label: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "erp_project_items_project_id_fkey"
		}),
]);

export const erpConsumptionResults = pgTable("erp_consumption_results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectItemId: uuid("project_item_id"),
	componenteNome: text("componente_nome"),
	skuId: uuid("sku_id"),
	quantidadeComPerda: numeric("quantidade_com_perda"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectItemId],
			foreignColumns: [erpProjectItems.id],
			name: "erp_consumption_results_project_item_id_fkey"
		}),
]);

export const erpSkusEngenharia = pgTable("erp_skus_engenharia", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sku: varchar({ length: 100 }).notNull(),
	nome: varchar({ length: 255 }).notNull(),
	componentes: jsonb().notNull(),
	versao: integer().default(1),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "erp_skus_engenharia_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("erp_skus_engenharia_sku_key").on(table.sku),
]);

export const classesFinanceiras = pgTable("classes_financeiras", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	codigo: varchar({ length: 50 }).notNull(),
	nome: varchar({ length: 255 }).notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	natureza: varchar({ length: 20 }).notNull(),
	paiId: uuid("pai_id"),
	ativa: boolean().default(true),
	dtLimite: timestamp("dt_limite", { mode: 'string' }),
	permiteLancamento: boolean("permite_lancamento").default(true),
	criadoEm: timestamp("criado_em", { mode: 'string' }).defaultNow(),
	atualizadoEm: timestamp("atualizado_em", { mode: 'string' }).defaultNow(),
	deletado: boolean().default(false),
	excluidoEm: timestamp("excluido_em", { mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_classes_financeiras_codigo").using("btree", table.codigo.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "classes_financeiras_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.paiId],
			foreignColumns: [table.id],
			name: "classes_financeiras_pai_id_fkey"
		}),
	unique("classes_financeiras_codigo_tenant_key").on(table.codigo, table.tenantId),
]);

export const pedidosCompra = pgTable("pedidos_compra", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	numero: text().notNull(),
	fornecedorId: uuid("fornecedor_id"),
	status: text().default('rascunho'),
	dataPedido: timestamp("data_pedido", { withTimezone: true, mode: 'string' }).defaultNow(),
	dataPrevisaoEntrega: timestamp("data_previsao_entrega", { withTimezone: true, mode: 'string' }),
	dataRecebimento: timestamp("data_recebimento", { withTimezone: true, mode: 'string' }),
	valorTotal: numeric("valor_total", { precision: 10, scale:  2 }).default('0'),
	frete: numeric({ precision: 10, scale:  2 }).default('0'),
	observacoes: text(),
	origem: text().default('manual'),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow(),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).defaultNow(),
	condicaoPagamentoId: uuid("condicao_pagamento_id"),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.condicaoPagamentoId],
			foreignColumns: [condicoesPagamento.id],
			name: "pedidos_compra_condicao_pagamento_id_fkey"
		}),
	foreignKey({
			columns: [table.fornecedorId],
			foreignColumns: [fornecedores.id],
			name: "pedidos_compra_fornecedor_id_fkey"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "pedidos_compra_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("pedidos_compra_numero_key").on(table.numero),
]);

export const pedidoCompraItens = pgTable("pedido_compra_itens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	pedidoId: uuid("pedido_id"),
	materialId: uuid("material_id"),
	sku: text().notNull(),
	descricao: text().notNull(),
	quantidadePedida: numeric("quantidade_pedida", { precision: 10, scale:  4 }).notNull(),
	quantidadeRecebida: numeric("quantidade_recebida", { precision: 10, scale:  4 }).default('0'),
	unidade: text().notNull(),
	precoUnitario: numeric("preco_unitario", { precision: 10, scale:  2 }).notNull(),
	subtotal: numeric({ precision: 10, scale:  2 }),
	statusItem: text("status_item").default('pendente'),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.pedidoId],
			foreignColumns: [pedidosCompra.id],
			name: "pedido_compra_itens_pedido_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.materialId],
			foreignColumns: [materiais.id],
			name: "pedido_compra_itens_material_id_fkey"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "pedido_compra_itens_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const formasPagamento = pgTable("formas_pagamento", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: varchar({ length: 100 }).notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	taxaPercentual: numeric("taxa_percentual", { precision: 5, scale:  2 }).default('0'),
	prazoCompensacaoDias: integer("prazo_compensacao_dias").default(0),
	ativa: boolean().default(true),
	deletado: boolean().default(false),
	excluidoEm: timestamp("excluido_em", { mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "formas_pagamento_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const notificacoes = pgTable("notificacoes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tipo: text().notNull(),
	titulo: text().notNull(),
	mensagem: text().notNull(),
	prioridade: text().default('normal'),
	lida: boolean().default(false),
	dataLeitura: timestamp("data_leitura", { withTimezone: true, mode: 'string' }),
	referenciaTipo: text("referencia_tipo"),
	referenciaId: uuid("referencia_id"),
	urlDestino: text("url_destino"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "notificacoes_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const contasInternas = pgTable("contas_internas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	tipo: varchar({ length: 50 }).notNull(),
	bancoCodigo: varchar("banco_codigo", { length: 10 }),
	agencia: varchar({ length: 20 }),
	conta: varchar({ length: 30 }),
	saldoInicial: numeric("saldo_inicial", { precision: 15, scale:  2 }).default('0'),
	saldoAtual: numeric("saldo_atual", { precision: 15, scale:  2 }).default('0').notNull(),
	dataSaldoInicial: timestamp("data_saldo_inicial", { mode: 'string' }),
	ativa: boolean().default(true),
	criadoEm: timestamp("criado_em", { mode: 'string' }).defaultNow(),
	deletado: boolean().default(false),
	excluidoEm: timestamp("excluido_em", { mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "contas_internas_tenant_id_fkey"
		}).onDelete("cascade"),
	check("check_saldo_atual_minimo", sql`saldo_atual > ('-1000000'::integer)::numeric`),
]);

export const retalhosEstoque = pgTable("retalhos_estoque", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	larguraMm: integer("largura_mm").notNull(),
	alturaMm: integer("altura_mm").notNull(),
	espessuraMm: integer("espessura_mm").notNull(),
	skuChapa: varchar("sku_chapa", { length: 100 }).notNull(),
	origem: varchar({ length: 50 }).notNull(),
	planoCorteOrigemId: uuid("plano_corte_origem_id"),
	projetoOrigem: varchar("projeto_origem", { length: 255 }),
	observacoes: text(),
	disponivel: boolean().default(true).notNull(),
	utilizadoEmId: uuid("utilizado_em_id"),
	dataUtilizacao: timestamp("data_utilizacao", { withTimezone: true, mode: 'string' }),
	descartado: boolean().default(false).notNull(),
	motivoDescarte: varchar("motivo_descarte", { length: 255 }),
	dataDescarte: timestamp("data_descarte", { withTimezone: true, mode: 'string' }),
	localizacao: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	usuarioCriou: varchar("usuario_criou", { length: 100 }),
	usuarioAtualizou: varchar("usuario_atualizou", { length: 100 }),
	metadata: jsonb().default({}),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	sku: varchar({ length: 20 }),
	quantidade: integer().default(1).notNull(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_retalhos_area").using("btree", sql`((largura_mm * altura_mm))`).where(sql`((disponivel = true) AND (descartado = false))`),
	index("idx_retalhos_criado").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")).where(sql`((disponivel = true) AND (descartado = false))`),
	index("idx_retalhos_disponivel_sku").using("btree", table.skuChapa.asc().nullsLast().op("text_ops"), table.disponivel.asc().nullsLast().op("bool_ops"), table.descartado.asc().nullsLast().op("text_ops")).where(sql`((disponivel = true) AND (descartado = false))`),
	index("idx_retalhos_origem").using("btree", table.planoCorteOrigemId.asc().nullsLast().op("uuid_ops")).where(sql`(plano_corte_origem_id IS NOT NULL)`),
	index("idx_retalhos_otimizacao").using("btree", sql`sku_chapa`, sql`((largura_mm * altura_mm))`, sql`created_at`).where(sql`((disponivel = true) AND (descartado = false))`),
	index("idx_retalhos_tamanho").using("btree", table.larguraMm.asc().nullsLast().op("int4_ops"), table.alturaMm.asc().nullsLast().op("int4_ops")).where(sql`((disponivel = true) AND (descartado = false))`),
	index("idx_retalhos_utilizacao").using("btree", table.utilizadoEmId.asc().nullsLast().op("uuid_ops")).where(sql`(utilizado_em_id IS NOT NULL)`),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "retalhos_estoque_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("retalhos_estoque_sku_key").on(table.sku),
	check("retalhos_estoque_largura_mm_check", sql`(largura_mm >= 100) AND (largura_mm <= 3000)`),
	check("retalhos_estoque_altura_mm_check", sql`(altura_mm >= 100) AND (altura_mm <= 2500)`),
	check("retalhos_estoque_espessura_mm_check", sql`(espessura_mm >= 3) AND (espessura_mm <= 50)`),
	check("area_minima", sql`(largura_mm * altura_mm) >= 90000`),
	check("retalhos_estoque_origem_check", sql`(origem)::text = ANY ((ARRAY['sobra_plano_corte'::character varying, 'devolucao'::character varying, 'manual'::character varying, 'ajuste'::character varying])::text[])`),
]);

export const contasRecorrentes = pgTable("contas_recorrentes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	descricao: varchar({ length: 255 }).notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	valor: numeric({ precision: 15, scale:  2 }).notNull(),
	diaVencimento: integer("dia_vencimento").notNull(),
	classeFinanceiraId: uuid("classe_financeira_id").notNull(),
	fornecedorId: uuid("fornecedor_id"),
	formaPagamentoId: uuid("forma_pagamento_id"),
	contaBancariaId: uuid("conta_bancaria_id"),
	ativa: boolean().default(true),
	criadoEm: timestamp("criado_em", { mode: 'string' }).defaultNow(),
	deletado: boolean().default(false),
	excluidoEm: timestamp("excluido_em", { mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "contas_recorrentes_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.classeFinanceiraId],
			foreignColumns: [classesFinanceiras.id],
			name: "contas_recorrentes_classe_financeira_id_fkey"
		}),
]);

export const titulosReceber = pgTable("titulos_receber", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	numeroTitulo: varchar("numero_titulo", { length: 50 }).notNull(),
	clienteId: integer("cliente_id").notNull(),
	projetoId: uuid("projeto_id"),
	orcamentoId: uuid("orcamento_id"),
	valorOriginal: numeric("valor_original", { precision: 15, scale:  2 }).notNull(),
	valorLiquido: numeric("valor_liquido", { precision: 15, scale:  2 }).notNull(),
	valorJuros: numeric("valor_juros", { precision: 15, scale:  2 }).default('0'),
	valorMulta: numeric("valor_multa", { precision: 15, scale:  2 }).default('0'),
	valorDesconto: numeric("valor_desconto", { precision: 15, scale:  2 }).default('0'),
	valorAberto: numeric("valor_aberto", { precision: 15, scale:  2 }).notNull(),
	dataEmissao: timestamp("data_emissao", { mode: 'string' }).notNull(),
	dataVencimento: timestamp("data_vencimento", { mode: 'string' }).notNull(),
	dataCompetencia: timestamp("data_competencia", { mode: 'string' }).notNull(),
	dataPagamento: timestamp("data_pagamento", { mode: 'string' }),
	classeFinanceiraId: uuid("classe_financeira_id").notNull(),
	centroCustoId: uuid("centro_custo_id"),
	formaRecebimentoId: uuid("forma_recebimento_id").notNull(),
	status: varchar({ length: 30 }).notNull(),
	parcela: integer().notNull(),
	totalParcelas: integer("total_parcelas").notNull(),
	observacoes: text(),
	criadoEm: timestamp("criado_em", { mode: 'string' }).defaultNow(),
	atualizadoEm: timestamp("atualizado_em", { mode: 'string' }).defaultNow(),
	deletado: boolean().default(false),
	excluidoEm: timestamp("excluido_em", { mode: 'string' }),
	condicaoPagamentoId: uuid("condicao_pagamento_id"),
	rateio: jsonb().default([]),
	taxaFinanceira: numeric("taxa_financeira", { precision: 5, scale:  2 }).default('0'),
	valorCustoFinanceiro: numeric("valor_custo_financeiro", { precision: 15, scale:  2 }).default('0'),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_titulos_receber_status_deletado").using("btree", table.status.asc().nullsLast().op("bool_ops"), table.deletado.asc().nullsLast().op("bool_ops")),
	index("idx_titulos_receber_vencimento").using("btree", table.dataVencimento.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.condicaoPagamentoId],
			foreignColumns: [condicoesPagamento.id],
			name: "titulos_receber_condicao_pagamento_id_fkey"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "titulos_receber_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.classeFinanceiraId],
			foreignColumns: [classesFinanceiras.id],
			name: "titulos_receber_classe_financeira_id_fkey"
		}),
	unique("titulos_receber_numero_titulo_key").on(table.numeroTitulo),
	check("check_valor_receber_positivo", sql`valor_original >= (0)::numeric`),
	check("check_valor_aberto_receber_positivo", sql`valor_aberto >= (0)::numeric`),
]);

export const titulosPagar = pgTable("titulos_pagar", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	numeroTitulo: varchar("numero_titulo", { length: 50 }).notNull(),
	fornecedorId: uuid("fornecedor_id").notNull(),
	notaFiscal: varchar("nota_fiscal", { length: 100 }),
	pedidoCompraId: uuid("pedido_compra_id"),
	valorOriginal: numeric("valor_original", { precision: 15, scale:  2 }).notNull(),
	valorLiquido: numeric("valor_liquido", { precision: 15, scale:  2 }).notNull(),
	valorJuros: numeric("valor_juros", { precision: 15, scale:  2 }).default('0'),
	valorMulta: numeric("valor_multa", { precision: 15, scale:  2 }).default('0'),
	valorDesconto: numeric("valor_desconto", { precision: 15, scale:  2 }).default('0'),
	valorAberto: numeric("valor_aberto", { precision: 15, scale:  2 }).notNull(),
	dataEmissao: timestamp("data_emissao", { mode: 'string' }).notNull(),
	dataVencimento: timestamp("data_vencimento", { mode: 'string' }).notNull(),
	dataCompetencia: timestamp("data_competencia", { mode: 'string' }).notNull(),
	dataPagamento: timestamp("data_pagamento", { mode: 'string' }),
	classeFinanceiraId: uuid("classe_financeira_id").notNull(),
	centroCustoId: uuid("centro_custo_id"),
	formaPagamentoId: uuid("forma_pagamento_id").notNull(),
	contaBancariaId: uuid("conta_bancaria_id").notNull(),
	status: varchar({ length: 30 }).notNull(),
	parcela: integer().notNull(),
	totalParcelas: integer("total_parcelas").notNull(),
	tipoDespesa: varchar("tipo_despesa", { length: 30 }),
	observacoes: text(),
	criadoEm: timestamp("criado_em", { mode: 'string' }).defaultNow(),
	atualizadoEm: timestamp("atualizado_em", { mode: 'string' }).defaultNow(),
	deletado: boolean().default(false),
	excluidoEm: timestamp("excluido_em", { mode: 'string' }),
	condicaoPagamentoId: uuid("condicao_pagamento_id"),
	rateio: jsonb().default([]),
	taxaFinanceira: numeric("taxa_financeira", { precision: 5, scale:  2 }).default('0'),
	valorCustoFinanceiro: numeric("valor_custo_financeiro", { precision: 15, scale:  2 }).default('0'),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_titulos_pagar_status_deletado").using("btree", table.status.asc().nullsLast().op("bool_ops"), table.deletado.asc().nullsLast().op("bool_ops")),
	index("idx_titulos_pagar_vencimento").using("btree", table.dataVencimento.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.condicaoPagamentoId],
			foreignColumns: [condicoesPagamento.id],
			name: "titulos_pagar_condicao_pagamento_id_fkey"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "titulos_pagar_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.classeFinanceiraId],
			foreignColumns: [classesFinanceiras.id],
			name: "titulos_pagar_classe_financeira_id_fkey"
		}),
	foreignKey({
			columns: [table.contaBancariaId],
			foreignColumns: [contasInternas.id],
			name: "titulos_pagar_conta_bancaria_id_fkey"
		}),
	unique("titulos_pagar_numero_titulo_key").on(table.numeroTitulo),
	check("check_valor_pagar_positivo", sql`valor_original >= (0)::numeric`),
	check("check_valor_aberto_pagar_positivo", sql`valor_aberto >= (0)::numeric`),
]);

export const condicoesPagamento = pgTable("condicoes_pagamento", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: text().notNull(),
	descricao: text(),
	parcelas: integer().default(1),
	entradaPercentual: numeric("entrada_percentual", { precision: 5, scale:  2 }).default('0'),
	jurosPercentual: numeric("juros_percentual", { precision: 5, scale:  2 }).default('0'),
	ativo: boolean().default(true),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow(),
	deletado: boolean().default(false),
	excluidoEm: timestamp("excluido_em", { mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "condicoes_pagamento_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const baixas = pgTable("baixas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	tituloId: uuid("titulo_id").notNull(),
	valorBaixa: numeric("valor_baixa", { precision: 15, scale:  2 }).notNull(),
	valorJuros: numeric("valor_juros", { precision: 15, scale:  2 }).default('0'),
	valorMulta: numeric("valor_multa", { precision: 15, scale:  2 }).default('0'),
	valorDesconto: numeric("valor_desconto", { precision: 15, scale:  2 }).default('0'),
	dataBaixa: timestamp("data_baixa", { mode: 'string' }).notNull(),
	contaInternaId: uuid("conta_interna_id").notNull(),
	observacoes: text(),
	criadoEm: timestamp("criado_em", { mode: 'string' }).defaultNow(),
	deletado: boolean().default(false),
	excluidoEm: timestamp("excluido_em", { mode: 'string' }),
	valorOriginalBaixa: numeric("valor_original_baixa", { precision: 15, scale:  2 }).default('0'),
	conferido: boolean().default(false),
	conferidoEm: timestamp("conferido_em", { mode: 'string' }),
	conferidoPor: uuid("conferido_por"),
	tituloReceberId: uuid("titulo_receber_id"),
	tituloPagarId: uuid("titulo_pagar_id"),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_baixas_data").using("btree", table.dataBaixa.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "baixas_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.contaInternaId],
			foreignColumns: [contasInternas.id],
			name: "baixas_conta_interna_id_fkey"
		}),
	foreignKey({
			columns: [table.tituloReceberId],
			foreignColumns: [titulosReceber.id],
			name: "baixas_titulo_receber_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tituloPagarId],
			foreignColumns: [titulosPagar.id],
			name: "baixas_titulo_pagar_id_fkey"
		}).onDelete("cascade"),
]);

export const skuEngenharia = pgTable("sku_engenharia", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	codigo: varchar({ length: 20 }).notNull(),
	nome: varchar({ length: 200 }).notNull(),
	categoria: varchar({ length: 50 }),
	tipoProduto: varchar("tipo_produto", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	unique("sku_engenharia_codigo_key").on(table.codigo),
]);

export const tiposEventoConfig = pgTable("tipos_evento_config", {
	tipo: varchar({ length: 30 }).primaryKey().notNull(),
	corPadrao: varchar("cor_padrao", { length: 7 }).notNull(),
	icone: varchar({ length: 50 }),
});

export const erpChapas = pgTable("erp_chapas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sku: varchar({ length: 100 }).notNull(),
	nome: varchar({ length: 255 }).notNull(),
	larguraMm: integer("largura_mm").notNull(),
	alturaMm: integer("altura_mm").notNull(),
	espessuraMm: integer("espessura_mm").notNull(),
	precoUnitario: numeric("preco_unitario", { precision: 12, scale:  2 }),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	estoque: integer().default(0),
	estoqueMinimo: integer("estoque_minimo").default(5),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "erp_chapas_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("erp_chapas_sku_key").on(table.sku),
]);

export const skuMontagem = pgTable("sku_montagem", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	codigo: varchar({ length: 20 }).notNull(),
	nome: varchar({ length: 200 }).notNull(),
	unidadeMedida: varchar("unidade_medida", { length: 10 }).default('UN'),
	tempoMontagemMin: integer("tempo_montagem_min"),
	complexidade: varchar({ length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	unique("sku_montagem_codigo_key").on(table.codigo),
]);

export const movimentacoesEstoque = pgTable("movimentacoes_estoque", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	itemTipo: varchar("item_tipo", { length: 20 }).default('material'),
	chapaId: uuid("chapa_id"),
	retalhoId: uuid("retalho_id"),
	planoCorteId: uuid("plano_corte_id"),
	quantidade: integer().default(1),
	motivo: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	usuarioId: varchar("usuario_id", { length: 100 }),
	materialId: uuid("material_id"),
	projetoId: uuid("projeto_id"),
	orcamentoId: uuid("orcamento_id"),
	precoUnitario: numeric("preco_unitario", { precision: 12, scale:  2 }),
	valorTotal: numeric("valor_total", { precision: 12, scale:  2 }),
	estoqueAntes: numeric("estoque_antes", { precision: 12, scale:  4 }),
	estoqueDepois: numeric("estoque_depois", { precision: 12, scale:  4 }),
	createdBy: varchar("created_by", { length: 100 }),
	notaFiscal: text("nota_fiscal"),
	tenantId: uuid("tenant_id"),
	quotationId: uuid("quotation_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "movimentacoes_estoque_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.materialId],
			foreignColumns: [materiais.id],
			name: "movimentacoes_estoque_material_id_fkey"
		}),
]);

export const bomEngenhariaMontagem = pgTable("bom_engenharia_montagem", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	skuEngenhariaId: uuid("sku_engenharia_id"),
	skuMontagemId: uuid("sku_montagem_id"),
	quantidade: numeric({ precision: 10, scale:  3 }).notNull(),
	ordemProduction: integer("ordem_production"),
	observacoes: text(),
}, (table) => [
	foreignKey({
			columns: [table.skuEngenhariaId],
			foreignColumns: [skuEngenharia.id],
			name: "bom_engenharia_montagem_sku_engenharia_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.skuMontagemId],
			foreignColumns: [skuMontagem.id],
			name: "bom_engenharia_montagem_sku_montagem_id_fkey"
		}),
	unique("bom_engenharia_montagem_sku_engenharia_id_sku_montagem_id_key").on(table.skuEngenhariaId, table.skuMontagemId),
]);

export const erpMovimentacoesIndustrial = pgTable("erp_movimentacoes_industrial", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	itemTipo: varchar("item_tipo", { length: 20 }).notNull(),
	chapaId: uuid("chapa_id"),
	retalhoId: uuid("retalho_id"),
	planoCorteId: uuid("plano_corte_id"),
	quantidade: integer().default(1),
	motivo: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	usuarioId: varchar("usuario_id", { length: 100 }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "erp_movimentacoes_industrial_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const eventos = pgTable("eventos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	titulo: varchar({ length: 255 }).notNull(),
	descricao: text(),
	dataInicio: timestamp("data_inicio", { withTimezone: true, mode: 'string' }).notNull(),
	dataFim: timestamp("data_fim", { withTimezone: true, mode: 'string' }).notNull(),
	diaInteiro: boolean("dia_inteiro").default(false),
	clienteId: text("cliente_id"),
	projetoId: text("projeto_id"),
	endereco: varchar({ length: 500 }),
	objetivo: tipoObjetivo(),
	statusVisita: varchar("status_visita", { length: 30 }),
	resultadoVisita: text("resultado_visita"),
	criadoPor: text("criado_por").notNull(),
	responsavelId: text("responsavel_id").notNull(),
	cor: varchar({ length: 7 }),
	lembreteMinutos: integer("lembrete_minutos"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	visitaId: text("visita_id"),
	orcamentoId: text("orcamento_id"),
	tenantId: uuid("tenant_id"),
	quotationId: text("quotation_id"),
}, (table) => [
	index("idx_eventos_cliente").using("btree", table.clienteId.asc().nullsLast().op("text_ops")).where(sql`(cliente_id IS NOT NULL)`),
	index("idx_eventos_data_inicio").using("btree", table.dataInicio.asc().nullsLast().op("timestamptz_ops")),
	index("idx_eventos_responsavel").using("btree", table.responsavelId.asc().nullsLast().op("text_ops")),
	index("idx_eventos_status_visita").using("btree", table.statusVisita.asc().nullsLast().op("text_ops")).where(sql`((tipo)::text = 'visita'::text)`),
	index("idx_eventos_tipo").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "eventos_tenant_id_fkey"
		}).onDelete("cascade"),
	check("check_datas_validas", sql`(data_fim IS NULL) OR (data_fim >= data_inicio)`),
	check("eventos_tipo_check", sql`(tipo)::text = ANY ((ARRAY['visita'::character varying, 'reuniao'::character varying, 'compromisso'::character varying, 'deadline'::character varying, 'outro'::character varying])::text[])`),
	check("eventos_status_visita_check", sql`(status_visita)::text = ANY ((ARRAY['agendado'::character varying, 'realizado'::character varying, 'follow_up'::character varying, 'cancelado'::character varying])::text[])`),
	check("visita_requer_status", sql`((tipo)::text <> 'visita'::text) OR (status_visita IS NOT NULL)`),
	check("data_fim_depois_inicio", sql`data_fim > data_inicio`),
	check("visita_requer_cliente", sql`((tipo)::text <> 'visita'::text) OR (cliente_id IS NOT NULL)`),
]);

export const bomMontagemComponente = pgTable("bom_montagem_componente", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	skuMontagemId: uuid("sku_montagem_id"),
	skuComponenteId: uuid("sku_componente_id"),
	quantidade: numeric({ precision: 10, scale:  3 }).notNull(),
	perdaPercentual: numeric("perda_percentual", { precision: 5, scale:  2 }).default('5.00'),
	observacoes: text(),
}, (table) => [
	foreignKey({
			columns: [table.skuMontagemId],
			foreignColumns: [skuMontagem.id],
			name: "bom_montagem_componente_sku_montagem_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.skuComponenteId],
			foreignColumns: [skuComponente.id],
			name: "bom_montagem_componente_sku_componente_id_fkey"
		}),
	unique("bom_montagem_componente_sku_montagem_id_sku_componente_id_key").on(table.skuMontagemId, table.skuComponenteId),
]);

export const ordensProducao = pgTable("ordens_producao", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	opId: text("op_id").notNull(),
	produto: text().notNull(),
	status: text().default('PENDENTE').notNull(),
	pecas: integer().default(0),
	dataInicio: timestamp("data_inicio", { withTimezone: true, mode: 'string' }),
	dataFim: timestamp("data_fim", { withTimezone: true, mode: 'string' }),
	tempoPrevistoCorte: integer("tempo_previsto_corte").default(0),
	tempoPrevistoMontagem: integer("tempo_previsto_montagem").default(0),
	dataPrevistaEntrega: timestamp("data_prevista_entrega", { withTimezone: true, mode: 'string' }),
	checklist: jsonb().default([]),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	visitaId: text("visita_id"),
	projetoId: text("projeto_id"),
	orcamentoId: text("orcamento_id"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	tenantId: uuid("tenant_id"),
	quotationId: text("quotation_id"),
}, (table) => [
	index("idx_ordens_producao_projeto_id").using("btree", table.projetoId.asc().nullsLast().op("text_ops")),
	index("idx_ordens_producao_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ordens_producao_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("ordens_producao_op_id_key").on(table.opId),
]);

export const conhecimentoMarcenaria = pgTable("conhecimento_marcenaria", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	titulo: varchar({ length: 255 }).notNull(),
	conteudo: text().notNull(),
	categoria: varchar({ length: 100 }).notNull(),
	embedding: vector({ dimensions: 768 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("conhecimento_marcenaria_embedding_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
]);

export const tenantConfigs = pgTable("tenant_configs", {
	tenantId: uuid("tenant_id").primaryKey().notNull(),
	espessuraPadraoMdf: integer("espessura_padrao_mdf").default(15).notNull(),
	larguraMaximaSemTravessa: integer("largura_maxima_sem_travessa").default(800).notNull(),
	folgaGavetaTelescopica: numeric("folga_gaveta_telescopica", { precision: 4, scale:  2 }).default('13.00').notNull(),
	markupPadrao: numeric("markup_padrao", { precision: 5, scale:  2 }).default('1.50').notNull(),
	geminiApiKeyCustom: text("gemini_api_key_custom"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "tenant_configs_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	asaasCustomerId: varchar("asaas_customer_id", { length: 255 }),
	asaasSubscriptionId: varchar("asaas_subscription_id", { length: 255 }),
	status: varchar({ length: 50 }).default('active').notNull(),
	plano: varchar({ length: 50 }).default('free').notNull(),
	valor: numeric({ precision: 12, scale:  2 }).default('0.00').notNull(),
	diaVencimento: integer("dia_vencimento"),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "subscriptions_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const usageLogs = pgTable("usage_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	modelo: varchar({ length: 100 }).notNull(),
	promptTokens: integer("prompt_tokens").default(0).notNull(),
	completionTokens: integer("completion_tokens").default(0).notNull(),
	totalTokens: integer("total_tokens").default(0).notNull(),
	custoEstimado: numeric("custo_estimado", { precision: 15, scale:  8 }).default('0.00000000').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "usage_logs_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const tenants = pgTable("tenants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	subdominio: varchar({ length: 100 }),
	planoTier: varchar("plano_tier", { length: 50 }).default('basic').notNull(),
	status: varchar({ length: 20 }).default('ativo').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	dominioPersonalizado: varchar("dominio_personalizado", { length: 255 }),
}, (table) => [
	unique("tenants_subdominio_key").on(table.subdominio),
	unique("tenants_dominio_personalizado_key").on(table.dominioPersonalizado),
]);

export const billings = pgTable("billings", {
	id: serial().primaryKey().notNull(),
	nf: text().notNull(),
	pedido: text().notNull(),
	cliente: text().notNull(),
	erp: text(),
	valor: numeric({ precision: 12, scale:  2 }).notNull(),
	data: date().default(sql`CURRENT_DATE`).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	status: text().default('FATURADO'),
	descricao: text(),
	tipo: text().default('entrada'),
	projectId: text("project_id"),
	categoria: text().default('outros'),
	dueDate: date("due_date"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "billings_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const monthlyGoals = pgTable("monthly_goals", {
	period: text().primaryKey().notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "monthly_goals_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const chamadosGarantia = pgTable("chamados_garantia", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projetoId: text("projeto_id"),
	clienteId: text("cliente_id"),
	numero: text().notNull(),
	titulo: text().notNull(),
	descricao: text().notNull(),
	tipo: text().notNull(),
	prioridade: text().default('normal'),
	status: text().default('aberto'),
	dataAbertura: timestamp("data_abertura", { withTimezone: true, mode: 'string' }).defaultNow(),
	dataAgendamento: timestamp("data_agendamento", { withTimezone: true, mode: 'string' }),
	dataResolucao: timestamp("data_resolucao", { withTimezone: true, mode: 'string' }),
	responsavel: text(),
	custoAtendimento: numeric("custo_atendimento", { precision: 10, scale:  2 }).default('0'),
	dentroGarantia: boolean("dentro_garantia").default(true),
	solucaoAplicada: text("solucao_aplicada"),
	fotosUrls: text("fotos_urls").array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "chamados_garantia_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("chamados_garantia_numero_key").on(table.numero),
]);

export const erpCategories = pgTable("erp_categories", {
	id: text().primaryKey().notNull(),
	nome: text().notNull(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "erp_categories_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const conversasWhatsapp = pgTable("conversas_whatsapp", {
	id: serial().primaryKey().notNull(),
	orcamentoId: uuid("orcamento_id"),
	operacaoProdId: uuid("operacao_prod_id"),
	numeroTelefone: varchar("numero_telefone", { length: 20 }).notNull(),
	contatoNome: varchar("contato_nome", { length: 255 }),
	ultimaMensagem: text("ultima_mensagem"),
	timestampUltimaMsg: timestamp("timestamp_ultima_msg", { withTimezone: true, mode: 'string' }),
	mensagensNaoLidas: integer("mensagens_nao_lidas").default(0),
	statusConversa: varchar("status_conversa", { length: 50 }).default('ativa'),
	tags: varchar({ length: 500 }),
	dataCriacao: timestamp("data_criacao", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.operacaoProdId],
			foreignColumns: [ordensProd.id],
			name: "conversas_whatsapp_operacao_prod_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "conversas_whatsapp_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const etapasProdKanban = pgTable("etapas_prod_kanban", {
	id: serial().primaryKey().notNull(),
	operacaoProdId: uuid("operacao_prod_id"),
	etapaNumero: integer("etapa_numero").notNull(),
	etapaNome: varchar("etapa_nome", { length: 100 }).notNull(),
	statusKanban: varchar("status_kanban", { length: 50 }).default('a_fazer').notNull(),
	ordemDisplay: integer("ordem_display").default(0),
	dataInicio: date("data_inicio"),
	dataConclusao: date("data_conclusao"),
	responsavelId: uuid("responsavel_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.operacaoProdId],
			foreignColumns: [ordensProd.id],
			name: "etapas_prod_kanban_operacao_prod_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "etapas_prod_kanban_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const movimentoKanban = pgTable("movimento_kanban", {
	id: serial().primaryKey().notNull(),
	etapaKanbanId: integer("etapa_kanban_id"),
	statusAnterior: varchar("status_anterior", { length: 50 }),
	statusNovo: varchar("status_novo", { length: 50 }),
	usuarioId: uuid("usuario_id"),
	timestampMovimento: timestamp("timestamp_movimento", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	nota: text(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.etapaKanbanId],
			foreignColumns: [etapasProdKanban.id],
			name: "movimento_kanban_etapa_kanban_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "movimento_kanban_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const eventosCalendario = pgTable("eventos_calendario", {
	id: serial().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	tipoEvento: varchar("tipo_evento", { length: 50 }).notNull(),
	titulo: varchar({ length: 255 }).notNull(),
	descricao: text(),
	dataEvento: date("data_evento").notNull(),
	horaEvento: time("hora_evento"),
	orcamentoId: uuid("orcamento_id"),
	operacaoProdId: uuid("operacao_prod_id"),
	corCategoria: varchar("cor_categoria", { length: 20 }).default('#3B82F6'),
	concluido: boolean().default(false),
	notificacaoDiasAntes: integer("notificacao_dias_antes").default(0),
	notificacaoEnviada: boolean("notificacao_enviada").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.operacaoProdId],
			foreignColumns: [ordensProd.id],
			name: "eventos_calendario_operacao_prod_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "eventos_calendario_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const notificacoesCalendario = pgTable("notificacoes_calendario", {
	id: serial().primaryKey().notNull(),
	eventoCalendarioId: integer("evento_calendario_id"),
	tipoNotificacao: varchar("tipo_notificacao", { length: 50 }),
	mensagem: text(),
	enviadoEm: timestamp("enviado_em", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	lido: boolean().default(false),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.eventoCalendarioId],
			foreignColumns: [eventosCalendario.id],
			name: "notificacoes_calendario_evento_calendario_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "notificacoes_calendario_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const ordensProd = pgTable("ordens_prod", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orcamentoId: uuid("orcamento_id"),
	numeroOp: varchar("numero_op", { length: 50 }).notNull(),
	status: varchar({ length: 50 }).default('planejamento').notNull(),
	prioridade: integer().default(5),
	dataInicio: date("data_inicio"),
	dataPrazo: date("data_prazo"),
	dataConclusao: date("data_conclusao"),
	observacoes: text(),
	responsavelId: uuid("responsavel_id"),
	environment: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
	projetoId: uuid("projeto_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ordens_prod_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("ordens_prod_numero_op_key").on(table.numeroOp),
]);

export const custosReaisOp = pgTable("custos_reais_op", {
	id: serial().primaryKey().notNull(),
	operacaoProdId: uuid("operacao_prod_id").notNull(),
	orcamentoId: uuid("orcamento_id").notNull(),
	custoMaterialEstimado: numeric("custo_material_estimado", { precision: 10, scale:  2 }),
	custoMaoObraEstimada: numeric("custo_mao_obra_estimada", { precision: 10, scale:  2 }),
	tempoHorasEstimado: numeric("tempo_horas_estimado", { precision: 10, scale:  2 }),
	custoMaterialReal: numeric("custo_material_real", { precision: 10, scale:  2 }),
	custoMaoObraReal: numeric("custo_mao_obra_real", { precision: 10, scale:  2 }),
	tempoHorasReal: numeric("tempo_horas_real", { precision: 10, scale:  2 }),
	custoRetrabalho: numeric("custo_retrabalho", { precision: 10, scale:  2 }).default('0'),
	custoDesperdicioMaterial: numeric("custo_desperdicio_material", { precision: 10, scale:  2 }).default('0'),
	custoTotalEstimado: numeric("custo_total_estimado", { precision: 10, scale:  2 }),
	custoTotalReal: numeric("custo_total_real", { precision: 10, scale:  2 }),
	variacaoCusto: numeric("variacao_custo", { precision: 10, scale:  2 }),
	variacaoPercentual: numeric("variacao_percentual", { precision: 5, scale:  2 }),
	valorVenda: numeric("valor_venda", { precision: 10, scale:  2 }),
	margemEstimada: numeric("margem_estimada", { precision: 10, scale:  2 }),
	margemReal: numeric("margem_real", { precision: 10, scale:  2 }),
	margemPercentualReal: numeric("margem_percentual_real", { precision: 5, scale:  2 }),
	descricaoDesvios: text("descricao_desvios"),
	responsavelAnalise: uuid("responsavel_analise"),
	dataConclusaoOp: date("data_conclusao_op"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.operacaoProdId],
			foreignColumns: [ordensProd.id],
			name: "custos_reais_op_operacao_prod_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "custos_reais_op_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const tendenciasPreco = pgTable("tendencias_preco", {
	id: serial().primaryKey().notNull(),
	tipoProduto: varchar("tipo_produto", { length: 100 }),
	dataAnalise: date("data_analise"),
	precoMedioMes: numeric("preco_medio_mes", { precision: 10, scale:  2 }),
	precoMinimo: numeric("preco_minimo", { precision: 10, scale:  2 }),
	precoMaximo: numeric("preco_maximo", { precision: 10, scale:  2 }),
	margemMediaMes: numeric("margem_media_mes", { precision: 5, scale:  2 }),
	volumeVendas: integer("volume_vendas"),
	variacaoPrecoMes: numeric("variacao_preco_mes", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "tendencias_preco_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const rentabilidadeCliente = pgTable("rentabilidade_cliente", {
	id: serial().primaryKey().notNull(),
	clienteId: integer("cliente_id").notNull(),
	totalOrcamentos: integer("total_orcamentos").default(0),
	totalPedidos: integer("total_pedidos").default(0),
	totalVendido: numeric("total_vendido", { precision: 12, scale:  2 }).default('0'),
	totalCustosReais: numeric("total_custos_reais", { precision: 12, scale:  2 }).default('0'),
	margemTotal: numeric("margem_total", { precision: 12, scale:  2 }).default('0'),
	margemMediaPercentual: numeric("margem_media_percentual", { precision: 5, scale:  2 }).default('0'),
	ticketMedio: numeric("ticket_medio", { precision: 10, scale:  2 }).default('0'),
	operacoesLucrativas: integer("operacoes_lucrativas").default(0),
	operacoesPrejuizadas: integer("operacoes_prejuizadas").default(0),
	scoreRentabilidade: integer("score_rentabilidade").default(0),
	ultimoPedidoData: date("ultimo_pedido_data"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "rentabilidade_cliente_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const mensagensWhatsapp = pgTable("mensagens_whatsapp", {
	id: serial().primaryKey().notNull(),
	conversaWhatsappId: integer("conversa_whatsapp_id").notNull(),
	usuarioId: uuid("usuario_id"),
	tipoMsg: varchar("tipo_msg", { length: 50 }).notNull(),
	conteudoMsg: text("conteudo_msg").notNull(),
	arquivoUrl: varchar("arquivo_url", { length: 500 }),
	timestampMsg: timestamp("timestamp_msg", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	lido: boolean().default(false),
	whatsappMsgId: varchar("whatsapp_msg_id", { length: 100 }),
	statusEntrega: varchar("status_entrega", { length: 50 }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.conversaWhatsappId],
			foreignColumns: [conversasWhatsapp.id],
			name: "mensagens_whatsapp_conversa_whatsapp_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "mensagens_whatsapp_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("mensagens_whatsapp_whatsapp_msg_id_key").on(table.whatsappMsgId),
]);

export const modelosMsgWhatsapp = pgTable("modelos_msg_whatsapp", {
	id: serial().primaryKey().notNull(),
	titulo: varchar({ length: 100 }).notNull(),
	conteudoTemplate: text("conteudo_template").notNull(),
	tipoAcionador: varchar("tipo_acionador", { length: 50 }),
	ativo: boolean().default(true),
	criadoPor: uuid("criado_por"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "modelos_msg_whatsapp_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const movimentoEstoqueGranular = pgTable("movimento_estoque_granular", {
	id: serial().primaryKey().notNull(),
	skuCodigo: varchar("sku_codigo", { length: 50 }),
	operacaoProdId: uuid("operacao_prod_id"),
	orcamentoId: uuid("orcamento_id"),
	tipoMovimento: varchar("tipo_movimento", { length: 50 }).notNull(),
	quantidadeMovimento: integer("quantidade_movimento").notNull(),
	statusAnterior: varchar("status_anterior", { length: 50 }),
	statusNovo: varchar("status_novo", { length: 50 }),
	saldoAnterior: integer("saldo_anterior"),
	saldoNovo: integer("saldo_novo"),
	motivoDescricao: text("motivo_descricao"),
	usuarioId: uuid("usuario_id"),
	timestampMovimento: timestamp("timestamp_movimento", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.skuCodigo],
			foreignColumns: [estoqueMateriaisDetalhado.skuCodigo],
			name: "movimento_estoque_granular_sku_codigo_fkey"
		}),
	foreignKey({
			columns: [table.operacaoProdId],
			foreignColumns: [ordensProd.id],
			name: "movimento_estoque_granular_operacao_prod_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "movimento_estoque_granular_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const alertasEstoque = pgTable("alertas_estoque", {
	id: serial().primaryKey().notNull(),
	skuCodigo: varchar("sku_codigo", { length: 50 }),
	tipoAlerta: varchar("tipo_alerta", { length: 50 }),
	quantidadeAtual: integer("quantidade_atual"),
	limiteAlerta: integer("limite_alerta"),
	severidade: varchar({ length: 20 }),
	ativo: boolean().default(true),
	dataAlerta: timestamp("data_alerta", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	dataResolucao: timestamp("data_resolucao", { withTimezone: true, mode: 'string' }),
	usuarioNotificadoId: uuid("usuario_notificado_id"),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.skuCodigo],
			foreignColumns: [estoqueMateriaisDetalhado.skuCodigo],
			name: "alertas_estoque_sku_codigo_fkey"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "alertas_estoque_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const planejamentoReposicao = pgTable("planejamento_reposicao", {
	id: serial().primaryKey().notNull(),
	skuCodigo: varchar("sku_codigo", { length: 50 }),
	quantidadeNecessaria: integer("quantidade_necessaria"),
	dataNecessarioAte: timestamp("data_necessario_ate", { withTimezone: true, mode: 'string' }),
	operacaoProdId: uuid("operacao_prod_id"),
	statusPlanejamento: varchar("status_planejamento", { length: 50 }),
	ordemCompraId: integer("ordem_compra_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.skuCodigo],
			foreignColumns: [estoqueMateriaisDetalhado.skuCodigo],
			name: "planejamento_reposicao_sku_codigo_fkey"
		}),
	foreignKey({
			columns: [table.operacaoProdId],
			foreignColumns: [ordensProd.id],
			name: "planejamento_reposicao_operacao_prod_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "planejamento_reposicao_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const ordensCompraGranular = pgTable("ordens_compra_granular", {
	id: serial().primaryKey().notNull(),
	numeroOc: varchar("numero_oc", { length: 50 }).notNull(),
	fornecedorId: integer("fornecedor_id"),
	dataEmissao: timestamp("data_emissao", { withTimezone: true, mode: 'string' }),
	dataEntregaPrevista: timestamp("data_entrega_prevista", { withTimezone: true, mode: 'string' }),
	dataEntregaReal: timestamp("data_entrega_real", { withTimezone: true, mode: 'string' }),
	statusOc: varchar("status_oc", { length: 50 }),
	valorTotal: numeric("valor_total", { precision: 12, scale:  2 }),
	observacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ordens_compra_granular_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("ordens_compra_granular_numero_oc_key").on(table.numeroOc),
]);

export const itensOcGranular = pgTable("itens_oc_granular", {
	id: serial().primaryKey().notNull(),
	ordemCompraId: integer("ordem_compra_id").notNull(),
	skuCodigo: varchar("sku_codigo", { length: 50 }),
	quantidadeSolicitada: integer("quantidade_solicitada"),
	quantidadeRecebida: integer("quantidade_recebida").default(0),
	precoUnitario: numeric("preco_unitario", { precision: 10, scale:  2 }),
	subtotal: numeric({ precision: 12, scale:  2 }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.ordemCompraId],
			foreignColumns: [ordensCompraGranular.id],
			name: "itens_oc_granular_ordem_compra_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.skuCodigo],
			foreignColumns: [estoqueMateriaisDetalhado.skuCodigo],
			name: "itens_oc_granular_sku_codigo_fkey"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "itens_oc_granular_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const contratoDigital = pgTable("contrato_digital", {
	id: serial().primaryKey().notNull(),
	orcamentoId: uuid("orcamento_id"),
	numeroContrato: varchar("numero_contrato", { length: 50 }),
	dataCriacao: timestamp("data_criacao", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	dataDocumento: timestamp("data_documento", { withTimezone: true, mode: 'string' }),
	empresaNome: varchar("empresa_nome", { length: 255 }),
	empresaCnpj: varchar("empresa_cnpj", { length: 20 }),
	clienteNome: varchar("cliente_nome", { length: 255 }),
	clienteCpfCnpj: varchar("cliente_cpf_cnpj", { length: 20 }),
	htmlContrato: text("html_contrato"),
	arquivoPdfUrl: varchar("arquivo_pdf_url", { length: 500 }),
	statusAssinatura: varchar("status_assinatura", { length: 50 }).default('pendente'),
	dataSolicitacaoAssinatura: timestamp("data_solicitacao_assinatura", { withTimezone: true, mode: 'string' }),
	idAssinaturaExterna: varchar("id_assinatura_externa", { length: 100 }),
	urlAssinatura: varchar("url_assinatura", { length: 500 }),
	dataAssinaturaEmpresa: timestamp("data_assinatura_empresa", { withTimezone: true, mode: 'string' }),
	dataAssinaturaCliente: timestamp("data_assinatura_cliente", { withTimezone: true, mode: 'string' }),
	certificadoValidade: timestamp("certificado_validade", { withTimezone: true, mode: 'string' }),
	documentoAssinadoUrl: varchar("documento_assinado_url", { length: 500 }),
	hashDocumento: varchar("hash_documento", { length: 256 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "contrato_digital_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("contrato_digital_orcamento_id_key").on(table.orcamentoId),
	unique("contrato_digital_numero_contrato_key").on(table.numeroContrato),
]);

export const estoqueMateriaisDetalhado = pgTable("estoque_materiais_detalhado", {
	id: serial().primaryKey().notNull(),
	skuCodigo: varchar("sku_codigo", { length: 50 }).notNull(),
	descricao: varchar({ length: 255 }).notNull(),
	unidadeMedida: varchar("unidade_medida", { length: 20 }).default('un'),
	quantidadeDisponivel: integer("quantidade_disponivel").default(0),
	quantidadeEmTransito: integer("quantidade_em_transito").default(0),
	quantidadeProvisionado: integer("quantidade_provisionado").default(0),
	quantidadeDefeituoso: integer("quantidade_defeituoso").default(0),
	quantidadeVencido: integer("quantidade_vencido").default(0),
	quantidadeMinima: integer("quantidade_minima").default(10),
	quantidadeMaxima: integer("quantidade_maxima").default(500),
	leadTimeDias: integer("lead_time_dias").default(7),
	precoCustoUnitario: numeric("preco_custo_unitario", { precision: 10, scale:  2 }),
	valorTotalEstoque: numeric("valor_total_estoque", { precision: 12, scale:  2 }),
	fornecedorId: integer("fornecedor_id"),
	dataUltimaCompra: timestamp("data_ultima_compra", { withTimezone: true, mode: 'string' }),
	dataProximaReposicao: timestamp("data_proxima_reposicao", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "estoque_materiais_detalhado_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("estoque_materiais_detalhado_sku_codigo_key").on(table.skuCodigo),
]);

export const historicoAssinaturaDigital = pgTable("historico_assinatura_digital", {
	id: serial().primaryKey().notNull(),
	contratoId: integer("contrato_id").notNull(),
	acao: varchar({ length: 100 }).notNull(),
	timestampAcao: timestamp("timestamp_acao", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	usuarioId: uuid("usuario_id"),
	detalhes: text(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "historico_assinatura_digital_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.contratoId],
			foreignColumns: [contratoDigital.id],
			name: "historico_assinatura_digital_contrato_id_fkey"
		}).onDelete("cascade"),
]);

export const mapeamentoSku = pgTable("mapeamento_sku", {
	id: serial().primaryKey().notNull(),
	skuPromob: varchar("sku_promob", { length: 100 }).notNull(),
	skuInterno: varchar("sku_interno", { length: 50 }),
	nomePromob: varchar("nome_promob", { length: 255 }),
	nomeInterno: varchar("nome_interno", { length: 255 }),
	confiancaMatch: integer("confianca_match").default(100),
	tipoMatch: varchar("tipo_match", { length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	validadoPor: uuid("validado_por"),
	dataValidation: timestamp("data_validation", { withTimezone: true, mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.skuInterno],
			foreignColumns: [estoqueMateriaisDetalhado.skuCodigo],
			name: "mapeamento_sku_sku_interno_fkey"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "mapeamento_sku_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const historicoSkuMatching = pgTable("historico_sku_matching", {
	id: serial().primaryKey().notNull(),
	orcamentoId: uuid("orcamento_id"),
	skuProcurado: varchar("sku_procurado", { length: 100 }).notNull(),
	skusSugeridos: varchar("skus_sugeridos", { length: 500 }),
	skuSelecionado: varchar("sku_selecionado", { length: 50 }),
	timestampMatching: timestamp("timestamp_matching", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	usuarioId: uuid("usuario_id"),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "historico_sku_matching_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const quotations = pgTable("quotations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	numeroOrcamento: varchar("numero_orcamento", { length: 30 }).notNull(),
	clienteId: integer("cliente_id"),
	projetoId: uuid("projeto_id"),
	dataOrcamento: timestamp("data_orcamento", { mode: 'string' }).defaultNow(),
	validadeDias: integer("validade_dias").default(15),
	prazoEntregaDias: integer("prazo_entrega_dias"),
	descritivoPagamento: text("descritivo_pagamento"),
	condicoesComerciais: text("condicoes_comerciais"),
	margemLucroPercentual: numeric("margem_lucro_percentual", { precision: 5, scale:  2 }),
	taxaFinanceiraPercentual: numeric("taxa_financeira_percentual", { precision: 5, scale:  2 }).default('0'),
	descontoPercentual: numeric("desconto_percentual", { precision: 5, scale:  2 }).default('0'),
	valorTotalCusto: numeric("valor_total_custo", { precision: 12, scale:  2 }),
	valorTotalVenda: numeric("valor_total_venda", { precision: 12, scale:  2 }),
	status: varchar({ length: 20 }).default('RASCUNHO'),
	arquivoSketchupUrl: text("arquivo_sketchup_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("quotations_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("int4_ops")),
	index("quotations_data_orcamento_idx").using("btree", table.dataOrcamento.asc().nullsLast().op("timestamp_ops")),
	index("quotations_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("quotations_numero_orcamento_key").on(table.numeroOrcamento),
]);

export const quotationItems = pgTable("quotation_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	quotationId: uuid("quotation_id"),
	skuEngenhariaId: uuid("sku_engenharia_id"),
	quantidade: numeric({ precision: 10, scale:  3 }).notNull(),
	custoUnitarioCalculado: numeric("custo_unitario_calculado", { precision: 12, scale:  2 }),
	precoVendaUnitario: numeric("preco_venda_unitario", { precision: 12, scale:  2 }),
	observacoes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	material: varchar({ length: 255 }),
	nomeCustomizado: varchar("nome_customizado", { length: 255 }),
	largura: varchar({ length: 20 }),
	altura: varchar({ length: 20 }),
	espessura: varchar({ length: 20 }),
	skuComponenteId: uuid("sku_componente_id"),
	skuCodigo: varchar("sku_codigo", { length: 100 }),
	skuDescricao: text("sku_descricao"),
	unidadeMedida: varchar("unidade_medida", { length: 20 }).default('UN'),
	custoBaseEstoque: numeric("custo_base_estoque", { precision: 12, scale:  2 }),
	custoSobrescrito: numeric("custo_sobrescrito", { precision: 12, scale:  2 }),
	precoVendaSobrescrito: numeric("preco_venda_sobrescrito", { precision: 12, scale:  2 }),
	markup: numeric({ precision: 10, scale:  4 }),
	margemLucro: numeric("margem_lucro", { precision: 10, scale:  4 }),
	origemDados: varchar("origem_dados", { length: 50 }).default('CSV'),
	possuiOverride: boolean("possui_override").default(false),
	metadata: jsonb().default({}),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("quotation_items_orcamento_id_idx").using("btree", table.quotationId.asc().nullsLast().op("uuid_ops")),
	index("quotation_items_orcamento_id_idx1").using("btree", table.quotationId.asc().nullsLast().op("uuid_ops")),
	index("quotation_items_orcamento_id_idx2").using("btree", table.quotationId.asc().nullsLast().op("uuid_ops")),
	index("quotation_items_sku_codigo_idx").using("btree", table.skuCodigo.asc().nullsLast().op("text_ops")),
	index("quotation_items_sku_componente_id_idx").using("btree", table.skuComponenteId.asc().nullsLast().op("uuid_ops")),
	index("quotation_items_sku_componente_id_idx1").using("btree", table.skuComponenteId.asc().nullsLast().op("uuid_ops")),
	index("quotation_items_sku_engenharia_id_idx").using("btree", table.skuEngenhariaId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.quotationId],
			foreignColumns: [quotations.id],
			name: "fk_quotation_items_quotations"
		}).onDelete("cascade"),
]);

export const quotationBom = pgTable("quotation_bom", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	quotationItemId: uuid("quotation_item_id"),
	skuComponenteId: uuid("sku_componente_id"),
	quantidadeCalculada: numeric("quantidade_calculada", { precision: 10, scale:  3 }),
	quantidadeAjustada: numeric("quantidade_ajustada", { precision: 10, scale:  3 }),
	custoUnitario: numeric("custo_unitario", { precision: 10, scale:  2 }),
	origem: varchar({ length: 20 }).default('BOM'),
	editado: boolean().default(false),
	observacoes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("quotation_bom_orcamento_item_id_idx").using("btree", table.quotationItemId.asc().nullsLast().op("uuid_ops")),
	index("quotation_bom_sku_componente_id_idx").using("btree", table.skuComponenteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.quotationItemId],
			foreignColumns: [quotationItems.id],
			name: "fk_quotation_bom_items"
		}).onDelete("cascade"),
]);

export const prospeccoes = pgTable("prospeccoes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	nome: varchar({ length: 255 }).notNull(),
	telefone: varchar({ length: 30 }),
	email: varchar({ length: 255 }),
	cidade: varchar({ length: 100 }),
	uf: varchar({ length: 2 }),
	status: varchar({ length: 50 }).default('novo_contato').notNull(),
	temperatura: varchar({ length: 20 }).default('frio'),
	origem: varchar({ length: 50 }).default('outro'),
	interesse: text(),
	orcamentoEstimado: numeric("orcamento_estimado", { precision: 12, scale:  2 }),
	prazoDesejadoDias: integer("prazo_desejado_dias"),
	responsavelId: varchar("responsavel_id", { length: 100 }),
	responsavelNome: varchar("responsavel_nome", { length: 255 }),
	clienteId: uuid("cliente_id"),
	projetoId: uuid("projeto_id"),
	budget: boolean().default(false),
	authority: boolean().default(false),
	need: boolean().default(false),
	timeline: boolean().default(false),
	motivoPerda: text("motivo_perda"),
	concorrentePerdeu: varchar("concorrente_perdeu", { length: 255 }),
	observacoes: text(),
	convertidoEm: timestamp("convertido_em", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("prospeccoes_status_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("prospeccoes_tenant_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "prospeccoes_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const orcamentos = pgTable("orcamentos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clienteId: text("cliente_id"),
	projetoId: text("projeto_id"),
	visitaId: text("visita_id"),
	numero: text(),
	status: text().default('rascunho'),
	valorBase: numeric("valor_base", { precision: 12, scale:  2 }),
	taxaMensal: numeric("taxa_mensal", { precision: 12, scale:  2 }),
	condicaoPagamentoId: uuid("condicao_pagamento_id"),
	valorFinal: numeric("valor_final", { precision: 12, scale:  2 }),
	prazoEntregaDias: integer("prazo_entrega_dias"),
	prazoTipo: text("prazo_tipo").default('padrao'),
	adicionalUrgenciaPct: numeric("adicional_urgencia_pct", { precision: 5, scale:  2 }).default('0'),
	observacoes: text(),
	materiaisConsumidos: jsonb("materiais_consumidos").default([]),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_orcamentos_numero").using("btree", table.numero.asc().nullsLast().op("text_ops")),
	index("idx_orcamentos_projeto_id").using("btree", table.projetoId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "orcamentos_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("orcamentos_numero_key").on(table.numero),
]);

export const orcamentoAmbientes = pgTable("orcamento_ambientes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	quotationId: uuid("quotation_id"),
	nome: text().notNull(),
	ordem: integer().default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.quotationId],
			foreignColumns: [orcamentos.id],
			name: "orcamento_ambientes_quotation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "orcamento_ambientes_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const orcamentoMoveis = pgTable("orcamento_moveis", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ambienteId: uuid("ambiente_id"),
	nome: text().notNull(),
	tipoMovel: text("tipo_movel"),
	larguraTotalCm: numeric("largura_total_cm", { precision: 10, scale:  2 }),
	alturaTotalCm: numeric("altura_total_cm", { precision: 10, scale:  2 }),
	profundidadeTotalCm: numeric("profundidade_total_cm", { precision: 10, scale:  2 }),
	erpProductId: uuid("erp_product_id"),
	observacoes: text(),
	ordem: integer().default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.ambienteId],
			foreignColumns: [orcamentoAmbientes.id],
			name: "orcamento_moveis_ambiente_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "orcamento_moveis_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const orcamentoPecas = pgTable("orcamento_pecas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	movelId: uuid("movel_id"),
	materialId: text("material_id"),
	sku: text(),
	descricaoPeca: text("descricao_peca"),
	larguraCm: numeric("largura_cm", { precision: 10, scale:  2 }),
	alturaCm: numeric("altura_cm", { precision: 10, scale:  2 }),
	espessuraMm: numeric("espessura_mm", { precision: 10, scale:  2 }).default('15'),
	quantidade: integer().default(1),
	m2Unitario: numeric("m2_unitario", { precision: 12, scale:  4 }),
	m2Total: numeric("m2_total", { precision: 12, scale:  4 }),
	fatorPerdaPct: numeric("fator_perda_pct", { precision: 5, scale:  2 }),
	m2ComPerda: numeric("m2_com_perda", { precision: 12, scale:  4 }),
	precoCustoM2: numeric("preco_custo_m2", { precision: 12, scale:  2 }),
	custoTotalPeca: numeric("custo_total_peca", { precision: 12, scale:  2 }),
	metrosFitaBorda: numeric("metros_fita_borda", { precision: 12, scale:  2 }),
	fitaMaterialId: text("fita_material_id"),
	sentidoVeio: text("sentido_veio").default('longitudinal'),
	descontoFitaMm: numeric("desconto_fita_mm", { precision: 5, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	index("idx_orcamento_pecas_sku").using("btree", table.sku.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.movelId],
			foreignColumns: [orcamentoMoveis.id],
			name: "orcamento_pecas_movel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "orcamento_pecas_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const orcamentoFerragens = pgTable("orcamento_ferragens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	movelId: uuid("movel_id"),
	materialId: text("material_id"),
	sku: text(),
	descricao: text(),
	quantidade: numeric({ precision: 12, scale:  2 }).default('1'),
	unidade: text().default('UN'),
	precoCustoUnitario: numeric("preco_custo_unitario", { precision: 12, scale:  2 }),
	custoTotal: numeric("custo_total", { precision: 12, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.movelId],
			foreignColumns: [orcamentoMoveis.id],
			name: "orcamento_ferragens_movel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "orcamento_ferragens_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const orcamentoCustosExtras = pgTable("orcamento_custos_extras", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	quotationId: uuid("quotation_id"),
	descricao: text().notNull(),
	tipo: text(),
	formaCalculo: text("forma_calculo"),
	percentualOuValor: numeric("percentual_ou_valor", { precision: 12, scale:  2 }),
	m2TotalReferencia: numeric("m2_total_referencia", { precision: 12, scale:  4 }),
	valorCalculado: numeric("valor_calculado", { precision: 12, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
}, (table) => [
	foreignKey({
			columns: [table.quotationId],
			foreignColumns: [orcamentos.id],
			name: "orcamento_custos_extras_quotation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "orcamento_custos_extras_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const interacoesProspeccao = pgTable("interacoes_prospeccao", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	prospeccaoId: uuid("prospeccao_id").notNull(),
	tenantId: uuid("tenant_id"),
	tipo: varchar({ length: 50 }).notNull(),
	titulo: varchar({ length: 255 }),
	descricao: text(),
	statusAnterior: varchar("status_anterior", { length: 50 }),
	statusNovo: varchar("status_novo", { length: 50 }),
	realizadoPor: varchar("realizado_por", { length: 255 }),
	dataInteracao: timestamp("data_interacao", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("interacoes_prosp_idx").using("btree", table.prospeccaoId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.prospeccaoId],
			foreignColumns: [prospeccoes.id],
			name: "interacoes_prospeccao_prospeccao_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "interacoes_prospeccao_tenant_id_fkey"
		}).onDelete("cascade"),
]);
export const retalhosDisponiveis = pgView("retalhos_disponiveis", {	id: uuid(),
	larguraMm: integer("largura_mm"),
	alturaMm: integer("altura_mm"),
	espessuraMm: integer("espessura_mm"),
	skuChapa: varchar("sku_chapa", { length: 100 }),
	areaMm2: integer("area_mm2"),
	origem: varchar({ length: 50 }),
	planoCorteOrigemId: uuid("plano_corte_origem_id"),
	projetoOrigem: varchar("projeto_origem", { length: 255 }),
	observacoes: text(),
	localizacao: varchar({ length: 100 }),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }),
	diasEstoque: numeric("dias_estoque"),
}).as(sql`SELECT id, largura_mm, altura_mm, espessura_mm, sku_chapa, largura_mm * altura_mm AS area_mm2, origem, plano_corte_origem_id, projeto_origem, observacoes, localizacao, created_at AS criado_em, EXTRACT(epoch FROM now() - created_at) / 86400::numeric AS dias_estoque FROM retalhos_estoque WHERE disponivel = true AND descartado = false`);

export const retalhosEstatisticas = pgView("retalhos_estatisticas", {	skuChapa: varchar("sku_chapa", { length: 100 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalRetalhos: bigint("total_retalhos", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	disponiveis: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	utilizados: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	descartados: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	areaTotalDisponivelMm2: bigint("area_total_disponivel_mm2", { mode: "number" }),
	areaMediaMm2: numeric("area_media_mm2"),
	retalhoMaisAntigo: timestamp("retalho_mais_antigo", { withTimezone: true, mode: 'string' }),
	retalhoMaisRecente: timestamp("retalho_mais_recente", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT sku_chapa, count(*) AS total_retalhos, sum( CASE WHEN disponivel = true AND descartado = false THEN 1 ELSE 0 END) AS disponiveis, sum( CASE WHEN disponivel = false AND descartado = false THEN 1 ELSE 0 END) AS utilizados, sum( CASE WHEN descartado = true THEN 1 ELSE 0 END) AS descartados, sum(largura_mm * altura_mm) FILTER (WHERE disponivel = true AND descartado = false) AS area_total_disponivel_mm2, avg(largura_mm * altura_mm) FILTER (WHERE disponivel = true AND descartado = false) AS area_media_mm2, min(created_at) FILTER (WHERE disponivel = true AND descartado = false) AS retalho_mais_antigo, max(created_at) FILTER (WHERE disponivel = true AND descartado = false) AS retalho_mais_recente FROM retalhos_estoque GROUP BY sku_chapa`);