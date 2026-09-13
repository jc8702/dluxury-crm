# RESUMO DE PROJETO: D'Luxury CRM

## Informações Gerais

- **Status Atual:** Sistema pronto para BETA SaaS privado — Tenant Isolation + DB Fase 1 + Rate Limit + Audit + Bundle + Design System + Feature Gates + E2E + Secrets + RH & Folha Simplificada (Fases 1-6) concluídos e validados em `main` (`d80518e`).
- **Objetivo Central:** Garantir isolamento rigoroso de dados por tenant (multi-tenancy), eliminar dívida técnica crítica (DB, UI, módulos, docs) e entregar gestão de RH/Folha com horas de falta automáticas.
- **Última Atualização:** 12/09/2026 - 21:45 — Consolidado a partir de `Resumo de Trabalho.md` (08/06 beta) + `PLANO_RH.md` F1-6

## Histórico de Alterações

- **[12/09/2026 - 21:45]:** Consolidação Pós-Auditoria — fonte da verdade unificada
  - **Docs:** `RESUMO_PROJETO.md` consolidado como única fonte; `Resumo de Trabalho.md` arquivado em `docs/legacy/Resumo_de_Trabalho_2026-06-08.md` (legado, 696 linhas até 17/06).
  - **Segurança P0:** corrigido leak `servicos.ts` (tenant_id), fallbacks `billing-middleware.ts:39`/`auditMiddleware.ts:56`, `auditLog` drift e fail-open `feature-gate`.
  - **RH horas falta automática:** `presencas` adicionado `hora_saida/hora_retorno/horas_falta_minutos` com cálculo automático `hora_retorno - hora_saida`; `calculations.ts` adicionado `calcFaltaHorasMinutos` + `calcValorFaltaHoras` e integração em `calcLiquido`.
  - **Env/CI:** `.env.example` adicionado `APP_INIT_KEY`, `validateEnv.ts` validado, `ci.yml` tornando `lint-and-test` e `tenant-isolation` blocking.
  - **Orcamento alias (opção B):** mantido deprecation `api/index.ts:266` 410 com `Deprecation` header; código interno renomeado mantendo alias `addOrcamento→addQuotation`.

- **[12/09/2026 - 21:15]:** Conclusão do Módulo RH & Folha de Pagamento Simplificada (Fases 1 a 6)
  - **Fase 4 (Engine Folha + HE Prevista vs Real):** Criado `FolhaGrid.tsx` interativo com edição de HE prevista vs real, percentual (50%/100%), bônus de produção e outros descontos. Criado `LucroSociosCard.tsx` com visualização analítica da divisão 50/50 e apuração de lucro líquido. Refatorada `RHFolhaDetalhePage.tsx` com vinculação à API e ações de fechar/reabrir.
  - **Fase 5 (Integração Financeira + Recibo PDF):** Criado componente `ReciboPreview.tsx` com geração/download de PDF via jsPDF + jspdf-autotable, visualização e impressão nativa. Integrado botão Recibo em cada linha da folha.
  - **Fase 6 (Polimento, Segurança e Testes):** Adicionado registro de auditoria (`audit_logs`) em override de itens de folha. Criada suíte completa de testes unitários `rh.calculations.test.ts` (11 testes verdes) validando cálculos de dias/horas, faltas, HE, lucro distribuível e 5º dia útil. Expandido teste E2E `rh.spec.ts`.
  - Arquivos modificados/criados: `src/modules/rh/components/FolhaGrid.tsx`, `src/modules/rh/components/LucroSociosCard.tsx`, `src/modules/rh/components/ReciboPreview.tsx`, `src/pages/RHFolhaDetalhePage.tsx`, `src/pages/RHPage.tsx`, `src/api-lib/rh.ts`, `src/modules/rh/domain/rh.calculations.test.ts`, `tests/e2e/rh.spec.ts`, `PLANO_RH.md`.

- **[08/06/2026]:** Sistema pronto para BETA SaaS privado (consolidado de `Resumo de Trabalho.md`)
  - **16 — Silent-fallback + AuditLogs + N+1:** eliminado `user?.tenantId || '00000000...'` em 5 arquivos (`agenda.ts:15`, `after_sales.ts:7`, `aprovacao.ts:94`, `retalhos.ts:12`), criado `src/db/schema/auditLogs.ts`, N+1 `projects.ts` via CTE `latest_quot`.
  - **17 — E2E CI + FeatureGates + Logger + Bundle:** job `e2e` em `ci.yml`, `requireFeature` em 6 handlers (`projects.ts:simulator`, `whatsapp.ts:whatsapp`, `planocorte.ts:simulator`), `console.*→logger` em 25 arquivos, bundle medido (5813 modules, `chunk-3d` 923kB).

- **[07/06/2026 - 22:58]:** Higienização de Repositório (`chore/repo-hygiene`)
  - Removido lixo versionado da raiz que serviam apenas como scripts one-off de debug, relatórios, backups (.sql, logs, etc.) que não tem uso em runtime.
  - Excluídos arquivos de teste órfãos ou testes isolados não utilizados (`migrate-db.ts`, `migrate-estoque.ts`, `create-user.ts`).
  - `.gitignore` atualizado rigorosamente com padrões correspondentes, evitando que novos arquivos de log ou scripts `debug-*.mjs` e screenshots fiquem versionados.
  - Criado o documento de decisão arquitetural `docs/decisions/migrations-gap.md` para clarificar a causa e intencionalidade do gap entre as migrations `0007` e `0013`, documentando que elas não devem ser renomeadas para proteger o histórico da `drizzle_migrations`.
  - Executado build, lint e test sem efeitos colaterais. Push em `fix/repo-hygiene` (ou `chore/repo-hygiene`).

- **[07/06/2026 - 22:45]:** Implementada semântica transacional real (BEGIN/COMMIT/ROLLBACK) para `sql.begin` no Neon serverless.
  - O utilitário `sql.begin` (`src/api-lib/_db.ts`) foi refatorado para usar o `db.transaction()` nativo do Drizzle via Pool (do `drizzle-db.ts`), garantindo atomicidade real para as operações críticas.
  - Foi desenvolvido um wrapper (`tx`) retrocompatível que repassa "tagged templates" cruas e queries string literais (com ou sem os parâmetros) diretamente para a nova transação do Drizzle, preservando totalmente a assinatura e a forma de consumo dos arquivos como `financeiro.ts`, sem necessidade de refatorar chamadas ao redor do app.
  - A interface global também herdou o stub funcional de `join` do `drizzle-orm` para garantir integridade.
  - Teste forçado de transação interrompida (throw Error() no meio da TX) comprovou que o ROLLBACK ocorre e os dados são expurgados com sucesso.
  - Branch utilizado: `fix/real-transactions`.

- **[07/06/2026 - 22:35]:** Refatoração e estabilização de Auditoria e Logs em serverless.
  - Verificado que `req.tenantId` é setado antes de `auditMiddleware` via `resolveTenantRequest`.
  - Refatorado `logAudit` (`src/api-lib/services/auditLogService.ts`) para tratamento robusto de UUIDs vazios, utilizando fallback explícito para `null` e casts corretos (`::uuid`, `::jsonb`), evitando erros silenciosos de tipo e perdas no catch.
  - Identificado e documentado o comportamento frágil do interceptador de `res.json` na plataforma Vercel em `src/api-lib/middleware/auditMiddleware.ts` sem bloqueio da requisição atual.
  - Constatado que a migração 0015 e a tabela `audit_logs` no banco de dados e schema do Drizzle já contam corretamente com as colunas `data_before` e `data_after`.
  - Branch utilizado: `fix/audit-logging`

- **[07/06/2026 - 19:23]:** Refatoração de Rate Limiting para evitar "double-send" (429 e redundância de headers).
  - Mantido o `checkRateLimit` inline no roteador (`api/index.ts`) que possui retorno antecipado adequado (early-return).
  - Removido o middleware assíncrono sobreposto (`globalRateLimitMiddleware`) do pipeline principal de requisições.
  - Refatorado `loginRateLimit` (`src/api-lib/middleware/rateLimiter.ts`) para retornar booleano, permitindo ao `auth.ts` realizar `await loginRateLimit(...)` e parar a execução caso seja bloqueado.
  - Adicionado guard `if (res.headersSent) return;` no roteador dinâmico.
  - Branch utilizado: `fix/consolidate-rate-limit`

- **[07/06/2026 - 19:17]:** Aplicada a isolação global e estrita de tenant em api/index.ts.
  - O roteador chama `resolveTenantRequest` para injetar `req.tenantId` e `req.tenantUser` antes dos middlewares de rateLimit e audit.
  - Rotas públicas identificadas (`/api/auth`, `/api/signup`, `/api/checkout`, etc.) e tratadas de forma a não forçar a falha sem token.
  - Branch utilizado: `fix/wire-tenant-isolation`

- **[07/06/2026 - 19:00]:** Realizado commit de modificações pendentes no frontend/backend e efetuado deploy unificado.
  - **GitHub**: Mudanças enviadas para a branch main.
  - **Neon**: Migrações executadas com sucesso via script scratch/run-migrations-now.mjs (14/14 tabelas OK).
  - **Vercel**: Deploy de produção disparado.
  - A tentativa de merge da branch audit/2026-06-05-tenant-db foi abortada devido a conflitos não resolvidos. Aguardando revisão manual antes de avançar.

- **[05/06/2026 - 22:55]:** **Tenant Isolation Middleware + Fase 1 (DB) — pronto para PR.**
  - **Branch:** `audit/2026-06-05-tenant-db` (ainda não mergeada).
  - **Decisão arquitetural:** `docs/decisions/2026-06-05-tenant-isolation.md` (ADR com 8 contradições E1–E8 resolvidas).
  - **Novos artefatos:**
    - `src/types/tenant.ts` — branded `TenantId`, `TENANT_MASTER_ID`, `JwtPayload`, `TenantRequest`.
    - `src/api-lib/middleware/suspiciousActivity.ts` — logger Sentry (tag `tenant_isolation_violation`) com fallback console, **never throws**.
    - `src/api-lib/db/withTenant.ts` — `withTenantSql()` (Neon `begin` + `set_config` via `pg_temp`), `withTenantDb()` (Drizzle Proxy auto-inject), `tenantExists()`, `withTenantWhere()`.
    - `src/api-lib/middleware/tenantMiddleware.ts` — HOF `withTenant(handler, options)`, suporta `enforceDomainMatch`, `requireRoles`, `allowMasterAdmin`.
    - 5 migrations SQL idempotentes: `0002_tenant_id_columns.sql`, `0003_rls_policies.sql`, `0004_create_missing_tables.sql`, `0005_consolidate_ordens.sql`, `0006_drop_orphans.sql`
    - `drizzle/meta/_journal.json` — atualizado com 7 entries (0000–0006).
  - **Migração piloto:** `src/api-lib/auth.ts` agora usa `withTenant` em todos os handlers protegidos. Login permanece público.
  - **Testes:** **44 novos testes** (22 middleware + 22 auth) — todos passam.
  - **TypeScript:** 0 novos erros introduzidos. Baseline do projeto: 279 erros pré-existentes.
  - **Deploy:** feature flag `NEW_TENANT_MIDDLEWARE` (default ON).

- **[05/06/2026 - 18:35]:** Correções definitivas de banco de dados (3 módulos + 1 regressão).
  - **Módulo Projetos:** Corrigido `quotation_id` faltando no `INSERT` do `projects.ts` e duplicata no `UPDATE`.
  - **Módulo Fornecedores:** Criada tabela `fornecedores` que estava **COMPLETAMENTE AUSENTE** no `_init.ts`.
  - **Módulo Calendário:** Adicionada migração `ALTER TABLE eventos_calendario ADD COLUMN IF NOT EXISTS quotation_id UUID`.
  - **Módulo SKUs/Estoque:** Adicionadas 6 colunas extras em `estoque_materiais_detalhado`.
  - Arquivo `_init.ts` também incluiu `erp_skus` e `fornecedores` na lista `tabelasComTenant`.
  - **14/14 migrações executadas direto no Neon** via script `scratch/run-migrations-now.mjs`.

- **[05/06/2026 - 17:15]:** Executada Auditoria Global de Sistema.
  - Arquivos modificados: `RELATORIO_AUDITORIA.md` (criado), `src/components/ui/Modal.tsx` (capitalização corrigida).

- **[05/06/2026 - 16:30]:** Padronização visual da UI e ajustes de botões.
  - `src/components/skus/SKUPage.tsx`, `src/components/inventory/Inventory.tsx`, `create-user.ts`

## TODOs / Próximos Passos

- [x] **Consolidar docs e arquivar legado** — `RESUMO_PROJETO.md` única fonte, `Resumo de Trabalho.md` arquivado
- [x] **RH horas falta automática** — `hora_saida/hora_retorno → horas_falta_minutos` com cálculo automático
- [ ] **Orcamento→quotation (opção B deprecation):** remover `drizzle/relations.ts` órfãs + alias `addOrcamento` mantido
- [ ] **Renomear `drizzle/schema.ts` → `drizzle/_schema.generated.ts` + `.gitignore` (D1)**
- [ ] **Centralizar rate limits em `src/config/rateLimits.ts` (D1)**
- [ ] **Corrigir 1.415 hex hardcoded por arquivo prioritário: `QuotationForm` → `StackedBarChart`**
- [ ] **Corrigir o bug pré-existente em `notificacoes.test.ts` (TDZ `quotations2`)**
- [ ] **Adicionar CI check para os 279 erros TS pré-existentes (tipá-los progressivamente)**
