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

## Fase 2: Padrão Visual "Diamante" (UI/UX) — 🔄 EM ANDAMENTO

**Objetivo:** Todas as páginas devem ser irmãs gêmeas no design, layout e comportamento.

1. **Design System Unificado:**
   - ✅ `<Button />` com variantes (`primary/secondary/accent/outline/ghost/danger`) + `loading`/`disabled`.
   - 🔄 Unificar inputs, selects e textareas (base pronta; páginas ainda em migração).
2. **Padronização de Formulários e Modais:**
   - ✅ Modal de Clientes corrigido (submit via `form id`, sem footer duplicado).
   - ✅ Formulário de Orçamentos já usa tokens + DS Buttons.
   - ✅ Headers padronizados (título esquerda / ações direita) via `layout/Header`.
3. **Feedback de Sucesso/Erro:**
   - ✅ Toasts consistentes via `ToastContext`/`useToast`.

## Fase 3: Validação End-to-End — ⏳ PENDENTE

1. Executar os testes do Playwright inserindo dados fictícios reais em todos os módulos e garantir que não haja erros 500 no console.
2. Garantir 100% de consistência em testes de regressão visual.

> Observação: suíte de testes unitários de API já validada (728 passed / 0 failed); **typecheck 100% limpo (0 erros)**.
