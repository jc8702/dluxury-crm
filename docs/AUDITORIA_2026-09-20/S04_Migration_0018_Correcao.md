# S04 — Correção T2: DDL manual → migration versionada (`drizzle/0018`)

**Data:** 2026-09-23
**Branch:** `fix/S-04` (a partir de `main`) · **Commit:** `07f2e46` `fix(S-04): versiona DDL manual de materiais/pedidos_compra em drizzle/0018`
**Host do banco (antes de tudo):** `ep-holy-term-acnj7373-pooler.sa-east-1.aws.neon.tech` (branch `audit-2026-09` apenas; produção intocada)
**Achado:** T2 de `docs/AUDITORIA_2026-09-20/SEPARACAO_BRANCH_AUDIT.md` (§T2) + `DDL_Comparacao.md` — DDL executado à mão no branch não estava versionado em `drizzle/` (diff `main..audit` com 0 arquivos SQL).

---

## Problema

DDL criado diretamente no branch de auditoria, fora do versionamento:

| Objeto                                                                       | Fonte manual                                                | Status                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `CREATE TABLE materiais`, `pedidos_compra`, `pedido_compra_itens`            | `scripts/audit/fix-missing-tables.mjs` (só no branch audit) | não versionado                                       |
| `chamados_garantia`: drop unique global + `UNIQUE INDEX (tenant_id, numero)` | script + `_init.ts`                                         | não versionado; ORM ainda declarava `unique(numero)` |
| `notificacoes`: `ADD tenant_id`, `ADD updated_at`                            | `_init.ts` (branch audit)                                   | não versionado; ORM sem `updatedAt`                  |

## Decisões (aprovadas na sessão)

1. **ID = S-04** (sequência S-01/S-02/S-03).
2. **Referência T2** = `docs/AUDITORIA_2026-09-20/` (`LOG.md` não existe no repo/histórico).
3. **`pedidos_compra.fornecedor_id INTEGER`** — mesmo tipo de `fornecedores.id`: banco audit = `integer` (SERIAL), `_init.ts` = `SERIAL`, `src/db/schema/estoque-granular.ts` = `serial`, `compras.ts` usa `Number()`. Apenas `drizzle/schema.ts:217` diz `uuid` (achado separado T6, não alterado).
4. Produção autorizada para 0018 **apenas** via merge futuro na main (não ocorreu nesta sessão).

## O que foi feito

| Arquivo                                                       | Mudança                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drizzle/0018_materiais_pedidos_compra.sql` (novo)            | `CREATE TABLE IF NOT EXISTS` das 3 tabelas (fiel ao DDL manual; `fornecedor_id INTEGER`); guarda `to_regclass` para drop do unique global + `chamados_garantia_tenant_numero (tenant_id, numero)`; `ALTER notificacoes ADD IF NOT EXISTS tenant_id/updated_at`. Idempotente. |
| `drizzle/meta/_journal.json`                                  | entrada `idx 11`, tag `0018_materiais_pedidos_compra`                                                                                                                                                                                                                        |
| `drizzle/schema.ts`                                           | `notificacoes.updatedAt` adicionado; `unique('chamados_garantia_numero_key').on(numero)` → `uniqueIndex('chamados_garantia_tenant_numero').on(tenantId, numero)`                                                                                                             |
| `src/api-lib/__tests__/drizzle-0018-migration.test.ts` (novo) | 7 asserções de regressão (arquivo, tipos, índice, colunas, ORM, journal)                                                                                                                                                                                                     |

Caminho `src/api-lib/db/schema` **não existe** — as definições correspondentes estão em `drizzle/schema.ts`.

## Testes (antes → depois)

- **ANTES:** `drizzle-0018-migration.test.ts` → **7/7 FALHARAM** (0018 inexistente; ORM com unique global e sem `updated_at`; journal sem tag).
- **DEPOIS:** **7/7 PASSARAM**.
- `compras.test.ts` (inalterado): 13 pass \| 1 skip pré-existente — antes e depois.
- Suíte completa: **56 arquivos / 724 testes passam, 0 falhas**; `npx tsc --noEmit` = 0 erros.
- Nenhum teste existente alterado.

## Execução da migration (só branch de auditoria)

1. Host verificado antes: `ep-holy-term-acnj7373-pooler.sa-east-1.aws.neon.tech` (guard aborta em outro host).
2. Snapshot `information_schema.columns` + `pg_indexes` + `pg_constraints` (public) antes → `npx drizzle-kit migrate` → snapshot depois.
3. **Resultado: 1636 linhas idênticas — 0 diferenças de schema.** `drizzle.__drizzle_migrations`: 11 → 12.
4. Produção: workflow `deploy-neon-migrations` **não** disparou (sem push na main).

## Item 4 — cast `::text` em `compras.ts`

O cast existe **somente em `origin/audit-2026-09`**. A base `main` não tem cast e o tipo é consistente (`integer`) → **nada a remover; `compras.ts` inalterado**.

## Riscos / pendências registrados

- **T6 (fora do escopo):** `drizzle/schema.ts` mantém `fornecedores.id`/`pedidosCompra.fornecedorId` como `uuid` vs `INTEGER` no SQL/banco — drift conhecido.
- **Pré-existente:** `pedidos_compra`/`pedido_compra_itens` no banco audit são a versão mínima manual (7/5 colunas); `compras.ts` insere colunas inexistentes (`valor_total`, `quantidade_pedida`, …) — CRUD real contra esse banco falharia antes e depois (testes usam mock). Achado separado.
- **Concorrência:** sessão S-05 trabalhando no mesmo working tree (`0019_add_users_token_version.sql`, `auth-token-version.test.ts`, `api/index.ts`, `aprovacao.ts`, `auth.ts`, `tenantMiddleware.ts`, `tenant.ts`) — não tocados; commit S-04 contém somente os 4 arquivos listados.
- `unique` → `uniqueIndex`: impede `drizzle-kit generate` de reintroduzir o unique global.

---

**Status:** correção commitada em `fix/S-04` (`07f2e46`), sem push/merge. Pasta `docs/AUDITORIA_2026-09-20/` segue untracked (convenção da sessão S-03).
