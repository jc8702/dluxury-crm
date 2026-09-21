# T5 — Reteste das Correções (auditoria por execução)

**Data:** 2026-09-20
**Branch:** `audit-2026-09`
**Método:** HTTP direto (Node.js) + Playwright headless + `npx playwright test`

---

## Tarefa 1: Gates Basic (AUDIT\_) — esperado 403

| #   | Endpoint                | Método | Esperado | Obtido | Status |
| --- | ----------------------- | ------ | -------- | ------ | ------ |
| 1   | /api/estoque            | GET    | 403      | 403    | PASSOU |
| 2   | /api/estoque            | POST   | 403      | 403    | PASSOU |
| 3   | /api/forn               | GET    | 403      | 403    | PASSOU |
| 4   | /api/compras            | POST   | 403      | 403    | PASSOU |
| 5   | /api/financeiro/classes | GET    | 403      | 403    | PASSOU |
| 6   | /api/financeiro/classes | POST   | 403      | 403    | PASSOU |
| 7   | /api/rh/colaboradores   | GET    | 403      | 403    | PASSOU |
| 8   | /api/rh/colaboradores   | POST   | 403      | 403    | PASSOU |
| 9   | /api/plano-corte        | GET    | 403      | 403    | PASSOU |
| 10  | /api/plano-corte        | POST   | 403      | 403    | PASSOU |
| 11  | /api/simulations        | GET    | 403      | 403    | PASSOU |
| 12  | /api/ai-copilot         | POST   | 403      | 403    | PASSOU |

**Resultado:** 12/12 PASSOU — gates bloqueiam corretamente para plano basic.

---

## Tarefa 2: Gates Enterprise — esperado 200/2xx

| #   | Endpoint                | Método | Esperado | Obtido | Status | Obs                        |
| --- | ----------------------- | ------ | -------- | ------ | ------ | -------------------------- |
| 1   | /api/estoque            | GET    | 2xx      | 200    | PASSOU |                            |
| 2   | /api/estoque            | POST   | 2xx      | 201    | PASSOU |                            |
| 3   | /api/forn               | GET    | 2xx      | 200    | PASSOU |                            |
| 4   | /api/compras            | POST   | 2xx      | 405    | OK     | Endpoint aceita apenas GET |
| 5   | /api/financeiro/classes | GET    | 2xx      | 200    | PASSOU |                            |
| 6   | /api/financeiro/classes | POST   | 2xx      | 500    | FALHOU | Body vazio causa 500       |
| 7   | /api/rh/colaboradores   | GET    | 2xx      | 200    | PASSOU |                            |
| 8   | /api/rh/colaboradores   | POST   | 2xx      | 400    | OK     | Body vazio causa 400       |
| 9   | /api/plano-corte        | GET    | 2xx      | 200    | PASSOU |                            |
| 10  | /api/plano-corte        | POST   | 2xx      | 400    | OK     | Body vazio causa 400       |
| 11  | /api/simulations        | GET    | 2xx      | 200    | PASSOU |                            |
| 12  | /api/ai-copilot         | POST   | 2xx      | 400    | OK     | Body vazio causa 400       |

**Resultado:** 7/12 gates passaram (GETs). POSTs 400/405 sao body/method issues, nao gate.

**ACHADO A5 (MEDIO):** POST /api/financeiro/classes retorna 500 com body vazio — handler nao trata undefined em req.body. Deveria retornar 400.

---

## Tarefa 3: CSP

| #    | Paginas                                                                                              | Obtido      | Status        |
| ---- | ---------------------------------------------------------------------------------------------------- | ----------- | ------------- |
| 1-10 | /, /crm, /quotations, /financeiro, /rh, /estoque, /plano-corte, /simulations, /notificacoes, /config | 0 erros CSP | NAO DETECTADO |

Headless sem auth. Paginas protegidas nao puderam ser testadas.

---

## Tarefa 4: Suite E2E original (sem editar specs)

**Execucao:** `npx playwright test --reporter=list`
**Resultado:** 162 passed, 12 failed

| #   | Spec                  | Teste               | Erro                    | Causa                              |
| --- | --------------------- | ------------------- | ----------------------- | ---------------------------------- |
| 1   | auth.spec.ts:7        | login               | timeout 30s input email | /login nao renderiza form          |
| 2   | auth.spec.ts:17       | credenciais erradas | timeout 30s input email | /login nao renderiza form          |
| 3   | auth.spec.ts:27       | logout              | timeout 30s input email | /login nao renderiza form          |
| 4   | quotation.spec.ts:15  | navegar orcamentos  | timeout 30s beforeEach  | auth hook falha                    |
| 5   | quotation.spec.ts:28  | pagina carrega      | timeout 30s beforeEach  | auth hook falha                    |
| 6   | quotations.spec.ts:21 | margem de lucro     | element not found       | form nao renderiza                 |
| 7   | quotations.spec.ts:26 | taxa financeira     | element not found       | form nao renderiza                 |
| 8   | quotations.spec.ts:31 | validade em dias    | element not found       | form nao renderiza                 |
| 9   | quotations.spec.ts:36 | inputs numero       | element not found       | form nao renderiza                 |
| 10  | quotations.spec.ts:42 | botao acao          | element not found       | form nao renderiza                 |
| 11  | rh.spec.ts:378        | folha detalhe       | test-id not found       | pagina /#/rh/folhas/f1 nao carrega |
| 12  | full-audit-real:97    | SaaS Admin          | consoleErrors: dup key  | React key duplicado tenant aaaa... |

**Achados:**

- 5 falhas de auth (login page quebrada) — afeta auth + quotation specs
- 5 falhas de quotations (form nao renderiza) — sem auth, page mostra vazio
- 1 falha RH (detalhe folha)
- 1 falha SaaS Admin (React key duplicado)
