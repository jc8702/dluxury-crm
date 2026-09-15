# Relatório de Auditoria — D'Luxury CRM

**Gerado em:** 2026-09-15T23:13:25.197Z

**Resumo:** 38 rotas testadas — ✅ 38 sem erro / 🔴 0 com erro

---

## ✅ Rotas sem erro detectado (38)

| Rota                                                                | Tempo de carregamento |
| ------------------------------------------------------------------- | --------------------- |
| Dashboard (`#/painel`)                                              | 2397ms                |
| Clientes (`#/clientes`)                                             | 2029ms                |
| Orçamentos (Quotations) (`#/quotations`)                            | 2062ms                |
| Projetos (`#/projetos`)                                             | 2060ms                |
| Produção (`#/producao`)                                             | 1998ms                |
| Plano de Corte Industrial (`#/plano-de-corte`)                      | 1999ms                |
| Plano de Corte (Demo) (`#/plano-de-corte-demo`)                     | 2043ms                |
| Simulador de Corte (`#/simulador-corte`)                            | 2106ms                |
| Simulador de Produção (`#/simulador-producao`)                      | 2009ms                |
| Visitas (`#/visitas`)                                               | 2026ms                |
| Calendário (`#/calendario`)                                         | 2002ms                |
| Pós-Venda (`#/pos-venda`)                                           | 1986ms                |
| Estoque (`#/estoque`)                                               | 2042ms                |
| Fornecedores (`#/fornecedores`)                                     | 1999ms                |
| Engenharia (`#/engenharia`)                                         | 2026ms                |
| SKUs / Peças (`#/pecas`)                                            | 2015ms                |
| Relatórios (`#/relatorios`)                                         | 2041ms                |
| Financeiro (Home) (`#/financeiro`)                                  | 2003ms                |
| Financeiro > Classes (`#/financeiro/classes`)                       | 2018ms                |
| Financeiro > Contas (`#/financeiro/contas`)                         | 2013ms                |
| Financeiro > Formas de Pagamento (`#/financeiro/formas`)            | 1989ms                |
| Financeiro > Condições (`#/financeiro/condicoes`)                   | 2023ms                |
| Financeiro > Títulos a Receber (`#/financeiro/titulos-receber`)     | 2015ms                |
| Financeiro > Wizard Receber (`#/financeiro/titulos-receber/wizard`) | 2007ms                |
| Financeiro > Títulos a Pagar (`#/financeiro/titulos-pagar`)         | 2032ms                |
| Financeiro > Wizard Pagar (`#/financeiro/titulos-pagar/wizard`)     | 1991ms                |
| Financeiro > DRE (`#/financeiro/dre`)                               | 2070ms                |
| Financeiro > Aging (`#/financeiro/aging`)                           | 2004ms                |
| Financeiro > Fluxo de Caixa (`#/financeiro/fluxo-caixa`)            | 2045ms                |
| Financeiro > Recorrentes (`#/financeiro/recorrentes`)               | 2002ms                |
| Financeiro > Conciliação (`#/financeiro/conciliacao`)               | 2022ms                |
| Financeiro > Rentabilidade (`#/financeiro/rentabilidade`)           | 2060ms                |
| Configurações (`#/configuracoes`)                                   | 2116ms                |
| Notificações (`#/notificacoes`)                                     | 2018ms                |
| Compras (`#/compras`)                                               | 2013ms                |
| Prospecção (Marcenaria) (`#/prospeccao`)                            | 2022ms                |
| Retalhos (`#/retalhos`)                                             | 2017ms                |
| SaaS Admin (`#/saas-admin`)                                         | 1989ms                |

---

## Observações importantes

- Este relatório detecta **crashes, erros de render e falhas de rede (4xx/5xx)** — não valida regras de negócio (ex: cálculo correto de orçamento, fluxo de aprovação end-to-end).
- Para validação funcional profunda, siga também o `docs/AUDIT_CHECKLIST.md` manualmente ou com um agente guiado.
- "Sem erro detectado" não significa "funcionalidade correta" — significa apenas que a página carregou sem exceções.
