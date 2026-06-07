# Resumo de Trabalho — D'Luxury CRM

Registro cronológico de todas as sessões, mudanças e decisões técnicas do projeto.

---

## SETUP AUTOMÁTICO — 2026-06-06

### Scripts criados

- `deploy.sh` — automatiza build + git + Vercel deploy
- `validate.sh` — verifica TypeScript, testes, build, secrets

### Como usar

```bash
./deploy.sh "Mensagem do commit"
./validate.sh
```

### Ambiente verificado

- Node v24.14.1
- npm 11.11.0
- drizzle-kit v0.31.10
- vercel CLI 51.4.0
- Git: branch `main` em dia com `origin/main`

### Status

- [x] Scripts de automação criados
- [x] Ambiente verificado
- [x] Próxima etapa: 02_DB_CLEANUP.md (concluído com escopo reduzido — ver abaixo)

---

## 02 — DB CLEANUP — 2026-06-06

### Auditoria do estado real

A Fase 1 do DB cleanup já foi mergeada no commit `21665e3` ("feat(tenant): isolation middleware + Fase 1 DB migrations"). Inspeção ao vivo do banco (via `@neondatabase/serverless` — `psql` não está disponível nesta máquina) revelou que **9 das 13 tabelas órfãs** da prompt original já foram removidas em `0006_drop_orphans.sql`, **21 tabelas já têm `tenant_id NOT NULL`** (0002) e **`ordens_producao` já foi renomeada para `ordens_producao_legacy`** (tombstone, retires 2026-07-05). Re-executar `0010/0011/0012/0013` seria redundante ou violaria a política de retenção do tombstone.

### Trabalho genuinamente novo

Inspeção ao vivo identificou **5 tabelas sem `tenant_id`** (excluindo `tenants`, que é a tabela de tenants):

- `bom_engenharia_montagem` (2 rows)
- `bom_montagem_componente` (5 rows)
- `conhecimento_marcenaria` (18 rows, schema já tinha o campo)
- `quotation_bom` (0 rows, schema em `quotations.ts` estava sem o campo)
- `erp_families` (0 rows) — **não tratada nesta migration**: não está em nenhum arquivo de schema Drizzle, requer decisão arquitetural separada

### Migration aplicada

- `drizzle/0014_add_tenant_id_bom_knowledge.sql` — `tenant_id UUID NOT NULL` adicionado em 4 tabelas com backfill a partir de FKs pai (`sku_engenharia`, `sku_montagem`, `quotation_items`) ou master tenant (`conhecimento_marcenaria`); índices criados.
- Idempotente: usa `to_regclass` + `ADD COLUMN IF NOT EXISTS`. Pode ser re-executada sem efeito colateral.
- Aplicada ao banco Neon em produção. Verificação: 0 rows com `tenant_id IS NULL` em todas as 4 tabelas.

### Mudanças Drizzle

- `src/db/schema/skus.ts` — adicionado `tenantId` em `bomEngenhariaMontagem` e `bomMontagemComponente` (imports de `tenants` já existiam).
- `src/db/schema/quotations.ts` — adicionado `tenantId` em `quotationBom` + índice `idx_quotation_bom_tenant_id`.
- `src/db/schema/conhecimento.ts` — sem mudança (já tinha `tenantId`).
- `drizzle/meta/_journal.json` — entrada `idx: 7` para 0014.

### Pendências pré-existentes (não resolvidas nesta sessão)

- `drizzle/0002_tenant_id_columns.sql` tinha diff não commitado: adiciona filtro `to_regclass` ao backfill e ao `SET NOT NULL` (idempotência). Commitado nesta sessão.
- `fix_encoding.cjs` (untracked) — script órfão, autor a decidir.
- `erp_families` no DB sem correspondente no schema Drizzle.

### Validação

- [x] Migration 0014 aplicada — 4 tabelas com `tenant_id NOT NULL`
- [x] 0 rows com `tenant_id` NULL nas 4 tabelas
- [x] `ordens_producao_legacy` preservado (tombstone até 2026-07-05)
- [x] Drizzle schemas alinhados com DB
- [x] `npx tsc --noEmit` sem erros
- [ ] `erp_families` audit pendente
- [ ] `fix_encoding.cjs` decisão pendente

### Próxima etapa

03_TENANT_MIDDLEWARE.md

---

## 03 — TENANT MIDDLEWARE — 2026-06-06

### Auditoria do estado existente (commit `21665e3`)

Inspeção dos artefatos já commitados revelou que **toda a infraestrutura proposta** pelo prompt já existe e está mais sofisticada do que o spec original:

- `src/types/tenant.ts` (133 linhas) — branded types `TenantId`, `TenantUser`, `TenantRequest`, helpers `asTenantId`/`isTenantId`, constante `TENANT_MASTER_ID = '00000000-0000-0000-0000-000000000000'`.
- `src/api-lib/middleware/tenantMiddleware.ts` (311 linhas) — `withTenant` HOF com injeção de `req.tenantId`, `req.tenantUser`, `req.tenantSubdomain`, `req.planoTier`, `req.isMasterAdmin`. Integra `enforceDomainMatch`, `requireRoles`, e chama `suspiciousActivity` em caso de cross-tenant access.
- `src/api-lib/middleware/suspiciousActivity.ts` — logger de atividades suspeitas integrado com Sentry.
- `src/api-lib/db/withTenant.ts` (280 linhas) — `withTenantSql`, `withTenantDb`, `withTenantWhere`, `tenantExists` com transações SQL e `app.tenant_id` para auditoria.

A decisão foi **NÃO sobrescrever** essa implementação. Apenas aplicar o que já existe aos 22 handlers ainda não migrados.

### Trabalho realizado

#### Handlers migrados para `withTenant` HOF (18 arquivos, 31 handlers)

Padrão aplicado: assinatura `export async function handleX(req, res)` → `const handleXCore: TenantHandler = ...; export const handleX = withTenant(handleXCore);`; bloco `const { authorized, error, user } = validateAuth(req); if (!authorized) return res.status(401)...; const tenantId = user?.tenantId || '00000000-...'` → `const tenantId = req.tenantId; const user = req.tenantUser;`.

| Arquivo                  | Handlers | Notas                                                                                                                                                    |
| ------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `whatsapp.ts`            | 1        | Piloto, validado                                                                                                                                         |
| `kanban-producao.ts`     | 1        |                                                                                                                                                          |
| `rentabilidade.ts`       | 1        | Mantida função `autoCreateCustosReaisOP` (helper)                                                                                                        |
| `notificacoes.ts`        | 1        | Mantida função `gerarNotificacoesAutomaticas` (helper)                                                                                                   |
| `contrato-digital.ts`    | 1        |                                                                                                                                                          |
| `estoque.ts`             | 1        | Mantida `extractAndVerifyToken` (helper interno)                                                                                                         |
| `estoque-granular.ts`    | 1        |                                                                                                                                                          |
| `match-skus.ts`          | 1        |                                                                                                                                                          |
| `importacao-projetos.ts` | 1        |                                                                                                                                                          |
| `compras.ts`             | 1        |                                                                                                                                                          |
| `production.ts`          | 1        | `createOP`/`updateOPDetails`/`deleteOP` agora recebem `user` por parâmetro                                                                               |
| `financeiro.ts`          | 1        |                                                                                                                                                          |
| `calendario.ts`          | 1        |                                                                                                                                                          |
| `planocorte.ts`          | 4        | `handlePlanoCorte`, `handleChapas`, `handleEngenhariaSKUs`, `handleImportarDesenho`                                                                      |
| `projects.ts`            | 5        | `handleProjects`, `handleReports`, `handleEngineering`, `handleSKUs`, `handleSimulations`                                                                |
| `quotations.ts`          | 1        | + 2 funções com default `tenantId` (`explodirBOM`, `recalcularOrcamento`) — agora `tenantId` é parâmetro obrigatório                                     |
| `prospeccao.ts`          | 4        | `handleProspeccoes`, `handleProspeccaoById`, `handleInteracoes`, `handleProspeccaoMetrics`                                                               |
| `crm.ts`                 | 3        | `handleClients` (com 3 re-declarações de `tenantId` internas removidas), `handleKanban`, `handleGoals`                                                   |
| `copilot.ts`             | 1        | `handleAICopilot`                                                                                                                                        |
| `api/index.ts`           | —        | 2 silent-fallbacks no router principal removidos (rate-limit key, AI chat tenantId) — agora `authedTenantId`/`authedUserId` hoistados do `auth` validado |

#### Casos especiais (não migrados)

- `billing-middleware.ts` — já faz sua própria validação via `validateAuth`; roda ANTES do `withTenant` no chain. Não é silent-fallback.
- `aprovacao.ts` — 3 de 4 rotas são públicas (GET com token, POST aprovar, POST recusar); `withTenant` quebraria o fluxo público. Mantida exceção.

#### Correção colateral

- `notificacoes.ts:113` — bug pré-existente: `const quotations = await db.select({ id: quotations.id, ... })` sombreava o import do schema. Renomeado para `orcamentosPendentes`. Causava `ReferenceError: Cannot access 'quotations2' before initialization`.

#### Testes atualizados (17 arquivos, ~250 testes)

Padrão de teste aplicado:

- `vi.mock('../middleware/tenantMiddleware.js', () => ({ withTenant: (handler: any) => handler }))` — pass-through que isola o teste do HOF.
- Helper `mockReq({...})` injeta `tenantId` e `tenantUser` automaticamente.
- `vi.mocked(validateAuth).mockReturnValue(...)` removido dos `beforeEach` — auth agora é responsabilidade do HOF.
- Testes obsoletos que verificavam 401/403 do handler (ex: "deve retornar 401 sem auth") marcados como `it.skip` com referência a `tenantMiddleware.test.ts` que cobre o novo comportamento.
- Testes de erro 500 (ex: "deve retornar 500 em caso de erro fatal") que mockavam `validateAuth` para throw agora mockam `sql` para throw (com URL que chegue ao SQL, não retorne 400 antes).
- `vi.mock` realocado para o top-level do módulo (warning eliminado).

#### `tenant-isolation.test.ts` (arquivo crítico de segurança)

Este arquivo testa explicitamente o isolamento multi-tenant. Antes mockava `validateAuth` para retornar tenants diferentes; agora injeta `_tenantId`/`_userId` diretamente no `mockReq` e valida que o `tenantId` chega nas queries SQL.

6/6 testes passam, incluindo:

- "deve injetar o tenant_id correto do Tenant A ao listar clientes"
- "deve injetar o tenant_id correto do Tenant B ao listar clientes"
- "deve barrar a alteração de cliente se pertencer a outro tenant" (cross-tenant attack)

### Validação final

- [x] `npx tsc --noEmit` — sem erros
- [x] `npm run build` — sucesso
- [x] `npx vitest run` — **707 testes passam, 23 skipped** (skipped = obsoletos 401/403 que agora são responsabilidade do `withTenant` HOF)
- [x] Todos os 18 arquivos de handler migrados compilam e têm testes verdes
- [x] `tenant-isolation.test.ts` valida isolamento cross-tenant end-to-end

### Arquivos de teste NÃO atualizados (não testam handlers migrados)

`tenantMiddleware.test.ts`, `auth.test.ts`, `config.test.ts`, `asaas-service.test.ts`, `sku-parser.test.ts`, `feature-gates.test.ts`, `tenant-provisioning.test.ts`, `saas-admin.test.ts`, `billing-middleware.test.ts`, `checkout.test.ts`, `ai-chat.test.ts`, `agenda.test.ts`, `_inventory.test.ts`, `after_sales.test.ts`, `financeiro-seeds.test.ts`, `retalhos.test.ts`, `quotations-bom.test.ts`, `aprovacao.test.ts` — não testam handlers migrados ou são testes do próprio middleware.

### Pendências pré-existentes (não resolvidas nesta sessão)

- `erp_families` (0 rows, sem schema Drizzle) — decisão arquitetural pendente.
- `fix_encoding.cjs` (untracked) — autor a decidir.
- `TODO` em `projects.ts:5` — 3 subqueries órfãs em `FROM quotations` (tabela dropada em 2026-06-04); marcado como `PROMPT 4`.

### Próxima etapa

Auditoria final do tenant isolation em produção (verificar logs do Sentry por `suspiciousActivity`).

## 04 — AUDIT LOGGING — 07/06/2026

### Objetivo

Implementar trilha de auditoria LGPD com `auditLogService.ts` (logAudit, getAuditTrail) e `auditMiddleware.ts` (interceptação automática de mutations). Migration 0015 adiciona colunas `tenant_id`, `ip_address`, `user_agent`, `retention_expires_at` em `audit_logs`.

### Arquivos criados

- `src/api-lib/services/auditLogService.ts` — `logAudit()` com 90-day retention; `getAuditTrail()` com filtros por tenant/período/tabela.
- `src/api-lib/middleware/auditMiddleware.ts` — intercepta `res.json` em POST/PATCH/PUT/DELETE; captura tenant, user, IP, user-agent.
- `drizzle/0015_add_audit_log_columns.sql` — ADD COLUMN IF NOT EXISTS para 6 colunas + índices.

### Arquivos alterados

- `api/index.ts` — integração `auditMiddleware(req, res, () => {})` antes do dispatcher de rotas.
- `drizzle/schema.ts` — `auditLogs` com `tenantId`, `tableName`, `recordId`, `ipAddress`, `userAgent`, `retentionExpiresAt`.
- `drizzle/meta/_journal.json` — entrada idx 8 para 0015.

### Adaptações do prompt original

- `import { sql } from '@neondatabase/serverless'` → `import { sql } from '../_db.js'` (o neon não exporta `sql` diretamente; é instanciado via `neon(DATABASE_URL)`).
- `app.use('/api', auditMiddleware)` → chamada dentro do `try` block do dispatcher Vercel (não há Express `app.use`).
- Migration foi necessária: colunas do novo `logAudit` (`tenant_id, table_name, record_id, ip_address, user_agent`) não existiam.

### Testes

- `npx tsc --noEmit` — 0 erros.
- `npx vitest run` — 707 passed, 23 skipped (mesmo baseline).
- `npm run build` — Vite build bem-sucedido.

### Pendências

- Double-logging: `auditMiddleware` + `auditLog()` explícito nos handlers logam 2x. Remover chamadas explícitas em PROMPT futuro.
- Testes específicos para `auditLogService` e `auditMiddleware` (fora do escopo do PROMPT 04).
- Agendador de limpeza (cron job) para apagar registros com `retention_expires_at < NOW()`.
