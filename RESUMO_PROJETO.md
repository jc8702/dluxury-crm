# RESUMO DE PROJETO: D'Luxury CRM

## Informações Gerais

- **Status Atual:** Sprints 1 e 2 concluídas; auditoria cruzada executada e **plano aprovado concluído**: TSK-12/13/14/15/16/17 **concluídas** (itens A e B da auditoria resolvidos); **banco de produção recuperado (91/91 tabelas, origem = destino)** e **6 telas/rotas quebradas corrigidas (TSK-18/19/20)**. E2E **186 passed / 0 failed** (inclui regressão visual de 39 rotas + 11 testes de inserção).
- **Objetivo Central:** Garantir funcionamento perfeito de todas as funcionalidades (especialmente inserção de dados) e unificar o padrão visual/design (Padrão Diamante) em todas as páginas.
- **Última Atualização:** 27/09/2026

## Histórico de Alterações

- **[27/09/2026 - Recuperação de banco + TSK-18/19/20 (telas quebradas)]:** produção passou a ter todos os dados e as 6 telas apontadas voltaram a funcionar.
  - **Banco origem → produção:** 6 tabelas ausentes criadas (`erp_skus`, `materiais`, `clientes`, `fechamentos_financeiros`, `pedidos_compra`, `pedido_compra_itens`) + sequences com `setval`, 7 colunas adicionadas (`notificacoes.updated_at`, `ordens_producao.quotation_id/deleted_at/tenant_id`, `quotations.token_expira_em`, `users.token_version/ativo`) e ~370 linhas copiadas por PK (`scratch/db-sync.cjs --apply`, ordem FK, `ON CONFLICT DO NOTHING`); verificação final **91/91 tabelas e origem = destino em todas as contagens** (linhas que já eram maiores no destino intocadas). Migração versionada `drizzle/0018_create_configuracoes_precificacao.sql` + DDL em `_init.ts`.
  - **TSK-18 (PDF de orçamento):** `/api/quotations/export-pdf` devolvia JSON e `/api/orcamentos/export-pdf` respondia 410 → botões de `QuotationForm`/`QuotationDetail` agora usam `exportBudgetToPDF` (jsPDF client-side) e o WhatsApp do `ModalEnviarCliente` usa o link público de aprovação (download do PDF + assinatura).
  - **TSK-19 (Precificação Técnica em Configurações):** `/api/quotation-tecnico` não existia (404) e a tabela `configuracoes_precificacao` — consultada por `recalcularOrcamento` — **não existia em nenhum dos dois bancos** → tabela criada + handler novo (`src/api-lib/quotation-tecnico.ts`, GET cria row com defaults / PATCH faz merge) + rota; semântica de percentual unificada (30 = 30%) corrigindo os `*100`/`/100` divergentes no `Settings.tsx`.
  - **TSK-20 (demais rotas):** badge de notificações migrado para `api.notificacoes.getCount()` (antes sem token e campo errado); `GET /api/billings` ganhou resource no `financeiro.ts` (antes 404); `MetricsSection` deixou de chamar `/api/dashboard` inexistente; `api.agenda.syncVisitas` (morte, sem chamadores) removida.
  - **Validação:** `tsc` 0 erros; `eslint .` 0 erros / 161 warnings; `vitest run` **728 passed / 23 skipped / 0 failed**; `vite build` OK; `npx playwright test` **186 passed / 0 failed**; smoke test manual dos endpoints novos (200/501 corretos).
  - **Arquivos novos/modificados:** `drizzle/0018_create_configuracoes_precificacao.sql`, `src/api-lib/quotation-tecnico.ts`, `api/index.ts`, `src/api-lib/{_init,financeiro}.ts`, `src/lib/api.ts`, `src/components/{layout/NotificacoesBadge,settings/Settings}.tsx`, `src/modules/quotations/{pages/QuotationForm,components/ModalEnviarCliente}.tsx`, `src/pages/Quotations/QuotationDetail.tsx`, `src/pages/landing/components/MetricsSection.tsx` + docs.

- **[27/09/2026 - TSK-17 concluída]:** padrão consolidado de formulários (item B remanescente da auditoria).
  - **Novos `ui/FormActions` e `ui/BackButton`:** rodapé padrão (Cancelar `outline` + Salvar `primary`/`isLoading`, secundárias em `left`, `onSubmit` para modais sem `<form>`) e voltar padrão (também no `layout/Header` via `onBack`/`backLabel`).
  - **Migrações:** **21 arquivos / 23 rodapés** de modal/página (Fornecedores, Materiais, Movimentações, Prospecção, RH, SKU, Engenharia, Kanban de Projetos, Calendário, Compras, Pós-Venda, ClientForm, ModalEvento, QuotationForm, SaaS Admin, Settings, Financeiro ×4) + **15 arquivos / 16 voltar** (11 blocos duplicados "Voltar ao Painel Financeiro", `ProductionDetail` ×2, `StockMovements`, `QuotationForm`); styles inline e classes legadas (`btn btn-primary`) removidos; testids de E2E preservados.
  - **Validação:** `tsc` 0 erros; `eslint .` 0 erros / 161 warnings; `vitest run` **728 passed / 23 skipped / 0 failed**; `vite build` OK; `npx playwright test` **186 passed / 0 failed** (39 visuais sem regressão).
  - **Arquivos novos/modificados:** `src/components/ui/{FormActions,BackButton,index}.tsx`, `src/components/layout/Header.tsx` + 34 arquivos migrados.

- **[27/09/2026 - TSK-14 + TSK-15 concluídas]:** migração de botões e specs de inserção.
  - **TSK-14 — `<button>` → `<Button>`:** **289 tags em 84 arquivos** migradas por AST (`scratch/migrate-buttons.cjs`), 0 crus fora de `ui/`; `variant` heurístico (`plain` 241 / `outline` 41 / `danger` 7) + `size="plain"` (zero imposição visual); `ui/Button.tsx` ganhou `variant: plain` e `size: plain` e injeta `gap-2` no `isLoading`; **`isLoading` em 19 botões / 14 arquivos** (6 submits de formulário com `type="submit"` preservado).
  - **TSK-15 — inserção E2E:** helper `tests/e2e/helpers/insertionMock.ts` + **9 testes novos** (`insertion.spec.ts`: Fornecedores, Engenharia, Peças/SKU, Compras, Pós-Venda, Projetos, Financeiro wizard; `insertion-agenda.spec.ts`: Calendário, Visitas) — total **11 testes de inserção**; módulos sem fluxo de criação documentados em `tareas.md`.
  - **Bugs reais corrigidos:** `ModalEvento` perdia `cliente_id` (`Number(uuid)` → `NaN` → `null`, mas o banco guarda UUID); **34 caracteres `U+FFFD`** em 5 arquivos (mojibake visível na UI, ex.: "C?digo SKU") corrigidos via `scratch/fix-fffd.cjs`.
  - **Validação:** `tsc` 0 erros; `eslint .` 0 erros / 162 warnings; `vitest run` **728 passed / 23 skipped / 0 failed**; `vite build` OK; `npx playwright test` **186 passed / 0 failed** (18 specs, inclui 39 visuais sem regressão).
  - **Arquivos novos/modificados:** `tests/e2e/{insertion,insertion-agenda}.spec.ts`, `tests/e2e/helpers/insertionMock.ts`, `scratch/{migrate-buttons,fix-fffd}.cjs`, `src/components/ui/Button.tsx`, `src/components/agenda/ModalEvento.tsx` + 84 arquivos de botões + 5 arquivos de encoding.

- **[27/09/2026 - Execução do plano aprovado (Fases 0–6)]:** auditoria validada e lacunas atacadas.
  - **Fase 0/6 — validação:** `vitest run` **728 passed / 23 skipped / 0 failed**; `vite build` **OK**; `tsc` app+node **0 erros**; `eslint .` **0 erros / 162 warnings**; Playwright **177 passed / 0 failed**.
  - **Fase 2 — lacunas:** 20 `alert(` → `useToast` (**0 restantes**); 28 PNGs de debug removidos (com `.gitignore`); 5 testes órfãos/duplicados removidos (2 testes de `quotation.spec.ts` movidos para `quotations.spec.ts`); 3 `@todo` de modal resolvidos.
  - **Fase 3 — Design System:** `<select>` **100%** (0 crus fora do DS); `<input>` **104 tags / 39 arquivos** migrados; **`<button>` ainda cru (297 tags / 88 arquivos)** → TSK-14 pendente.
  - **Fase 4 — E2E:** regressão visual criada (`visual.spec.ts`, **39 snapshots**, skip no CI) e 1º spec de inserção (`estoque-insert.spec.ts`, 2 testes); restam 14 módulos de inserção.
  - **Fase 5 — CI:** `npm run typecheck`, steps de lint/typecheck bloqueantes, `continue-on-error` removido e jobs E2E com API real + secrets Neon + `wait-on`.
  - **Bugs corrigidos no caminho:** `Modal.tsx` escondia todo o conteúdo do diálogo (`aria-hidden="true"` na superfície); `Inventory.tsx` nunca carregava dados no mount.
  - **Arquivos novos/modificados:** `tests/e2e/{visual,estoque-insert}.spec.ts`, `tests/e2e/helpers/auditMock.ts`, `scratch/migrate-inputs.cjs`, `.github/workflows/{ci,e2e}.yml`, `package.json`, `src/components/ui/Modal.tsx`, `src/components/inventory/Inventory.tsx` + 39 arquivos de inputs/selects.

- **[27/09/2026 - Auditoria Cruzada docs × código]:** Verificação executada dos quatro documentos contra o código-fonte.
  - **Números confirmados:** suíte unitária **728 passed / 23 skipped / 0 failed**; `vite build` **OK**; `tsc` **0 erros** (app + node); `eslint .` **0 erros** (170 warnings); Playwright **137 passed / 0 failed**.
  - **Lacunas identificadas:** 20 `alert(` em 11 arquivos; migração do DS a ~5% (73 `<input>` crudos vs 2 `ui/Input`, 46 `<select>` vs 0, 117 `<button>` vs 11); E2E de inserção em só 3 de 35 rotas; **0** testes de regressão visual; CI sem lint/typecheck e com jobs E2E sem API/banco; 28 PNGs de debug versionados; 4 testes órfãos; `quotation.spec.ts` duplicado.
  - Novas tarefas **TSK-12..TSK-16** registradas em `tareas.md`.

- **[27/09/2026 - 11:55]:** Diagnóstico inicial do projeto (Evolução). Realizada simulação de auditoria focada em inserção de dados e consistência visual a pedido do usuário. Gerados `RELATORIO_AUDITORIA.md`, `plan_implementacion.md` e `tareas.md`.
  - Arquivos modificados: `RESUMO_PROJETO.md`, `RELATORIO_AUDITORIA.md`, `plan_implementacion.md`, `tareas.md`.
- **[27/09/2026]:** Execução do **Sprint 1 (Fase 1 — Estabilização do Motor de Dados)** e parte do Sprint 2.
  - **Schema/Integração (TSK-01):** `src/db/schema/crm.ts` (`clientes.id` → `uuid`) e `quotations.ts` (`clienteId` → `uuid`) alinhados ao banco real (criado em `_init.ts`). Removido `Number(clienteId)` que produzia `NaN`.
  - **API (TSK-02):** `src/api-lib/crm.ts` POST/PUT normalizados; `quotations.ts` POST passa a persistir todos os campos do item; soft-delete de orçamentos por cliente usa UUID.
  - **Produção:** status `FINALIZADA`/`FINALIZADO` normalizados (frontend usa `FINALIZADO`).
  - **UI (TSK-06):** corrigido submit do modal de Cliente (`form id="client-form"`) e removido footer duplicado.
  - **Estoque:** `useEstoque.ts` corrigido (métodos de API inexistentes) e `Inventory.tsx` (tipo `Material`, `created_at`).
  - **Design System:** Badge compatível (`components/common`) volta a aceitar `variant`.
  - **Qualidade:** typecheck **229 → 142** erros (núcleo CRM sem erros); suíte completa **728 passed / 0 failed**.
  - Arquivos modificados: `src/api-lib/{crm,quotations,production,_productionForecasting,_db,middleware/tenantMiddleware}.ts`, `src/db/schema/{crm,quotations}.ts`, `src/schemas/quotation.schema.ts`, `src/modules/quotations/hooks/useQuotation.ts`, `src/pages/Clients/ClientForm.tsx`, `src/components/clients/Clients.tsx`, `src/components/{inventory/Inventory,common/Badge,common/index}.tsx`, `src/hooks/useEstoque.ts`, `src/pages/Production/ProductionDetail.tsx`, `src/types/qrcode.d.ts`, entre outros ajustes de type-only imports.

- **[27/09/2026]:** Continuação — Sprint 2 (UI) e limpeza de tipos.
  - **Headers (TSK-08):** páginas ativas já seguem "título à esquerda / ações à direita" com tokens; `QuotationList` e `ProductionList` migrados para o componente compartilhado `layout/Header`.
  - **Orçamentos (TSK-07):** `modules/quotations/pages/QuotationForm.tsx` confirmado no design system (tokens + DS Buttons).
  - **Typecheck:** **189 → 61** erros; corrigidos imports quebrados e bugs reais (Modal `isOpen`→`open`, `api.events` inexistente, Dashboard com métricas não derivadas).
  - **Validação:** suíte 728 testes OK, `vite build` OK, ESLint 0 erros.

## TODOs / Próximos Passos

- [x] Fixar erros de inserção de dados na API (Clientes, Orçamentos, Produção, Estoque).
- [x] Padronizar headers das páginas ativas e o formulário de Orçamentos (tokens + DS Buttons).
- [x] **Sprint 3 (parcial):** E2E com dados fictícios e submissão real para **Clientes, Orçamentos e RH** (137/0).
- [x] Reduzir os 61 erros de typecheck restantes → **typecheck zerado (0 erros)**.
- [x] **TSK-12:** substituir os 20 `alert(` por toast — **concluído (0 `alert(`)**.
- [x] **TSK-13:** higiene do repositório — **concluído** (PNGs, testes órfãos, spec duplicada, 3 `@todo` de modal).
- [x] **TSK-14:** migração de `<select>`/`<input>`/`<button>` para o DS — **concluída** (289 botões migrados, `isLoading` em 19 submits, `variant`/`size` plain no DS).
- [x] **TSK-15:** regressão visual (39 snapshots) + **11 testes de inserção** em Estoque, Fornecedores, Engenharia, Peças, Compras, Pós-Venda, Projetos, Financeiro, Calendário e Visitas — **concluída** (módulos sem fluxo de criação documentados).
- [x] **TSK-16:** CI com lint/typecheck bloqueantes e jobs E2E com API real (secrets Neon) — **concluído**.
- [x] **TSK-17:** layout de formulários (voltar/cancelar/salvar) — **concluída** (`ui/FormActions` em 21 arquivos/23 rodapés + `ui/BackButton` em 15 arquivos/16 voltar; item B da auditoria resolvido).
