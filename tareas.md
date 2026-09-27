# 📋 Backlog de Tarefas (Tareas)

## Sprint 1: Fixação de Dados e API

- [x] **TSK-01:** Revisar `src/db/schema` vs. Validações Zod (Frontend) para Clientes e Orçamentos.
  - ✅ `src/db/schema/crm.ts`: `clientes.id` corrigido de `integer` para `uuid` (a tabela real usa UUID).
  - ✅ `src/db/schema/quotations.ts`: `clienteId` corrigido de `integer` para `uuid` (FK real `clients.id`).
  - ✅ `src/validators/clientSchema.ts` alinhado (telefone normalizado, campos opcionais, defaults).
  - ✅ Removido o `Number(clienteId)` que gerava `NaN` em `useQuotation.ts` (cliente é UUID).
- [x] **TSK-02:** Corrigir os endpoints de POST/PUT em `src/api-lib/crm.ts` e `quotations.ts`, removendo importações falhas.
  - ✅ `crm.ts` POST/PUT normalizados (camelCase/snake_case, cômodos array→string, derivação de `razao_social`/`municipio`/`situacao_cadastral`, 422 para nome inválido).
  - ✅ `quotations.ts` POST agora persiste os campos completos do item (nome, dimensões, material, preços, margem) em vez de só `skuEngenhariaId`+`quantidade`.
  - ✅ Soft-delete de orçamentos por cliente passou a usar UUID (não `Number`).
- [x] **TSK-03:** Adicionar logger claro para requisições de backend rejeitadas pelo Banco de Dados.
  - ✅ `logger.error` nos catches de `crm.ts`, `quotations.ts` e `production.ts`.
- [x] **TSK-04:** Testar inserção completa de um Cliente e um Orçamento via Postman ou console antes da UI.
  - ✅ Suíte de API: `crm`, `quotations`, `quotations-bom`, `quotations-extra`, `production` → **85 passed / 3 skipped / 0 failed**.
  - ✅ Teste stale de fallback GET removido/atualizado.

## Sprint 2: UI e Componentes Padronizados

- [x] **TSK-05:** Criar/Refatorar componente global `<Button>` para ter variantes: `default`, `outline`, `ghost`, `danger`.
  - ✅ `src/components/ui/Button.tsx` tem `primary/secondary/accent/outline/ghost/danger` + `isLoading`/`disabled` + ícones.
- [x] **TSK-06:** Refatorar o `<Form>` de Clientes para usar o novo padrão de botões e inputs.
  - ✅ `ClientForm` usa `Button/Input/Select/Textarea` + RHF/Zod.
  - ✅ Corrigido o submit do modal: `<form id="client-form">` e removido o footer duplicado em `Clients.tsx`.
- [x] **TSK-07:** Refatorar o `<Form>` de Orçamentos para usar o novo padrão visual.
  - ✅ `modules/quotations/pages/QuotationForm.tsx` usa tokens (`var(--ui-*)`), `<Button>` do DS com `leftIcon`/loading, toasts e header título/ações.
- [x] **TSK-08:** Refatorar headers das páginas (Título à esquerda, Ações à direita).
  - ✅ Páginas ativas já seguem o padrão (título esquerda / ações direita).
  - ✅ `QuotationList` e `ProductionList` migrados para o componente compartilhado `layout/Header` (ações convertidas para o `<Button>` do DS).
- [x] **TSK-09:** Integrar toast global para feedback claro de inserções.
  - ✅ `src/context/ToastContext.tsx` + `useToast`, usado em Clientes/Estoque/Financeiro.

## Sprint 3: Validação

- [x] **TSK-10:** Atualizar scripts de auditoria Playwright para preencher formulários de ponta a ponta com dados reais/fictícios e submeter.
  - ✅ Novos helpers: `tests/e2e/helpers/formData.ts` (dados fictícios centralizados) e `formApi.ts` (mock stateful com captura de payloads POST/PUT).
  - ✅ `clients.spec.ts`: cadastro completo preenchendo todos os campos, submissão real, toast de sucesso e assertions sobre o payload da API (incl. normalização de telefone pelo Zod); teste de validação bloqueando envio sem nome.
  - ✅ `quotations.spec.ts`: fluxo completo cliente→orçamento; edição de margem/taxa/validade com PUT verificado no payload; seleção de cliente no dropdown.
  - ✅ Mock stateful simula persistência do servidor (PUT mescla no estado; GET devolve o estado atualizado) — elimina corridas do reload pós-PUT.
  - ✅ Corrida UI×refresh serializada com `expect.poll` aguardando o GET de recarga entre edições: **60/60 passed** com `--repeat-each=5`.
- [x] **TSK-11:** Rodar E2E e aprovar todos os testes localmente sem warnings de console.
  - ✅ Suíte E2E completa: **137 passed / 0 failed**.
  - ✅ Correções: rotas HashRouter em `auth.spec`/`quotation.spec` (mock de login + `role="alert"` no erro), testids duplicados `tab-*` → `tabpanel-*` em `RHPage`, URL do detalhe de folha `/#/rh/f1`, `ReciboPreview` desembrulhando resposta da `apiCall` (bug real: modal de recibo sempre em erro), `tenant-isolation` esperando 401 (contrato do `tenantMiddleware`), `checklist-functional` "Domínio personalizado" usando fetch no contexto da página (mock era ignorado por `page.request`) para não depender do rate limit da API.

## 🧱 Qualidade (transversal)

- [x] Reduzir erros de typecheck: **189 → 61** erros totais (0 em testes).
  - Núcleo CRM/Orçamentos/Produção/Estoque/Agenda/Dashboard/Kanban **sem erros de tipo**.
  - Tipos compartilhados corrigidos: `SqlClient.join/query`, `ResponseLike.setHeader/headersSent`.
  - Badge compatível (`components/common`) volta a aceitar `variant`.
  - Corrigidos imports quebrados: `utils/planodeCorte`, `simulador-producao/domain/types`, `context/CRMContext` → `types/entities`, `types/simulator` (novo).
  - Bugs reais encontrados ao tipar: `api.events.remove` inexistente (→ `api.agenda.delete`), `<Modal isOpen>` (→ `open`) em Dashboard e Pós-Venda, `Dashboard` consumindo `totalPeriodo`/`currentMeta` inexistentes.
- [x] Suíte completa: **728 passed / 23 skipped / 0 failed**.
- [x] `npm run build` (vite): OK.
- [x] ESLint nos arquivos alterados: **0 erros**.
- [x] Typecheck **zerado (0 erros)** em `tsconfig.app.json` e `tsconfig.node.json`:
  - `simulador-corte`: `<bufferAttribute>` migrado para `args={[array, itemSize]}` (API R3F v9/three 0.184); `PecaSimulacao` importado; DragControls `onDragEnd` sem argumentos; `CollisionPolicy` no lugar de array nos limites.
  - `plano-corte`: unificado uso do `LayoutChapa` de `entities/CuttingPlan` nos literais (`tipo` obrigatório); `PecaPosicionada` exige `id`/`rotacionavel`; worker importa tipos corretos; `peca_id` → `id`; `espessura_mm` removido de `FiltrosRetalho`.
  - API: `recalcularOrcamento` recebe `tenantId`; guards de `candidate`/`fc.name` no ai-chat; casts seguros onde o fluxo já garante o valor.
  - Componentes: `KanbanBoard` sem prop `title` inexistente; `Button variant="danger"`; `EmptyState` com `React.ElementType` tipado; `Notificacao` usa `created_at`.
- [x] Revalidado após as correções: **728 passed / 0 failed** e build OK.
