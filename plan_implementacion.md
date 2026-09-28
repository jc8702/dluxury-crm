# 💎 Plano de Implementação e Correções (Padrão Diamante)

Este plano traça a rota para resolver definitivamente os erros de inserção de dados e unificar a interface do sistema, elevando o projeto a um padrão Enterprise funcional e esteticamente premium.

## Fase 1: Estabilização do Motor de Dados (Backend & Integração) — ✅ CONCLUÍDA

**Objetivo:** Garantir que 100% das inserções de dados (POST/PUT) funcionem sem erros.

1. **Auditoria de Schemas:** Sincronizar os schemas do Zod (Frontend) com os schemas do Drizzle ORM (Backend).
   - ✅ `clientes.id` e `quotations.cliente_id` agora são `uuid` (alinhados ao banco real). `clientSchema` revisado.
2. **Tratamento de Erros Global na API:** Padronizar as respostas de erro da API para que o frontend sempre receba mensagens claras (ex: "Campo X é obrigatório").
   - ✅ POST de Clientes retorna 422 com mensagem clara; endpoints registram erro via `logger`.
3. **Correção dos Módulos Críticos:**
   - ✅ Inserção de Clientes (normalização camelCase/snake_case + soft-delete de orçamentos por UUID).
   - ✅ Fluxo de Orçamentos: itens passam a persistir todos os campos (não só SKU+quantidade).
   - ✅ Produção (status `FINALIZADO` normalizado) e Estoque (hook + `Inventory.tsx` corrigidos).

## Fase 2: Padrão Visual "Diamante" (UI/UX) — ✅ CONCLUÍDA

**Objetivo:** Todas as páginas devem ser irmãs gêmeas no design, layout e comportamento.

1. **Design System Unificado:** ✅ **CONCLUÍDO** (TSK-14)
   - ✅ `<Button />` com variantes (`primary/secondary/accent/outline/ghost/danger/plain`) + `loading`/`disabled` + `size="plain"`.
   - ✅ Unificar inputs, selects e textareas — migração concluída.
     - Medição 27/09 (auditoria): **117** arquivos com `<button>` cru vs **11** que importam `ui/Button`; **73** com `<input>` cru vs **2** com `ui/Input`; **46** com `<select>` cru vs **0** com `ui/Select` → ~5% concluído (TSK-14).
     - Medição 27/09 **após execução**: `<select>` **0 cruos** (fora de `ui/Input.tsx`); `<input>` **26 tags / 21 arquivos** (só checkbox/radio/file/range, fora do escopo do `ui/Input`); `<button>` **297 tags / 88 arquivos** ainda crus → migração de inputs/selects **concluída**, botões **pendentes** (TSK-14).
     - Medição 27/09 **final**: `<button>` **289 tags → `<Button>` em 84 arquivos** (0 crus fora de `ui/`, 8 dentro da própria DS) + `isLoading` em **19 botões / 14 arquivos** → **TSK-14 concluída** (`variant`/`size` `plain` adicionados ao `Button` para zero imposição visual).
     - ✅ Estados `loading`/`disabled` nos submits (6 formulários + modais/wizards com `isLoading`).
2. **Padronização de Formulários e Modais:** ✅ **CONCLUÍDO** (TSK-17)
   - ✅ Modal de Clientes corrigido (submit via `form id`, sem footer duplicado).
   - ✅ Formulário de Orçamentos já usa tokens + DS Buttons.
   - ✅ Headers padronizados (título esquerda / ações direita) via `layout/Header`.
   - ✅ **Padrão voltar/cancelar/salvar consolidado:** novos `ui/FormActions` (rodapé padrão Cancelar `outline` + Salvar `primary`/`isLoading`, ações em `left`, `onSubmit` p/ modais sem `<form>`) em **21 arquivos / 23 rodapés** e `ui/BackButton` (também via `layout/Header` `onBack`) em **15 arquivos / 16 voltar** — inclui os 11 blocos duplicados "Voltar ao Painel Financeiro".
3. **Feedback de Sucesso/Erro:**
   - ✅ Toasts consistentes via `ToastContext`/`useToast`.

## Fase 3: Validação End-to-End — ✅ CONCLUÍDA

1. ✅ Executar o Playwright inserindo dados fictícios reais e submetendo — **concluído para Clientes, Orçamentos, RH, Estoque, Fornecedores, Engenharia, Peças/SKU, Compras, Pós-Venda, Projetos, Financeiro (wizard 3 passos), Calendário e Visitas** (helpers `tests/e2e/helpers/{formData,formApi,insertionMock}.ts`; **11 testes de inserção**).
2. ✅ **TSK-15 concluída:** os demais módulos **não têm fluxo de criação** (sem diálogo/botão de inserção): Produção (só "Atualizar Quadro"), Retalhos (filtros), Notificações ("Verificar Novos"), Relatórios (0 botões), Prospecção e SaaS Admin (estado de erro com mock vazio) — documentado em `tareas.md`.
3. ✅ **Regressão visual concluída (TSK-15):** `tests/e2e/visual.spec.ts` com **39 snapshots** (`toHaveScreenshot`) por rota, com `test.skip` no CI (fontes Linux ≠ Windows) e baseline commitada.
4. ✅ **CI concluído (TSK-16):** script `npm run typecheck`; steps de lint/typecheck bloqueantes; `continue-on-error` removido; jobs E2E sobem a API real (`npm run dev:api`) com secrets Neon + `wait-on`.

> Observação (validado por execução em 27/09): suíte unitária **728 passed / 23 skipped / 0 failed**; `vite build` **OK**; `tsc` **0 erros**; `eslint .` **0 erros / 162 warnings**; Playwright **186 passed / 0 failed** (18 specs).
