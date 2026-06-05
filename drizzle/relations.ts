import { relations } from "drizzle-orm/relations";
import { tenants, erpSimulations, users, materiais, fornecedores, itensOrcamento, chamadosGarantia, historicoChamado, clients, kanbanItems, erpSkus, erpProductBom, projects, erpCategories, erpFamilies, erpSubfamilies, planosDeCorte, erpProjectItems, erpConsumptionResults, erpSkusEngenharia, classesFinanceiras, condicoesPagamento, pedidosCompra, pedidoCompraItens, formasPagamento, notificacoes, contasInternas, retalhosEstoque, contasRecorrentes, titulosReceber, titulosPagar, baixas, erpChapas, movimentacoesEstoque, skuEngenharia, bomEngenhariaMontagem, skuMontagem, erpMovimentacoesIndustrial, eventos, bomMontagemComponente, skuComponente, ordensProducao, tenantConfigs, subscriptions, usageLogs, billings, monthlyGoals, ordensProd, conversasWhatsapp, etapasProdKanban, movimentoKanban, eventosCalendario, notificacoesCalendario, custosReaisOp, tendenciasPreco, rentabilidadeCliente, mensagensWhatsapp, modelosMsgWhatsapp, estoqueMateriaisDetalhado, movimentoEstoqueGranular, alertasEstoque, planejamentoReposicao, ordensCompraGranular, itensOcGranular, contratoDigital, historicoAssinaturaDigital, mapeamentoSku, historicoSkuMatching, quotations, quotationItems, quotationBom, prospeccoes, orcamentos, orcamentoAmbientes, orcamentoMoveis, orcamentoPecas, orcamentoFerragens, orcamentoCustosExtras, interacoesProspeccao } from "./schema";

export const erpSimulationsRelations = relations(erpSimulations, ({one}) => ({
	tenant: one(tenants, {
		fields: [erpSimulations.tenantId],
		references: [tenants.id]
	}),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	erpSimulations: many(erpSimulations),
	users: many(users),
	materiais: many(materiais),
	fornecedores: many(fornecedores),
	itensOrcamentos: many(itensOrcamento),
	clients: many(clients),
	kanbanItems: many(kanbanItems),
	erpProductBoms: many(erpProductBom),
	projects: many(projects),
	planosDeCortes: many(planosDeCorte),
	erpSkusEngenharias: many(erpSkusEngenharia),
	classesFinanceiras: many(classesFinanceiras),
	pedidosCompras: many(pedidosCompra),
	pedidoCompraItens: many(pedidoCompraItens),
	formasPagamentos: many(formasPagamento),
	notificacoes: many(notificacoes),
	contasInternas: many(contasInternas),
	retalhosEstoques: many(retalhosEstoque),
	contasRecorrentes: many(contasRecorrentes),
	titulosRecebers: many(titulosReceber),
	titulosPagars: many(titulosPagar),
	condicoesPagamentos: many(condicoesPagamento),
	baixas: many(baixas),
	erpChapas: many(erpChapas),
	movimentacoesEstoques: many(movimentacoesEstoque),
	erpMovimentacoesIndustrials: many(erpMovimentacoesIndustrial),
	eventos: many(eventos),
	ordensProducaos: many(ordensProducao),
	tenantConfigs: many(tenantConfigs),
	subscriptions: many(subscriptions),
	usageLogs: many(usageLogs),
	billings: many(billings),
	monthlyGoals: many(monthlyGoals),
	chamadosGarantias: many(chamadosGarantia),
	erpCategories: many(erpCategories),
	conversasWhatsapps: many(conversasWhatsapp),
	etapasProdKanbans: many(etapasProdKanban),
	movimentoKanbans: many(movimentoKanban),
	eventosCalendarios: many(eventosCalendario),
	notificacoesCalendarios: many(notificacoesCalendario),
	ordensProds: many(ordensProd),
	custosReaisOps: many(custosReaisOp),
	tendenciasPrecos: many(tendenciasPreco),
	rentabilidadeClientes: many(rentabilidadeCliente),
	mensagensWhatsapps: many(mensagensWhatsapp),
	modelosMsgWhatsapps: many(modelosMsgWhatsapp),
	movimentoEstoqueGranulars: many(movimentoEstoqueGranular),
	alertasEstoques: many(alertasEstoque),
	planejamentoReposicaos: many(planejamentoReposicao),
	ordensCompraGranulars: many(ordensCompraGranular),
	itensOcGranulars: many(itensOcGranular),
	contratoDigitals: many(contratoDigital),
	estoqueMateriaisDetalhados: many(estoqueMateriaisDetalhado),
	historicoAssinaturaDigitals: many(historicoAssinaturaDigital),
	mapeamentoSkus: many(mapeamentoSku),
	historicoSkuMatchings: many(historicoSkuMatching),
	prospeccoes: many(prospeccoes),
	orcamentos: many(orcamentos),
	orcamentoAmbientes: many(orcamentoAmbientes),
	orcamentoMoveis: many(orcamentoMoveis),
	orcamentoPecas: many(orcamentoPecas),
	orcamentoFerragens: many(orcamentoFerragens),
	orcamentoCustosExtras: many(orcamentoCustosExtras),
	interacoesProspeccaos: many(interacoesProspeccao),
}));

export const usersRelations = relations(users, ({one}) => ({
	tenant: one(tenants, {
		fields: [users.tenantId],
		references: [tenants.id]
	}),
}));

export const materiaisRelations = relations(materiais, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [materiais.tenantId],
		references: [tenants.id]
	}),
	pedidoCompraItens: many(pedidoCompraItens),
	movimentacoesEstoques: many(movimentacoesEstoque),
}));

export const fornecedoresRelations = relations(fornecedores, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [fornecedores.tenantId],
		references: [tenants.id]
	}),
	pedidosCompras: many(pedidosCompra),
}));

export const itensOrcamentoRelations = relations(itensOrcamento, ({one}) => ({
	tenant: one(tenants, {
		fields: [itensOrcamento.tenantId],
		references: [tenants.id]
	}),
}));

export const historicoChamadoRelations = relations(historicoChamado, ({one}) => ({
	chamadosGarantia: one(chamadosGarantia, {
		fields: [historicoChamado.chamadoId],
		references: [chamadosGarantia.id]
	}),
}));

export const chamadosGarantiaRelations = relations(chamadosGarantia, ({one, many}) => ({
	historicoChamados: many(historicoChamado),
	tenant: one(tenants, {
		fields: [chamadosGarantia.tenantId],
		references: [tenants.id]
	}),
}));

export const clientsRelations = relations(clients, ({one}) => ({
	tenant: one(tenants, {
		fields: [clients.tenantId],
		references: [tenants.id]
	}),
}));

export const kanbanItemsRelations = relations(kanbanItems, ({one, many}) => ({
	kanbanItem: one(kanbanItems, {
		fields: [kanbanItems.projectId],
		references: [kanbanItems.id],
		relationName: "kanbanItems_projectId_kanbanItems_id"
	}),
	kanbanItems: many(kanbanItems, {
		relationName: "kanbanItems_projectId_kanbanItems_id"
	}),
	tenant: one(tenants, {
		fields: [kanbanItems.tenantId],
		references: [tenants.id]
	}),
}));

export const erpProductBomRelations = relations(erpProductBom, ({one}) => ({
	erpSkus: one(erpSkus, {
		fields: [erpProductBom.skuId],
		references: [erpSkus.id]
	}),
	tenant: one(tenants, {
		fields: [erpProductBom.tenantId],
		references: [tenants.id]
	}),
}));

export const erpSkusRelations = relations(erpSkus, ({many}) => ({
	erpProductBoms: many(erpProductBom),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [projects.tenantId],
		references: [tenants.id]
	}),
	erpProjectItems: many(erpProjectItems),
}));

export const erpFamiliesRelations = relations(erpFamilies, ({one, many}) => ({
	erpCategory: one(erpCategories, {
		fields: [erpFamilies.categoriaId],
		references: [erpCategories.id]
	}),
	erpSubfamilies: many(erpSubfamilies),
}));

export const erpCategoriesRelations = relations(erpCategories, ({one, many}) => ({
	erpFamilies: many(erpFamilies),
	tenant: one(tenants, {
		fields: [erpCategories.tenantId],
		references: [tenants.id]
	}),
}));

export const erpSubfamiliesRelations = relations(erpSubfamilies, ({one}) => ({
	erpFamily: one(erpFamilies, {
		fields: [erpSubfamilies.familiaId],
		references: [erpFamilies.id]
	}),
}));

export const planosDeCorteRelations = relations(planosDeCorte, ({one}) => ({
	tenant: one(tenants, {
		fields: [planosDeCorte.tenantId],
		references: [tenants.id]
	}),
}));

export const erpProjectItemsRelations = relations(erpProjectItems, ({one, many}) => ({
	project: one(projects, {
		fields: [erpProjectItems.projectId],
		references: [projects.id]
	}),
	erpConsumptionResults: many(erpConsumptionResults),
}));

export const erpConsumptionResultsRelations = relations(erpConsumptionResults, ({one}) => ({
	erpProjectItem: one(erpProjectItems, {
		fields: [erpConsumptionResults.projectItemId],
		references: [erpProjectItems.id]
	}),
}));

export const erpSkusEngenhariaRelations = relations(erpSkusEngenharia, ({one}) => ({
	tenant: one(tenants, {
		fields: [erpSkusEngenharia.tenantId],
		references: [tenants.id]
	}),
}));

export const classesFinanceirasRelations = relations(classesFinanceiras, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [classesFinanceiras.tenantId],
		references: [tenants.id]
	}),
	classesFinanceira: one(classesFinanceiras, {
		fields: [classesFinanceiras.paiId],
		references: [classesFinanceiras.id],
		relationName: "classesFinanceiras_paiId_classesFinanceiras_id"
	}),
	classesFinanceiras: many(classesFinanceiras, {
		relationName: "classesFinanceiras_paiId_classesFinanceiras_id"
	}),
	contasRecorrentes: many(contasRecorrentes),
	titulosRecebers: many(titulosReceber),
	titulosPagars: many(titulosPagar),
}));

export const pedidosCompraRelations = relations(pedidosCompra, ({one, many}) => ({
	condicoesPagamento: one(condicoesPagamento, {
		fields: [pedidosCompra.condicaoPagamentoId],
		references: [condicoesPagamento.id]
	}),
	fornecedore: one(fornecedores, {
		fields: [pedidosCompra.fornecedorId],
		references: [fornecedores.id]
	}),
	tenant: one(tenants, {
		fields: [pedidosCompra.tenantId],
		references: [tenants.id]
	}),
	pedidoCompraItens: many(pedidoCompraItens),
}));

export const condicoesPagamentoRelations = relations(condicoesPagamento, ({one, many}) => ({
	pedidosCompras: many(pedidosCompra),
	titulosRecebers: many(titulosReceber),
	titulosPagars: many(titulosPagar),
	tenant: one(tenants, {
		fields: [condicoesPagamento.tenantId],
		references: [tenants.id]
	}),
}));

export const pedidoCompraItensRelations = relations(pedidoCompraItens, ({one}) => ({
	pedidosCompra: one(pedidosCompra, {
		fields: [pedidoCompraItens.pedidoId],
		references: [pedidosCompra.id]
	}),
	materiai: one(materiais, {
		fields: [pedidoCompraItens.materialId],
		references: [materiais.id]
	}),
	tenant: one(tenants, {
		fields: [pedidoCompraItens.tenantId],
		references: [tenants.id]
	}),
}));

export const formasPagamentoRelations = relations(formasPagamento, ({one}) => ({
	tenant: one(tenants, {
		fields: [formasPagamento.tenantId],
		references: [tenants.id]
	}),
}));

export const notificacoesRelations = relations(notificacoes, ({one}) => ({
	tenant: one(tenants, {
		fields: [notificacoes.tenantId],
		references: [tenants.id]
	}),
}));

export const contasInternasRelations = relations(contasInternas, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [contasInternas.tenantId],
		references: [tenants.id]
	}),
	titulosPagars: many(titulosPagar),
	baixas: many(baixas),
}));

export const retalhosEstoqueRelations = relations(retalhosEstoque, ({one}) => ({
	tenant: one(tenants, {
		fields: [retalhosEstoque.tenantId],
		references: [tenants.id]
	}),
}));

export const contasRecorrentesRelations = relations(contasRecorrentes, ({one}) => ({
	tenant: one(tenants, {
		fields: [contasRecorrentes.tenantId],
		references: [tenants.id]
	}),
	classesFinanceira: one(classesFinanceiras, {
		fields: [contasRecorrentes.classeFinanceiraId],
		references: [classesFinanceiras.id]
	}),
}));

export const titulosReceberRelations = relations(titulosReceber, ({one, many}) => ({
	condicoesPagamento: one(condicoesPagamento, {
		fields: [titulosReceber.condicaoPagamentoId],
		references: [condicoesPagamento.id]
	}),
	tenant: one(tenants, {
		fields: [titulosReceber.tenantId],
		references: [tenants.id]
	}),
	classesFinanceira: one(classesFinanceiras, {
		fields: [titulosReceber.classeFinanceiraId],
		references: [classesFinanceiras.id]
	}),
	baixas: many(baixas),
}));

export const titulosPagarRelations = relations(titulosPagar, ({one, many}) => ({
	condicoesPagamento: one(condicoesPagamento, {
		fields: [titulosPagar.condicaoPagamentoId],
		references: [condicoesPagamento.id]
	}),
	tenant: one(tenants, {
		fields: [titulosPagar.tenantId],
		references: [tenants.id]
	}),
	classesFinanceira: one(classesFinanceiras, {
		fields: [titulosPagar.classeFinanceiraId],
		references: [classesFinanceiras.id]
	}),
	contasInterna: one(contasInternas, {
		fields: [titulosPagar.contaBancariaId],
		references: [contasInternas.id]
	}),
	baixas: many(baixas),
}));

export const baixasRelations = relations(baixas, ({one}) => ({
	tenant: one(tenants, {
		fields: [baixas.tenantId],
		references: [tenants.id]
	}),
	contasInterna: one(contasInternas, {
		fields: [baixas.contaInternaId],
		references: [contasInternas.id]
	}),
	titulosReceber: one(titulosReceber, {
		fields: [baixas.tituloReceberId],
		references: [titulosReceber.id]
	}),
	titulosPagar: one(titulosPagar, {
		fields: [baixas.tituloPagarId],
		references: [titulosPagar.id]
	}),
}));

export const erpChapasRelations = relations(erpChapas, ({one}) => ({
	tenant: one(tenants, {
		fields: [erpChapas.tenantId],
		references: [tenants.id]
	}),
}));

export const movimentacoesEstoqueRelations = relations(movimentacoesEstoque, ({one}) => ({
	tenant: one(tenants, {
		fields: [movimentacoesEstoque.tenantId],
		references: [tenants.id]
	}),
	materiai: one(materiais, {
		fields: [movimentacoesEstoque.materialId],
		references: [materiais.id]
	}),
}));

export const bomEngenhariaMontagemRelations = relations(bomEngenhariaMontagem, ({one}) => ({
	skuEngenharia: one(skuEngenharia, {
		fields: [bomEngenhariaMontagem.skuEngenhariaId],
		references: [skuEngenharia.id]
	}),
	skuMontagem: one(skuMontagem, {
		fields: [bomEngenhariaMontagem.skuMontagemId],
		references: [skuMontagem.id]
	}),
}));

export const skuEngenhariaRelations = relations(skuEngenharia, ({many}) => ({
	bomEngenhariaMontagems: many(bomEngenhariaMontagem),
}));

export const skuMontagemRelations = relations(skuMontagem, ({many}) => ({
	bomEngenhariaMontagems: many(bomEngenhariaMontagem),
	bomMontagemComponentes: many(bomMontagemComponente),
}));

export const erpMovimentacoesIndustrialRelations = relations(erpMovimentacoesIndustrial, ({one}) => ({
	tenant: one(tenants, {
		fields: [erpMovimentacoesIndustrial.tenantId],
		references: [tenants.id]
	}),
}));

export const eventosRelations = relations(eventos, ({one}) => ({
	tenant: one(tenants, {
		fields: [eventos.tenantId],
		references: [tenants.id]
	}),
}));

export const bomMontagemComponenteRelations = relations(bomMontagemComponente, ({one}) => ({
	skuMontagem: one(skuMontagem, {
		fields: [bomMontagemComponente.skuMontagemId],
		references: [skuMontagem.id]
	}),
	skuComponente: one(skuComponente, {
		fields: [bomMontagemComponente.skuComponenteId],
		references: [skuComponente.id]
	}),
}));

export const skuComponenteRelations = relations(skuComponente, ({many}) => ({
	bomMontagemComponentes: many(bomMontagemComponente),
}));

export const ordensProducaoRelations = relations(ordensProducao, ({one}) => ({
	tenant: one(tenants, {
		fields: [ordensProducao.tenantId],
		references: [tenants.id]
	}),
}));

export const tenantConfigsRelations = relations(tenantConfigs, ({one}) => ({
	tenant: one(tenants, {
		fields: [tenantConfigs.tenantId],
		references: [tenants.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	tenant: one(tenants, {
		fields: [subscriptions.tenantId],
		references: [tenants.id]
	}),
}));

export const usageLogsRelations = relations(usageLogs, ({one}) => ({
	tenant: one(tenants, {
		fields: [usageLogs.tenantId],
		references: [tenants.id]
	}),
}));

export const billingsRelations = relations(billings, ({one}) => ({
	tenant: one(tenants, {
		fields: [billings.tenantId],
		references: [tenants.id]
	}),
}));

export const monthlyGoalsRelations = relations(monthlyGoals, ({one}) => ({
	tenant: one(tenants, {
		fields: [monthlyGoals.tenantId],
		references: [tenants.id]
	}),
}));

export const conversasWhatsappRelations = relations(conversasWhatsapp, ({one, many}) => ({
	ordensProd: one(ordensProd, {
		fields: [conversasWhatsapp.operacaoProdId],
		references: [ordensProd.id]
	}),
	tenant: one(tenants, {
		fields: [conversasWhatsapp.tenantId],
		references: [tenants.id]
	}),
	mensagensWhatsapps: many(mensagensWhatsapp),
}));

export const ordensProdRelations = relations(ordensProd, ({one, many}) => ({
	conversasWhatsapps: many(conversasWhatsapp),
	etapasProdKanbans: many(etapasProdKanban),
	eventosCalendarios: many(eventosCalendario),
	tenant: one(tenants, {
		fields: [ordensProd.tenantId],
		references: [tenants.id]
	}),
	custosReaisOps: many(custosReaisOp),
	movimentoEstoqueGranulars: many(movimentoEstoqueGranular),
	planejamentoReposicaos: many(planejamentoReposicao),
}));

export const etapasProdKanbanRelations = relations(etapasProdKanban, ({one, many}) => ({
	ordensProd: one(ordensProd, {
		fields: [etapasProdKanban.operacaoProdId],
		references: [ordensProd.id]
	}),
	tenant: one(tenants, {
		fields: [etapasProdKanban.tenantId],
		references: [tenants.id]
	}),
	movimentoKanbans: many(movimentoKanban),
}));

export const movimentoKanbanRelations = relations(movimentoKanban, ({one}) => ({
	etapasProdKanban: one(etapasProdKanban, {
		fields: [movimentoKanban.etapaKanbanId],
		references: [etapasProdKanban.id]
	}),
	tenant: one(tenants, {
		fields: [movimentoKanban.tenantId],
		references: [tenants.id]
	}),
}));

export const eventosCalendarioRelations = relations(eventosCalendario, ({one, many}) => ({
	ordensProd: one(ordensProd, {
		fields: [eventosCalendario.operacaoProdId],
		references: [ordensProd.id]
	}),
	tenant: one(tenants, {
		fields: [eventosCalendario.tenantId],
		references: [tenants.id]
	}),
	notificacoesCalendarios: many(notificacoesCalendario),
}));

export const notificacoesCalendarioRelations = relations(notificacoesCalendario, ({one}) => ({
	eventosCalendario: one(eventosCalendario, {
		fields: [notificacoesCalendario.eventoCalendarioId],
		references: [eventosCalendario.id]
	}),
	tenant: one(tenants, {
		fields: [notificacoesCalendario.tenantId],
		references: [tenants.id]
	}),
}));

export const custosReaisOpRelations = relations(custosReaisOp, ({one}) => ({
	ordensProd: one(ordensProd, {
		fields: [custosReaisOp.operacaoProdId],
		references: [ordensProd.id]
	}),
	tenant: one(tenants, {
		fields: [custosReaisOp.tenantId],
		references: [tenants.id]
	}),
}));

export const tendenciasPrecoRelations = relations(tendenciasPreco, ({one}) => ({
	tenant: one(tenants, {
		fields: [tendenciasPreco.tenantId],
		references: [tenants.id]
	}),
}));

export const rentabilidadeClienteRelations = relations(rentabilidadeCliente, ({one}) => ({
	tenant: one(tenants, {
		fields: [rentabilidadeCliente.tenantId],
		references: [tenants.id]
	}),
}));

export const mensagensWhatsappRelations = relations(mensagensWhatsapp, ({one}) => ({
	conversasWhatsapp: one(conversasWhatsapp, {
		fields: [mensagensWhatsapp.conversaWhatsappId],
		references: [conversasWhatsapp.id]
	}),
	tenant: one(tenants, {
		fields: [mensagensWhatsapp.tenantId],
		references: [tenants.id]
	}),
}));

export const modelosMsgWhatsappRelations = relations(modelosMsgWhatsapp, ({one}) => ({
	tenant: one(tenants, {
		fields: [modelosMsgWhatsapp.tenantId],
		references: [tenants.id]
	}),
}));

export const movimentoEstoqueGranularRelations = relations(movimentoEstoqueGranular, ({one}) => ({
	estoqueMateriaisDetalhado: one(estoqueMateriaisDetalhado, {
		fields: [movimentoEstoqueGranular.skuCodigo],
		references: [estoqueMateriaisDetalhado.skuCodigo]
	}),
	ordensProd: one(ordensProd, {
		fields: [movimentoEstoqueGranular.operacaoProdId],
		references: [ordensProd.id]
	}),
	tenant: one(tenants, {
		fields: [movimentoEstoqueGranular.tenantId],
		references: [tenants.id]
	}),
}));

export const estoqueMateriaisDetalhadoRelations = relations(estoqueMateriaisDetalhado, ({one, many}) => ({
	movimentoEstoqueGranulars: many(movimentoEstoqueGranular),
	alertasEstoques: many(alertasEstoque),
	planejamentoReposicaos: many(planejamentoReposicao),
	itensOcGranulars: many(itensOcGranular),
	tenant: one(tenants, {
		fields: [estoqueMateriaisDetalhado.tenantId],
		references: [tenants.id]
	}),
	mapeamentoSkus: many(mapeamentoSku),
}));

export const alertasEstoqueRelations = relations(alertasEstoque, ({one}) => ({
	estoqueMateriaisDetalhado: one(estoqueMateriaisDetalhado, {
		fields: [alertasEstoque.skuCodigo],
		references: [estoqueMateriaisDetalhado.skuCodigo]
	}),
	tenant: one(tenants, {
		fields: [alertasEstoque.tenantId],
		references: [tenants.id]
	}),
}));

export const planejamentoReposicaoRelations = relations(planejamentoReposicao, ({one}) => ({
	estoqueMateriaisDetalhado: one(estoqueMateriaisDetalhado, {
		fields: [planejamentoReposicao.skuCodigo],
		references: [estoqueMateriaisDetalhado.skuCodigo]
	}),
	ordensProd: one(ordensProd, {
		fields: [planejamentoReposicao.operacaoProdId],
		references: [ordensProd.id]
	}),
	tenant: one(tenants, {
		fields: [planejamentoReposicao.tenantId],
		references: [tenants.id]
	}),
}));

export const ordensCompraGranularRelations = relations(ordensCompraGranular, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [ordensCompraGranular.tenantId],
		references: [tenants.id]
	}),
	itensOcGranulars: many(itensOcGranular),
}));

export const itensOcGranularRelations = relations(itensOcGranular, ({one}) => ({
	ordensCompraGranular: one(ordensCompraGranular, {
		fields: [itensOcGranular.ordemCompraId],
		references: [ordensCompraGranular.id]
	}),
	estoqueMateriaisDetalhado: one(estoqueMateriaisDetalhado, {
		fields: [itensOcGranular.skuCodigo],
		references: [estoqueMateriaisDetalhado.skuCodigo]
	}),
	tenant: one(tenants, {
		fields: [itensOcGranular.tenantId],
		references: [tenants.id]
	}),
}));

export const contratoDigitalRelations = relations(contratoDigital, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [contratoDigital.tenantId],
		references: [tenants.id]
	}),
	historicoAssinaturaDigitals: many(historicoAssinaturaDigital),
}));

export const historicoAssinaturaDigitalRelations = relations(historicoAssinaturaDigital, ({one}) => ({
	tenant: one(tenants, {
		fields: [historicoAssinaturaDigital.tenantId],
		references: [tenants.id]
	}),
	contratoDigital: one(contratoDigital, {
		fields: [historicoAssinaturaDigital.contratoId],
		references: [contratoDigital.id]
	}),
}));

export const mapeamentoSkuRelations = relations(mapeamentoSku, ({one}) => ({
	estoqueMateriaisDetalhado: one(estoqueMateriaisDetalhado, {
		fields: [mapeamentoSku.skuInterno],
		references: [estoqueMateriaisDetalhado.skuCodigo]
	}),
	tenant: one(tenants, {
		fields: [mapeamentoSku.tenantId],
		references: [tenants.id]
	}),
}));

export const historicoSkuMatchingRelations = relations(historicoSkuMatching, ({one}) => ({
	tenant: one(tenants, {
		fields: [historicoSkuMatching.tenantId],
		references: [tenants.id]
	}),
}));

export const quotationItemsRelations = relations(quotationItems, ({one, many}) => ({
	quotation: one(quotations, {
		fields: [quotationItems.quotationId],
		references: [quotations.id]
	}),
	quotationBoms: many(quotationBom),
}));

export const quotationsRelations = relations(quotations, ({many}) => ({
	quotationItems: many(quotationItems),
}));

export const quotationBomRelations = relations(quotationBom, ({one}) => ({
	quotationItem: one(quotationItems, {
		fields: [quotationBom.quotationItemId],
		references: [quotationItems.id]
	}),
}));

export const prospeccoesRelations = relations(prospeccoes, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [prospeccoes.tenantId],
		references: [tenants.id]
	}),
	interacoesProspeccaos: many(interacoesProspeccao),
}));

export const orcamentosRelations = relations(orcamentos, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [orcamentos.tenantId],
		references: [tenants.id]
	}),
	orcamentoAmbientes: many(orcamentoAmbientes),
	orcamentoCustosExtras: many(orcamentoCustosExtras),
}));

export const orcamentoAmbientesRelations = relations(orcamentoAmbientes, ({one, many}) => ({
	orcamento: one(orcamentos, {
		fields: [orcamentoAmbientes.quotationId],
		references: [orcamentos.id]
	}),
	tenant: one(tenants, {
		fields: [orcamentoAmbientes.tenantId],
		references: [tenants.id]
	}),
	orcamentoMoveis: many(orcamentoMoveis),
}));

export const orcamentoMoveisRelations = relations(orcamentoMoveis, ({one, many}) => ({
	orcamentoAmbiente: one(orcamentoAmbientes, {
		fields: [orcamentoMoveis.ambienteId],
		references: [orcamentoAmbientes.id]
	}),
	tenant: one(tenants, {
		fields: [orcamentoMoveis.tenantId],
		references: [tenants.id]
	}),
	orcamentoPecas: many(orcamentoPecas),
	orcamentoFerragens: many(orcamentoFerragens),
}));

export const orcamentoPecasRelations = relations(orcamentoPecas, ({one}) => ({
	orcamentoMovei: one(orcamentoMoveis, {
		fields: [orcamentoPecas.movelId],
		references: [orcamentoMoveis.id]
	}),
	tenant: one(tenants, {
		fields: [orcamentoPecas.tenantId],
		references: [tenants.id]
	}),
}));

export const orcamentoFerragensRelations = relations(orcamentoFerragens, ({one}) => ({
	orcamentoMovei: one(orcamentoMoveis, {
		fields: [orcamentoFerragens.movelId],
		references: [orcamentoMoveis.id]
	}),
	tenant: one(tenants, {
		fields: [orcamentoFerragens.tenantId],
		references: [tenants.id]
	}),
}));

export const orcamentoCustosExtrasRelations = relations(orcamentoCustosExtras, ({one}) => ({
	orcamento: one(orcamentos, {
		fields: [orcamentoCustosExtras.quotationId],
		references: [orcamentos.id]
	}),
	tenant: one(tenants, {
		fields: [orcamentoCustosExtras.tenantId],
		references: [tenants.id]
	}),
}));

export const interacoesProspeccaoRelations = relations(interacoesProspeccao, ({one}) => ({
	prospeccoe: one(prospeccoes, {
		fields: [interacoesProspeccao.prospeccaoId],
		references: [prospeccoes.id]
	}),
	tenant: one(tenants, {
		fields: [interacoesProspeccao.tenantId],
		references: [tenants.id]
	}),
}));