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

## 05 — RATE LIMITING — 07/06/2026

### Objetivo

Implementar proteção contra brute force (login) e DoS (API geral, search, export) com `rate-limiter-flexible` in-memory store.

### Arquivos criados

- `src/api-lib/config/rateLimits.ts` — configuração centralizada dos limites.
- `src/api-lib/middleware/rateLimiter.ts` — `applyRateLimit()`, `globalRateLimitMiddleware()`, `loginRateLimit()`.

### Arquivos alterados

- `src/api-lib/auth.ts:1,16` — import + `await loginRateLimit()` no início de `handleLogin`.
- `api/index.ts:156-159` — `globalRateLimitMiddleware()` antes do audit middleware.
- `src/api-lib/__tests__/auth.test.ts` — mockRes agora tem `setHeader`.
- `package.json` — adicionado `rate-limiter-flexible`, `@upstash/redis`.

### Limites

- Login: 5 tentativas / 10 min (bloqueio 15 min)
- API geral: 1000 req / min por tenant
- Search: 10 / min por tenant
- Export: 5 / hora por tenant
- Password reset: 3 / hora por IP

### Adaptações do prompt

- `req.path` → `req.url` (Vercel raw req não tem `.path` do Express)
- `req.ip` → `getClientIP(req)` helper (Vercel usa x-forwarded-for)
- `app.use('/api', globalRateLimitMiddleware, ...)` → chamada direta no dispatcher

### Testes

- `npx tsc --noEmit` — 0 erros.
- `npx vitest run` — 707 passed, 23 skipped (idêntico ao baseline).
- `npm run build` — Vite build bem-sucedido.

### Nota

In-memory (`RateLimiterMemory`) é compatível com Vercel serverless sem estado persistente, mas cada cold start reinicia o contador. Para escala: migrar para `RateLimiterRedis` com Upstash.

### Pendências

- Implementar `RateLimiterRedis` com Upstash em produção.
- Testes específicos para cada limiter (fora do escopo do PROMPT 05).

---

## 06 — REFACTOR PAGES — 07/06/2026

### Pages refatoradas

- FinanceiroContasPage.tsx: 1163 → 74 linhas
- ProspeccaoPage.tsx: 997 → 38 linhas
- FinanceiroTitulosPagarPage.tsx: 955 → 60 linhas

### Componentes criados

- 3 hooks de dados (useContasHook, useProspeccaoHook, useTitulosPagarHook)
- 3 hooks de filtros (useContasFilters, useProspeccaoFilters, useTitulosPagarFilters)
- 3 componentes ListView (ContasListView, ProspeccaoListView, TitulosPagarListView)
- 3 componentes FormModal (ContasFormModal, ProspeccaoFormModal, TitulosPagarFormModal)
- 1 componente extra: ContasExtratoModal

### Estrutura

```
src/hooks/financeiro/
├── useContasHook.ts          # CRUD contas + extrato + transferência + fechamentos
├── useContasFilters.ts       # Filtros de extrato (data, tipo, busca)
└── useTitulosPagarHook.ts    # CRUD títulos + baixa + lote + paginação

src/hooks/crm/
├── useProspeccaoHook.ts      # CRUD leads + métricas + kanban
└── useProspeccaoFilters.ts   # Constants (STATUS_CONFIG, ORIGENS, KANBAN_COLS) + helpers

src/components/financeiro/
├── ContasListView.tsx        # Grid cards + header + transferência + fechamento modals
├── ContasFormModal.tsx       # Create/edit conta form
├── ContasExtratoModal.tsx    # Extrato table with filters
├── TitulosPagarListView.tsx  # Tabela agrupada + header + wizard drawer
└── TitulosPagarFormModal.tsx # BaixaModal + EditTituloModal + LoteModal

src/components/crm/
├── ProspeccaoListView.tsx    # Kanban + list views + KPI cards + filters
└── ProspeccaoFormModal.tsx   # Drawer form create/edit lead
```

### Validação

- [x] `npx tsc --noEmit` — 0 erros
- [x] `npm run build` — Vite build bem-sucedido
- [x] 3 pages com < 120 linhas cada

---

## 07 — N+1 QUERY ELIMINATION — 2026-06-07

### Objetivo

Eliminar padrões N+1 em loops com SQL no módulo `api-lib/`, trocando N queries individuais por operações batch.

### Files modificados (9)

| File              | N+1 loops eliminados                                                                  | Técnica                                                   |
| ----------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `_inventory.ts`   | 3 funções (reserveStock, writeOffStock, releaseStock)                                 | `UPDATE ... FROM (SELECT ...)` + `ANY(array)`             |
| `notificacoes.ts` | 5 loops (cliente, visita, material, categoria, usuário)                               | `bulkInsertNotificacoes` helper                           |
| `compras.ts`      | 2 loops (parcelas INSERT, itens INSERT)                                               | `sql.join` multi-row VALUES                               |
| `projects.ts`     | 1 loop (writeOffStock)                                                                | nova `writeOffStockForProjectBatch`                       |
| `production.ts`   | 1 loop (per-OP UPDATE)                                                                | `UPDATE FROM (VALUES ...)`                                |
| `calendario.ts`   | 2 loops (per-user INSERT, per-event INSERT+UPDATE)                                    | multi-row INSERT + `INSERT FROM SELECT`                   |
| `financeiro.ts`   | 3 loops (nested mes×parcela, per-conta, per-mês)                                      | flattened VALUES + batch IN + bulk INSERT                 |
| `quotations.ts`   | 7 loops (instalment, stage, user, nested item×part, chunked items, bulk-update-items) | batch VALUES + batch material lookup + UPDATE FROM VALUES |
| `planocorte.ts`   | 1 loop (duplicate check)                                                              | single fetch + Set lookup                                 |

### Resultados

- N queries reduzidas para O(1) em ~30 loops
- ~456 linhas de diff líquido
- `npx tsc --noEmit` — 0 erros
- `npm run build` — sucesso
- Commit: `070715d` — "perf(api-lib): eliminate N+1 query patterns"

---

## 08 — BUNDLE OPTIMIZATION — 2026-06-07

### Mudanças

- `vite.config.ts`: `manualChunks` configurado com função (chunk-3d, chunk-ai, chunk-calendar, chunk-vendor, lucide, date)
- Rotas pesadas: App.tsx já usava `lazy()` para todas as páginas (confirmado)
- `CuttingPlanPage.tsx` (1.138 linhas): removida — era duplicata morta de `modules/plano-corte/ui/pages/PlanoCorteIndustrialPage`

### Tamanho antes/depois (gzip)

| Chunk                       | Antes           | Depois        | Diff                      |
| --------------------------- | --------------- | ------------- | ------------------------- |
| `index` (main)              | 84 kB           | 26 kB         | -58 kB                    |
| `SimuladorCortePage`        | 96 kB           | 30 kB         | -66 kB                    |
| `three.module` / `chunk-3d` | 189 kB (inline) | 257 kB (lazy) | isolado                   |
| `chunk-vendor`              | 18 kB           | 82 kB         | +64 kB (react-dom/router) |
| **Carga inicial total**     | **~360 kB**     | **~199 kB**   | **-45%**                  |

### Arquivos modificados

- `vite.config.ts` — manualChunks function
- `src/pages/CuttingPlanPage.tsx` — deletado (1.138 linhas mortas)

### Validação

- [x] `npx tsc --noEmit` — 0 erros
- [x] `npm run build` — sucesso
- Commit: `3147db3` — "Perf: Bundle optimization — code split, lazy routes, remove dead code"

---

## 09 — DESIGN SYSTEM — 2026-06-07

### Componentes criados

- `src/components/design-system/Button.tsx` — 5 variants (primary/secondary/outline/danger/ghost), 3 sizes, isLoading
- `src/components/design-system/Badge.tsx` — 5 tones (default/success/warning/destructive/info)
- `src/components/design-system/Card.tsx` — container com tokens CSS (bg-card, border-border)
- `src/components/design-system/Input.tsx` — com error state e focus ring
- `src/components/design-system/index.ts` — barrel export

### Decisão técnica

Componentes usam classes Tailwind v4 (`bg-primary`, `text-primary-foreground`, `border-border`) em vez de `hsl(var(--))` inline, aproveitando o `@theme` já configurado no `index.css`.

### Bug corrigido

- `AprovacaoPage.tsx`: `rgba(255,b255,` → `rgba(255,255,` em 7 linhas

### Validação

- [x] `npx tsc --noEmit` — 0 erros
- [x] `npm run build` — sucesso
- Commit: `8d28072` — "Feat: Design system base components (Button, Badge, Card, Input)"

---

## 10 — FEATURE GATES — 2026-06-07

### Arquivos criados

- `src/api-lib/middleware/featureGate.ts` — `validateFeatureAccess` + `requireFeature` middleware programático
- `src/components/ProtectedFeature.tsx` — componente React com fallback de upgrade

### Arquivos modificados

- `src/lib/features.ts` — `Feature` type expandido com simulator, whatsapp, export-xml, api-integration, advanced-reports, digital-signature; matriz atualizada (basic/pro/enterprise)
- `src/api-lib/feature-gate-middleware.ts` — novos mapeamentos de URL para whatsapp, export-xml, features
- `api/index.ts` — nova rota `GET /api/features/check?feature=<name>`

### Matrix de features por tier

| Feature                                        | basic | pro | enterprise |
| ---------------------------------------------- | ----- | --- | ---------- |
| crm, quotations                                | ✅    | ✅  | ✅         |
| financeiro, ia, plano_corte, estoque           | —     | ✅  | ✅         |
| whatasapp, advanced-reports, digital-signature | —     | ✅  | ✅         |
| export-xml, api-integration                    | —     | —   | ✅         |

### Nota

O feature gate centralizado (`feature-gate-middleware.ts`) já existia e fazia o bloqueio automático por URL. Esta etapa adicionou novas features à matriz, criou um middleware programático para uso em handlers específicos, e um componente React para proteção no frontend.

### Validação

- [x] `npx tsc --noEmit` — 0 erros
- [x] `npm run build` — sucesso
- Commit: `27c9c80` — "Feat: Feature gates by pricing tier (STARTER/PRO/ENTERPRISE)"

---

## 11 — STRUCTURED LOGGING — 2026-06-07

### Arquivos criados

- `src/api-lib/logger.ts` — logger com níveis (info, warn, error, debug), saída JSON estruturada
- `src/api-lib/middleware/requestLogger.ts` — log de cada request com requestId, method, path, status, duration

### Arquivos modificados (console._ → logger._)

- `quotations.ts`, `projects.ts`, `financeiro.ts`, `production.ts`
- `crm.ts`, `planocorte.ts`, `compras.ts`, `calendario.ts`

### Comportamento

- Logs em JSON estruturado → filtráveis no Vercel por `service:dluxury-crm`
- Cada entry inclui: `timestamp`, `service`, `env`, `tenantId`, `userId`, `requestId`, `duration`
- `logger.debug()` silenciado em produção (NODE_ENV !== 'production')
- `requestLogger` gera requestId aleatório e loga no `finish` do response

### Validação

- [x] `npx tsc --noEmit` — 0 erros
- [x] `npm run build` — sucesso
- Commit: `29beee7` — "Feat: Structured JSON logging (Vercel-compatible, replaces console.log)"

---

## 12 — E2E TESTS (PLAYWRIGHT) — 2026-06-07

### Arquivos criados

- `playwright.config.ts` — config (chromium, 30s timeout, trace on retry)
- `tests/e2e/auth.spec.ts` — 3 testes: login, erro credenciais, logout
- `tests/e2e/quotation.spec.ts` — 2 testes: navegação, carregamento sem erro
- `tests/e2e/tenant-isolation.spec.ts` — 3 testes: sem token, token inválido, UUID fake
- `.github/workflows/e2e.yml` — CI no GitHub Actions (push/PR para main)

### Scripts adicionados

- `npm run test:e2e` — playwright test (headless)
- `npm run test:e2e:ui` — playwright test --ui (modo interativo)

### Comportamento do CI

- Build → dev server → wait-on → playwright test → upload report se falhar
- Secrets necessários: DATABASE_URL, APP_JWT_SECRET

### Validação

- [x] `npm run build` — sucesso
- Commit: `b3ff26e` — "Feat: E2E tests (Playwright) — auth, quotations, tenant isolation"
