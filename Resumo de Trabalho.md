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
