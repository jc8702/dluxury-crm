# 📊 Relatório de Auditoria: D'Luxury CRM (Status Atual)

**Data da Auditoria:** 27/09/2026
**Foco:** Funcionalidade de Inserção de Dados e Consistência de Interface (UI/UX)

---

## ✅ 0. Corrigido desde a auditoria (revalidado em 27/09)

Os itens **A** e **B** abaixo foram integralmente resolvidos (evidência: suíte unitária 728 passed / 0 failed, E2E **186 passed / 0 failed**, typecheck 0 erros):

- **Módulo de Clientes:** schemas UUID (`clientes.id`, `quotations.cliente_id`), normalização camelCase/snake_case, 422 com mensagem clara, modal com `form id` correto.
- **Módulo de Orçamentos:** POST persiste todos os campos do item; soft-delete por UUID; E2E com asserção de payload.
- **Módulo de Produção:** status `FINALIZADO` normalizado; `ReciboPreview` desembrulhava mal a resposta da API (bug real corrigido).
- **Módulo de Estoque:** `useEstoque.ts` (métodos de API inexistentes) e `Inventory.tsx` corrigidos; **a página agora carrega dados no mount** (`reloadInventoryData` nunca era chamado na visita — bug encontrado pelo E2E de inserção).
- **Tema:** 0 classes `dark:` espalhadas — aderência ao Tailwind v4 normalizada.
- **Acessibilidade de modais:** `src/components/ui/Modal.tsx` escondia **todo o conteúdo do diálogo** da árvore de acessibilidade (`aria-hidden="true"` na superfície) — corrigido.
- **Lacunas de processo:** TSK-12 (`alert(` → toast, 0 restantes), TSK-13 (higiene do repositório) e TSK-16 (CI com lint/typecheck e E2E contra API real) **concluídas**.
- **TSK-14 (Design System de botões):** **289 `<button>` → `<Button>` em 84 arquivos** (0 crus fora do DS), `variant` heurístico sem imposição visual, `isLoading` em 19 botões/14 arquivos — **concluída**.
- **TSK-15 (E2E de inserção):** `helpers/insertionMock.ts` + 9 testes novos (Fornecedores, Engenharia, Peças, Compras, Pós-Venda, Projetos, Financeiro wizard, Calendário, Visitas) = **11 testes de inserção** — **concluída**; módulos sem fluxo de criação documentados.
- **`ModalEvento` (agenda):** `cliente_id` convertido com `Number()` → `NaN` → `null` no payload (banco guarda UUID) — visitas/eventos perdiam o vínculo com o cliente; corrigido.
- **Encoding:** **34 caracteres `U+FFFD`** em 5 arquivos (ex.: "C?digo SKU" na tela de Peças) corrigidos — 0 restantes em `src/`.
- **TSK-17 (Layout de Formulários — item B remanescente):** padrão consolidado com **`ui/FormActions`** (Cancelar `outline` + Salvar `primary` com `isLoading`, ações secundárias em `left`, `onSubmit` para modais sem `<form>`) e **`ui/BackButton`** (também usado pelo `layout/Header` via `onBack`): **21 arquivos / 23 rodapés** de formulário e modal migrados (Fornecedores, Materiais, Movimentações, Prospecção, RH — Colaborador/Adiantamento/Gerar Folha, SKU, Engenharia, Kanban de Projetos, Calendário, Compras, Pós-Venda, ClientForm, ModalEvento, QuotationForm, SaaS Admin ×2, Settings ×2, Financeiro Classes/Condições/Formas/Rentabilidade) + **15 arquivos / 16 voltar** padronizados em `<BackButton>` (11 blocos duplicados "Voltar ao Painel Financeiro", `ProductionDetail` ×2, `StockMovements`, `QuotationForm`); testids de E2E preservados (`btn-salvar`, `btn-cancel`, `btn-salvar-adiantamento`, `btn-confirm-gerar`).

- **Recuperação do banco de dados (origem → produção):** o banco de produção (Neon `ep-winter-unit`, usado pela Vercel) estava com **85 de 91 tabelas** e ~365 linhas a menos que a origem (`ep-holy-term`): **6 tabelas ausentes** (`erp_skus` 83, `materiais` 2, `clientes` 1, `fechamentos_financeiros`, `pedidos_compra`, `pedido_compra_itens` — todas usadas por Serviços/Estoque/Compras/Financeiro) e **7 colunas faltando** (`notificacoes.updated_at`, `ordens_producao.quotation_id/deleted_at/tenant_id`, `quotations.token_expira_em`, `users.token_version/ativo`). Sincronização executada com `scratch/db-sync.cjs` (DDL espelhado da origem + sequences + índices, cópia por PK com `ON CONFLICT DO NOTHING`, ordem por dependência FK, `setval` nas sequences): **91/91 tabelas e origem = destino em todas as contagens**; tabelas que já tinham mais linhas no destino (`quotations`, `interacoes_prospeccao`, `prospeccoes`) **não foram tocadas**. Migração versionada `drizzle/0018_create_configuracoes_precificacao.sql` (+ `src/api-lib/_init.ts`) cobre ambientes novos.
- **6 telas/rotas quebradas — CORRIGIDO:** (1) **PDF de orçamento** — `/api/quotations/export-pdf` devolvia JSON e `/api/orcamentos/export-pdf` respondia 410: os botões agora usam o gerador client-side `exportBudgetToPDF` (jsPDF) e a mensagem de WhatsApp do `ModalEnviarCliente` usa o link público de aprovação (de onde o cliente baixa o PDF e assina); (2) **Configurações → Precificação Técnica** — `api.orcamentoTecnico` chamava `/api/quotation-tecnico` inexistente (404): novo handler `src/api-lib/quotation-tecnico.ts` + rota em `api/index.ts`, com a tabela `configuracoes_precificacao` criada (já era consultada por `recalcularOrcamento` e **não existia em nenhum dos dois bancos**) e semântica de percentual unificada (30 = 30%) corrigindo os `*100`/`/100` divergentes no `Settings.tsx`; (3) **Badge de notificações** — `fetch('/api?action=contar_nao_lidas')` sem autenticação e lendo campo errado: agora usa `api.notificacoes.getCount()` (`/api/notificacoes/contar` com Bearer token); (4) **`GET /api/billings`** — rota existia mas caía no dispatch do financeiro e retornava 404: resource `billings` adicionado em `financeiro.ts` (lista por tenant); (5) **Métricas da landing** — `MetricsSection` buscava `/api/dashboard` inexistente (404 no console): fetch removido, métricas estáticas de marketing; (6) **`api.agenda.syncVisitas`** — apontava para `action=sincronizar` não implementado e **não tinha chamadores**: método morto removido.

Os itens **A** e **B** da auditoria estão **integralmente resolvidos**.

---

## 🔴 1. Funcionalidades com Falha (Não Passou)

### A. Inserção de Dados e Integração API — ✅ RESOLVIDO (ver seção 0)

- **Módulo de Clientes:** Falha ao salvar novos clientes. Erros de validação silenciosos entre o frontend (React Hook Form) e o backend (Drizzle Schema).
- **Módulo de Orçamentos:** Erros de inserção de itens. O payload enviado pela UI não corresponde exatamente aos tipos esperados pela API (`/api/quotations`).
- **Módulo de Produção:** Erro ao mudar status ou registrar movimentos de peças.
- **Sintoma Geral:** Muitas chamadas de inserção (POST/PUT) estavam retornando `500 Internal Server Error` ou `422 Unprocessable Entity` devido a campos obrigatórios faltando, tipagens rígidas no banco (Neon Serverless) que não estavam sendo tratadas na UI, e falha na inicialização correta do módulo de configuração da API.

### B. Consistência Visual e Padrão de Design — ✅ RESOLVIDO (ver seção 0)

- **Botões e Ações:** ✅ **RESOLVIDO** — **289 `<button>` migrados para `ui/Button` em 84 arquivos** (0 crus fora do DS; 8 restam dentro da própria DS), com `isLoading` em 19 botões/14 arquivos (TSK-14 concluída).
- **Layout de Formulários:** ✅ **RESOLVIDO** — padrão consolidado modal × página dedicada com `ui/FormActions` (**21 arquivos / 23 rodapés**: Cancelar `outline` + Salvar `primary`/`isLoading` + secundárias em `left`) e `ui/BackButton` (**15 arquivos / 16 voltar**, incl. os 11 blocos duplicados "Voltar ao Painel Financeiro" e o `layout/Header` com `onBack`); headers padronizados (7 arquivos com `layout/Header`) — TSK-17 concluída.
- **Feedback Visual (Toast/Alerts):** ✅ **RESOLVIDO** — **0 `alert(`** em `src/` (20 convertidos para `useToast` em 11 arquivos) — TSK-12 concluída.
- **Tema:** ✅ **RESOLVIDO** — 0 classes `dark:` espalhadas; tokens `var(--ui-*)` no lugar.
- **Inputs/Selects:** ✅ **RESOLVIDO** — `<select>` **0 crus** (fora do próprio `ui/Input.tsx`); `<input>` 104 tags migradas em 39 arquivos, restando **26 tags / 21 arquivos** de `checkbox`/`radio`/`file`/`range` (fora do escopo do `ui/Input`).
- **Regressão visual:** ✅ **RESOLVIDO** — `tests/e2e/visual.spec.ts` com **39 snapshots** por rota (baseline commitada; skip no CI).

---

## 🟢 2. Funcionalidades Estáveis (Passou)

- **Rotas e Navegação Base:** O React Router está navegando corretamente entre as páginas autenticadas.
- **Autenticação:** O fluxo de login e validação de token JWT e estado global (Zustand) estão íntegros.
- **Visualização (Leitura):** As tabelas e listagens (`GET`) estão, em sua maioria, conseguindo renderizar dados quando o banco já possui registros.

---

## 📌 Conclusão da Auditoria

A aplicação possui uma arquitetura moderna (React 19, Tailwind v4, Neon DB), mas sofre de **dívida técnica de integração** na camada de Mutação (Inserção/Edição de dados) e **dívida de UX** pela falta de componentes padronizados reaproveitáveis. O banco de dados é rigoroso, e o frontend não está tratando essas regras antes de enviar os dados.
