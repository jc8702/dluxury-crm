# MATRIZ DE ENDPOINTS — DENOMINADOR DE COBERTURA

- Etapa: 1 — lista fixa de endpoints (denominador de cobertura)
- Fonte: `api/index.ts` (roteador único, rewrite `vercel.json: "/api/(.*)" -> "/api/index"`) e `src/api-lib/**`
- Branch de auditoria: `audit-2026-09`
- Status inicial de TODAS as linhas: `NÃO TESTADO`
- Banco de dados NÃO foi acessado nesta etapa. Nenhum dado `AUDIT_` foi criado.

## Regras de formação das linhas (granularidade)

1. Uma linha = UM método HTTP × UM caminho.
2. Quando o handler aceita `PATCH || PUT` no mesmo `if`, são geradas DUAS linhas (PATCH e PUT), porque handlers diferentes aceitam verbos diferentes (ex.: `retalhos` aceita só PATCH, `presencas` aceita só PUT).
3. Discriminador de ROTA gera linha separada: segmento de path (`/extrato`, `/fechar`, `/list`, `/{id}/itens/{itemId}`) ou query seletora de recurso/ação (`?type=`, `?action=`, `?stats=true`).
4. Filtro/ID opcional NÃO gera linha nova: fica registrado na coluna `Recebe ID` (ex.: `GET /api/quotations` com `?id=` opcional = 1 linha).
5. Quando o handler NÃO testa o método, a coluna Método é `QUALQUER` (1 linha), e isso é registrado na Evidência.
6. Prefixos alternativos roteados para o mesmo handler geram linhas próprias (`/api/orcamentos-pro`, `/api/condicoes-pagamento`, `/api/forn`).
7. Código inalcançável (dead code) não gera linha.

## Legenda das colunas

- **Auth**:
  - `SIM` = Bearer JWT exigido pelo middleware global de tenant (`api/index.ts:161-169`, default ligado — `NEW_TENANT_MIDDLEWARE` não definido no `.env`)
  - `SIM+admin` = Bearer JWT + `role=admin` verificado no handler
  - `SIM+master` = Bearer JWT + tenant master / admin SaaS global
  - `SIM+handler` = rota é "pública" nos middlewares, mas o próprio handler exige Bearer
  - `NÃO` = rota pública (`api/index.ts:149-156`)
- **Gate** = feature gate do plano (`feature-gate-middleware.ts:60-88`) e/ou gate por handler (`middleware/featureGate.ts:42`, `src/lib/features.ts`). `—` = sem gate.
- **Recebe ID** = onde o ID entra (path / query / body), ou `—`.
- **Status**: nesta etapa todas as linhas são `NÃO TESTADO` (nenhuma chamada HTTP/UI executada).

---

## 1. /api/signup (dispatch: api/index.ts:200)

| #   | Método | Caminho                     | Auth | Gate | Recebe ID                   | Status      | Evidência                              |
| --- | ------ | --------------------------- | ---- | ---- | --------------------------- | ----------- | -------------------------------------- |
| 1   | GET    | /api/signup/check-subdomain | NÃO  | —    | — (query `?s` = subdomínio) | NÃO TESTADO | src/api-lib/tenant-provisioning.ts:208 |
| 2   | POST   | /api/signup                 | NÃO  | —    | —                           | NÃO TESTADO | src/api-lib/tenant-provisioning.ts:228 |

## 2. /api/saas-admin (dispatch: api/index.ts:204)

| #   | Método | Caminho                 | Auth       | Gate | Recebe ID        | Status      | Evidência                                                      |
| --- | ------ | ----------------------- | ---------- | ---- | ---------------- | ----------- | -------------------------------------------------------------- |
| 3   | GET    | /api/saas-admin/tenants | SIM+master | —    | —                | NÃO TESTADO | src/api-lib/saas-admin.ts:31 (guarda master: saas-admin.ts:21) |
| 4   | PATCH  | /api/saas-admin/tenants | SIM+master | —    | body `tenantId`  | NÃO TESTADO | src/api-lib/saas-admin.ts:77                                   |
| 5   | GET    | /api/saas-admin/users   | SIM+master | —    | query `tenantId` | NÃO TESTADO | src/api-lib/saas-admin.ts:195                                  |
| 6   | POST   | /api/saas-admin/users   | SIM+master | —    | body `tenantId`  | NÃO TESTADO | src/api-lib/saas-admin.ts:146                                  |

## 3. /api/checkout (dispatch: api/index.ts:208)

| #   | Método | Caminho                    | Auth        | Gate | Recebe ID | Status      | Evidência                                          |
| --- | ------ | -------------------------- | ----------- | ---- | --------- | ----------- | -------------------------------------------------- |
| 7   | GET    | /api/checkout/invoices     | SIM+handler | —    | —         | NÃO TESTADO | src/api-lib/checkout.ts:20 (auth: checkout.ts:7-9) |
| 8   | POST   | /api/checkout/cancel       | SIM+handler | —    | —         | NÃO TESTADO | src/api-lib/checkout.ts:81                         |
| 9   | POST   | /api/checkout/gerar-boleto | SIM+handler | —    | —         | NÃO TESTADO | src/api-lib/checkout.ts:101                        |
| 10  | GET    | /api/checkout              | SIM+handler | —    | —         | NÃO TESTADO | src/api-lib/checkout.ts:123 (fallback de path)     |
| 11  | POST   | /api/checkout              | SIM+handler | —    | —         | NÃO TESTADO | src/api-lib/checkout.ts:171 (fallback de path)     |

## 4. /api/auth (dispatch: api/index.ts:212)

| #   | Método | Caminho                   | Auth      | Gate                          | Recebe ID                       | Status      | Evidência                                                                 |
| --- | ------ | ------------------------- | --------- | ----------------------------- | ------------------------------- | ----------- | ------------------------------------------------------------------------- |
| 12  | POST   | /api/auth?action=login    | NÃO       | —                             | —                               | NÃO TESTADO | src/api-lib/auth.ts:179                                                   |
| 13  | POST   | /api/auth?action=register | SIM+admin | limite de usuários (maxUsers) | body (name/email/password/role) | NÃO TESTADO | src/api-lib/auth.ts:182; gate: src/api-lib/feature-gate-middleware.ts:101 |
| 14  | GET    | /api/auth?action=me       | SIM       | —                             | —                               | NÃO TESTADO | src/api-lib/auth.ts:186                                                   |

## 5. /api/clients (dispatch: api/index.ts:216)

| #   | Método | Caminho      | Auth | Gate | Recebe ID  | Status      | Evidência             |
| --- | ------ | ------------ | ---- | ---- | ---------- | ----------- | --------------------- |
| 15  | GET    | /api/clients | SIM  | —    | —          | NÃO TESTADO | src/api-lib/crm.ts:12 |
| 16  | POST   | /api/clients | SIM  | —    | body       | NÃO TESTADO | src/api-lib/crm.ts:22 |
| 17  | PATCH  | /api/clients | SIM  | —    | query `id` | NÃO TESTADO | src/api-lib/crm.ts:46 |
| 18  | PUT    | /api/clients | SIM  | —    | query `id` | NÃO TESTADO | src/api-lib/crm.ts:46 |
| 19  | DELETE | /api/clients | SIM  | —    | query `id` | NÃO TESTADO | src/api-lib/crm.ts:86 |

## 6. /api/financeiro (dispatch: api/index.ts:220) — Gate: `financeiro`

| #   | Método   | Caminho                                             | Auth | Gate       | Recebe ID                                                 | Status      | Evidência                                                                          |
| --- | -------- | --------------------------------------------------- | ---- | ---------- | --------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| 20  | GET      | /api/financeiro/classes                             | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:186 (dispatch: financeiro.ts:137)                        |
| 21  | POST     | /api/financeiro/classes                             | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:198                                                      |
| 22  | PATCH    | /api/financeiro/classes                             | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:206                                                      |
| 23  | PUT      | /api/financeiro/classes                             | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:206                                                      |
| 24  | DELETE   | /api/financeiro/classes                             | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:221                                                      |
| 25  | GET      | /api/financeiro/contas-internas                     | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:229 (dispatch: financeiro.ts:140)                        |
| 26  | GET      | /api/financeiro/contas-internas/{id}/extrato        | SIM  | financeiro | path `id` ou query `id`                                   | NÃO TESTADO | src/api-lib/financeiro.ts:230                                                      |
| 27  | POST     | /api/financeiro/contas-internas                     | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:332                                                      |
| 28  | PATCH    | /api/financeiro/contas-internas                     | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:342                                                      |
| 29  | PUT      | /api/financeiro/contas-internas                     | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:342                                                      |
| 30  | DELETE   | /api/financeiro/contas-internas                     | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:386                                                      |
| 31  | GET      | /api/financeiro/formas-pagamento                    | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:394 (dispatch: financeiro.ts:143)                        |
| 32  | POST     | /api/financeiro/formas-pagamento                    | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:404                                                      |
| 33  | PATCH    | /api/financeiro/formas-pagamento                    | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:412                                                      |
| 34  | PUT      | /api/financeiro/formas-pagamento                    | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:412                                                      |
| 35  | DELETE   | /api/financeiro/formas-pagamento                    | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:424                                                      |
| 36  | POST     | /api/financeiro/titulos-receber?action=preview      | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:432                                                      |
| 37  | POST     | /api/financeiro/titulos-receber/{id}/baixar         | SIM  | financeiro | path `id`                                                 | NÃO TESTADO | src/api-lib/financeiro.ts:446                                                      |
| 38  | GET      | /api/financeiro/titulos-receber                     | SIM  | financeiro | — (filtros query: cliente_id/status/data_inicio/data_fim) | NÃO TESTADO | src/api-lib/financeiro.ts:489                                                      |
| 39  | POST     | /api/financeiro/titulos-receber                     | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:528                                                      |
| 40  | PATCH    | /api/financeiro/titulos-receber                     | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:591                                                      |
| 41  | PUT      | /api/financeiro/titulos-receber                     | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:591                                                      |
| 42  | DELETE   | /api/financeiro/titulos-receber                     | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:514                                                      |
| 43  | DELETE   | /api/financeiro/titulos-receber?action=delete_group | SIM  | financeiro | query `cliente_id`                                        | NÃO TESTADO | src/api-lib/financeiro.ts:516                                                      |
| 44  | POST     | /api/financeiro/titulos-pagar?action=preview        | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:617 (dispatch: financeiro.ts:149)                        |
| 45  | POST     | /api/financeiro/titulos-pagar/{id}/baixar           | SIM  | financeiro | path `id`                                                 | NÃO TESTADO | src/api-lib/financeiro.ts:631                                                      |
| 46  | GET      | /api/financeiro/titulos-pagar                       | SIM  | financeiro | — (filtros query)                                         | NÃO TESTADO | src/api-lib/financeiro.ts:687                                                      |
| 47  | POST     | /api/financeiro/titulos-pagar                       | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:727                                                      |
| 48  | PATCH    | /api/financeiro/titulos-pagar                       | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:790                                                      |
| 49  | PUT      | /api/financeiro/titulos-pagar                       | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:790                                                      |
| 50  | DELETE   | /api/financeiro/titulos-pagar                       | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:712                                                      |
| 51  | DELETE   | /api/financeiro/titulos-pagar?action=delete_group   | SIM  | financeiro | query `fornecedor_id`                                     | NÃO TESTADO | src/api-lib/financeiro.ts:714                                                      |
| 52  | GET      | /api/financeiro/tesouraria                          | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:816 (dispatch: financeiro.ts:152)                        |
| 53  | POST     | /api/financeiro/tesouraria?action=lancamento        | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:824                                                      |
| 54  | POST     | /api/financeiro/tesouraria?action=transferencia     | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:828                                                      |
| 55  | GET      | /api/financeiro/fluxo-caixa                         | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:912 (dispatch: financeiro.ts:155)                        |
| 56  | QUALQUER | /api/financeiro/relatorios?type=dre                 | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1025 (sem guarda de método: financeiro.ts:1022)          |
| 57  | QUALQUER | /api/financeiro/relatorios?type=aging               | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1146                                                     |
| 58  | QUALQUER | /api/financeiro/relatorios?type=projetado           | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1186                                                     |
| 59  | QUALQUER | /api/financeiro/relatorios?type=dashboard           | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1236                                                     |
| 60  | QUALQUER | /api/financeiro/relatorios?type=capital_giro        | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1350                                                     |
| 61  | QUALQUER | /api/financeiro/relatorios?type=rentabilidade       | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1366                                                     |
| 62  | POST     | /api/financeiro/contas-recorrentes/gerar-mes        | SIM  | financeiro | path `gerar-mes`                                          | NÃO TESTADO | src/api-lib/financeiro.ts:1524 (dispatch: financeiro.ts:161)                       |
| 63  | GET      | /api/financeiro/contas-recorrentes                  | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1641                                                     |
| 64  | POST     | /api/financeiro/contas-recorrentes                  | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:1647                                                     |
| 65  | PATCH    | /api/financeiro/contas-recorrentes                  | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:1659                                                     |
| 66  | PUT      | /api/financeiro/contas-recorrentes                  | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:1659                                                     |
| 67  | DELETE   | /api/financeiro/contas-recorrentes                  | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:1672                                                     |
| 68  | GET      | /api/financeiro/condicoes-pagamento                 | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1744 (dispatch: financeiro.ts:164)                       |
| 69  | POST     | /api/financeiro/condicoes-pagamento                 | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:1749                                                     |
| 70  | PATCH    | /api/financeiro/condicoes-pagamento                 | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:1757                                                     |
| 71  | PUT      | /api/financeiro/condicoes-pagamento                 | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:1757                                                     |
| 72  | DELETE   | /api/financeiro/condicoes-pagamento                 | SIM  | financeiro | path/query `id`                                           | NÃO TESTADO | src/api-lib/financeiro.ts:1771                                                     |
| 73  | GET      | /api/financeiro/fechamentos                         | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1420 (dispatch: financeiro.ts:167)                       |
| 74  | POST     | /api/financeiro/fechamentos                         | SIM  | financeiro | body                                                      | NÃO TESTADO | src/api-lib/financeiro.ts:1426                                                     |
| 75  | POST     | /api/financeiro/conferencia                         | SIM  | financeiro | body `id`                                                 | NÃO TESTADO | src/api-lib/financeiro.ts:1472 (dispatch: financeiro.ts:170)                       |
| 76  | QUALQUER | /api/financeiro/test                                | SIM  | financeiro | —                                                         | NÃO TESTADO | src/api-lib/financeiro.ts:1680 (sem guarda de método; dispatch: financeiro.ts:173) |

## 7. /api/condicoes-pagamento — prefixo alternativo (dispatch: api/index.ts:387)

| #   | Método | Caminho                  | Auth | Gate       | Recebe ID       | Status      | Evidência                                         |
| --- | ------ | ------------------------ | ---- | ---------- | --------------- | ----------- | ------------------------------------------------- |
| 77  | GET    | /api/condicoes-pagamento | SIM  | financeiro | —               | NÃO TESTADO | src/api-lib/financeiro.ts:1744 + api/index.ts:387 |
| 78  | POST   | /api/condicoes-pagamento | SIM  | financeiro | body            | NÃO TESTADO | src/api-lib/financeiro.ts:1749 + api/index.ts:387 |
| 79  | PATCH  | /api/condicoes-pagamento | SIM  | financeiro | query/body `id` | NÃO TESTADO | src/api-lib/financeiro.ts:1757 + api/index.ts:387 |
| 80  | PUT    | /api/condicoes-pagamento | SIM  | financeiro | query/body `id` | NÃO TESTADO | src/api-lib/financeiro.ts:1757 + api/index.ts:387 |
| 81  | DELETE | /api/condicoes-pagamento | SIM  | financeiro | query/body `id` | NÃO TESTADO | src/api-lib/financeiro.ts:1771 + api/index.ts:387 |

## 8. /api/billings (dispatch: api/index.ts:492)

| #   | Método   | Caminho       | Auth | Gate       | Recebe ID | Status      | Evidência                                                                                      |
| --- | -------- | ------------- | ---- | ---------- | --------- | ----------- | ---------------------------------------------------------------------------------------------- |
| 82  | QUALQUER | /api/billings | SIM  | financeiro | —         | NÃO TESTADO | api/index.ts:492 → src/api-lib/financeiro.ts:137-177 (`resource='billings'` sem handler → 404) |

## 9. /api/rh (dispatch: api/index.ts:224) — Gate: `rh` (middleware) + `rh` (handler: rh.ts:87) + `role=admin`

| #   | Método   | Caminho                                           | Auth      | Gate | Recebe ID                                   | Status      | Evidência                                     |
| --- | -------- | ------------------------------------------------- | --------- | ---- | ------------------------------------------- | ----------- | --------------------------------------------- |
| 83  | GET      | /api/rh/colaboradores                             | SIM+admin | rh   | —                                           | NÃO TESTADO | src/api-lib/rh.ts:251                         |
| 84  | POST     | /api/rh/colaboradores                             | SIM+admin | rh   | body                                        | NÃO TESTADO | src/api-lib/rh.ts:260                         |
| 85  | PATCH    | /api/rh/colaboradores/{id}                        | SIM+admin | rh   | path `id`                                   | NÃO TESTADO | src/api-lib/rh.ts:284                         |
| 86  | PUT      | /api/rh/colaboradores/{id}                        | SIM+admin | rh   | path `id`                                   | NÃO TESTADO | src/api-lib/rh.ts:284                         |
| 87  | DELETE   | /api/rh/colaboradores/{id}                        | SIM+admin | rh   | path `id`                                   | NÃO TESTADO | src/api-lib/rh.ts:332                         |
| 88  | GET      | /api/rh/presencas?colaborador_id={id}&mes=YYYY-MM | SIM+admin | rh   | query `colaborador_id`+`mes` (obrigatórios) | NÃO TESTADO | src/api-lib/rh.ts:364                         |
| 89  | PUT      | /api/rh/presencas                                 | SIM+admin | rh   | body (lote)                                 | NÃO TESTADO | src/api-lib/rh.ts:384                         |
| 90  | GET      | /api/rh/adiantamentos                             | SIM+admin | rh   | query `competencia`/`status` (opcionais)    | NÃO TESTADO | src/api-lib/rh.ts:438 (ver achado A2)         |
| 91  | POST     | /api/rh/adiantamentos                             | SIM+admin | rh   | body `colaborador_id`                       | NÃO TESTADO | src/api-lib/rh.ts:461                         |
| 92  | GET      | /api/rh/folhas                                    | SIM+admin | rh   | —                                           | NÃO TESTADO | src/api-lib/rh.ts:519                         |
| 93  | POST     | /api/rh/folhas                                    | SIM+admin | rh   | body `competencia`                          | NÃO TESTADO | src/api-lib/rh.ts:528                         |
| 94  | GET      | /api/rh/folhas/{id}                               | SIM+admin | rh   | path `id`                                   | NÃO TESTADO | src/api-lib/rh.ts:652                         |
| 95  | PATCH    | /api/rh/folhas/{id}/itens/{itemId}                | SIM+admin | rh   | path `id`+`itemId`                          | NÃO TESTADO | src/api-lib/rh.ts:709                         |
| 96  | PUT      | /api/rh/folhas/{id}/itens/{itemId}                | SIM+admin | rh   | path `id`+`itemId`                          | NÃO TESTADO | src/api-lib/rh.ts:709                         |
| 97  | POST     | /api/rh/folhas/{id}/fechar                        | SIM+admin | rh   | path `id`                                   | NÃO TESTADO | src/api-lib/rh.ts:834                         |
| 98  | POST     | /api/rh/folhas/{id}/reabrir                       | SIM+admin | rh   | path `id`                                   | NÃO TESTADO | src/api-lib/rh.ts:986                         |
| 99  | GET      | /api/rh/folhas/{id}/recibo/{itemId}/pdf           | SIM+admin | rh   | path `id`+`itemId`                          | NÃO TESTADO | src/api-lib/rh.ts:1032                        |
| 100 | QUALQUER | /api/rh/dashboard                                 | SIM+admin | rh   | — (query `mes` opcional)                    | NÃO TESTADO | src/api-lib/rh.ts:1060 (sem guarda de método) |

## 10. estoque-granular (dispatch: api/index.ts:228-243)

| #   | Método | Caminho                          | Auth | Gate | Recebe ID                               | Status      | Evidência                                              |
| --- | ------ | -------------------------------- | ---- | ---- | --------------------------------------- | ----------- | ------------------------------------------------------ |
| 101 | GET    | /api/estoque/items               | SIM  | —    | —                                       | NÃO TESTADO | src/api-lib/estoque-granular.ts:90                     |
| 102 | GET    | /api/estoque/alertas             | SIM  | —    | —                                       | NÃO TESTADO | src/api-lib/estoque-granular.ts:146                    |
| 103 | POST   | /api/estoque/registrar-movimento | SIM  | —    | body (`sku_codigo`, `operacao_prod_id`) | NÃO TESTADO | src/api-lib/estoque-granular.ts:160                    |
| 104 | POST   | /api/estoque/finalizar-op        | SIM  | —    | body (`operacao_prod_id`)               | NÃO TESTADO | src/api-lib/estoque-granular.ts:284                    |
| 105 | POST   | /api/orcamentos/sku-matching     | SIM  | —    | body (`quotation_id` opcional)          | NÃO TESTADO | src/api-lib/estoque-granular.ts:363 + api/index.ts:238 |
| 106 | POST   | /api/quotations/sku-matching     | SIM  | —    | body (`quotation_id` opcional)          | NÃO TESTADO | src/api-lib/estoque-granular.ts:363 + api/index.ts:239 |

## 11. /api/contratos (dispatch: api/index.ts:244)

| #   | Método | Caminho                                 | Auth | Gate | Recebe ID                          | Status      | Evidência                                           |
| --- | ------ | --------------------------------------- | ---- | ---- | ---------------------------------- | ----------- | --------------------------------------------------- |
| 107 | GET    | /api/contratos/status?quotation_id={id} | SIM  | —    | query `quotation_id` (obrigatório) | NÃO TESTADO | src/api-lib/contrato-digital.ts:127                 |
| 108 | POST   | /api/contratos/gerar-e-enviar           | SIM  | —    | body `quotation_id`                | NÃO TESTADO | src/api-lib/contrato-digital.ts:157                 |
| 109 | POST   | /api/contratos/webhook-assinatura       | SIM  | —    | body (`envelope_id`, `status`)     | NÃO TESTADO | src/api-lib/contrato-digital.ts:281 (ver achado A3) |

## 12. /api/estoque (dispatch: api/index.ts:248)

| #   | Método | Caminho                         | Auth      | Gate | Recebe ID                                   | Status      | Evidência                                             |
| --- | ------ | ------------------------------- | --------- | ---- | ------------------------------------------- | ----------- | ----------------------------------------------------- |
| 110 | GET    | /api/estoque?type=movimentacoes | SIM       | —    | — (query `material_id` opcional)            | NÃO TESTADO | src/api-lib/estoque.ts:12                             |
| 111 | POST   | /api/estoque?type=movimentacoes | SIM       | —    | body `material_id`                          | NÃO TESTADO | src/api-lib/estoque.ts:20                             |
| 112 | GET    | /api/estoque?type=fornecedores  | SIM       | —    | query `id` opcional (detalhe)               | NÃO TESTADO | src/api-lib/estoque.ts:38                             |
| 113 | POST   | /api/estoque?type=fornecedores  | SIM       | —    | body                                        | NÃO TESTADO | src/api-lib/estoque.ts:44                             |
| 114 | PATCH  | /api/estoque?type=fornecedores  | SIM       | —    | query `id`                                  | NÃO TESTADO | src/api-lib/estoque.ts:49                             |
| 115 | DELETE | /api/estoque?type=fornecedores  | SIM       | —    | query `id`                                  | NÃO TESTADO | src/api-lib/estoque.ts:54                             |
| 116 | GET    | /api/estoque?type=categories    | SIM       | —    | —                                           | NÃO TESTADO | src/api-lib/estoque.ts:62                             |
| 117 | POST   | /api/estoque?type=categories    | SIM       | —    | body                                        | NÃO TESTADO | src/api-lib/estoque.ts:66                             |
| 118 | GET    | /api/estoque                    | SIM       | —    | query `id` opcional (detalhe) / `q` (busca) | NÃO TESTADO | src/api-lib/estoque.ts:72                             |
| 119 | POST   | /api/estoque                    | SIM       | —    | body                                        | NÃO TESTADO | src/api-lib/estoque.ts:88                             |
| 120 | PATCH  | /api/estoque                    | SIM       | —    | query `id`                                  | NÃO TESTADO | src/api-lib/estoque.ts:88                             |
| 121 | DELETE | /api/estoque                    | SIM+admin | —    | query `id`                                  | NÃO TESTADO | src/api-lib/estoque.ts:98 (role admin: estoque.ts:99) |

## 13. /api/forn — prefixo alternativo (dispatch: api/index.ts:504)

| #   | Método | Caminho                      | Auth      | Gate | Recebe ID                 | Status      | Evidência                                    |
| --- | ------ | ---------------------------- | --------- | ---- | ------------------------- | ----------- | -------------------------------------------- |
| 122 | GET    | /api/forn?type=movimentacoes | SIM       | —    | —                         | NÃO TESTADO | src/api-lib/estoque.ts:12 + api/index.ts:504 |
| 123 | POST   | /api/forn?type=movimentacoes | SIM       | —    | body `material_id`        | NÃO TESTADO | src/api-lib/estoque.ts:20 + api/index.ts:504 |
| 124 | GET    | /api/forn?type=fornecedores  | SIM       | —    | query `id` opcional       | NÃO TESTADO | src/api-lib/estoque.ts:38 + api/index.ts:504 |
| 125 | POST   | /api/forn?type=fornecedores  | SIM       | —    | body                      | NÃO TESTADO | src/api-lib/estoque.ts:44 + api/index.ts:504 |
| 126 | PATCH  | /api/forn?type=fornecedores  | SIM       | —    | query `id`                | NÃO TESTADO | src/api-lib/estoque.ts:49 + api/index.ts:504 |
| 127 | DELETE | /api/forn?type=fornecedores  | SIM       | —    | query `id`                | NÃO TESTADO | src/api-lib/estoque.ts:54 + api/index.ts:504 |
| 128 | GET    | /api/forn?type=categories    | SIM       | —    | —                         | NÃO TESTADO | src/api-lib/estoque.ts:62 + api/index.ts:504 |
| 129 | POST   | /api/forn?type=categories    | SIM       | —    | body                      | NÃO TESTADO | src/api-lib/estoque.ts:66 + api/index.ts:504 |
| 130 | GET    | /api/forn                    | SIM       | —    | query `id` opcional / `q` | NÃO TESTADO | src/api-lib/estoque.ts:72 + api/index.ts:504 |
| 131 | POST   | /api/forn                    | SIM       | —    | body                      | NÃO TESTADO | src/api-lib/estoque.ts:88 + api/index.ts:504 |
| 132 | PATCH  | /api/forn                    | SIM       | —    | query `id`                | NÃO TESTADO | src/api-lib/estoque.ts:88 + api/index.ts:504 |
| 133 | DELETE | /api/forn                    | SIM+admin | —    | query `id`                | NÃO TESTADO | src/api-lib/estoque.ts:98 + api/index.ts:504 |

## 14. /api/orcamentos/importar-itens (dispatch: api/index.ts:253)

| #   | Método | Caminho                        | Auth | Gate | Recebe ID                            | Status      | Evidência                          |
| --- | ------ | ------------------------------ | ---- | ---- | ------------------------------------ | ----------- | ---------------------------------- |
| 134 | POST   | /api/orcamentos/importar-itens | SIM  | —    | body (`orcamento_id`/`quotation_id`) | NÃO TESTADO | api/orcamentos/importar-itens.ts:7 |

## 15. /api/quotations (dispatch: api/index.ts:257)

| #   | Método | Caminho                                               | Auth | Gate | Recebe ID                                          | Status      | Evidência                                                        |
| --- | ------ | ----------------------------------------------------- | ---- | ---- | -------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| 135 | GET    | /api/quotations?action=explode                        | SIM  | —    | query `skuId`/`qtd`                                | NÃO TESTADO | src/api-lib/quotations.ts:493                                    |
| 136 | GET    | /api/quotations?action=search-skus                    | SIM  | —    | — (query `q`/`limit`)                              | NÃO TESTADO | src/api-lib/quotations.ts:500                                    |
| 137 | GET    | /api/quotations                                       | SIM  | —    | query `id` opcional (detalhe) / `q`/`page`/`limit` | NÃO TESTADO | src/api-lib/quotations.ts:575 e :619                             |
| 138 | POST   | /api/quotations                                       | SIM  | —    | body                                               | NÃO TESTADO | src/api-lib/quotations.ts:658                                    |
| 139 | PUT    | /api/quotations?id={id}&action=update-bom             | SIM  | —    | query `id` + body (`bomId`)                        | NÃO TESTADO | src/api-lib/quotations.ts:783                                    |
| 140 | PUT    | /api/quotations?id={id}&action=add-item               | SIM  | —    | query `id` + body (`skuId`)                        | NÃO TESTADO | src/api-lib/quotations.ts:803                                    |
| 141 | PUT    | /api/quotations?id={id}&action=import-items           | SIM  | —    | query `id` + body `items[]`                        | NÃO TESTADO | src/api-lib/quotations.ts:867                                    |
| 142 | PUT    | /api/quotations?id={id}&action=reset-to-global-margin | SIM  | —    | query `id` + body `itemIds`                        | NÃO TESTADO | src/api-lib/quotations.ts:1074                                   |
| 143 | PUT    | /api/quotations?id={id}&action=apply-global-margin    | SIM  | —    | query `id`                                         | NÃO TESTADO | src/api-lib/quotations.ts:1088                                   |
| 144 | PUT    | /api/quotations?id={id}&action=bulk-update-items      | SIM  | —    | query `id` + body `itemIds`                        | NÃO TESTADO | src/api-lib/quotations.ts:1118                                   |
| 145 | PUT    | /api/quotations?id={id}&action=update-sku             | SIM  | —    | query `id` + body (`itemId`,`skuId`)               | NÃO TESTADO | src/api-lib/quotations.ts:1169                                   |
| 146 | PUT    | /api/quotations?id={id}&action=update-item            | SIM  | —    | query `id` + body (`itemId`)                       | NÃO TESTADO | src/api-lib/quotations.ts:1236                                   |
| 147 | PUT    | /api/quotations?id={id}&action=delete-item            | SIM  | —    | query `id` + body (`itemId`)                       | NÃO TESTADO | src/api-lib/quotations.ts:1322                                   |
| 148 | PUT    | /api/quotations?id={id}                               | SIM  | —    | query `id`                                         | NÃO TESTADO | src/api-lib/quotations.ts:1331 (sem `action` → cabeçalho/status) |
| 149 | DELETE | /api/quotations?id={id}                               | SIM  | —    | query `id` (obrigatório)                           | NÃO TESTADO | src/api-lib/quotations.ts:1617                                   |

## 16. /api/orcamentos-pro — prefixo alternativo (dispatch: api/index.ts:257)

| #   | Método | Caminho                                                   | Auth | Gate | Recebe ID                                | Status      | Evidência                                               |
| --- | ------ | --------------------------------------------------------- | ---- | ---- | ---------------------------------------- | ----------- | ------------------------------------------------------- |
| 150 | GET    | /api/orcamentos-pro?action=explode                        | SIM  | —    | query `skuId`/`qtd`                      | NÃO TESTADO | src/api-lib/quotations.ts:493 + api/index.ts:257        |
| 151 | GET    | /api/orcamentos-pro?action=search-skus                    | SIM  | —    | —                                        | NÃO TESTADO | src/api-lib/quotations.ts:500 + api/index.ts:257        |
| 152 | GET    | /api/orcamentos-pro                                       | SIM  | —    | query `id` opcional / `q`/`page`/`limit` | NÃO TESTADO | src/api-lib/quotations.ts:575 e :619 + api/index.ts:257 |
| 153 | POST   | /api/orcamentos-pro                                       | SIM  | —    | body                                     | NÃO TESTADO | src/api-lib/quotations.ts:658 + api/index.ts:257        |
| 154 | PUT    | /api/orcamentos-pro?id={id}&action=update-bom             | SIM  | —    | query `id` + body                        | NÃO TESTADO | src/api-lib/quotations.ts:783 + api/index.ts:257        |
| 155 | PUT    | /api/orcamentos-pro?id={id}&action=add-item               | SIM  | —    | query `id` + body                        | NÃO TESTADO | src/api-lib/quotations.ts:803 + api/index.ts:257        |
| 156 | PUT    | /api/orcamentos-pro?id={id}&action=import-items           | SIM  | —    | query `id` + body                        | NÃO TESTADO | src/api-lib/quotations.ts:867 + api/index.ts:257        |
| 157 | PUT    | /api/orcamentos-pro?id={id}&action=reset-to-global-margin | SIM  | —    | query `id` + body                        | NÃO TESTADO | src/api-lib/quotations.ts:1074 + api/index.ts:257       |
| 158 | PUT    | /api/orcamentos-pro?id={id}&action=apply-global-margin    | SIM  | —    | query `id`                               | NÃO TESTADO | src/api-lib/quotations.ts:1088 + api/index.ts:257       |
| 159 | PUT    | /api/orcamentos-pro?id={id}&action=bulk-update-items      | SIM  | —    | query `id` + body                        | NÃO TESTADO | src/api-lib/quotations.ts:1118 + api/index.ts:257       |
| 160 | PUT    | /api/orcamentos-pro?id={id}&action=update-sku             | SIM  | —    | query `id` + body                        | NÃO TESTADO | src/api-lib/quotations.ts:1169 + api/index.ts:257       |
| 161 | PUT    | /api/orcamentos-pro?id={id}&action=update-item            | SIM  | —    | query `id` + body                        | NÃO TESTADO | src/api-lib/quotations.ts:1236 + api/index.ts:257       |
| 162 | PUT    | /api/orcamentos-pro?id={id}&action=delete-item            | SIM  | —    | query `id` + body                        | NÃO TESTADO | src/api-lib/quotations.ts:1322 + api/index.ts:257       |
| 163 | PUT    | /api/orcamentos-pro?id={id}                               | SIM  | —    | query `id`                               | NÃO TESTADO | src/api-lib/quotations.ts:1331 + api/index.ts:257       |
| 164 | DELETE | /api/orcamentos-pro?id={id}                               | SIM  | —    | query `id` (obrigatório)                 | NÃO TESTADO | src/api-lib/quotations.ts:1617 + api/index.ts:257       |

## 17. /api/orcamentos/export-pdf (dispatch: api/index.ts:261)

| #   | Método   | Caminho                    | Auth | Gate | Recebe ID | Status      | Evidência                                                             |
| --- | -------- | -------------------------- | ---- | ---- | --------- | ----------- | --------------------------------------------------------------------- |
| 165 | QUALQUER | /api/orcamentos/export-pdf | SIM  | —    | —         | NÃO TESTADO | api/orcamentos/exportar-pdf.ts:4 (sem guarda de método; resposta 501) |

## 18. Fallback depreciado /api/orcamentos e /api/orcamento-tecnico (dispatch: api/index.ts:265-276)

| #   | Método   | Caminho                                                                          | Auth | Gate | Recebe ID | Status      | Evidência                       |
| --- | -------- | -------------------------------------------------------------------------------- | ---- | ---- | --------- | ----------- | ------------------------------- |
| 166 | QUALQUER | /api/orcamentos/** (qualquer subcaminho não mapeado) e /api/orcamento-tecnico/** | SIM  | —    | —         | NÃO TESTADO | api/index.ts:265 (resposta 410) |

## 19. /api/ai/chat (dispatch: api/index.ts:277)

| #   | Método | Caminho      | Auth | Gate | Recebe ID          | Status      | Evidência                                                                       |
| --- | ------ | ------------ | ---- | ---- | ------------------ | ----------- | ------------------------------------------------------------------------------- |
| 167 | POST   | /api/ai/chat | SIM  | ia   | — (body `message`) | NÃO TESTADO | api/index.ts:277-278 e :318 (401 sem auth); gate: feature-gate-middleware.ts:60 |

## 20. Copiloto de IA (dispatch: api/index.ts:378, 382)

| #   | Método | Caminho         | Auth | Gate | Recebe ID                                                                                                                                           | Status      | Evidência                                        |
| --- | ------ | --------------- | ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------ |
| 168 | POST   | /api/ai-copilot | SIM  | ia   | — (skill no body: chat, generate-bom, audit-sku, purchase-suggestion, detect-anomalies, analyze-proposal, translate, generate-pdf, forecast-demand) | NÃO TESTADO | src/api-lib/copilot.ts:592 e :597-625            |
| 169 | POST   | /api/ai/parser  | SIM  | ia   | — (body)                                                                                                                                            | NÃO TESTADO | api/index.ts:382-383; src/api-lib/copilot.ts:261 |

## 21. /api/goals (dispatch: api/index.ts:391)

| #   | Método | Caminho    | Auth | Gate | Recebe ID                | Status      | Evidência              |
| --- | ------ | ---------- | ---- | ---- | ------------------------ | ----------- | ---------------------- |
| 170 | GET    | /api/goals | SIM  | —    | —                        | NÃO TESTADO | src/api-lib/crm.ts:189 |
| 171 | POST   | /api/goals | SIM  | —    | body (`period`,`amount`) | NÃO TESTADO | src/api-lib/crm.ts:198 |

## 22. kanban-produção (dispatch: api/index.ts:395-403)

| #   | Método | Caminho                  | Auth | Gate | Recebe ID              | Status      | Evidência                          |
| --- | ------ | ------------------------ | ---- | ---- | ---------------------- | ----------- | ---------------------------------- |
| 172 | GET    | /api/kanban/board        | SIM  | —    | —                      | NÃO TESTADO | src/api-lib/kanban-producao.ts:12  |
| 173 | POST   | /api/kanban/move-card    | SIM  | —    | body `etapa_kanban_id` | NÃO TESTADO | src/api-lib/kanban-producao.ts:96  |
| 174 | PATCH  | /api/kanban/card-details | SIM  | —    | body `etapa_kanban_id` | NÃO TESTADO | src/api-lib/kanban-producao.ts:173 |
| 175 | GET    | /api/kanban/card-history | SIM  | —    | query `id`             | NÃO TESTADO | src/api-lib/kanban-producao.ts:251 |

## 23. /api/kanban (dispatch: api/index.ts:404)

| #   | Método | Caminho     | Auth | Gate | Recebe ID  | Status      | Evidência              |
| --- | ------ | ----------- | ---- | ---- | ---------- | ----------- | ---------------------- |
| 176 | GET    | /api/kanban | SIM  | —    | —          | NÃO TESTADO | src/api-lib/crm.ts:126 |
| 177 | POST   | /api/kanban | SIM  | —    | body       | NÃO TESTADO | src/api-lib/crm.ts:143 |
| 178 | PATCH  | /api/kanban | SIM  | —    | query `id` | NÃO TESTADO | src/api-lib/crm.ts:153 |
| 179 | PUT    | /api/kanban | SIM  | —    | query `id` | NÃO TESTADO | src/api-lib/crm.ts:153 |

## 24. /api/calendario (dispatch: api/index.ts:408)

| #   | Método | Caminho                             | Auth | Gate | Recebe ID                          | Status      | Evidência                     |
| --- | ------ | ----------------------------------- | ---- | ---- | ---------------------------------- | ----------- | ----------------------------- |
| 180 | GET    | /api/calendario/eventos             | SIM  | —    | — (query `mes`/`ano` obrigatórios) | NÃO TESTADO | src/api-lib/calendario.ts:12  |
| 181 | POST   | /api/calendario/criar-evento        | SIM  | —    | body                               | NÃO TESTADO | src/api-lib/calendario.ts:194 |
| 182 | POST   | /api/calendario/gerar-automatico    | SIM  | —    | body `quotation_id`                | NÃO TESTADO | src/api-lib/calendario.ts:233 |
| 183 | GET    | /api/calendario/verificar-lembretes | SIM  | —    | —                                  | NÃO TESTADO | src/api-lib/calendario.ts:281 |
| 184 | PATCH  | /api/calendario?id={id}             | SIM  | —    | query `id`                         | NÃO TESTADO | src/api-lib/calendario.ts:318 |
| 185 | DELETE | /api/calendario?id={id}             | SIM  | —    | query `id`                         | NÃO TESTADO | src/api-lib/calendario.ts:332 |

## 25. /api/rentabilidade (dispatch: api/index.ts:412)

| #   | Método | Caminho                           | Auth | Gate | Recebe ID                    | Status      | Evidência                        |
| --- | ------ | --------------------------------- | ---- | ---- | ---------------------------- | ----------- | -------------------------------- |
| 186 | GET    | /api/rentabilidade/kpi            | SIM  | —    | —                            | NÃO TESTADO | src/api-lib/rentabilidade.ts:15  |
| 187 | GET    | /api/rentabilidade/projetos       | SIM  | —    | — (query `cliente` opcional) | NÃO TESTADO | src/api-lib/rentabilidade.ts:90  |
| 188 | GET    | /api/rentabilidade/alertas        | SIM  | —    | —                            | NÃO TESTADO | src/api-lib/rentabilidade.ts:167 |
| 189 | GET    | /api/rentabilidade/por-cliente    | SIM  | —    | —                            | NÃO TESTADO | src/api-lib/rentabilidade.ts:209 |
| 190 | GET    | /api/rentabilidade/grafico-margem | SIM  | —    | —                            | NÃO TESTADO | src/api-lib/rentabilidade.ts:252 |
| 191 | POST   | /api/rentabilidade/salvar         | SIM  | —    | body `id` (obrigatório)      | NÃO TESTADO | src/api-lib/rentabilidade.ts:278 |

## 26. /api/whatsapp (dispatch: api/index.ts:416) — Gate: `whatsapp` (middleware: feature-gate-middleware.ts:79) + `whatsapp` (handler: whatsapp.ts:8)

| #   | Método | Caminho                       | Auth | Gate     | Recebe ID                               | Status      | Evidência                                   |
| --- | ------ | ----------------------------- | ---- | -------- | --------------------------------------- | ----------- | ------------------------------------------- |
| 192 | GET    | /api/whatsapp/mensagens       | SIM  | whatsapp | query `quotation_id`/`operacao_prod_id` | NÃO TESTADO | src/api-lib/whatsapp.ts:21                  |
| 193 | POST   | /api/whatsapp/enviar-mensagem | SIM  | whatsapp | body                                    | NÃO TESTADO | src/api-lib/whatsapp.ts:100                 |
| 194 | GET    | /api/whatsapp/modelos         | SIM  | whatsapp | —                                       | NÃO TESTADO | src/api-lib/whatsapp.ts:193                 |
| 195 | POST   | /api/whatsapp/webhook         | SIM  | whatsapp | body                                    | NÃO TESTADO | src/api-lib/whatsapp.ts:214 (ver achado A3) |

## 27. /api/engineering (dispatch: api/index.ts:420)

| #   | Método | Caminho                  | Auth | Gate | Recebe ID              | Status      | Evidência                   |
| --- | ------ | ------------------------ | ---- | ---- | ---------------------- | ----------- | --------------------------- |
| 196 | GET    | /api/engineering         | SIM  | —    | — (query `q` opcional) | NÃO TESTADO | src/api-lib/projects.ts:395 |
| 197 | POST   | /api/engineering         | SIM  | —    | body                   | NÃO TESTADO | src/api-lib/projects.ts:425 |
| 198 | PATCH  | /api/engineering?id={id} | SIM  | —    | query `id`             | NÃO TESTADO | src/api-lib/projects.ts:493 |
| 199 | PUT    | /api/engineering?id={id} | SIM  | —    | query `id`             | NÃO TESTADO | src/api-lib/projects.ts:493 |
| 200 | DELETE | /api/engineering?id={id} | SIM  | —    | query `id`             | NÃO TESTADO | src/api-lib/projects.ts:524 |

## 28. /api/skus (dispatch: api/index.ts:424)

| #   | Método | Caminho                    | Auth | Gate | Recebe ID                | Status      | Evidência                   |
| --- | ------ | -------------------------- | ---- | ---- | ------------------------ | ----------- | --------------------------- |
| 201 | GET    | /api/skus?action=next-code | SIM  | —    | — (query `prefix`)       | NÃO TESTADO | src/api-lib/projects.ts:543 |
| 202 | GET    | /api/skus                  | SIM  | —    | —                        | NÃO TESTADO | src/api-lib/projects.ts:562 |
| 203 | POST   | /api/skus                  | SIM  | —    | body                     | NÃO TESTADO | src/api-lib/projects.ts:567 |
| 204 | PATCH  | /api/skus?id={id}          | SIM  | —    | query `id` (obrigatório) | NÃO TESTADO | src/api-lib/projects.ts:574 |
| 205 | PUT    | /api/skus?id={id}          | SIM  | —    | query `id`               | NÃO TESTADO | src/api-lib/projects.ts:574 |
| 206 | DELETE | /api/skus?id={id}          | SIM  | —    | query `id`               | NÃO TESTADO | src/api-lib/projects.ts:593 |

## 29. /api/servicos (dispatch: api/index.ts:428)

| #   | Método | Caminho                         | Auth | Gate | Recebe ID                 | Status      | Evidência                   |
| --- | ------ | ------------------------------- | ---- | ---- | ------------------------- | ----------- | --------------------------- |
| 207 | GET    | /api/servicos?action=categorias | SIM  | —    | —                         | NÃO TESTADO | src/api-lib/servicos.ts:11  |
| 208 | GET    | /api/servicos                   | SIM  | —    | — (query `categoria`/`q`) | NÃO TESTADO | src/api-lib/servicos.ts:26  |
| 209 | POST   | /api/servicos                   | SIM  | —    | body                      | NÃO TESTADO | src/api-lib/servicos.ts:44  |
| 210 | PATCH  | /api/servicos?id={id}           | SIM  | —    | query `id` (obrigatório)  | NÃO TESTADO | src/api-lib/servicos.ts:72  |
| 211 | DELETE | /api/servicos?id={id}           | SIM  | —    | query `id` (obrigatório)  | NÃO TESTADO | src/api-lib/servicos.ts:133 |

## 30. /api/reports (dispatch: api/index.ts:432)

| #   | Método   | Caminho                             | Auth | Gate | Recebe ID         | Status      | Evidência                                                           |
| --- | -------- | ----------------------------------- | ---- | ---- | ----------------- | ----------- | ------------------------------------------------------------------- |
| 212 | QUALQUER | /api/reports?type=fin-rentabilidade | SIM  | —    | —                 | NÃO TESTADO | src/api-lib/projects.ts:284 (sem guarda de método: projects.ts:278) |
| 213 | QUALQUER | /api/reports?type=ind-romaneio      | SIM  | —    | query `projectId` | NÃO TESTADO | src/api-lib/projects.ts:293                                         |
| 214 | QUALQUER | /api/reports?type=com-necessidade   | SIM  | —    | —                 | NÃO TESTADO | src/api-lib/projects.ts:304                                         |
| 215 | QUALQUER | /api/reports?type=ind-desvios       | SIM  | —    | —                 | NÃO TESTADO | src/api-lib/projects.ts:312                                         |

## 31. /api/projects (dispatch: api/index.ts:436)

| #   | Método | Caminho               | Auth | Gate | Recebe ID                          | Status      | Evidência                   |
| --- | ------ | --------------------- | ---- | ---- | ---------------------------------- | ----------- | --------------------------- |
| 216 | GET    | /api/projects         | SIM  | —    | — (query `q`/`client_id`/`status`) | NÃO TESTADO | src/api-lib/projects.ts:105 |
| 217 | POST   | /api/projects         | SIM  | —    | body                               | NÃO TESTADO | src/api-lib/projects.ts:177 |
| 218 | PATCH  | /api/projects?id={id} | SIM  | —    | query `id` (obrigatório)           | NÃO TESTADO | src/api-lib/projects.ts:212 |
| 219 | PUT    | /api/projects?id={id} | SIM  | —    | query `id`                         | NÃO TESTADO | src/api-lib/projects.ts:212 |
| 220 | DELETE | /api/projects?id={id} | SIM  | —    | query `id`                         | NÃO TESTADO | src/api-lib/projects.ts:251 |

## 32. /api/production (dispatch: api/index.ts:440)

| #   | Método | Caminho                 | Auth | Gate | Recebe ID                              | Status      | Evidência                    |
| --- | ------ | ----------------------- | ---- | ---- | -------------------------------------- | ----------- | ---------------------------- |
| 221 | GET    | /api/production         | SIM  | —    | —                                      | NÃO TESTADO | src/api-lib/production.ts:49 |
| 222 | GET    | /api/production/list    | SIM  | —    | path `list` (ou query `id=list`)       | NÃO TESTADO | src/api-lib/production.ts:49 |
| 223 | GET    | /api/production/metrics | SIM  | —    | path `metrics` (ou query `id=metrics`) | NÃO TESTADO | src/api-lib/production.ts:50 |
| 224 | POST   | /api/production         | SIM  | —    | body                                   | NÃO TESTADO | src/api-lib/production.ts:51 |
| 225 | PATCH  | /api/production/details | SIM  | —    | body `op_id`                           | NÃO TESTADO | src/api-lib/production.ts:52 |
| 226 | PATCH  | /api/production         | SIM  | —    | body `op_id`                           | NÃO TESTADO | src/api-lib/production.ts:54 |
| 227 | DELETE | /api/production         | SIM  | —    | query `id`/`op_id` (fallback body)     | NÃO TESTADO | src/api-lib/production.ts:55 |

## 33. /api/simulations (dispatch: api/index.ts:444) — Gate: `simulador_cnc` (middleware: feature-gate-middleware.ts:62) + `simulator` (handler: projects.ts:605)

| #   | Método | Caminho               | Auth | Gate                      | Recebe ID                 | Status      | Evidência                          |
| --- | ------ | --------------------- | ---- | ------------------------- | ------------------------- | ----------- | ---------------------------------- |
| 228 | GET    | /api/simulations      | SIM  | simulador_cnc + simulator | — (query `tipo` opcional) | NÃO TESTADO | src/api-lib/projects.ts:642        |
| 229 | GET    | /api/simulations/{id} | SIM  | simulador_cnc + simulator | path `id` (ou query `id`) | NÃO TESTADO | src/api-lib/projects.ts:629 e :635 |
| 230 | POST   | /api/simulations      | SIM  | simulador_cnc + simulator | body                      | NÃO TESTADO | src/api-lib/projects.ts:652        |
| 231 | PUT    | /api/simulations/{id} | SIM  | simulador_cnc + simulator | path `id` (ou query `id`) | NÃO TESTADO | src/api-lib/projects.ts:669        |
| 232 | DELETE | /api/simulations/{id} | SIM  | simulador_cnc + simulator | path `id` (ou query `id`) | NÃO TESTADO | src/api-lib/projects.ts:685        |

## 34. /api/after-sales (dispatch: api/index.ts:448)

| #   | Método | Caminho                     | Auth | Gate | Recebe ID | Status      | Evidência                     |
| --- | ------ | --------------------------- | ---- | ---- | --------- | ----------- | ----------------------------- |
| 233 | GET    | /api/after-sales?stats=true | SIM  | —    | —         | NÃO TESTADO | src/api-lib/after_sales.ts:14 |
| 234 | GET    | /api/after-sales            | SIM  | —    | —         | NÃO TESTADO | src/api-lib/after_sales.ts:25 |
| 235 | POST   | /api/after-sales            | SIM  | —    | body      | NÃO TESTADO | src/api-lib/after_sales.ts:36 |
| 236 | PATCH  | /api/after-sales            | SIM  | —    | body `id` | NÃO TESTADO | src/api-lib/after_sales.ts:77 |
| 237 | PUT    | /api/after-sales            | SIM  | —    | body `id` | NÃO TESTADO | src/api-lib/after_sales.ts:77 |

## 35. /api/users (dispatch: api/index.ts:452)

| #   | Método | Caminho            | Auth      | Gate | Recebe ID                             | Status      | Evidência               |
| --- | ------ | ------------------ | --------- | ---- | ------------------------------------- | ----------- | ----------------------- |
| 238 | GET    | /api/users         | SIM+admin | —    | —                                     | NÃO TESTADO | src/api-lib/auth.ts:264 |
| 239 | PATCH  | /api/users?id={id} | SIM+admin | —    | query `id` (senão, o próprio usuário) | NÃO TESTADO | src/api-lib/auth.ts:265 |
| 240 | DELETE | /api/users?id={id} | SIM+admin | —    | query `id`                            | NÃO TESTADO | src/api-lib/auth.ts:266 |

## 36. /api/compras (dispatch: api/index.ts:456)

| #   | Método   | Caminho                            | Auth | Gate | Recebe ID                                       | Status      | Evidência                                           |
| --- | -------- | ---------------------------------- | ---- | ---- | ----------------------------------------------- | ----------- | --------------------------------------------------- |
| 241 | GET      | /api/compras?type=pedidos          | SIM  | —    | query `id` opcional (detalhe) / `fornecedor_id` | NÃO TESTADO | src/api-lib/compras.ts:15 (dispatch: compras.ts:14) |
| 242 | POST     | /api/compras?type=pedidos          | SIM  | —    | body                                            | NÃO TESTADO | src/api-lib/compras.ts:45                           |
| 243 | PATCH    | /api/compras?type=pedidos&id={id}  | SIM  | —    | query `id`                                      | NÃO TESTADO | src/api-lib/compras.ts:98                           |
| 244 | PUT      | /api/compras?type=pedidos&id={id}  | SIM  | —    | query `id`                                      | NÃO TESTADO | src/api-lib/compras.ts:98                           |
| 245 | DELETE   | /api/compras?type=pedidos&id={id}  | SIM  | —    | query `id` (obrigatório)                        | NÃO TESTADO | src/api-lib/compras.ts:34                           |
| 246 | POST     | /api/compras?type=itens            | SIM  | —    | body `pedido_id`                                | NÃO TESTADO | src/api-lib/compras.ts:203                          |
| 247 | DELETE   | /api/compras?type=itens&id={id}    | SIM  | —    | query `id`                                      | NÃO TESTADO | src/api-lib/compras.ts:214                          |
| 248 | POST     | /api/compras?type=recebimento      | SIM  | —    | body `pedido_id`                                | NÃO TESTADO | src/api-lib/compras.ts:227                          |
| 249 | QUALQUER | /api/compras?type=sugestao         | SIM  | —    | —                                               | NÃO TESTADO | src/api-lib/compras.ts:279 (sem guarda de método)   |
| 250 | QUALQUER | /api/compras?type=historico_precos | SIM  | —    | query `material_id`                             | NÃO TESTADO | src/api-lib/compras.ts:288 (sem guarda de método)   |

## 37. /api/retalhos (dispatch: api/index.ts:460) — Gate: `plano_corte`

| #   | Método | Caminho                                | Auth | Gate        | Recebe ID                     | Status      | Evidência                                                |
| --- | ------ | -------------------------------------- | ---- | ----------- | ----------------------------- | ----------- | -------------------------------------------------------- |
| 251 | GET    | /api/retalhos                          | SIM  | plano_corte | query `id` opcional (detalhe) | NÃO TESTADO | src/api-lib/retalhos.ts:20 e :21                         |
| 252 | POST   | /api/retalhos                          | SIM  | plano_corte | body                          | NÃO TESTADO | src/api-lib/retalhos.ts:48                               |
| 253 | PATCH  | /api/retalhos?id={id}                  | SIM  | plano_corte | query `id` (obrigatório)      | NÃO TESTADO | src/api-lib/retalhos.ts:101                              |
| 254 | PATCH  | /api/retalhos?id={id}&action=usar      | SIM  | plano_corte | query `id`                    | NÃO TESTADO | src/api-lib/retalhos.ts:111                              |
| 255 | PATCH  | /api/retalhos?id={id}&action=descartar | SIM  | plano_corte | query `id`                    | NÃO TESTADO | src/api-lib/retalhos.ts:114                              |
| 256 | DELETE | /api/retalhos?id={id}                  | SIM  | plano_corte | query `id` (obrigatório)      | NÃO TESTADO | src/api-lib/retalhos.ts:129 (PUT → 405: retalhos.ts:161) |

## 38. /api/aprovacao (dispatch: api/index.ts:464) — Gate: `plano_corte`

| #   | Método | Caminho                              | Auth                                             | Gate        | Recebe ID           | Status      | Evidência                                                                |
| --- | ------ | ------------------------------------ | ------------------------------------------------ | ----------- | ------------------- | ----------- | ------------------------------------------------------------------------ |
| 257 | GET    | /api/aprovacao?token={token}         | SIM (fluxo pretendido é público — ver achado A3) | plano_corte | query `token`       | NÃO TESTADO | src/api-lib/aprovacao.ts:15 (comentário de rota pública: aprovacao.ts:7) |
| 258 | POST   | /api/aprovacao/gerar                 | SIM                                              | plano_corte | body `quotation_id` | NÃO TESTADO | src/api-lib/aprovacao.ts:93                                              |
| 259 | POST   | /api/aprovacao/aprovar?token={token} | SIM (fluxo pretendido é público — ver achado A3) | plano_corte | query `token`       | NÃO TESTADO | src/api-lib/aprovacao.ts:126                                             |
| 260 | POST   | /api/aprovacao/recusar?token={token} | SIM (fluxo pretendido é público — ver achado A3) | plano_corte | query `token`       | NÃO TESTADO | src/api-lib/aprovacao.ts:152                                             |

## 39. /api/agenda (dispatch: api/index.ts:468)

| #   | Método | Caminho                             | Auth | Gate | Recebe ID                                      | Status      | Evidência                          |
| --- | ------ | ----------------------------------- | ---- | ---- | ---------------------------------------------- | ----------- | ---------------------------------- |
| 261 | GET    | /api/agenda?action=kanban           | SIM  | —    | —                                              | NÃO TESTADO | src/api-lib/agenda.ts:20           |
| 262 | GET    | /api/agenda                         | SIM  | —    | query `id` opcional (detalhe) / `inicio`/`fim` | NÃO TESTADO | src/api-lib/agenda.ts:18, :26, :33 |
| 263 | POST   | /api/agenda                         | SIM  | —    | body                                           | NÃO TESTADO | src/api-lib/agenda.ts:39           |
| 264 | PATCH  | /api/agenda?id={id}&action=mover    | SIM  | —    | query `id`                                     | NÃO TESTADO | src/api-lib/agenda.ts:55           |
| 265 | PUT    | /api/agenda?id={id}&action=mover    | SIM  | —    | query `id`                                     | NÃO TESTADO | src/api-lib/agenda.ts:55           |
| 266 | PATCH  | /api/agenda?id={id}&action=realizar | SIM  | —    | query `id`                                     | NÃO TESTADO | src/api-lib/agenda.ts:62           |
| 267 | PUT    | /api/agenda?id={id}&action=realizar | SIM  | —    | query `id`                                     | NÃO TESTADO | src/api-lib/agenda.ts:62           |
| 268 | PATCH  | /api/agenda?id={id}                 | SIM  | —    | query `id` (obrigatório)                       | NÃO TESTADO | src/api-lib/agenda.ts:69           |
| 269 | PUT    | /api/agenda?id={id}                 | SIM  | —    | query `id` (obrigatório)                       | NÃO TESTADO | src/api-lib/agenda.ts:69           |
| 270 | DELETE | /api/agenda?id={id}                 | SIM  | —    | query `id` (obrigatório)                       | NÃO TESTADO | src/api-lib/agenda.ts:73           |

## 40. /api/notificacoes (dispatch: api/index.ts:472)

| #   | Método | Caminho                               | Auth | Gate | Recebe ID                  | Status      | Evidência                            |
| --- | ------ | ------------------------------------- | ---- | ---- | -------------------------- | ----------- | ------------------------------------ |
| 271 | GET    | /api/notificacoes?action=contar       | SIM  | —    | —                          | NÃO TESTADO | src/api-lib/notificacoes.ts:17       |
| 272 | GET    | /api/notificacoes                     | SIM  | —    | — (query `unread`/`limit`) | NÃO TESTADO | src/api-lib/notificacoes.ts:16       |
| 273 | PUT    | /api/notificacoes?action=marcar-todas | SIM  | —    | —                          | NÃO TESTADO | src/api-lib/notificacoes.ts:33 e :34 |
| 274 | PATCH  | /api/notificacoes?action=marcar-todas | SIM  | —    | —                          | NÃO TESTADO | src/api-lib/notificacoes.ts:33 e :34 |
| 275 | PUT    | /api/notificacoes?id={id}             | SIM  | —    | query `id`                 | NÃO TESTADO | src/api-lib/notificacoes.ts:38       |
| 276 | PATCH  | /api/notificacoes?id={id}             | SIM  | —    | query `id`                 | NÃO TESTADO | src/api-lib/notificacoes.ts:38       |
| 277 | POST   | /api/notificacoes?action=gerar        | SIM  | —    | —                          | NÃO TESTADO | src/api-lib/notificacoes.ts:42       |

## 41. plano-corte (dispatch: api/index.ts:476, 480) — Gate: `plano_corte` (middleware) + `simulator` (handler)

| #   | Método | Caminho                                               | Auth | Gate                    | Recebe ID                                        | Status      | Evidência                                               |
| --- | ------ | ----------------------------------------------------- | ---- | ----------------------- | ------------------------------------------------ | ----------- | ------------------------------------------------------- |
| 278 | POST   | /api/plano-corte/importar-desenho                     | SIM  | plano_corte + simulator | — (body `fileBase64`/`fileName`)                 | NÃO TESTADO | src/api-lib/planocorte.ts:563 (gate: planocorte.ts:566) |
| 279 | GET    | /api/plano-corte                                      | SIM  | plano_corte + simulator | query `id` opcional (detalhe)                    | NÃO TESTADO | src/api-lib/planocorte.ts:49 e :63                      |
| 280 | POST   | /api/plano-corte?action=criar_plano                   | SIM  | plano_corte + simulator | body                                             | NÃO TESTADO | src/api-lib/planocorte.ts:75                            |
| 281 | POST   | /api/plano-corte?action=verificar_retalhos_duplicados | SIM  | plano_corte + simulator | body `plano_id`                                  | NÃO TESTADO | src/api-lib/planocorte.ts:94                            |
| 282 | POST   | /api/plano-corte?action=aprovar_producao              | SIM  | plano_corte + simulator | body `plano_id`                                  | NÃO TESTADO | src/api-lib/planocorte.ts:117                           |
| 283 | POST   | /api/plano-corte                                      | SIM  | plano_corte + simulator | body `plano_id` (sem `action` → salva resultado) | NÃO TESTADO | src/api-lib/planocorte.ts:342                           |
| 284 | PUT    | /api/plano-corte?id={id}                              | SIM  | plano_corte + simulator | query `id` (obrigatório)                         | NÃO TESTADO | src/api-lib/planocorte.ts:376                           |
| 285 | DELETE | /api/plano-corte?id={id}                              | SIM  | plano_corte + simulator | query `id` (obrigatório)                         | NÃO TESTADO | src/api-lib/planocorte.ts:388                           |

## 42. /api/chapas (dispatch: api/index.ts:484) — Gate: `plano_corte` (middleware) + `simulator` (handler: planocorte.ts:427)

| #   | Método   | Caminho     | Auth | Gate                    | Recebe ID     | Status      | Evidência                                            |
| --- | -------- | ----------- | ---- | ----------------------- | ------------- | ----------- | ---------------------------------------------------- |
| 286 | QUALQUER | /api/chapas | SIM  | plano_corte + simulator | — (query `q`) | NÃO TESTADO | src/api-lib/planocorte.ts:421 (sem guarda de método) |

## 43. /api/engenharia/skus (dispatch: api/index.ts:488) — Gate: `simulator` (handler: planocorte.ts:531)

| #   | Método   | Caminho              | Auth | Gate      | Recebe ID     | Status      | Evidência                                            |
| --- | -------- | -------------------- | ---- | --------- | ------------- | ----------- | ---------------------------------------------------- |
| 287 | QUALQUER | /api/engenharia/skus | SIM  | simulator | — (query `q`) | NÃO TESTADO | src/api-lib/planocorte.ts:525 (sem guarda de método) |

## 44. /api/importar-projeto (dispatch: api/index.ts:496)

| #   | Método | Caminho               | Auth | Gate | Recebe ID       | Status      | Evidência                             |
| --- | ------ | --------------------- | ---- | ---- | --------------- | ----------- | ------------------------------------- |
| 288 | POST   | /api/importar-projeto | SIM  | —    | body `jsonData` | NÃO TESTADO | src/api-lib/importacao-projetos.ts:60 |

## 45. /api/match-skus (dispatch: api/index.ts:500)

| #   | Método | Caminho         | Auth | Gate | Recebe ID                 | Status      | Evidência                    |
| --- | ------ | --------------- | ---- | ---- | ------------------------- | ----------- | ---------------------------- |
| 289 | GET    | /api/match-skus | SIM  | —    | — (query `q`/`categoria`) | NÃO TESTADO | src/api-lib/match-skus.ts:16 |
| 290 | POST   | /api/match-skus | SIM  | —    | body                      | NÃO TESTADO | src/api-lib/match-skus.ts:69 |

## 46. /api/prospeccao (dispatch: api/index.ts:510-529)

| #   | Método   | Caminho                         | Auth | Gate | Recebe ID                                       | Status      | Evidência                                                                        |
| --- | -------- | ------------------------------- | ---- | ---- | ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| 291 | QUALQUER | /api/prospeccao/metrics         | SIM  | —    | —                                               | NÃO TESTADO | src/api-lib/prospeccao.ts:235 (sem guarda de método; dispatch: api/index.ts:510) |
| 292 | GET      | /api/prospeccao/{id}/interacoes | SIM  | —    | path `id` (injetado em query: api/index.ts:516) | NÃO TESTADO | src/api-lib/prospeccao.ts:197                                                    |
| 293 | POST     | /api/prospeccao/{id}/interacoes | SIM  | —    | path `id` + body                                | NÃO TESTADO | src/api-lib/prospeccao.ts:206                                                    |
| 294 | GET      | /api/prospeccao/{id}            | SIM  | —    | path `id` (injetado em query: api/index.ts:522) | NÃO TESTADO | src/api-lib/prospeccao.ts:106                                                    |
| 295 | PATCH    | /api/prospeccao/{id}            | SIM  | —    | path `id`                                       | NÃO TESTADO | src/api-lib/prospeccao.ts:116                                                    |
| 296 | PUT      | /api/prospeccao/{id}            | SIM  | —    | path `id`                                       | NÃO TESTADO | src/api-lib/prospeccao.ts:116                                                    |
| 297 | DELETE   | /api/prospeccao/{id}            | SIM  | —    | path `id`                                       | NÃO TESTADO | src/api-lib/prospeccao.ts:172                                                    |
| 298 | GET      | /api/prospeccao                 | SIM  | —    | — (filtros/f paginação em query)                | NÃO TESTADO | src/api-lib/prospeccao.ts:11                                                     |
| 299 | POST     | /api/prospeccao                 | SIM  | —    | body                                            | NÃO TESTADO | src/api-lib/prospeccao.ts:56                                                     |

## 47. Infraestrutura (rotas inline em api/index.ts)

| #   | Método | Caminho               | Auth                                                  | Gate           | Recebe ID                   | Status      | Evidência                                                          |
| --- | ------ | --------------------- | ----------------------------------------------------- | -------------- | --------------------------- | ----------- | ------------------------------------------------------------------ |
| 300 | POST   | /api/init-db          | NÃO (exige header `x-init-key`)                       | —              | —                           | NÃO TESTADO | api/index.ts:532-539                                               |
| 301 | POST   | /api/webhooks/asaas   | NÃO                                                   | —              | body (`event`)              | NÃO TESTADO | api/webhooks/asaas-webhook.ts:4 (dispatch: api/index.ts:542)       |
| 302 | GET    | /api/resolve-dominio  | NÃO                                                   | —              | query `host`                | NÃO TESTADO | api/index.ts:547                                                   |
| 303 | POST   | /api/dominio          | SIM+admin                                             | —              | body (`tenantId`,`dominio`) | NÃO TESTADO | api/index.ts:557 (guarda: api/index.ts:559-564)                    |
| 304 | GET    | /api/features/check   | SIM                                                   | — (self-check) | query `feature`             | NÃO TESTADO | api/index.ts:575                                                   |
| 305 | GET    | /api/ping             | NÃO                                                   | —              | —                           | NÃO TESTADO | api/index.ts:586                                                   |
| 306 | POST   | /api/services/ai-chat | n/d (rota de filesystem Vercel, sem `export default`) | —              | body                        | NÃO TESTADO | api/services/ai-chat.ts:569 (funções exportadas: :269, :539, :569) |

---

## TOTAL

**TOTAL DE ENDPOINTS (DENOMINADOR) = 306**

- Denominador fixo: **306**. A partir desta etapa ele não muda mais (linhas só mudam de status, não são adicionadas/removidas).
- Status nesta etapa: 306 × `NÃO TESTADO`.
- Bancos acessados: nenhum. Dados criados com prefixo `AUDIT_`: nenhum. Dados removidos: nenhum.

## Distribuição por método

| Método                                  | Qtd |
| --------------------------------------- | --- |
| GET                                     | 84  |
| POST                                    | 87  |
| PATCH                                   | 37  |
| PUT                                     | 46  |
| DELETE                                  | 32  |
| QUALQUER (handler sem guarda de método) | 20  |

(306 = 84 + 87 + 37 + 46 + 32 + 20)

## Achados de análise estática (não alteram o denominador)

| ID  | Status           | Achado                                                                                                                                                                                                                                                                                                                                    | Evidência                                                                                                                                                        |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | ANÁLISE ESTÁTICA | `/api/billings` é roteada para `handleFinanceiro`, mas `resource='billings'` não existe no dispatcher → sempre 404 "Recurso financeiro não encontrado". Nenhum uso no frontend.                                                                                                                                                           | api/index.ts:492; src/api-lib/financeiro.ts:137-177                                                                                                              |
| A2  | SUSPEITA         | `GET /api/rh/adiantamentos` lê a variável `status` que nunca é declarada (só `competencia`) → `ReferenceError` em runtime → 500 pelo catch. Não reproduzido.                                                                                                                                                                              | src/api-lib/rh.ts:443 e :451 (declarada? não); catch em rh.ts:1167                                                                                               |
| A3  | SUSPEITA         | Rotas com fluxo público pretendido estão fora da lista `isPublicRoute` do middleware global de tenant, que está ligado por default → devem responder 401 sem `Authorization`: `/api/aprovacao?token=`, `/api/aprovacao/aprovar`, `/api/aprovacao/recusar`, `/api/whatsapp/webhook`, `/api/contratos/webhook-assinatura`. Não reproduzido. | api/index.ts:149-169; src/api-lib/aprovacao.ts:7,15; src/api-lib/whatsapp.ts:214; src/api-lib/contrato-digital.ts:281                                            |
| A4  | ANÁLISE ESTÁTICA | O feature gate aplica limite de usuários a `POST /api/users`, mas `handleUsers` não implementa POST (405) → regra morta.                                                                                                                                                                                                                  | src/api-lib/feature-gate-middleware.ts:102; src/api-lib/auth.ts:267                                                                                              |
| A5  | ANÁLISE ESTÁTICA | O gate `export-xml` mapeia `/api/orcamentos/export-xml` e `/api/export-xml`, que não existem no roteador (o fallback `/api/orcamentos/**` devolve 410) → gate sem rota viva.                                                                                                                                                              | src/api-lib/feature-gate-middleware.ts:81-85; api/index.ts:265-276                                                                                               |
| A6  | ANÁLISE ESTÁTICA | Código inalcançável: `financeiro.ts:608` e `:807` (`DELETE && id` após um `DELETE` que já retornou) e o segundo `if (type === 'capital_giro')` em `financeiro.ts:1395` (o ramo de 1350 já retornou). Não geram linhas na matriz.                                                                                                          | src/api-lib/financeiro.ts:608, :807, :1395                                                                                                                       |
| A7  | ANÁLISE ESTÁTICA | `/api/orcamentos/export-pdf` responde 501 (legado), sem guarda de método.                                                                                                                                                                                                                                                                 | api/orcamentos/exportar-pdf.ts:4                                                                                                                                 |
| A8  | SUSPEITA         | `api/services/ai-chat.ts` está sob `api/` (função Vercel pelo padrão `functions: api/**/*.ts`) mas não tem `export default` → comportamento HTTP da rota `/api/services/ai-chat` é incerto/inválido. Não reproduzido.                                                                                                                     | api/services/ai-chat.ts:269, :539, :569; vercel.json (`functions`)                                                                                               |
| A9  | ANÁLISE ESTÁTICA | Handlers sem guarda de método (aceitam qualquer verbo): `financeiro` relatorios/test, `rh` dashboard, `compras` sugestao/historico_precos, `reports`, `chapas`, `engenharia/skus`, `prospeccao/metrics`, `export-pdf`. Registrados como `QUALQUER` na matriz.                                                                             | src/api-lib/financeiro.ts:1022,1680; rh.ts:1060; compras.ts:279,288; projects.ts:278; planocorte.ts:421,525; prospeccao.ts:235; api/orcamentos/exportar-pdf.ts:4 |
| A10 | ANÁLISE ESTÁTICA | Prefixos roteados sem nenhuma ocorrência no frontend (`src/`): `/api/forn`, `/api/condicoes-pagamento`, `/api/orcamentos-pro`, `/api/billings`. Mantidos na matriz por serem URLs alcançáveis.                                                                                                                                            | api/index.ts:504,387,257,492                                                                                                                                     |
| A11 | ANÁLISE ESTÁTICA | `GET /api/rh/colaboradores/{id}` não tem ramo de detalhe (exige `!id`) → cai no 405 do recurso. Não gerou linha.                                                                                                                                                                                                                          | src/api-lib/rh.ts:251 e :357                                                                                                                                     |
