# RESUMO DE PROJETO: D'Luxury CRM

## Informações Gerais

- **Status Atual:** Sprint 1 (Estabilização de Dados) concluído; Sprint 2 (UI) em andamento.
- **Objetivo Central:** Garantir funcionamento perfeito de todas as funcionalidades (especialmente inserção de dados) e unificar o padrão visual/design (Padrão Diamante) em todas as páginas.
- **Última Atualização:** 27/09/2026

## Histórico de Alterações

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
- [x] Padronizar UI/UX (Botões/inputs, formulário de Orçamentos e headers das páginas ativas).
- [ ] **Sprint 3:** validar testes E2E (Playwright) com dados reais/fictícios e submissão real.
- [ ] Reduzir os 61 erros de typecheck restantes (módulos `simulador-corte` e `plano-corte`).
