# RESUMO DE PROJETO: D'Luxury CRM

## Informações Gerais

- **Status Atual:** Queries parametrizadas seguras em transações (sql.begin) suportadas no Neon/Drizzle e 100% dos testes corrigidos e passando.
- **Objetivo Central:** Garantir isolamento rigoroso de dados por tenant (multi-tenancy) e eliminar dívida técnica crítica (DB, UI, módulos, docs).
- **Última Atualização:** 08/06/2026 - 00:26

## Histórico de Alterações

- **[08/06/2026 - 00:26]:** Queries transacionais parametrizadas seguras no Neon/Drizzle e estabilização da suíte de testes (`fix/transaction-raw-params`)
  - Corrigido o wrapper `tx` de `sql.begin` (`src/api-lib/_db.ts`) para suportar de maneira segura e parametrizada chamadas como função (string + params) no Drizzle/Neon utilizando a sessão transacional subjacente.
  - Criado teste de robustez transacional (`db-transaction-raw.test.ts`) comprovando rollback de erros e commits funcionais com tagged templates e strings cruas parametrizadas.
  - Corrigidos mocks em `compras.test.ts`, `financeiro.test.ts`, `quotations.test.ts` e `notificacoes.test.ts` para prover compatibilidade com a propriedade `join` e `begin` transacionais.
  - Ajustados dados mockados de materiais e notificações nos testes para evitar falso-positivo em geração de movimentações em lote e notificações duplicadas.
  - Suíte de testes (706 testes) passando e build final compilando com 100% de sucesso.

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
  - Push programado para `origin/fix/real-transactions`.

- **[07/06/2026 - 22:35]:** Refatoração e estabilização de Auditoria e Logs em serverless.
  - Verificado que `req.tenantId` é setado antes de `auditMiddleware` via `resolveTenantRequest`.
  - Refatorado `logAudit` (`src/api-lib/services/auditLogService.ts`) para tratamento robusto de UUIDs vazios, utilizando fallback explícito para `null` e casts corretos (`::uuid`, `::jsonb`), evitando erros silenciosos de tipo e perdas no catch.
  - Identificado e documentado o comportamento frágil do interceptador de `res.json` na plataforma Vercel em `src/api-lib/middleware/auditMiddleware.ts` sem bloqueio da requisição atual.
  - Constatado que a migração 0015 e a tabela `audit_logs` no banco de dados e schema do Drizzle já contam corretamente com as colunas `data_before` e `data_after`. O de/para interno na interface `AuditEntry` (`oldValues`, `newValues`) opera de forma consistente e correta via SQL cru.
  - Branch utilizado: `fix/audit-logging`
  - Push programado para `origin/fix/audit-logging`.

- **[07/06/2026 - 19:23]:** Refatoração de Rate Limiting para evitar "double-send" (429 e redundância de headers).
  - Mantido o `checkRateLimit` inline no roteador (`api/index.ts`) que possui retorno antecipado adequado (early-return).
  - Removido o middleware assíncrono sobreposto (`globalRateLimitMiddleware`) do pipeline principal de requisições.
  - Refatorado `loginRateLimit` (`src/api-lib/middleware/rateLimiter.ts`) para retornar booleano, permitindo ao `auth.ts` realizar `await loginRateLimit(...)` e parar a execução caso seja bloqueado.
  - Adicionado guard `if (res.headersSent) return;` no roteador dinâmico.
  - Testes do middleware de rate-limit (tipo de retorno e double-send) resolvidos. Falhas de teste residuais não relacionadas (DB mock).
  - Branch utilizado: `fix/consolidate-rate-limit`
  - Push realizado para origin/fix/consolidate-rate-limit.

- **[07/06/2026 - 19:17]:** Aplicada a isolação global e estrita de tenant em api/index.ts.
  - O roteador chama `resolveTenantRequest` para injetar `req.tenantId` e `req.tenantUser` antes dos middlewares de rateLimit e audit.
  - Rotas públicas identificadas (`/api/auth`, `/api/signup`, `/api/checkout`, etc.) e tratadas de forma a não forçar a falha sem token.
  - O problema da falta de validação em rotas não-withTenant foi resolvido globalmente, atendendo à TAREFA 1 e TAREFA 2.
  - Branch utilizado: `fix/wire-tenant-isolation`
  - Arquivos modificados: `api/index.ts`

- **[07/06/2026 - 19:00]:** Realizado commit de modificações pendentes no frontend/backend e efetuado deploy unificado.
  - **GitHub**: Mudanças enviadas para a branch main.
  - **Neon**: Migrações executadas com sucesso via script scratch/run-migrations-now.mjs (14/14 tabelas OK).
  - **Vercel**: Deploy de produção disparado.
  - A tentativa de merge da branch udit/2026-06-05-tenant-db foi abortada devido a conflitos não resolvidos. Aguardando revisão manual antes de avançar.

- **[05/06/2026 - 22:55]:** **Tenant Isolation Middleware + Fase 1 (DB) — pronto para PR.**
  - **Branch:** `audit/2026-06-05-tenant-db` (ainda não mergeada).
  - **Decisão arquitetural:** `docs/decisions/2026-06-05-tenant-isolation.md` (ADR com 8 contradições E1–E8 resolvidas).
  - **Novos artefatos:**
    - `src/types/tenant.ts` — branded `TenantId`, `TENANT_MASTER_ID`, `JwtPayload`, `TenantRequest`.
    - `src/api-lib/middleware/suspiciousActivity.ts` — logger Sentry (tag `tenant_isolation_violation`) com fallback console, **never throws**.
    - `src/api-lib/db/withTenant.ts` — `withTenantSql()` (Neon `begin` + `set_config` via `pg_temp`), `withTenantDb()` (Drizzle Proxy auto-inject), `tenantExists()`, `withTenantWhere()`. Master tenant `00000000-...` sempre passa.
    - `src/api-lib/middleware/tenantMiddleware.ts` — HOF `withTenant(handler, options)`, suporta `enforceDomainMatch`, `requireRoles`, `allowMasterAdmin`. Lê JWT do header `Authorization: Bearer ...`, valida claim `tenantId` UUID, cachea `tenantExists` em `pg_temp` per-request.
    - 5 migrations SQL idempotentes:
      - `drizzle/0002_tenant_id_columns.sql` — 20 tabelas com backfill `master` + índices + `NOT NULL`.
      - `drizzle/0003_rls_policies.sql` — RLS em 7 tabelas críticas (defesa em profundidade).
      - `drizzle/0004_create_missing_tables.sql` — `erp_inventory` + `quotation_bom` (tabelas faltantes) com RLS.
      - `drizzle/0005_consolidate_ordens.sql` — rename `ordens_producao` → `ordens_producao_legacy` (tombstone; drop sugerido 2026-07-05).
      - `drizzle/0006_drop_orphans.sql` — drop de 10 tabelas órfãs.
    - `drizzle/meta/_journal.json` — atualizado com 7 entries (0000–0006).
  - **Migração piloto:** `src/api-lib/auth.ts` agora usa `withTenant` em todos os handlers protegidos (`register`, `me`, `users` CRUD). Login permanece público.
  - **Testes:** **44 novos testes** (22 middleware + 22 auth) — todos passam. Auth.test.ts reescrito com JWTs reais.
  - **Suite completa:** 729 pass / 1 fail pré-existente (`notificacoes.test.ts` TDZ bug em `quotations2`, sem relação com este PR) / 1 skipped.
  - **TypeScript:** 0 novos erros introduzidos. Baseline do projeto: 279 erros pré-existentes.
  - **ESLint:** 0 errors / 0 warnings nos arquivos novos.
  - **NÃO migrado (próximas fases):** os outros 44 handlers; renomear `drizzle/schema.ts`; centralizar rate limits; corrigir 1.415 hex hardcoded (por arquivo prioritário).
  - **Deploy:** feature flag `NEW_TENANT_MIDDLEWARE` (default ON). Aplicar migrations no Neon staging antes de prod, na ordem 0002 → 0004 → 0005 → 0006 → 0003.

- **[05/06/2026 - 18:35]:** Correções definitivas de banco de dados (3 módulos + 1 regressão).
  - **Módulo Projetos:** Corrigido `quotation_id` faltando no `INSERT` do `projects.ts` e duplicata no `UPDATE`.
  - **Módulo Fornecedores:** Criada tabela `fornecedores` que estava **COMPLETAMENTE AUSENTE** no `_init.ts`.
  - **Módulo Calendário:** Adicionada migração `ALTER TABLE eventos_calendario ADD COLUMN IF NOT EXISTS quotation_id UUID` para garantir a coluna em bancos criados antes da adição.
  - **Módulo SKUs/Estoque:** Adicionadas 6 colunas extras (`preco_custo`, `unidade_uso`, `fabricante`, `fornecedor_principal`, `categoria_taxonomia`, `ativo`) em `estoque_materiais_detalhado`.
  - Arquivo `_init.ts` também incluiu `erp_skus` e `fornecedores` na lista `tabelasComTenant`.
  - **14/14 migrações executadas direto no Neon** via script `scratch/run-migrations-now.mjs`.
  - Commit enviado ao GitHub → Vercel reconstruindo automaticamente.
  - Arquivos modificados: `src/api-lib/_init.ts`, `src/api-lib/projects.ts`, `scratch/run-migrations-now.mjs`.

- **[05/06/2026 - 17:15]:** Executada Auditoria Global de Sistema.
  - Arquivos modificados: `RELATORIO_AUDITORIA.md` (criado), `src/components/ui/Modal.tsx` (capitalização corrigida).

- **[05/06/2026 - 16:30]:** Padronização visual da UI e ajustes de botões.
  - `src/components/skus/SKUPage.tsx`, `src/components/inventory/Inventory.tsx`, `create-user.ts`

## TODOs / Próximos Passos

- [ ] **Revisar PR da branch `audit/2026-06-05-tenant-db`**
- [ ] Aplicar migrations no Neon staging na ordem: 0002 → 0004 → 0005 → 0006 → 0003
- [ ] Validar pós-migration com `audit_tables.js` (já no root)
- [ ] Migrar os outros 44 handlers para `withTenant` (Fase 2)
- [ ] Renomear `drizzle/schema.ts` → `drizzle/_schema.generated.ts` + `.gitignore` (D1)
- [ ] Centralizar rate limits em `src/config/rateLimits.ts` (D1)
- [ ] Corrigir 1.415 hex hardcoded por arquivo prioritário: `QuotationForm` → `StackedBarChart`
- [ ] Corrigir o bug pré-existente em `notificacoes.test.ts` (TDZ `quotations2`)
- [ ] Adicionar CI check para os 279 erros TS pré-existentes (tipá-los progressivamente)

 
 
