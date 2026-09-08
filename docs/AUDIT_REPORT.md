# Relatório de Auditoria — D'Luxury CRM

**Gerado em:** 2026-09-08T02:11:26.260Z

**Resumo:** 38 rotas testadas — ✅ 38 sem erro / 🔴 0 com erro

---

## ✅ Rotas sem erro detectado (38)

| Rota | Tempo de carregamento |
|---|---|
| Dashboard (`#/painel`) | 2201ms |
| Clientes (`#/clientes`) | 2002ms |
| Orçamentos (Quotations) (`#/quotations`) | 2095ms |
| Projetos (`#/projetos`) | 2250ms |
| Produção (`#/producao`) | 2031ms |
| Plano de Corte Industrial (`#/plano-de-corte`) | 2052ms |
| Plano de Corte (Demo) (`#/plano-de-corte-demo`) | 2093ms |
| Simulador de Corte (`#/simulador-corte`) | 2171ms |
| Simulador de Produção (`#/simulador-producao`) | 2189ms |
| Visitas (`#/visitas`) | 2197ms |
| Calendário (`#/calendario`) | 2158ms |
| Pós-Venda (`#/pos-venda`) | 2165ms |
| Estoque (`#/estoque`) | 2226ms |
| Fornecedores (`#/fornecedores`) | 2126ms |
| Engenharia (`#/engenharia`) | 2140ms |
| SKUs / Peças (`#/pecas`) | 2143ms |
| Relatórios (`#/relatorios`) | 2155ms |
| Financeiro (Home) (`#/financeiro`) | 2217ms |
| Financeiro > Classes (`#/financeiro/classes`) | 2226ms |
| Financeiro > Contas (`#/financeiro/contas`) | 2163ms |
| Financeiro > Formas de Pagamento (`#/financeiro/formas`) | 2155ms |
| Financeiro > Condições (`#/financeiro/condicoes`) | 2197ms |
| Financeiro > Títulos a Receber (`#/financeiro/titulos-receber`) | 2172ms |
| Financeiro > Wizard Receber (`#/financeiro/titulos-receber/wizard`) | 2189ms |
| Financeiro > Títulos a Pagar (`#/financeiro/titulos-pagar`) | 2178ms |
| Financeiro > Wizard Pagar (`#/financeiro/titulos-pagar/wizard`) | 2222ms |
| Financeiro > DRE (`#/financeiro/dre`) | 2138ms |
| Financeiro > Aging (`#/financeiro/aging`) | 2159ms |
| Financeiro > Fluxo de Caixa (`#/financeiro/fluxo-caixa`) | 2228ms |
| Financeiro > Recorrentes (`#/financeiro/recorrentes`) | 2213ms |
| Financeiro > Conciliação (`#/financeiro/conciliacao`) | 1993ms |
| Financeiro > Rentabilidade (`#/financeiro/rentabilidade`) | 2263ms |
| Configurações (`#/configuracoes`) | 2306ms |
| Notificações (`#/notificacoes`) | 2204ms |
| Compras (`#/compras`) | 2153ms |
| Prospecção (Marcenaria) (`#/prospeccao`) | 2190ms |
| Retalhos (`#/retalhos`) | 2218ms |
| SaaS Admin (`#/saas-admin`) | 2234ms |

---

## Observações importantes

- Este relatório detecta **crashes, erros de render e falhas de rede (4xx/5xx)** — não valida regras de negócio (ex: cálculo correto de orçamento, fluxo de aprovação end-to-end).
- Para validação funcional profunda, siga também o `docs/AUDIT_CHECKLIST.md` manualmente ou com um agente guiado.
- "Sem erro detectado" não significa "funcionalidade correta" — significa apenas que a página carregou sem exceções.
