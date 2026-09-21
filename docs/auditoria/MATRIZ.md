# Matriz de Endpoints — Denominador de Cobertura

**Data:** 2026-09-20
**Branch:** `audit-2026-09`
**Fonte:** `api/index.ts` + handlers em `src/api-lib/`
**Total de endpoints:** **211**
**Status inicial de todos:** NÃO TESTADO

---

## Legenda

- **Auth:** S = requer autenticação (token JWT via middleware ou inline), N = público
- **Gate:** feature gate obrigatório (ia, simulador_cnc, plano_corte, financeiro, rh, estoque, whatsapp) ou `—` (sem gate)
- **Recebe ID:** S = aceita `?id=`, `/:id` na URL ou path com ID, N = apenas lista/criação
- **Status:** NÃO TESTADO (padrão), será preenchido em etapas seguintes

---

## 1. Infraestrutura / Públicos

| #   | Método | Caminho                | Auth              | Gate | Recebe ID | Status      | Evidência              |
| --- | ------ | ---------------------- | ----------------- | ---- | --------- | ----------- | ---------------------- |
| 1   | ANY    | `/api/ping`            | N                 | —    | N         | NÃO TESTADO | `api/index.ts:591-593` |
| 2   | ANY    | `/api/resolve-dominio` | N                 | —    | N         | NÃO TESTADO | `api/index.ts:552-559` |
| 3   | ANY    | `/api/init-db`         | N (x-init-key)    | —    | N         | NÃO TESTADO | `api/index.ts:537-544` |
| 4   | POST   | `/api/webhooks/asaas`  | S (webhook token) | —    | N         | NÃO TESTADO | `api/index.ts:547-549` |
| 5   | POST   | `/api/dominio`         | S (admin)         | —    | N         | NÃO TESTADO | `api/index.ts:562-578` |
| 6   | ANY    | `/api/features/check`  | S                 | —    | N         | NÃO TESTADO | `api/index.ts:580-589` |

## 2. Auth / Signup / Checkout

| #   | Método | Caminho                      | Auth | Gate | Recebe ID | Status      | Evidência                                                       |
| --- | ------ | ---------------------------- | ---- | ---- | --------- | ----------- | --------------------------------------------------------------- |
| 7   | POST   | `/api/auth?action=login`     | N    | —    | N         | NÃO TESTADO | `src/api-lib/auth.ts` via `api/index.ts:212-214`                |
| 8   | POST   | `/api/auth?action=register`  | S    | —    | N         | NÃO TESTADO | `src/api-lib/auth.ts` via `api/index.ts:212-214`                |
| 9   | GET    | `/api/auth?action=me`        | S    | —    | N         | NÃO TESTADO | `src/api-lib/auth.ts` via `api/index.ts:212-214`                |
| 10  | POST   | `/api/signup`                | N    | —    | N         | NÃO TESTADO | `src/api-lib/tenant-provisioning.ts` via `api/index.ts:200-203` |
| 11  | GET    | `/api/checkout/invoices`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/checkout.ts` via `api/index.ts:208-211`            |
| 12  | POST   | `/api/checkout/cancel`       | S    | —    | N         | NÃO TESTADO | `src/api-lib/checkout.ts` via `api/index.ts:208-211`            |
| 13  | POST   | `/api/checkout/gerar-boleto` | S    | —    | N         | NÃO TESTADO | `src/api-lib/checkout.ts` via `api/index.ts:208-211`            |
| 14  | GET    | `/api/checkout`              | S    | —    | N         | NÃO TESTADO | `src/api-lib/checkout.ts` via `api/index.ts:208-211`            |
| 15  | POST   | `/api/checkout`              | S    | —    | N         | NÃO TESTADO | `src/api-lib/checkout.ts` via `api/index.ts:208-211`            |

## 3. SaaS Admin

| #   | Método | Caminho                   | Auth | Gate | Recebe ID | Status      | Evidência                                              |
| --- | ------ | ------------------------- | ---- | ---- | --------- | ----------- | ------------------------------------------------------ |
| 16  | GET    | `/api/saas-admin/tenants` | S    | —    | N         | NÃO TESTADO | `src/api-lib/saas-admin.ts` via `api/index.ts:204-207` |
| 17  | PATCH  | `/api/saas-admin/tenants` | S    | —    | N         | NÃO TESTADO | `src/api-lib/saas-admin.ts` via `api/index.ts:204-207` |
| 18  | POST   | `/api/saas-admin/users`   | S    | —    | N         | NÃO TESTADO | `src/api-lib/saas-admin.ts` via `api/index.ts:204-207` |
| 19  | GET    | `/api/saas-admin/users`   | S    | —    | N         | NÃO TESTADO | `src/api-lib/saas-admin.ts` via `api/index.ts:204-207` |

## 4. CRM / Clients

| #   | Método | Caminho            | Auth | Gate | Recebe ID | Status      | Evidência                                       |
| --- | ------ | ------------------ | ---- | ---- | --------- | ----------- | ----------------------------------------------- |
| 20  | GET    | `/api/clients`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/crm.ts` via `api/index.ts:216-219` |
| 21  | POST   | `/api/clients`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/crm.ts` via `api/index.ts:216-219` |
| 22  | PATCH  | `/api/clients?id=` | S    | —    | S         | NÃO TESTADO | `src/api-lib/crm.ts` via `api/index.ts:216-219` |
| 23  | DELETE | `/api/clients?id=` | S    | —    | S         | NÃO TESTADO | `src/api-lib/crm.ts` via `api/index.ts:216-219` |
| 24  | GET    | `/api/goals`       | S    | —    | N         | NÃO TESTADO | `src/api-lib/crm.ts` via `api/index.ts:396-399` |
| 25  | POST   | `/api/goals`       | S    | —    | N         | NÃO TESTADO | `src/api-lib/crm.ts` via `api/index.ts:396-399` |

## 5. Kanban (CRM)

| #   | Método | Caminho       | Auth | Gate | Recebe ID | Status      | Evidência                                       |
| --- | ------ | ------------- | ---- | ---- | --------- | ----------- | ----------------------------------------------- |
| 26  | GET    | `/api/kanban` | S    | —    | N         | NÃO TESTADO | `src/api-lib/crm.ts` via `api/index.ts:409-412` |
| 27  | POST   | `/api/kanban` | S    | —    | N         | NÃO TESTADO | `src/api-lib/crm.ts` via `api/index.ts:409-412` |
| 28  | PATCH  | `/api/kanban` | S    | —    | S         | NÃO TESTADO | `src/api-lib/crm.ts` via `api/index.ts:409-412` |

## 6. Kanban Produção

| #   | Método | Caminho                    | Auth | Gate | Recebe ID | Status      | Evidência                                                   |
| --- | ------ | -------------------------- | ---- | ---- | --------- | ----------- | ----------------------------------------------------------- |
| 29  | GET    | `/api/kanban/board`        | S    | —    | N         | NÃO TESTADO | `src/api-lib/kanban-producao.ts` via `api/index.ts:400-408` |
| 30  | POST   | `/api/kanban/move-card`    | S    | —    | N         | NÃO TESTADO | `src/api-lib/kanban-producao.ts` via `api/index.ts:400-408` |
| 31  | PATCH  | `/api/kanban/card-details` | S    | —    | S         | NÃO TESTADO | `src/api-lib/kanban-producao.ts` via `api/index.ts:400-408` |
| 32  | GET    | `/api/kanban/card-history` | S    | —    | S         | NÃO TESTADO | `src/api-lib/kanban-producao.ts` via `api/index.ts:400-408` |

## 7. Financeiro

| #   | Método | Caminho                                  | Auth | Gate       | Recebe ID | Status      | Evidência                                              |
| --- | ------ | ---------------------------------------- | ---- | ---------- | --------- | ----------- | ------------------------------------------------------ |
| 33  | GET    | `/api/financeiro/classes`                | S    | financeiro | N         | PASSOU      | Gate Basic:403, Enterprise:200                         |
| 34  | POST   | `/api/financeiro/classes`                | S    | financeiro | N         | FALHOU      | Enterprise:500 com body vazio (ACHADO A5)              |
| 35  | PATCH  | `/api/financeiro/classes/:id`            | S    | financeiro | S         | PASSOU      | IDOR: cross-tenant retorna 404 correto                 |
| 36  | GET    | `/api/financeiro/contas-internas`        | S    | financeiro | N         | PASSOU      | IDOR: cross-tenant não vê registros                    |
| 37  | POST   | `/api/financeiro/contas-internas`        | S    | financeiro | N         | PASSOU      | POST retorna 201                                       |
| 38  | PATCH  | `/api/financeiro/contas-internas/:id`    | S    | financeiro | S         | FALHOU      | IDOR-vuln: PATCH cross-tenant retorna 200 (A6)         |
| 39  | GET    | `/api/financeiro/formas-pagamento`       | S    | financeiro | N         | PASSOU      | IDOR: cross-tenant não vê registros                    |
| 40  | POST   | `/api/financeiro/formas-pagamento`       | S    | financeiro | N         | PASSOU      | POST retorna 201                                       |
| 41  | PATCH  | `/api/financeiro/formas-pagamento/:id`   | S    | financeiro | S         | FALHOU      | IDOR-vuln: PATCH cross-tenant retorna 200 (A7)         |
| 42  | GET    | `/api/financeiro/titulos-receber`        | S    | financeiro | N         | NÃO TESTADO | Tabela fechamentos_financeiros ausente                 |
| 43  | POST   | `/api/financeiro/titulos-receber`        | S    | financeiro | N         | NÃO TESTADO | Tabela fechamentos_financeiros ausente                 |
| 44  | PATCH  | `/api/financeiro/titulos-receber/:id`    | S    | financeiro | S         | NÃO TESTADO | Tabela fechamentos_financeiros ausente                 |
| 45  | GET    | `/api/financeiro/titulos-pagar`          | S    | financeiro | N         | NÃO TESTADO | Tabela fechamentos_financeiros ausente                 |
| 46  | POST   | `/api/financeiro/titulos-pagar`          | S    | financeiro | N         | NÃO TESTADO | Tabela fechamentos_financeiros ausente                 |
| 47  | PATCH  | `/api/financeiro/titulos-pagar/:id`      | S    | financeiro | S         | NÃO TESTADO | Tabela fechamentos_financeiros ausente                 |
| 48  | GET    | `/api/financeiro/tesouraria`             | S    | financeiro | S         | NÃO TESTADO | `src/api-lib/financeiro.ts` via `api/index.ts:220-223` |
| 49  | POST   | `/api/financeiro/tesouraria`             | S    | financeiro | N         | NÃO TESTADO | `src/api-lib/financeiro.ts` via `api/index.ts:220-223` |
| 50  | GET    | `/api/financeiro/fluxo-caixa`            | S    | financeiro | N         | NÃO TESTADO | `src/api-lib/financeiro.ts` via `api/index.ts:220-223` |
| 51  | GET    | `/api/financeiro/relatorios`             | S    | financeiro | N         | NÃO TESTADO | `src/api-lib/financeiro.ts` via `api/index.ts:220-223` |
| 52  | GET    | `/api/financeiro/contas-recorrentes`     | S    | financeiro | N         | PASSOU      | IDOR: cross-tenant não vê                              |
| 53  | POST   | `/api/financeiro/contas-recorrentes`     | S    | financeiro | N         | PASSOU      | POST retorna 201                                       |
| 54  | PATCH  | `/api/financeiro/contas-recorrentes/:id` | S    | financeiro | S         | PASSOU      | IDOR: cross-tenant retorna 404                         |
| 55  | GET    | `/api/financeiro/fechamentos`            | S    | financeiro | N         | NÃO TESTADO | `src/api-lib/financeiro.ts` via `api/index.ts:220-223` |
| 56  | POST   | `/api/financeiro/fechamentos`            | S    | financeiro | N         | NÃO TESTADO | `src/api-lib/financeiro.ts` via `api/index.ts:220-223` |
| 57  | PATCH  | `/api/financeiro/fechamentos/:id`        | S    | financeiro | S         | NÃO TESTADO | `src/api-lib/financeiro.ts` via `api/index.ts:220-223` |
| 58  | GET    | `/api/financeiro/conferencia`            | S    | financeiro | N         | NÃO TESTADO | `src/api-lib/financeiro.ts` via `api/index.ts:220-223` |
| 59  | GET    | `/api/financeiro/test`                   | S    | financeiro | N         | NÃO TESTADO | `src/api-lib/financeiro.ts` via `api/index.ts:220-223` |

## 8. Condições de Pagamento (via financeiro handler)

| #   | Método | Caminho                                            | Auth | Gate       | Recebe ID | Status | Evidência                      |
| --- | ------ | -------------------------------------------------- | ---- | ---------- | --------- | ------ | ------------------------------ |
| 60  | GET    | `/api/condicoes-pagamento/condicoes-pagamento`     | S    | financeiro | N         | PASSOU | IDOR: cross-tenant não vê      |
| 61  | POST   | `/api/condicoes-pagamento/condicoes-pagamento`     | S    | financeiro | N         | PASSOU | POST retorna 201               |
| 62  | PATCH  | `/api/condicoes-pagamento/condicoes-pagamento/:id` | S    | financeiro | S         | PASSOU | IDOR: cross-tenant retorna 404 |

## 9. RH

| #   | Método | Caminho                     | Auth | Gate | Recebe ID | Status      | Evidência                                      |
| --- | ------ | --------------------------- | ---- | ---- | --------- | ----------- | ---------------------------------------------- |
| 63  | GET    | `/api/rh/colaboradores`     | S    | rh   | N         | PASSOU      | Gate Basic:403, Enterprise:200                 |
| 64  | POST   | `/api/rh/colaboradores`     | S    | rh   | N         | PASSOU      | Gate Basic:403, Enterprise:400 (body vazio ok) |
| 65  | PATCH  | `/api/rh/colaboradores/:id` | S    | rh   | S         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |
| 66  | DELETE | `/api/rh/colaboradores/:id` | S    | rh   | S         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |
| 67  | GET    | `/api/rh/presencas`         | S    | rh   | N         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |
| 68  | POST   | `/api/rh/presencas`         | S    | rh   | N         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |
| 69  | PATCH  | `/api/rh/presencas/:id`     | S    | rh   | S         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |
| 70  | GET    | `/api/rh/adiantamentos`     | S    | rh   | N         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |
| 71  | POST   | `/api/rh/adiantamentos`     | S    | rh   | N         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |
| 72  | GET    | `/api/rh/folhas`            | S    | rh   | N         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |
| 73  | POST   | `/api/rh/folhas`            | S    | rh   | N         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |
| 74  | GET    | `/api/rh/dashboard`         | S    | rh   | N         | NÃO TESTADO | `src/api-lib/rh.ts` via `api/index.ts:224-227` |

## 10. Estoque (granular)

| #   | Método | Caminho                            | Auth | Gate    | Recebe ID | Status      | Evidência                                                    |
| --- | ------ | ---------------------------------- | ---- | ------- | --------- | ----------- | ------------------------------------------------------------ |
| 75  | GET    | `/api/estoque/items`               | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque-granular.ts` via `api/index.ts:228-236` |
| 76  | GET    | `/api/estoque/alertas`             | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque-granular.ts` via `api/index.ts:228-236` |
| 77  | POST   | `/api/estoque/registrar-movimento` | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque-granular.ts` via `api/index.ts:228-236` |
| 78  | POST   | `/api/estoque/finalizar-op`        | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque-granular.ts` via `api/index.ts:228-236` |

## 11. Estoque (handler principal — materiais, fornecedores, categories)

| #   | Método | Caminho                              | Auth | Gate    | Recebe ID | Status      | Evidência                                           |
| --- | ------ | ------------------------------------ | ---- | ------- | --------- | ----------- | --------------------------------------------------- |
| 79  | GET    | `/api/estoque`                       | S    | estoque | N         | PASSOU      | Gate Basic:403, Enterprise:200                      |
| 80  | POST   | `/api/estoque`                       | S    | estoque | N         | PASSOU      | Gate Basic:403, Enterprise:201                      |
| 81  | PATCH  | `/api/estoque?id=`                   | S    | estoque | S         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 82  | DELETE | `/api/estoque?id=`                   | S    | estoque | S         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 83  | GET    | `/api/estoque?type=movimentacoes`    | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 84  | POST   | `/api/estoque?type=movimentacoes`    | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 85  | GET    | `/api/estoque?type=fornecedores`     | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 86  | POST   | `/api/estoque?type=fornecedores`     | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 87  | PATCH  | `/api/estoque?type=fornecedores&id=` | S    | estoque | S         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 88  | DELETE | `/api/estoque?type=fornecedores&id=` | S    | estoque | S         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 89  | GET    | `/api/estoque?type=categories`       | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 90  | POST   | `/api/estoque?type=categories`       | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque.ts` via `api/index.ts:248-251` |
| 91  | GET    | `/api/forn`                          | S    | estoque | N         | PASSOU      | Gate Basic:403, Enterprise:200                      |

## 12. Contratos Digitais

| #   | Método | Caminho                             | Auth | Gate | Recebe ID | Status      | Evidência                                                    |
| --- | ------ | ----------------------------------- | ---- | ---- | --------- | ----------- | ------------------------------------------------------------ |
| 92  | GET    | `/api/contratos/status`             | S    | —    | N         | NÃO TESTADO | `src/api-lib/contrato-digital.ts` via `api/index.ts:244-247` |
| 93  | POST   | `/api/contratos/gerar-e-enviar`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/contrato-digital.ts` via `api/index.ts:244-247` |
| 94  | POST   | `/api/contratos/webhook-assinatura` | S    | —    | N         | NÃO TESTADO | `src/api-lib/contrato-digital.ts` via `api/index.ts:244-247` |

## 13. Quotations (Orçamentos)

| #   | Método | Caminho                                         | Auth | Gate | Recebe ID | Status      | Evidência                                              |
| --- | ------ | ----------------------------------------------- | ---- | ---- | --------- | ----------- | ------------------------------------------------------ |
| 95  | GET    | `/api/quotations`                               | S    | —    | N         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 96  | POST   | `/api/quotations`                               | S    | —    | N         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 97  | PUT    | `/api/quotations?id=`                           | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 98  | DELETE | `/api/quotations?id=`                           | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 99  | GET    | `/api/quotations?action=explode`                | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 100 | GET    | `/api/quotations?action=search-skus`            | S    | —    | N         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 101 | PUT    | `/api/quotations?action=update-bom`             | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 102 | PUT    | `/api/quotations?action=add-item`               | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 103 | PUT    | `/api/quotations?action=import-items`           | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 104 | PUT    | `/api/quotations?action=reset-to-global-margin` | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 105 | PUT    | `/api/quotations?action=apply-global-margin`    | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 106 | PUT    | `/api/quotations?action=bulk-update-items`      | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 107 | PUT    | `/api/quotations?action=update-sku`             | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 108 | PUT    | `/api/quotations?action=update-item`            | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |
| 109 | DELETE | `/api/quotations?action=delete-item`            | S    | —    | S         | NÃO TESTADO | `src/api-lib/quotations.ts` via `api/index.ts:257-260` |

## 14. Quotations — Rotas auxiliares

| #   | Método | Caminho                          | Auth | Gate    | Recebe ID | Status      | Evidência                                                     |
| --- | ------ | -------------------------------- | ---- | ------- | --------- | ----------- | ------------------------------------------------------------- |
| 110 | POST   | `/api/quotations/sku-matching`   | S    | estoque | N         | NÃO TESTADO | `src/api-lib/estoque-granular.ts` via `api/index.ts:237-243`  |
| 111 | POST   | `/api/orcamentos/importar-itens` | S    | —       | N         | NÃO TESTADO | `api/orcamentos/importar-itens.ts` via `api/index.ts:253-256` |
| 112 | GET    | `/api/orcamentos/export-pdf`     | S    | —       | N         | NÃO TESTADO | `api/orcamentos/exportar-pdf.ts` via `api/index.ts:261-264`   |
| 113 | ANY    | `/api/quotation-tecnico`         | S    | —       | N         | NÃO TESTADO | redireciona para `handleQuotations`, `api/index.ts:265-269`   |
| 114 | ANY    | `/api/orcamentos/*` (restante)   | —    | —       | —         | NÃO TESTADO | retorna 410 deprecated, `api/index.ts:270-281`                |
| 115 | ANY    | `/api/orcamento-tecnico`         | —    | —       | —         | NÃO TESTADO | retorna 410 deprecated, `api/index.ts:270-281`                |

## 15. Engenharia / SKUs

| #   | Método | Caminho                      | Auth | Gate    | Recebe ID | Status      | Evidência                                            |
| --- | ------ | ---------------------------- | ---- | ------- | --------- | ----------- | ---------------------------------------------------- |
| 116 | GET    | `/api/engineering`           | S    | —       | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:425-428` |
| 117 | POST   | `/api/engineering`           | S    | —       | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:425-428` |
| 118 | PATCH  | `/api/engineering?id=`       | S    | —       | S         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:425-428` |
| 119 | DELETE | `/api/engineering?id=`       | S    | —       | S         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:425-428` |
| 120 | GET    | `/api/skus`                  | S    | estoque | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:429-432` |
| 121 | GET    | `/api/skus?action=next-code` | S    | estoque | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:429-432` |
| 122 | POST   | `/api/skus`                  | S    | estoque | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:429-432` |
| 123 | PATCH  | `/api/skus?id=`              | S    | estoque | S         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:429-432` |
| 124 | DELETE | `/api/skus?id=`              | S    | estoque | S         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:429-432` |

## 16. Serviços

| #   | Método | Caminho                           | Auth | Gate | Recebe ID | Status      | Evidência                                            |
| --- | ------ | --------------------------------- | ---- | ---- | --------- | ----------- | ---------------------------------------------------- |
| 125 | GET    | `/api/servicos`                   | S    | —    | N         | NÃO TESTADO | `src/api-lib/servicos.ts` via `api/index.ts:433-436` |
| 126 | GET    | `/api/servicos?action=categorias` | S    | —    | N         | NÃO TESTADO | `src/api-lib/servicos.ts` via `api/index.ts:433-436` |
| 127 | POST   | `/api/servicos`                   | S    | —    | N         | NÃO TESTADO | `src/api-lib/servicos.ts` via `api/index.ts:433-436` |
| 128 | PATCH  | `/api/servicos?id=`               | S    | —    | S         | NÃO TESTADO | `src/api-lib/servicos.ts` via `api/index.ts:433-436` |
| 129 | DELETE | `/api/servicos?id=`               | S    | —    | S         | NÃO TESTADO | `src/api-lib/servicos.ts` via `api/index.ts:433-436` |

## 17. Relatórios

| #   | Método | Caminho                               | Auth | Gate | Recebe ID | Status      | Evidência                                            |
| --- | ------ | ------------------------------------- | ---- | ---- | --------- | ----------- | ---------------------------------------------------- |
| 130 | GET    | `/api/reports?type=fin-rentabilidade` | S    | —    | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:437-440` |
| 131 | GET    | `/api/reports?type=ind-romaneio`      | S    | —    | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:437-440` |
| 132 | GET    | `/api/reports?type=com-necessidade`   | S    | —    | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:437-440` |
| 133 | GET    | `/api/reports?type=ind-desvios`       | S    | —    | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:437-440` |

## 18. Projetos

| #   | Método | Caminho             | Auth | Gate | Recebe ID | Status      | Evidência                                            |
| --- | ------ | ------------------- | ---- | ---- | --------- | ----------- | ---------------------------------------------------- |
| 134 | GET    | `/api/projects`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:441-444` |
| 135 | POST   | `/api/projects`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:441-444` |
| 136 | PATCH  | `/api/projects?id=` | S    | —    | S         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:441-444` |
| 137 | DELETE | `/api/projects?id=` | S    | —    | S         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:441-444` |

## 19. Produção

| #   | Método | Caminho                       | Auth | Gate | Recebe ID | Status      | Evidência                                              |
| --- | ------ | ----------------------------- | ---- | ---- | --------- | ----------- | ------------------------------------------------------ |
| 138 | GET    | `/api/production`             | S    | —    | N         | NÃO TESTADO | `src/api-lib/production.ts` via `api/index.ts:445-448` |
| 139 | GET    | `/api/production/:id`         | S    | —    | S         | NÃO TESTADO | `src/api-lib/production.ts` via `api/index.ts:445-448` |
| 140 | GET    | `/api/production/metrics`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/production.ts` via `api/index.ts:445-448` |
| 141 | POST   | `/api/production`             | S    | —    | N         | NÃO TESTADO | `src/api-lib/production.ts` via `api/index.ts:445-448` |
| 142 | PATCH  | `/api/production/:id`         | S    | —    | S         | NÃO TESTADO | `src/api-lib/production.ts` via `api/index.ts:445-448` |
| 143 | PATCH  | `/api/production/:id/details` | S    | —    | S         | NÃO TESTADO | `src/api-lib/production.ts` via `api/index.ts:445-448` |

## 20. Simulações

| #   | Método | Caminho                | Auth | Gate          | Recebe ID | Status      | Evidência                                            |
| --- | ------ | ---------------------- | ---- | ------------- | --------- | ----------- | ---------------------------------------------------- |
| 144 | GET    | `/api/simulations`     | S    | simulador_cnc | N         | PASSOU      | Gate Basic:403, Enterprise:200                       |
| 145 | GET    | `/api/simulations?id=` | S    | simulador_cnc | S         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:449-452` |
| 146 | POST   | `/api/simulations`     | S    | simulador_cnc | N         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:449-452` |
| 147 | PUT    | `/api/simulations?id=` | S    | simulador_cnc | S         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:449-452` |
| 148 | DELETE | `/api/simulations?id=` | S    | simulador_cnc | S         | NÃO TESTADO | `src/api-lib/projects.ts` via `api/index.ts:449-452` |

## 21. After-Sales (Pós-Venda)

| #   | Método | Caminho                | Auth | Gate | Recebe ID | Status      | Evidência                                               |
| --- | ------ | ---------------------- | ---- | ---- | --------- | ----------- | ------------------------------------------------------- |
| 149 | GET    | `/api/after-sales`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/after_sales.ts` via `api/index.ts:453-456` |
| 150 | POST   | `/api/after-sales`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/after_sales.ts` via `api/index.ts:453-456` |
| 151 | PATCH  | `/api/after-sales?id=` | S    | —    | S         | NÃO TESTADO | `src/api-lib/after_sales.ts` via `api/index.ts:453-456` |
| 152 | DELETE | `/api/after-sales?id=` | S    | —    | S         | NÃO TESTADO | `src/api-lib/after_sales.ts` via `api/index.ts:453-456` |

## 22. Usuários

| #   | Método | Caminho          | Auth | Gate | Recebe ID | Status      | Evidência                                        |
| --- | ------ | ---------------- | ---- | ---- | --------- | ----------- | ------------------------------------------------ |
| 153 | GET    | `/api/users`     | S    | —    | N         | NÃO TESTADO | `src/api-lib/auth.ts` via `api/index.ts:457-460` |
| 154 | PATCH  | `/api/users?id=` | S    | —    | S         | NÃO TESTADO | `src/api-lib/auth.ts` via `api/index.ts:457-460` |
| 155 | DELETE | `/api/users?id=` | S    | —    | S         | NÃO TESTADO | `src/api-lib/auth.ts` via `api/index.ts:457-460` |

## 23. Compras

| #   | Método | Caminho                       | Auth | Gate    | Recebe ID | Status      | Evidência                                           |
| --- | ------ | ----------------------------- | ---- | ------- | --------- | ----------- | --------------------------------------------------- |
| 156 | GET    | `/api/compras`                | S    | estoque | N         | PASSOU      | Gate Basic:403, Enterprise:200                      |
| 157 | GET    | `/api/compras/:id`            | S    | estoque | S         | NÃO TESTADO | `src/api-lib/compras.ts` via `api/index.ts:461-464` |
| 158 | POST   | `/api/compras`                | S    | estoque | N         | NÃO TESTADO | `src/api-lib/compras.ts` via `api/index.ts:461-464` |
| 159 | PATCH  | `/api/compras/:id`            | S    | estoque | S         | NÃO TESTADO | `src/api-lib/compras.ts` via `api/index.ts:461-464` |
| 160 | DELETE | `/api/compras/:id`            | S    | estoque | S         | NÃO TESTADO | `src/api-lib/compras.ts` via `api/index.ts:461-464` |
| 161 | GET    | `/api/compras?fornecedor_id=` | S    | estoque | N         | NÃO TESTADO | `src/api-lib/compras.ts` via `api/index.ts:461-464` |

## 24. Retalhos

| #   | Método | Caminho             | Auth | Gate        | Recebe ID | Status      | Evidência                                            |
| --- | ------ | ------------------- | ---- | ----------- | --------- | ----------- | ---------------------------------------------------- |
| 162 | GET    | `/api/retalhos`     | S    | plano_corte | N         | NÃO TESTADO | `src/api-lib/retalhos.ts` via `api/index.ts:465-468` |
| 163 | POST   | `/api/retalhos`     | S    | plano_corte | N         | NÃO TESTADO | `src/api-lib/retalhos.ts` via `api/index.ts:465-468` |
| 164 | PATCH  | `/api/retalhos?id=` | S    | plano_corte | S         | NÃO TESTADO | `src/api-lib/retalhos.ts` via `api/index.ts:465-468` |
| 165 | DELETE | `/api/retalhos?id=` | S    | plano_corte | S         | NÃO TESTADO | `src/api-lib/retalhos.ts` via `api/index.ts:465-468` |

## 25. Aprovação (token público)

| #   | Método | Caminho                 | Auth              | Gate        | Recebe ID | Status      | Evidência                                             |
| --- | ------ | ----------------------- | ----------------- | ----------- | --------- | ----------- | ----------------------------------------------------- |
| 166 | GET    | `/api/aprovacao?token=` | S (token público) | plano_corte | N         | NÃO TESTADO | `src/api-lib/aprovacao.ts` via `api/index.ts:469-472` |
| 167 | POST   | `/api/aprovacao`        | S                 | plano_corte | N         | NÃO TESTADO | `src/api-lib/aprovacao.ts` via `api/index.ts:469-472` |
| 168 | PUT    | `/api/aprovacao?id=`    | S                 | plano_corte | S         | NÃO TESTADO | `src/api-lib/aprovacao.ts` via `api/index.ts:469-472` |

## 26. Agenda

| #   | Método | Caminho                           | Auth | Gate | Recebe ID | Status      | Evidência                                          |
| --- | ------ | --------------------------------- | ---- | ---- | --------- | ----------- | -------------------------------------------------- |
| 169 | GET    | `/api/agenda`                     | S    | —    | N         | NÃO TESTADO | `src/api-lib/agenda.ts` via `api/index.ts:473-476` |
| 170 | GET    | `/api/agenda?action=kanban`       | S    | —    | N         | NÃO TESTADO | `src/api-lib/agenda.ts` via `api/index.ts:473-476` |
| 171 | POST   | `/api/agenda`                     | S    | —    | N         | NÃO TESTADO | `src/api-lib/agenda.ts` via `api/index.ts:473-476` |
| 172 | PATCH  | `/api/agenda?id=`                 | S    | —    | S         | NÃO TESTADO | `src/api-lib/agenda.ts` via `api/index.ts:473-476` |
| 173 | PATCH  | `/api/agenda?action=mover&id=`    | S    | —    | S         | NÃO TESTADO | `src/api-lib/agenda.ts` via `api/index.ts:473-476` |
| 174 | PATCH  | `/api/agenda?action=realizar&id=` | S    | —    | S         | NÃO TESTADO | `src/api-lib/agenda.ts` via `api/index.ts:473-476` |
| 175 | DELETE | `/api/agenda?id=`                 | S    | —    | S         | NÃO TESTADO | `src/api-lib/agenda.ts` via `api/index.ts:473-476` |

## 27. Notificações

| #   | Método | Caminho                          | Auth | Gate | Recebe ID | Status      | Evidência                                                |
| --- | ------ | -------------------------------- | ---- | ---- | --------- | ----------- | -------------------------------------------------------- |
| 176 | GET    | `/api/notificacoes`              | S    | —    | N         | NÃO TESTADO | `src/api-lib/notificacoes.ts` via `api/index.ts:477-480` |
| 177 | GET    | `/api/notificacoes?contar`       | S    | —    | N         | NÃO TESTADO | `src/api-lib/notificacoes.ts` via `api/index.ts:477-480` |
| 178 | PUT    | `/api/notificacoes?marcar-todas` | S    | —    | N         | NÃO TESTADO | `src/api-lib/notificacoes.ts` via `api/index.ts:477-480` |
| 179 | POST   | `/api/notificacoes?gerar`        | S    | —    | N         | NÃO TESTADO | `src/api-lib/notificacoes.ts` via `api/index.ts:477-480` |

## 28. Plano de Corte

| #   | Método | Caminho                                    | Auth | Gate        | Recebe ID | Status      | Evidência                                              |
| --- | ------ | ------------------------------------------ | ---- | ----------- | --------- | ----------- | ------------------------------------------------------ |
| 180 | GET    | `/api/plano-corte`                         | S    | plano_corte | N         | PASSOU      | Gate Basic:403, Enterprise:200                         |
| 181 | POST   | `/api/plano-corte`                         | S    | plano_corte | N         | PASSOU      | Gate Basic:403, Enterprise:400 (body vazio ok)         |
| 182 | POST   | `/api/plano-corte?action=check_duplicate`  | S    | plano_corte | N         | NÃO TESTADO | `src/api-lib/planocorte.ts` via `api/index.ts:485-488` |
| 183 | POST   | `/api/plano-corte?action=aprovar_producao` | S    | plano_corte | N         | NÃO TESTADO | `src/api-lib/planocorte.ts` via `api/index.ts:485-488` |
| 184 | PUT    | `/api/plano-corte?id=`                     | S    | plano_corte | S         | NÃO TESTADO | `src/api-lib/planocorte.ts` via `api/index.ts:485-488` |
| 185 | DELETE | `/api/plano-corte?id=`                     | S    | plano_corte | S         | NÃO TESTADO | `src/api-lib/planocorte.ts` via `api/index.ts:485-488` |
| 186 | POST   | `/api/plano-corte/importar-desenho`        | S    | plano_corte | N         | NÃO TESTADO | `src/api-lib/planocorte.ts` via `api/index.ts:481-484` |

## 29. Chapas

| #   | Método | Caminho       | Auth | Gate    | Recebe ID | Status      | Evidência                                              |
| --- | ------ | ------------- | ---- | ------- | --------- | ----------- | ------------------------------------------------------ |
| 187 | GET    | `/api/chapas` | S    | estoque | N         | NÃO TESTADO | `src/api-lib/planocorte.ts` via `api/index.ts:489-492` |

## 30. Engenharia SKUs

| #   | Método | Caminho                | Auth | Gate    | Recebe ID | Status      | Evidência                                              |
| --- | ------ | ---------------------- | ---- | ------- | --------- | ----------- | ------------------------------------------------------ |
| 188 | GET    | `/api/engenharia/skus` | S    | estoque | N         | NÃO TESTADO | `src/api-lib/planocorte.ts` via `api/index.ts:493-496` |

## 31. Rentabilidade

| #   | Método | Caminho                             | Auth | Gate | Recebe ID | Status      | Evidência                                                 |
| --- | ------ | ----------------------------------- | ---- | ---- | --------- | ----------- | --------------------------------------------------------- |
| 189 | GET    | `/api/rentabilidade/kpi`            | S    | —    | N         | NÃO TESTADO | `src/api-lib/rentabilidade.ts` via `api/index.ts:417-420` |
| 190 | GET    | `/api/rentabilidade/projetos`       | S    | —    | N         | NÃO TESTADO | `src/api-lib/rentabilidade.ts` via `api/index.ts:417-420` |
| 191 | GET    | `/api/rentabilidade/alertas`        | S    | —    | N         | NÃO TESTADO | `src/api-lib/rentabilidade.ts` via `api/index.ts:417-420` |
| 192 | GET    | `/api/rentabilidade/por-cliente`    | S    | —    | N         | NÃO TESTADO | `src/api-lib/rentabilidade.ts` via `api/index.ts:417-420` |
| 193 | GET    | `/api/rentabilidade/grafico-margem` | S    | —    | N         | NÃO TESTADO | `src/api-lib/rentabilidade.ts` via `api/index.ts:417-420` |
| 194 | POST   | `/api/rentabilidade/salvar`         | S    | —    | N         | NÃO TESTADO | `src/api-lib/rentabilidade.ts` via `api/index.ts:417-420` |

## 32. WhatsApp

| #   | Método | Caminho                         | Auth | Gate     | Recebe ID | Status      | Evidência                                            |
| --- | ------ | ------------------------------- | ---- | -------- | --------- | ----------- | ---------------------------------------------------- |
| 195 | GET    | `/api/whatsapp/mensagens`       | S    | whatsapp | N         | NÃO TESTADO | `src/api-lib/whatsapp.ts` via `api/index.ts:421-424` |
| 196 | POST   | `/api/whatsapp/enviar-mensagem` | S    | whatsapp | N         | NÃO TESTADO | `src/api-lib/whatsapp.ts` via `api/index.ts:421-424` |
| 197 | GET    | `/api/whatsapp/modelos`         | S    | whatsapp | N         | NÃO TESTADO | `src/api-lib/whatsapp.ts` via `api/index.ts:421-424` |
| 198 | POST   | `/api/whatsapp/webhook`         | S    | whatsapp | N         | NÃO TESTADO | `src/api-lib/whatsapp.ts` via `api/index.ts:421-424` |

## 33. Prospecção

| #   | Método | Caminho                          | Auth | Gate | Recebe ID | Status      | Evidência                                              |
| --- | ------ | -------------------------------- | ---- | ---- | --------- | ----------- | ------------------------------------------------------ |
| 199 | GET    | `/api/prospeccao`                | S    | —    | N         | NÃO TESTADO | `src/api-lib/prospeccao.ts` via `api/index.ts:531-534` |
| 200 | POST   | `/api/prospeccao`                | S    | —    | N         | NÃO TESTADO | `src/api-lib/prospeccao.ts` via `api/index.ts:531-534` |
| 201 | GET    | `/api/prospeccao/:id`            | S    | —    | S         | NÃO TESTADO | `src/api-lib/prospeccao.ts` via `api/index.ts:525-530` |
| 202 | PATCH  | `/api/prospeccao/:id`            | S    | —    | S         | NÃO TESTADO | `src/api-lib/prospeccao.ts` via `api/index.ts:525-530` |
| 203 | DELETE | `/api/prospeccao/:id`            | S    | —    | S         | NÃO TESTADO | `src/api-lib/prospeccao.ts` via `api/index.ts:525-530` |
| 204 | GET    | `/api/prospeccao/metrics`        | S    | —    | N         | NÃO TESTADO | `src/api-lib/prospeccao.ts` via `api/index.ts:515-518` |
| 205 | GET    | `/api/prospeccao/:id/interacoes` | S    | —    | S         | NÃO TESTADO | `src/api-lib/prospeccao.ts` via `api/index.ts:519-524` |
| 206 | POST   | `/api/prospeccao/:id/interacoes` | S    | —    | S         | NÃO TESTADO | `src/api-lib/prospeccao.ts` via `api/index.ts:519-524` |

## 34. IA / AI

| #   | Método | Caminho           | Auth | Gate | Recebe ID | Status      | Evidência                                           |
| --- | ------ | ----------------- | ---- | ---- | --------- | ----------- | --------------------------------------------------- |
| 207 | POST   | `/api/ai/chat`    | S    | ia   | N         | NÃO TESTADO | inline em `api/index.ts:282-382`                    |
| 208 | POST   | `/api/ai-copilot` | S    | ia   | N         | PASSOU      | Gate Basic:403, Enterprise:400 (body vazio ok)      |
| 209 | POST   | `/api/ai/parser`  | S    | ia   | N         | NÃO TESTADO | `src/api-lib/copilot.ts` via `api/index.ts:387-391` |

## 35. Importação / Match

| #   | Método | Caminho                 | Auth | Gate | Recebe ID | Status      | Evidência                                                       |
| --- | ------ | ----------------------- | ---- | ---- | --------- | ----------- | --------------------------------------------------------------- |
| 210 | POST   | `/api/importar-projeto` | S    | —    | N         | NÃO TESTADO | `src/api-lib/importacao-projetos.ts` via `api/index.ts:501-504` |
| 211 | POST   | `/api/match-skus`       | S    | —    | N         | NÃO TESTADO | `src/api-lib/match-skus.ts` via `api/index.ts:505-508`          |

---

## Resumo por módulo

| Módulo                    | # Endpoints | Auth           | Gate          |
| ------------------------- | ----------- | -------------- | ------------- |
| Infraestrutura / Públicos | 6           | 2 S, 4 N       | —             |
| Auth / Signup / Checkout  | 9           | 7 S, 2 N       | —             |
| SaaS Admin                | 4           | 4 S            | —             |
| CRM / Clients             | 6           | 6 S            | —             |
| Kanban (CRM)              | 3           | 3 S            | —             |
| Kanban Produção           | 4           | 4 S            | —             |
| Financeiro                | 27          | 27 S           | financeiro    |
| Condições Pagamento       | 3           | 3 S            | financeiro    |
| RH                        | 12          | 12 S           | rh            |
| Estoque (granular)        | 4           | 4 S            | estoque       |
| Estoque (principal)       | 13          | 13 S           | estoque       |
| Contratos                 | 3           | 3 S            | —             |
| Quotations                | 15          | 15 S           | —             |
| Quotations (aux)          | 6           | 5 S, 1 —       | 1 estoque     |
| Engenharia / SKUs         | 9           | 9 S            | 5 estoque     |
| Serviços                  | 5           | 5 S            | —             |
| Relatórios                | 4           | 4 S            | —             |
| Projetos                  | 4           | 4 S            | —             |
| Produção                  | 6           | 6 S            | —             |
| Simulações                | 5           | 5 S            | simulador_cnc |
| After-Sales               | 4           | 4 S            | —             |
| Usuários                  | 3           | 3 S            | —             |
| Compras                   | 6           | 6 S            | estoque       |
| Retalhos                  | 4           | 4 S            | plano_corte   |
| Aprovação                 | 3           | 3 S            | plano_corte   |
| Agenda                    | 7           | 7 S            | —             |
| Notificações              | 4           | 4 S            | —             |
| Plano de Corte            | 7           | 7 S            | plano_corte   |
| Chapas                    | 1           | 1 S            | estoque       |
| Engenharia SKUs           | 1           | 1 S            | estoque       |
| Rentabilidade             | 6           | 6 S            | —             |
| WhatsApp                  | 4           | 4 S            | whatsapp      |
| Prospecção                | 8           | 8 S            | —             |
| IA                        | 3           | 3 S            | ia            |
| Importação / Match        | 2           | 2 S            | —             |
| **TOTAL**                 | **211**     | **206 S, 5 N** |               |

---

## Contagem final

```
Total de endpoints expandidos: 211
Com autenticação (S): 206
Públicos (N): 5 (ping, resolve-dominio, init-db, auth?action=login, signup)
Com feature gate: ~85 (financeiro=30, estoque=20, plano_corte=11, rh=12, ia=3, simulador_cnc=5, whatsapp=4)
Sem feature gate: ~126
```

**Este total (211) é o denominador de cobertura e não muda mais.**

---

## Resultados de Teste (2026-09-20)

### Gates Basic vs Enterprise

- **Basic (12/12):** Todos os gates bloqueiam corretamente — estoque, financeiro, rh, plano_corte, simulador_cnc, ia
- **Enterprise (7/12):** GETs passam; POSTs com body vazio retornam 400 (esperado) ou 500 (bug — ACHADO A5)

### E2E Suite

- **162 passed, 12 failed** (retries 1)
- 5 falhas: auth.spec.ts + quotation.spec.ts — login page não renderiza form
- 5 falhas: quotations.spec.ts — form não encontrado (sem auth, redireciona)
- 1 falha: rh.spec.ts — detalhe folha test-id não encontrado
- 1 falha: full-audit-real — React key duplicado em SaaS Admin

### CSP

- Nenhum erro detectado (headless, sem auth)

### Achados Novos

| ID  | Severidade | Descrição                                                                                                            |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| A5  | MÉDIO      | POST /api/financeiro/classes retorna 500 com body vazio — precisa validação de input                                 |
| A6  | ALTO       | PATCH /api/financeiro/contas-internas/:id retorna 200 em vez de 404 para cross-tenant (IDOR)                         |
| A7  | ALTO       | PATCH /api/financeiro/formas-pagamento/:id retorna 200 em vez de 404 para cross-tenant (IDOR)                        |
| A8  | BAIXO      | Tabela fechamentos_financeiros ausente — impede teste de titulos-receber/pagar                                       |
| A9  | MÉDIO      | `financeiro.ts:438-441,552-553,623-626,752-753` — timezone bug em `setMonth()` — funciona em UTC (Vercel) mas frágil |
| A10 | MÉDIO      | API INSERT titulos-receber falha com `sql.join()` — `params: [object Object]`                                        |

### 3B — Cálculos Financeiros (Execução)

**23/23 PASSOU** — Todos os cálculos estão corretos quando executados diretamente no banco:

- Caso 1: Baixa parcial R$1000 (7/7): ✓ — aberto=1000→600→0, overpay=0, 3 baixas=1200
- Caso 2: Título vencido 10d multa+juros (3/3): ✓ — R$1030 (1000+20 multa+10 juros)
- Caso 3: Parcelamento 3x R$100 (3/3): ✓ — soma=300, vencimentos 10/11-12
- Caso 4: Último dia do mês (4/4): ✓ — Fev-28, Jan-31, Abr-30, Mar-31
- Caso 5: DRE + Fluxo (3/3): ✓ — receita bruta=6500, aberto=500, fluxo 7d=500
- Caso 6: Aging 4 faixas (4/4): ✓ — 0-30:500, 31-60:300, 61-90:200, 90+:100
