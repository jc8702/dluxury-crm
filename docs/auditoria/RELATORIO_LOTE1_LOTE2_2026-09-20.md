# Auditoria Lote 1 + Lote 2 — branch audit-2026-09 host ep-holy-term

**Data:** 2026-09-20 **Branch:** audit-2026-09 **Host:** ep-holy-term-acnj7373-pooler (Neon) — sem PII impressa, apenas COUNT/id truncado. Sem alteração de código-fonte em Lote 1; Lote 2 schema corrigido apenas via SQL (CREATE TABLE materiais/pedidos_compra, UNIQUE per tenant em chamados_garantia) para desbloquear HTTP real. `mascaramento-pii.mjs` não executado.

## Matriz 66 endpoints (38 telas + ~28 APIs api/index.ts)

| Endpoint/Tela                         | Status           | Evidência arquivo:linha                                                                                      |
| ------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| POST /api/webhooks/asaas              | ANÁLISE ESTÁTICA | asaas-webhook.ts:10 fail-open s/ ASAAS_WEBHOOK_TOKEN (vercel env ls sem var); subscriptions sem idempotência |
| GET /api/resolve-dominio              | ANÁLISE ESTÁTICA | api/index.ts:547 enumeração                                                                                  |
| POST /api/init-db                     | ANÁLISE ESTÁTICA | api/index.ts:532 x-init-key                                                                                  |
| GET /api/clients IDOR                 | PASSOU           | HTTP PATCH B 404 crm.ts:53,79                                                                                |
| GET /api/forn IDOR                    | PASSOU           | HTTP DB FORN_A intacto (200 ressalva) estoque.ts:50                                                          |
| GET /api/projects IDOR                | PASSOU           | HTTP 404                                                                                                     |
| GET /api/prospeccao IDOR              | PASSOU           | HTTP 404                                                                                                     |
| GET /api/financeiro/classes IDOR      | PASSOU           | HTTP DB CLASSE_A intacto financeiro.ts:208                                                                   |
| GET /api/plano-corte IDOR             | PASSOU           | HTTP 404 planocorte.ts:54                                                                                    |
| GET /api/quotations IDOR              | NÃO TESTADO      | 500 payload                                                                                                  |
| GET /api/financeiro FG basic          | PASSOU           | HTTP 403 feature-gate-middleware.ts:72                                                                       |
| GET /api/rh FG basic                  | PASSOU           | HTTP 403 rh.ts:85                                                                                            |
| GET /api/plano-corte FG basic         | PASSOU           | HTTP 403                                                                                                     |
| GET /api/simulations FG basic         | PASSOU           | HTTP 403                                                                                                     |
| POST /api/ai/chat FG basic            | PASSOU           | HTTP 403                                                                                                     |
| GET /api/whatsapp FG basic            | PASSOU           | HTTP 403                                                                                                     |
| GET /api/estoque FG basic             | FALHOU           | HTTP 500 vs 403 (500 após CREATE TABLE virou 200 vs 403) feature-gate-middleware.ts:60-86 sem estoque        |
| GET /api/forn FG basic                | FALHOU           | HTTP 200 vs 403                                                                                              |
| GET /api/aprovacao?token              | ANÁLISE ESTÁTICA | PII sem auth aprovacao.ts:15 ALTO                                                                            |
| GET /#/scan/:numero                   | NÃO TESTADO      | sem backend                                                                                                  |
| POST /api/retalhos IDOR               | PASSOU           | HTTP PATCH B 200 mas DB null retalhos.ts:120                                                                 |
| POST /api/estoque IDOR                | PASSOU           | HTTP DB MAT_A                                                                                                |
| POST /api/after-sales IDOR            | PASSOU           | HTTP DB AS_A                                                                                                 |
| GET /api/calendario/criar-evento IDOR | PASSOU           | HTTP 404 calendario.ts:318                                                                                   |
| GET /api/compras                      | NÃO TESTADO      | 500 text=integer compras.ts                                                                                  |
| POST /api/clients billing 5d          | PASSOU           | 402 6d /201 2d billing-middleware.ts:80                                                                      |
| CSP GET /api/ping                     | ANÁLISE ESTÁTICA | script-src unsafe-eval api/index.ts:106 BAIXO/MÉDIO                                                          |
| exportar-pdf/html_contrato XSS        | SUSPEITA         | contrato-digital.ts:948 sem DOMPurify                                                                        |

**Legenda:** PASSOU=HTTP prova isolado/bloqueado; FALHOU=HTTP prova falta gate; ANÁLISE=sem HTTP; NÃO TESTADO=schema/payload 500.

## Severidades

- ALTO: /api/aprovacao PII sem login/sem expiração; estoque/fornecedores sem gate
- MÉDIO: fail-open GET billing/feature-gate quando banco falha; RLS 2/86 com bypass
- BAIXO/MÉDIO: CSP unsafe-eval
- SUSPEITA: XSS exportar-pdf até prova

## Próximos passos

Fix feature-gate para estoque/fornecedores, UNIQUE per tenant, text=integer em compras — em audit-2026-09 antes de merge.
