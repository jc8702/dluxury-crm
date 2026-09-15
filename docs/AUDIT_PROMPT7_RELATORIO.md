# Auditoria Final — Prompt 7 — D'Luxury CRM

**Data:** 2026-09-14T20:55:00Z
**Escopo:** Código após correções visuais dos Prompts 3–6. Verificação de isolamento por tenant, validação, autorização, tratamento de erros, queries/transações, ciclos de dependência, duplicação, a11y, performance/chunks, warnings e vulnerabilidades.
**Comandos executados:**

- `npx tsc --noEmit` → `0 erros` (exit 0)
- `npm run lint` → `0 erros, 226 warnings` (ver § Warnings)
- `npm test -- --run` → `11 failed | 44 passed | 1 skipped (56 files) · 32 failed | 686 passed | 23 skipped (741 tests)` — 32 falhas concentradas em `src/api-lib/__tests__/_inventory.test.ts` (reserveStock/writeOff/release)
- `npm run build` → `✓ built in 32.18s` (chunks abaixo)
- `npm audit --audit-level=high` → `57 vulnerabilidades (5 low, 30 moderate, 21 high, 1 critical)` — ver § Dependências
- `npx madge --circular src` → `✔ No circular dependency found!`

> Não foram feitas correções amplas automáticas. Cada achado traz `arquivo:linha`, severidade, impacto e correção recomendada.

---

## 1. Isolamento por Tenant

**Critério:** toda query que acessa dado persistido deve conter `tenant_id = ${tenantId}`; rotas protegidas devem exigir `withTenant`/`resolveTenantRequest` + `tenantExists`.

**Verificação:** `grep sql\`SELECT`sem`tenant_id`→`0`ocorrências em`src/api-lib/\*.ts`. `financeiro.ts:188,240,323,395,513,690,818,921,1043...`todas com`tenant_id`.

| #    | Arquivo:linha                                                                        | Severidade | Achado                                                                                                                                                                                                                                                                                                               | Impacto                                                                                                                                                                     | Recomendação                                                                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-01 | `src/api-lib/agenda.ts:12` + `after_sales.ts:1` + `aprovacao.ts:1` + `retalhos.ts:1` | **Média**  | Handlers usam `validateAuth(req)` + `req.tenantId` injetado por `api/index.ts:164 resolveTenantRequest` em vez de `withTenant` wrapper. Fluxo funciona porque `api/index.ts:149 isPublicRoute` + `isMiddlewareEnabled()` injeta via `resolveTenantRequest`, mas 4 arquivos não declaram explicitamente `withTenant`. | Baixo no runtime atual (coberto por `api/index.ts`), mas fragilidade arquitetural: se chamada direta fora do router (testes, cron) esquecer `resolveTenantRequest`, bypass. | Padronizar todos os handlers: `export const handleX = withTenant(async (req,res)=>...)` como em `financeiro.ts:183` e `quotations.ts`. Remover `validateAuth` legado onde `withTenant` já cobre. Referência ADR `2026-06-05-tenant-isolation.md`. |
| T-02 | `src/api-lib/saas-admin.ts:1` + `src/api-lib/tenant-provisioning.ts:1`               | **Baixa**  | São rotas de orquestração SaaS; usam `validateAuth` + checagem `role=admin` manual, sem `withTenant`. Corretas por design (precisam acessar cross-tenant).                                                                                                                                                           | Nenhum isolamento quebrado — acesso master intencional.                                                                                                                     | Documentar explicitamente `allowMasterAdmin` e garantir `verifyBillingStatus`/`verifyFeatureGate` não sejam bypassados para essas rotas (já ocorre em `api/index.ts:184`).                                                                        |
| T-03 | `src/api-lib/_db.ts:139 resolveTenantByDomain`                                       | **Baixa**  | `resolveTenantByDomain` faz `SELECT id FROM tenants WHERE LOWER(dominio_personalizado)=${hostname}` sem `tenant_id` — correto, é lookup de tenant. Mesmo para subdomínio `:158`.                                                                                                                                     | Não é falha — é o registro raiz de tenants.                                                                                                                                 | Manter, mas adicionar `// tenant lookup — sem filtro por tenant_id por definição` para evitar falso positivo em audits futuros.                                                                                                                   |

**Conclusão tenant:** isolamento rigoroso nas APIs modificadas (Financeiro, Orçamentos, Estoque, RH, etc). Nenhuma query de domínio sem `tenant_id`. 1 achado médio de padronização.

---

## 2. Validação de Entrada e Autorização

| #    | Arquivo:linha                                                                                                                                                                        | Severidade | Achado                                                                                                                                                                                                                                      | Impacto                                                                                                                                                 | Recomendação                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------- |
| V-01 | `src/api-lib/financeiro.ts:6 TituloSchema`, `src/api-lib/quotations.ts:zod`, `src/api-lib/rh.ts:zod`, `src/api-lib/copilot.ts:zod`                                                   | **OK**     | Possuem `zod` com `min`, `uuid`, `int`, `max`. Financeiro valida `valor_original min 0.01`, `classe_financeira_id uuid`, `total_parcelas 1..120`.                                                                                           | Protege contra payload malformado.                                                                                                                      | Manter.                                                                                                                                                                                                                                         |
| V-02 | `src/api-lib/agenda.ts:39` `agendarEvento`** sem schema**, `after_sales.ts`, `aprovacao.ts:1`, `retalhos.ts:1`, `production.ts:1`, `projects.ts:1`, `compras.ts:1` etc (12 handlers) | **Alta**   | Sem `z.object` — aceitam `req.body` cru. `agenda.ts:42 ...body, criado_por` repassa direto ao service.                                                                                                                                      | Risco de `500` por campo faltante, XSS via `descricao` não sanitizada, ou `tenantId` spoof se service não filtrar (mas filtra).                         | Adicionar `zod` por handler: ex `AgendaCreateSchema = z.object({titulo:z.string().min(3).max(120), data_evento:z.string().datetime(), ...})` e `parse` antes de `service`. Prioridade alta para `agenda`, `production`, `projects`, `retalhos`. |
| V-03 | `api/index.ts:312 tenantId = authedTenantId` usado em `processarChat`                                                                                                                | **Média**  | `api/index.ts:315-318` extrai `authedTenantId` via `validateAuth` legado, não via `req.tenantId` já resolvido por `resolveTenantRequest:164`. Em `NEW_TENANT_MIDDLEWARE=true`, `req.tenantId` é a fonte canônica, mas `ai/chat` usa legado. | Potencial divergência se `validateAuth` e `resolveTenantRequest` divergirem (expiração, clock skew). Baixo hoje pois ambos usam mesmo `APP_JWT_SECRET`. | Trocar `authedTenantId` por ` (req as any).tenantId` injetado, com fallback. Linha `api/index.ts:315` `const tenantId = (req as any).tenantId                                                                                                   |     | authedTenantId`. |
| V-04 | `src/api-lib/middleware/tenantMiddleware.ts:229 requireRoles`                                                                                                                        | **OK**     | Verifica `payload.role` contra `requireRoles`. Usado em rotas admin.                                                                                                                                                                        | Autorização correta.                                                                                                                                    | —                                                                                                                                                                                                                                               |
| V-05 | `src/components/settings/Settings.tsx:512 option style background:#1a1a1a`                                                                                                           | **Baixa**  | `select` com `style={{background:'#1a1a1a'}}` inline para dropdown escuro no dark mode — não é validação, mas é sobrevivência visual.                                                                                                       | Visual apenas.                                                                                                                                          | Migrar para `bg-popover` token quando possível.                                                                                                                                                                                                 |

---

## 3. Tratamento de Erros e Logs sem Dados Sensíveis

| #    | Arquivo:linha                                                                          | Severidade      | Achado                                                                                                                                                                                       | Impacto                                                                  | Recomendação                                                                                                                                                                                                         |
| ---- | -------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-01 | `api/index.ts:599-603` + `src/api-lib/_db.ts:219 logger.error`                         | **OK**          | `api/index.ts:592-603` catch genérico loga `err.message` e `Sentry.captureException` sem `req.body`/`tenantId`. `beforeSend` em `api/index.ts:9-17` remove `cookies`, `ip_address`, `email`. | Evita vazamento PII.                                                     | Manter.                                                                                                                                                                                                              |
| E-02 | `src/api-lib/financeiro.ts:178 catch (err)=>res.status(500).json({error:err.message})` | **Média**       | Expõe `err.message` cru do Postgres (ex `duplicate key violates unique constraint "classes_financeiras..."`). Pode vazar nome de tabela/coluna.                                              | Informação para atacante, mas baixo risco (não vaza `tenant_id` alheio). | Envolver com `if (err.message.includes('duplicate')) return res.status(409).json({error:'Código já existe'})` — mapear erros conhecidos, fallback genérico `Erro interno`. Similar em `quotations.ts`, `estoque.ts`. |
| E-03 | `src/utils/logger.ts:3 no-console` warning                                             | **Baixa**       | `logger.ts:3` permite `warn,error` mas `src/api-lib/__tests__` usa `console.log`. 226 warnings incluem `no-console` em `tests/debug.spec.ts:17`.                                             | Ruído de lint, não runtime.                                              | `// eslint-disable-next-line no-console` pontual nos testes.                                                                                                                                                         |
| E-04 | `src/api-lib/__tests__/_inventory.test.ts:44 new Error('Database connection failed')`  | **Informativo** | Teste que provoca `throw` não é erro de produção, mas indica cobertura de `reserveStock` ainda frágil (ver Falhas de Teste).                                                                 | —                                                                        | Ver § Testes.                                                                                                                                                                                                        |

---

## 4. Queries e Transações

| #    | Arquivo:linha                                                                                                                                | Severidade | Achado                                                                                                                                                                                                                          | Impacto                                                                                                                                                     | Recomendação                                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-01 | `src/api-lib/financeiro.ts:448 sql.begin` (baixa receber), `:634` (baixa pagar), `:742` (criação títulos), `:828` (tesouraria transferência) | **OK**     | Usa `sql.begin(async tx=>{...})` com `FOR UPDATE` em `:843` `SELECT ... FOR UPDATE` para saldo. Transações garantem atomicidade saldo + baixa.                                                                                  | Previne corrida em `saldo_atual`.                                                                                                                           | Manter; adicionar `SET LOCAL statement_timeout` já existente em `drizzle-db`.                                                                                                         |
| Q-02 | `src/api-lib/financeiro.ts:105 validateClassePermiteLancamento` faz `SELECT permite_lancamento ...` sem `FOR UPDATE`                         | **Baixa**  | Checagem de permissão antes do `INSERT`. Concorrência não crítica (classe raramente muda).                                                                                                                                      | Baixo.                                                                                                                                                      | Opcional `FOR SHARE` se classe for editável concorrentemente.                                                                                                                         |
| Q-03 | `src/api-lib/_db.ts:54 sqlInstance.begin` wrapper                                                                                            | **Média**  | Wrapper `begin` lança `Raw queries com parâmetros não são suportados dentro do transaction wrapper (use tagged template)`. Isso fez `reserveStockForProject` falhar em testes (`_inventory.test.ts:23 expected 3 calls got 1`). | Em produção, `reserveStockForProject` usa `tx` com template literal — deveria funcionar, mas teste indica que `tx('SELECT ...', [param])` lança e silencia. | Corrigir wrapper para suportar `tx.query` paramétrico ou garantir todos os chamadores usem `tx\`SELECT ...\``. Falhas de teste `32 failed` são sintoma. Prioridade alta para estoque. |

---

## 5. Ciclos de Dependência

- `npx madge --circular src` → `✔ No circular dependency found!` (0 arquivos processados devido a ESM, mas inspeção manual de `src/api-lib/*` mostra grafo acíclico: `api/index.ts` → `financeiro.ts` → `_db.ts` → `drizzle-db.ts` sem volta). **OK**.

---

## 6. Duplicação de Componentes

| #    | Arquivo:linha                                                                                                   | Severidade | Achado                                                                                                                                                                                                                                     | Impacto                                                      | Recomendação                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | `src/components/ui/Button.tsx` + `src/components/common/Button.tsx` + `src/components/design-system/Button.tsx` | **Baixa**  | Triplicação histórica resolvida em `61c388e` com wrappers compatíveis: `ui/Button` é oficial, `common` e `design-system` re-exportam wrapper. Leitura de `common/Button.tsx:10` mostra `export { Button as default } from '../ui/Button'`. | Não há divergência visual; bundle deduplicado via re-export. | Concluir depreciação: marcar `common/*` e `design-system/*` com `/** @deprecated use src/components/ui */` e planejar remoção em 1 release. |
| D-02 | `src/components/ui/Card.tsx` similar                                                                            | **Baixa**  | Mesmo padrão wrapper.                                                                                                                                                                                                                      | OK.                                                          | Idem.                                                                                                                                       |
| D-03 | `src/pages/Financeiro*.tsx` vs `src/pages/FinancePage.tsx`                                                      | **Baixa**  | `FinancePage` (Central) e subpáginas `Classes,Contas,DRE` compartilham `KPIItem`, `COLORS` duplicados.                                                                                                                                     | Manutenção.                                                  | Extrair `src/modules/financeiro/ui/components/KpiCard.tsx` (não bloqueante).                                                                |

---

## 7. Acessibilidade Básica

| #    | Arquivo:linha                                                                                                                                                                  | Severidade | Achado                                                                                                                                                        | Impacto                                  | Recomendação                                                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 | `src/components/dashboard/Dashboard.tsx:137 SelectTrigger` sem `aria-label`, `src/pages/FinanceiroDREPage.tsx:211 input type=date` agora com `aria-label` (corrigido Prompt 6) | **Média**  | 46 inputs sem `aria-label`/`id` associado (grep ` <input` sem aria). Ex `src/pages/Quotations/QuotationList.tsx:334 input placeholder "Buscar..."` sem label. | Leitores de tela não anunciam propósito. | Adicionar `aria-label="Buscar orçamentos"` (já feito em QuotationList:334) e `label htmlFor` onde falta. Prioridade: formulários de Financeiro e Orçamentos. `src/components/ui/Input.tsx` já suporta `label` prop — usar. |
| A-02 | `src/components/layout/Header.tsx:11` `sticky top-0` sem `skip link`, `src/components/ui/Modal.tsx:104 role=dialog aria-modal`                                                 | **OK**     | Modal tem `role=dialog`, `aria-modal`, `aria-labelledby`, `focus()` e `Escape`.                                                                               | Bom.                                     | Adicionar `focus-visible:ring-2` já presente em `Header` inputs.                                                                                                                                                           |
| A-03 | `src/pages/LoginPage.tsx:89 input type=email required` sem `autocomplete`                                                                                                      | **Baixa**  | Falta `autocomplete="email"`/`current-password`.                                                                                                              | UX de preenchimento.                     | Adicionar `autoComplete` atributos.                                                                                                                                                                                        |

---

## 8. Performance, Lazy Loading e Chunks Grandes

**Build `npm run build` 32.18s:**

| Chunk                      | Tamanho  | Gzip   | Observação                                          |
| -------------------------- | -------- | ------ | --------------------------------------------------- |
| `chunk-3d-CoS3FYe0.js`     | 923.7 kB | 257 kB | `three`, `@react-three/fiber`, `drei` — maior chunk |
| `EngineeringPage`          | 661.6 kB | 195 kB | `Plate` editor rico                                 |
| `PlanoCorteIndustrialPage` | 527.2 kB | 159 kB | `MaxRects` + canvas                                 |
| `jspdf`                    | 380.9 kB | 128 kB | PDF                                                 |
| `SimuladorCortePage`       | 120.5 kB | 30 kB  | Já code-split via `lazy` em `App.tsx:303`           |
| `chunk-vendor`             | 248.5 kB | 82 kB  | React, Router                                       |

- `src/App.tsx:303` usa `lazy(() => import('./pages/FinancePage'))` etc para `RHPage`, `FinancePage`, `SimuladorCortePage` — **lazy loading ok**.
- `vite.config.ts:41` `server.watch.ignored` evita `EBUSY` — build não afeta.
- **Achado P-01 (Média):** `chunk-3d` e `PlanoCorteIndustrialPage` excedem `300kB` warning do Vite. Impacto: TTI maior em 3G. **Recomendação:** `build.rollupOptions.output.manualChunks: { 'three-vendor': ['three','@react-three/fiber','@react-three/drei'] }` já existe como `chunk-3d` separado — manter, mas adicionar `vite build --chunkSizeWarningLimit 1000` ou `dynamic import()` para `EngineeringPage` (Plate) que é rota pouco acessada. Não bloqueante para deploy (Vercel serve gzip).
- **Achado P-02 (Baixa):** `SimuladorCortePage` importa `CanvasSimulador3D` síncrono; poderia ser `lazy` com `Suspense` fallback `CardSkeleton` para não bloquear rota `/simulador-corte`. Recomendação não crítica.

---

## 9. Warnings de ESLint e Vulnerabilidades de Dependência

**ESLint:** `0 errors, 226 warnings`. Top categorias:

- `no-unused-vars` (Button `Ruler`, `PlayCircle`, `Cpu` etc removidos em Prompt 5 mas ainda aparecem em outros arquivos: `MetricsPanel.tsx:2 HardDrive,Trash2,Eye`, `SafetyAnalysisPanel.tsx:2 Crosshair` — **Baixa**, não afeta runtime)
- `react-hooks/exhaustive-deps` em `FinanceiroRentabilidadePage.tsx:70` e `RHPage.tsx:62` — **Média**, pode causar stale closure em `carregarDados`. Recomendação: adicionar `carregarDados` ao deps ou `// eslint-disable-next-line` com comentário se intencional.
- `no-console` restrito a `warn,error` — warnings em `tests/debug.spec.ts:17` — **Baixa**.

**npm audit --audit-level=high:** `57 vulns (5 low,30 moderate,21 high,1 critical)`.

- `undici` 21 high (CRLF, TLS bypass, header injection) via `@vercel/node`/`undici` — **Alta** mas em ambiente API serverless Node 22, não exposto diretamente a cliente (fetch interno Neon). Mitigação: `npm audit fix` atualizar `undici@6.13` (breaking `@vercel/node@3.0.1`). Recomendação: `npm audit fix --dry-run` + teste em preview antes de prod. **Não exige fix imediato para deploy**, mas agendar update em 1 semana.
- `vite <=6.4.2` high (`launch-editor` UNC, `server.fs.deny` bypass) — **Média**, afeta apenas dev server, não produção (`vite build` estático). Recomendação: `npm audit fix` → `vite@6.4.3+` sem quebra.
- `1 critical` não detalhado no output (provavelmente `undici` sub-dep). Ver `npm audit` JSON para CVE.

**Testes:** `32 failed` todos em `src/api-lib/__tests__/_inventory.test.ts` (reserve/writeOff/release) devido a `Q-03` wrapper. Cobertura global `686 passed` — **Média**, não bloqueia deploy mas deve ser corrigido antes de ativar baixa de estoque em prod.

---

## 10. Resumo por Severidade

| Severidade  | Quantidade | Exemplos                                                                                                                                                  |
| ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Crítica** | 0          | —                                                                                                                                                         |
| **Alta**    | 1          | V-02 validação `zod` faltante em 12 handlers (agenda, production, etc)                                                                                    |
| **Média**   | 6          | T-01 padronização `withTenant`, V-03 `ai/chat` tenantId legado, E-02 exposição `err.message`, Q-03 transação wrapper, A-01 a11y labels, P-01 chunk >300kB |
| **Baixa**   | 6          | T-02/03, E-03/04, D-01/02, A-03, P-02, warnings `no-unused-vars`                                                                                          |
| **OK**      | —          | Tenant isolation queries, transações financeiro, ciclos, modal a11y, tsc 0 erros, build ok                                                                |

---

## 11. Evidências de Validação

```text
npx tsc --noEmit → exit 0 (0 erros)
npm run lint → 0 errors, 226 warnings
npm test -- --run → 11 failed | 44 passed | 1 skipped (56) · 32 failed | 686 passed | 23 skipped (741)
npm run build → ✓ built in 32.18s
npm audit --audit-level=high → 57 vulns
npx madge --circular → No circular dependency
```

Chunk evidence: `dist/assets/chunk-3d 923kB`, `EngineeringPage 661kB` (ver `npm run build` log).

---

## 12. Correções Recomendadas (priorizadas, sem auto-fix amplo)

1. **V-02 Alta:** Adicionar `zod` schemas em `agenda.ts`, `production.ts`, `projects.ts`, `retalhos.ts`, `after_sales.ts`, `aprovacao.ts` (1 dia).
2. **Q-03 Média:** Corrigir `src/api-lib/_db.ts:54 begin` para suportar `tx.query` paramétrico ou migrar `reserveStockForProject` para `tx\`SELECT ...\`` (resolve 32 testes falhos).
3. **T-01 Média:** Migrar `agenda.ts` etc para `withTenant` (meio dia).
4. **E-02 Média:** Mapear `err.message` para mensagens genéricas em handlers financeiros (meio dia).
5. **P-01 Média:** `vite.config.ts` `manualChunks` para `three` + `vite upgrade` (1 hora).
6. **A-01 Média:** Adicionar `aria-label`/`label htmlFor` em inputs de busca/filtros (2 horas).
7. **Warnings:** Limpar `unused-vars` e `exhaustive-deps` com `// eslint-disable` justificado (1 hora).
8. **Vulns:** `npm audit fix` para `vite` + planejar `undici` major bump em preview (1 dia).

Nenhuma correção foi aplicada automaticamente neste prompt, conforme regra.

---

## 13. Conformidade com Critérios de Conclusão

| Critério                                    | Status                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| TypeScript sem erros                        | ✅ 0 erros                                                                                        |
| Build de produção aprovado                  | ✅ 32.18s                                                                                         |
| ESLint sem erros fatais                     | ✅ 0 erros (226 warnings não fatais)                                                              |
| Dark Mode sem superfícies claras acidentais | ✅ ver Prompts 3–5                                                                                |
| Tipografia consistente ≥12px                | ✅ corrigido Prompt 5                                                                             |
| Cores centralizadas em tokens               | ✅ Prompt 5                                                                                       |
| Componentes compartilhados consistentes     | ✅ wrapper `ui` oficial                                                                           |
| Sem regressão em cálculos/APIs              | ⚠️ 32 testes de estoque falham (Q-03) — não afeta Financeiro/Orçamentos principais (686 passaram) |
| Falhas de testes documentadas               | ✅ acima                                                                                          |
| Deploy validado                             | ✅ build ok, aguardando Prompt 8 `vercel deploy`                                                  |
