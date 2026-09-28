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
- [x] **TSK-11:** Rodar E2E e aprovar todos os testes localmente sem erros de aplicação no console.
  - ✅ Suíte E2E completa: **137 passed / 0 failed**.
  - ⚠️ Restam 2 mensagens `401 Unauthorized` no console (chamada a API real durante sessão mockada) — nenhum erro de aplicação.
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

## 🔍 Auditoria Cruzada 27/09 (docs × código)

- [x] Validação numérica executada: `vitest run` → **728 passed / 23 skipped / 0 failed** (57 arquivos); `vite build` → **OK** (46s); `tsc -p app/node` → **0 erros**; `eslint .` → **0 erros / 170 warnings**; Playwright → **137 passed / 0 failed**.
- [x] Auditoria estática de cobertura: 35 rotas × 17 specs; inserção E2E apenas em clientes/orçamentos/RH; regressão visual inexistente; 20 `alert(` em 11 arquivos; DS migrado a ~5% (73 `<input>` crudos vs 2 `ui/Input`; 46 `<select>` vs 0; 117 `<button>` vs 11).

### Lacunas abertas (novas tarefas)

- [x] **TSK-12:** Substituir os 20 `alert(` por `useToast` — **concluído** (0 `alert(` em `src/`).
- [x] **TSK-13:** Higiene do repositório — **concluído**: 28 PNGs (`screenshot-*`/`trace-*`) removidos + padrões no `.gitignore`; `tests/auth.spec.ts`, `tests/debug.spec.ts`, `tests/e2e/example.spec.ts`, `tests/e2e/_debug.spec.ts` apagados; os 2 testes de `quotation.spec.ts` movidos para `quotations.spec.ts` e a spec deletada; 3 `@todo` de modal (`isOpen` → `open`) resolvidos (resta só `src/api-lib/copilot.ts:508`, alheio ao modal).
- [x] **TSK-14:** migração de `<input>`/`<select>`/`<button>` para o DS — **concluída**: **`<select>` 100%** (0 crus fora de `ui/Input.tsx`), **`<input>` 104 tags / 39 arquivos** migrados (restam 26 tags / 21 arquivos, só `checkbox`/`radio`/`file`/`range`, fora do escopo do `ui/Input`), **`<button>`: 289 tags → `<Button>` em 84 arquivos** via `scratch/migrate-buttons.cjs` (AST) — 0 crus fora de `ui/` (8 restam dentro da própria DS), `variant` heurístico (`plain` 241 / `outline` 41 / `danger` 7) + `size="plain"` (zero imposição visual); `Button` ganhou `variant: plain` e `size: plain`; **`isLoading` em 19 botões / 14 arquivos** (6 submits de formulário com `type="submit"` preservado + modais/wizards), imports órfãos (`Loader2`) removidos.
- [x] **TSK-15:** inserção E2E nos módulos restantes — **concluída**: helper `tests/e2e/helpers/insertionMock.ts` (sessão autenticada + GETs de clientes/categorias/classes e captura de POST/PUT/PATCH) + **9 novos testes**: `insertion.spec.ts` (Fornecedores, Engenharia, Peças/SKU, Compras, Pós-Venda, Projetos, Financeiro/Títulos a Receber — wizard de 3 passos) e `insertion-agenda.spec.ts` (Calendário, Visitas — `ModalEvento`); com o `estoque-insert.spec.ts` prévio são **11 testes de inserção**. **Módulos sem fluxo de inserção** (sem diálogo/botão de criação, documentados): Produção (só "Atualizar Quadro"), Retalhos (filtros), Notificações ("Verificar Novos"), Relatórios (0 botões), Prospecção e SaaS Admin (estado de erro com mock vazio). A regressão visual (`visual.spec.ts`, 39 snapshots) também é TSK-15.
- [x] **TSK-16:** CI — **concluído**: script `npm run typecheck` (app + node), steps de `lint`/`typecheck` bloqueantes, `continue-on-error` removido dos unit tests, job `e2e` do `ci.yml` sobe `dev:api` + `vite preview` com `wait-on`, `e2e.yml` sobe API real com secrets Neon (`DATABASE_URL`/`NEON_DATABASE_URL`, `APP_JWT_SECRET`, `APP_INIT_KEY`) e Node 24.
- [x] **TSK-17:** Layout de Formulários (item B remanescente da auditoria) — **concluída**: padrão consolidado **modal × página dedicada (voltar, cancelar, salvar)** com dois componentes novos em `src/components/ui/`: **`FormActions`** (rodapé padrão: Cancelar `outline`/`type="button"` + Salvar `primary`/`type="submit"` com `isLoading`, ações secundárias no slot `left`, `onSubmit` opcional para modais sem `<form>`, `submitLabel`/`cancelLabel`/testids) e **`BackButton`** (voltar padrão, usado pelo `layout/Header` com `onBack`/`backLabel`). **21 arquivos / 23 rodapés** migrados (Fornecedores, Materiais, Movimentações, Prospecção, Colaborador, Adiantamento, SKU, Engenharia, Kanban de Projetos, Calendário, Compras, Pós-Venda, RH/Gerar Folha, ClientForm, ModalEvento, QuotationForm, SaaS Admin ×2, Settings ×2, Financeiro Classes/Condições/Formas/Rentabilidade) + **15 arquivos / 16 voltar** em `<BackButton>` (11 blocos duplicados "Voltar ao Painel Financeiro", `ProductionDetail` ×2, `StockMovements`, `QuotationForm`); styles inline de rodapé e classes legadas (`btn btn-primary`) removidos; testids de E2E preservados (`btn-salvar`, `btn-cancel`, `btn-salvar-adiantamento`, `btn-confirm-gerar`).

### Bugs reais encontrados na execução

- [x] `src/components/ui/Modal.tsx:113` — a superfície do modal estava dentro de um `<div aria-hidden="true">`, escondendo **todo o conteúdo do diálogo** da árvore de acessibilidade (quebrava `getByRole` e leitores de tela). Atributo removido.
- [x] `src/components/inventory/Inventory.tsx` — a página **nunca chamava `reloadInventoryData()`** (0 `useEffect`): materiais/categorias só carregavam após alguma mutação. Adicionado efeito de carga no mount.
- [x] `src/components/agenda/ModalEvento.tsx` — `cliente_id` era convertido com `Number(e.target.value)` → `NaN` → `null` no payload, mas o banco guarda **UUID** (`eventos.cliente_id` TEXT com joins `::text`): agendar visita/evento com cliente selecionado **perdia o vínculo**. Valor string preservado (`string | number | null`). Encontrado pelo teste E2E de Visitas.
- [x] Mojibake em 5 arquivos: **34 caracteres `U+FFFD` literais** exibidos na UI como "C?digo SKU" (`components/skus/SKUPage.tsx` 23, `api-lib/production.ts` 6, `importacao-projetos.ts` 2, `kanban-producao.ts` 2, `projects.ts` 1) — corrigidos via `scratch/fix-fffd.cjs` (0 restantes em `src/`). Encontrado ao escrever os testes de Peças.

### Validação final (após toda a execução)

- `vitest run` → **728 passed / 23 skipped / 0 failed** (57 arquivos); `tsc` app+node → **0 erros**; `eslint .` → **0 erros / 161 warnings**; `vite build` → **OK**; `npx playwright test` → **186 passed / 0 failed** (18 specs: 38 rotas de auditoria + 39 visuais + 11 de inserção + demais). Revalidado após TSK-17 (FormActions/BackButton).
