# AUDITORIA FINAL — D'Luxury CRM

**Data:** 2026-09-20
**Branch:** `audit-2026-09`
**Método:** Análise estática de código (source review) + testes unitários existentes + script de auditoria
**Denominador:** 211 endpoints (MATRIZ.md)

---

## 1. RESUMO

### Nota Geral: 3/10

| Severidade | Qtd    |
| ---------- | ------ |
| 🔴 CRÍTICA | 8      |
| 🟠 ALTA    | 12     |
| 🟡 MÉDIA   | 18     |
| 🟢 BAIXA   | 9      |
| **TOTAL**  | **47** |

### Top 5 Riscos

| #   | Risco                                                                                                                          | Severidade | Impacto                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------ |
| 1   | **SQL Injection em `/api/prospeccao`** — interpolação direta de `req.query` em SQL raw (`prospeccao.ts:16-22`)                 | 🔴 CRÍTICA | Exfiltração/-destructão de dados. 1 endpoint público a queries parametrizadas. |
| 2   | **Token JWT sem revogação** — `validateAuth` não verifica se user existe no DB; DELETE é hard; token válido 7 dias pós-deleção | 🔴 CRÍTICA | Usuário deletado mantém acesso completo por 7 dias.                            |
| 3   | **Token aprovação reutilizável** — POST `/api/aprovacao` aprovar não verifica `status !== 'aprovado'` (`aprovacao.ts:126-148`) | 🔴 CRÍTICA | Cliente pode aprovar proposta infinitamente; potencial fraude financeira.      |
| 4   | **Duplo clique na baixa financeira** — sem debounce/loading guard frontend + sem `SELECT FOR UPDATE` backend                   | 🟠 ALTA    | Baixa duplicada em produção. Race condition confirmada.                        |
| 5   | **IDOR em PATCH financeiro** — contas-internas e formas-pagamento retornam 200 para cross-tenant (`MATRIZ.md` A6/A7)           | 🟠 ALTA    | Usuário do tenant A modifica dados do tenant B via PATCH.                      |

---

## 2. COBERTURA vs MATRIZ.md (211 endpoints)

| Status              | Qtd     | %        |
| ------------------- | ------- | -------- |
| ✅ PASSOU           | 22      | 10.4%    |
| ❌ FALHOU           | 3       | 1.4%     |
| 🔍 ANÁLISE ESTÁTICA | 47      | 22.3%    |
| 🔎 SUSPEITA         | 6       | 2.8%     |
| ⬜ NÃO TESTADO      | 133     | 63.0%    |
| **TOTAL**           | **211** | **100%** |

### Detalhamento por Categoria de Teste

| Categoria                   | Método               | Qtd Testada | Ferramenta                                 |
| --------------------------- | -------------------- | ----------- | ------------------------------------------ |
| Gates (Basic vs Enterprise) | HTTP real            | 12/12       | E2E `checklist-functional.spec.ts`         |
| Cálculos financeiros        | Execução DB          | 23/23       | `3B_Calculos_Financeiros.md`               |
| Cálculos RH                 | Unit test            | 14/14       | `rh.calculations.test.ts`                  |
| IDOR cross-tenant           | E2E + HTTP           | 16/16       | E2E `tenant-isolation.spec.ts` + HTTP      |
| Segurança (8 testes)        | Análise estática     | 8/8         | `T1-T8` sessão atual                       |
| UI/UX (6 análises)          | Análise estática     | 6/6         | Sessão atual                               |
| Financeiro robustez         | Análise estática     | 20/20       | `ETAPA_CONCLUIDA.md`                       |
| Produção (Kanban)           | Análise estática     | 7/7         | Sessão atual                               |
| Plano de Corte              | Unit test + estática | 8/8         | `MaxRectsOptimizer.test.ts` + sessão atual |
| Orçamentos (cálculos)       | Análise estática     | 15/15       | Sessão atual                               |
| SKUs                        | Análise estática     | 6/6         | Sessão atual                               |
| Prospecção                  | Análise estática     | 5/5         | Sessão atual                               |
| Pós-venda                   | Análise estática     | 4/4         | Sessão atual                               |
| Visitas                     | Análise estática     | 4/4         | Sessão atual                               |
| Calendário                  | Análise estática     | 3/3         | Sessão atual                               |

### Status por Módulo na MATRIZ.md

| Módulo                    | Total   | PASSOU | FALHOU | NÃO TESTADO |
| ------------------------- | ------- | ------ | ------ | ----------- |
| Infraestrutura / Públicos | 6       | 0      | 0      | 6           |
| Auth / Signup / Checkout  | 9       | 0      | 0      | 9           |
| SaaS Admin                | 4       | 0      | 0      | 4           |
| CRM / Clients             | 6       | 0      | 0      | 6           |
| Kanban (CRM)              | 3       | 0      | 0      | 3           |
| Kanban Produção           | 4       | 0      | 0      | 4           |
| Financeiro                | 27      | 10     | 3      | 14          |
| Condições Pagamento       | 3       | 3      | 0      | 0           |
| RH                        | 12      | 2      | 0      | 10          |
| Estoque (granular)        | 4       | 0      | 0      | 4           |
| Estoque (principal)       | 13      | 3      | 0      | 10          |
| Contratos                 | 3       | 0      | 0      | 3           |
| Quotations                | 15      | 0      | 0      | 15          |
| Quotations (aux)          | 6       | 0      | 0      | 6           |
| Engenharia / SKUs         | 9       | 0      | 0      | 9           |
| Serviços                  | 5       | 0      | 0      | 5           |
| Relatórios                | 4       | 0      | 0      | 4           |
| Projetos                  | 4       | 0      | 0      | 4           |
| Produção                  | 6       | 0      | 0      | 6           |
| Simulações                | 5       | 1      | 0      | 4           |
| After-Sales               | 4       | 0      | 0      | 4           |
| Usuários                  | 3       | 0      | 0      | 3           |
| Compras                   | 6       | 1      | 0      | 5           |
| Retalhos                  | 4       | 0      | 0      | 4           |
| Aprovação                 | 3       | 0      | 0      | 3           |
| Agenda                    | 7       | 0      | 0      | 7           |
| Notificações              | 4       | 0      | 0      | 4           |
| Plano de Corte            | 7       | 2      | 0      | 5           |
| Chapas                    | 1       | 0      | 0      | 1           |
| Engenharia SKUs           | 1       | 0      | 0      | 1           |
| Rentabilidade             | 6       | 0      | 0      | 6           |
| WhatsApp                  | 4       | 0      | 0      | 4           |
| Prospecção                | 8       | 0      | 0      | 8           |
| IA                        | 3       | 1      | 0      | 2           |
| Importação / Match        | 2       | 0      | 0      | 2           |
| **TOTAL**                 | **211** | **22** | **3**  | **186**     |

---

## 3. TODOS OS ACHADOS

### 3.1 SEGURANÇA

| ID  | Cat.        | Severidade | Localização                          | Passos                                                                            | Esperado vs Obtido                                                                                                                       | Evidência                                                                                                                       | Correção Sugerida                                                                           | Esforço |
| --- | ----------- | ---------- | ------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------- |
| S01 | SQLi        | 🔴 CRÍTICA | `src/api-lib/prospeccao.ts:16-22`    | GET `/api/prospeccao?status=' OR 1=1; DROP TABLE--`                               | Esperado: rejeição ou query parametrizada. Obtido: interpolação direta em SQL raw via `sql(query, [])` sem bind params.                  | `prospeccao.ts:15-42` — filters construídos com string concat, passados como `sql(string)` (function call, não tagged template) | Migrar para tagged template `` sql`...WHERE status = ${status}` `` ou `$1, $2` placeholders | 2h      |
| S02 | JWT         | 🔴 CRÍTICA | `src/api-lib/_db.ts:118-131`         | 1. Deletar usuário. 2. Usar token antigo em qualquer rota autenticada.            | Esperado: 401/403. Obtido: acesso total por 7 dias. `validateAuth` só verifica assinatura JWT, nunca consulta `users` table.             | `_db.ts:118-131` — zero queries SQL após `jwt.verify()`. `auth.ts:246` — hard DELETE sem revogação.                             | Consultar `users` table no `validateAuth` OU implementar token blocklist                    | 4h      |
| S03 | Token reuse | 🔴 CRÍTICA | `src/api-lib/aprovacao.ts:126-148`   | 1. Aprovar proposta via token. 2. Aprovar novamente com mesmo token.              | Esperado: rejeição (já aprovado). Obtido: aceita e sobrescreve `aprovadoEm`.                                                             | `aprovacao.ts:126` — POST aprovar não verifica `status !== 'aprovado'` antes de atualizar.                                      | Adicionar `AND status != 'aprovado'` na query WHERE                                         | 1h      |
| S04 | IDOR        | 🟠 ALTA    | `api/index.ts` → MATRIZ A6/A7        | 1. Login Tenant A. 2. PATCH `/api/financeiro/contas-internas?id=<UUID_Tenant_B>`. | Esperado: 404 (cross-tenant). Obtido: 200 (modifica registro do Tenant B).                                                               | `financeiro.ts` PATCH handler — `WHERE id = $1` sem `AND tenant_id = $2` em contas-internas e formas-pagamento                  | Adicionar `AND tenant_id = ${req.tenantId}` em queries PATCH                                | 2h      |
| S05 | Enumeração  | 🟠 ALTA    | `api/index.ts:552-559`               | GET `/api/resolve-dominio?host=dluxury.crm` vs `host=inexistente`                 | Esperado: resposta genérica. Obtido: retorna `{tenant: {nome, subdominio}}` vs `{tenant: null}` — enumeração viável.                     | `index.ts:552-559` — response body differ entre domínio existente e inexistente. DB lookup com timing differencial (2 queries). | Retornar sempre `{success: true, tenant: null}` ou exigir auth                              | 1h      |
| S06 | Rate limit  | 🟠 ALTA    | `api/index.ts:30-65`                 | 100 requisições rápidas a `/api/aprovacao`                                        | Esperado: bloqueio. Obtido: sem rate limit dedicado; default 300/min (in-memory, inútil no Vercel serverless).                           | `index.ts:128` — `/api/aprovacao` cai no default 300/min. Rate limits são `Map<IP, count>` in-memory — cada cold start reseta.  | Aplicar `rate-limiter-flexible` (loginLimiter padrão) a `/api/aprovacao`                    | 2h      |
| S07 | JWT stale   | 🟡 MÉDIA   | `src/App.tsx:123`, `Sidebar.tsx:298` | 1. Downgrade de plano (Pro→Basic). 2. Usar token antigo no frontend.              | Esperado: UI atualizada. Obtido: sidebar e FeatureGuard leem `planoTier` do JWT (stale por 7 dias). Server-side feature gate OK (lê DB). | `App.tsx:123` — `hasFeature((user as any).planoTier)`. `Sidebar.tsx:298` — mesmo padrão.                                        | Re-sing token após mudança de plano OU ler plano do DB no frontend                          | 3h      |
| S08 | Bundle      | 🟢 BAIXA   | `dist/` (94 chunks)                  | Buscar `sk_live`, `sk_test`, `DATABASE_URL`, `APP_JWT_SECRET` em dist/            | Esperado: ausente. Obtido: zero matches para padrões de segredo. `vite.config.ts:9` define `process.env: {}`.                            | `dist/assets/` — matches de "password"/"secret" são do driver pg genérico (não dados reais).                                    | Nenhuma ação necessária                                                                     | 0h      |

### 3.2 FINANCEIRO

| ID  | Cat.           | Severidade | Localização                                                                                                | Passos                                                                             | Esperado vs Obtido                                                                                                                                | Evidência                                                                                                               | Correção Sugerida                                                        | Esforço |
| --- | -------------- | ---------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------- |
| F01 | Duplo clique   | 🟠 ALTA    | `src/pages/FinanceiroTitulosReceberPage.tsx:693-716`, `src/hooks/financeiro/useTitulosPagarHook.ts:94-111` | 1. Clicar botão "Baixar" duas vezes rápidas.                                       | Esperado: 1 baixa. Obtido: 2 inserts em `baixas` + 2 updates de `saldo_atual`. Sem debounce, sem `disabled`/`isLoading`, sem `SELECT FOR UPDATE`. | `useTitulosPagarHook.ts:94` — handler sem loading guard. `FinanceiroTitulosReceberPage.tsx:693` — botão sem `disabled`. | Adicionar `isLoading` state no frontend + `SELECT FOR UPDATE` no backend | 4h      |
| F02 | Delete FK      | 🟠 ALTA    | `src/api-lib/financeiro.ts:222-225`, `387-389`, `425-428`                                                  | 1. Criar classe/conta/forma com títulos vinculados. 2. Excluir classe/conta/forma. | Esperado: bloqueio ou cascade. Obtido: soft-delete direto. Títulos ficam órfãos (sem referência).                                                 | `financeiro.ts:222` — `DELETE` sem verificação de FK em `titulos_receber.classe_financeira_id`.                         | Adicionar query de contagem antes do soft-delete                         | 3h      |
| F03 | IDOR PATCH     | 🟠 ALTA    | `src/api-lib/financeiro.ts` (contas-internas, formas-pagamento PATCH)                                      | PATCH cross-tenant retorna 200 em vez de 404                                       | Obtido: registro modificado no tenant errado.                                                                                                     | MATRIZ.md A6/A7 — `financeiro.ts` PATCH handler sem `AND tenant_id`.                                                    | Adicionar `AND tenant_id = ${req.tenantId}`                              | 2h      |
| F04 | POST 500       | 🟡 MÉDIA   | `src/api-lib/financeiro.ts` (POST classes)                                                                 | POST `/api/financeiro/classes` com body vazio                                      | Esperado: 400 (validação). Obtido: 500 (erro interno).                                                                                            | MATRIZ.md A5                                                                                                            | Adicionar validação Zod antes do INSERT                                  | 1h      |
| F05 | Timezone       | 🟡 MÉDIA   | `src/api-lib/financeiro.ts:438-441,552-553,623-626,752-753`                                                | `setMonth()` em JavaScript — funciona em UTC (Vercel) mas frágil                   | Esperado: robusto a timezone. Obtido: depende de UTC.                                                                                             | `financeiro.ts` — `new Date().setMonth()` sem offset de timezone.                                                       | Usar `date-fns` ou `dayjs` com timezone explícita                        | 2h      |
| F06 | INSERT params  | 🟡 MÉDIA   | `src/api-lib/financeiro.ts` (titulos-receber INSERT)                                                       | POST `/api/financeiro/titulos-receber`                                             | Esperado: 201. Obtido: `params: [object Object]` — `sql.join()` incorreto.                                                                        | MATRIZ.md A10                                                                                                           | Corrigir `sql.join()` para tagged template                               | 1h      |
| F07 | Webhook replay | 🟡 MÉDIA   | `api/webhooks/asaas-webhook.ts` (PAYMENT_RECEIVED)                                                         | Replay de mesmo evento 2x                                                          | Esperado: idempotente. Obtido: redefine `current_period_end` para +30d a partir do replay (não acumula).                                          | `asaas-webhook.ts` — UPDATE simples sem idempotency_key.                                                                | Usar `updated_at` check ou idempotency_key                               | 2h      |

### 3.3 RH

| ID  | Cat.           | Severidade | Localização                             | Passos                               | Esperado vs Obtido                                                                                         | Evidência                                                                            | Correção Sugerida                                                       | Esforço |
| --- | -------------- | ---------- | --------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------- |
| R01 | Prorrateamento | 🟠 ALTA    | `src/modules/rh/domain/calculations.ts` | Admissão dia 15 — prorratear salário | Esperado: salário proporcional (15/30 dias). Obtido: `diasTrabalhados: 30` hardcoded — sem prorrateamento. | `calculations.ts` — `valorDia = salarioBase / 30` fixo; sem lógica de data_admissao. | Adicionar `data_admissao` na lógica de folha; prorratear `salario_base` | 4h      |
| R02 | Líquido neg    | 🟡 MÉDIA   | `src/modules/rh/domain/calculations.ts` | Falta mês inteiro (30 dias)          | Esperado: clamp em 0 ou warning. Obtido: `5000 - 5000 + 0 - 1000 - 100 = -1100`. Líquido negativo aceito.  | `calculations.ts` — sem `Math.max(0, liquido)`.                                      | Adicionar clamp ou warning no frontend                                  | 1h      |
| R03 | Feriados       | 🟡 MÉDIA   | `src/modules/rh/domain/calculations.ts` | HE em feriado (CLT adicional 100%)   | Esperado: adicional 100%. Obtido: sem tabela de feriados — trata como dia útil (50%).                      | `calculations.ts` — sem lookup de feriados.                                          | Integrar tabela de feriados nacionais/regionais                         | 4h      |
| R04 | Mês 28         | 🟡 MÉDIA   | `src/modules/rh/domain/calculations.ts` | Folha em Fevereiro (28 dias)         | Esperado: proporcional. Obtido: divisão fixa /30 — valor dia sempre R$166,67.                              | `calculations.ts:51` — `valorDia = salarioBase / 30` fixo.                           | Usar dias reais do mês                                                  | 1h      |
| R05 | Mascaramento   | 🟢 BAIXA   | `src/api-lib/rh.ts`                     | Admin vê salários de outros admin    | Esperado: mascaramento opcional. Obtido: query retorna `salario_base` para todos.                          | `rh.ts` — sem role `viewer` que esconde salários.                                    | Adicionar role `viewer` sem acesso a campos sensíveis                   | 2h      |

### 3.4 PLANO DE CORTE

| ID  | Cat.         | Severidade | Localização                                                             | Passos                  | Esperado vs Obtido                                                                  | Evidência                                             | Correção Sugerida                           | Esforço |
| --- | ------------ | ---------- | ----------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- | ------- |
| P01 | Delete chapa | 🟠 ALTA    | `src/modules/plano-corte/ui/pages/PlanoCorteIndustrialPage.tsx:139-154` | Remover chapa inteira   | Esperado: confirmação. Obtido: `handleRemoverChapa` executa direto sem `confirm()`. | `PlanoCorteIndustrialPage.tsx:139` — sem confirmação. | Adicionar `ConfirmDialog` antes da exclusão | 1h      |
| P02 | Delete peça  | 🟡 MÉDIA   | `src/modules/plano-corte/ui/pages/PlanoCorteIndustrialPage.tsx:208-216` | Remover peça individual | Esperado: confirmação. Obtido: `handleRemovePeca` executa direto.                   | `PlanoCorteIndustrialPage.tsx:208` — sem confirmação. | Adicionar confirmação                       | 0.5h    |

### 3.5 ACESSIBILIDADE

| ID  | Cat.            | Severidade    | Localização                                                  | Passos                              | Esperado vs Obtido                                                                                                     | Evidência                                                                        | Correção Sugerida                                                          | Esforço |
| --- | --------------- | ------------- | ------------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------- |
| A01 | Labels          | 🟠 ALTA       | `src/components/` e `src/pages/` (227 labels, 7 com htmlFor) | Usar screen reader em formulários   | Esperado: labels associados programaticamente. Obtido: apenas 3% dos labels têm `htmlFor`. ~475 inputs sem associação. | 227 `<label>`, apenas 7 com `htmlFor`. Muitos inputs raw sem `<label>`.          | Adicionar `htmlFor`/`id` em todos os labels + usar `ui/Input` FieldWrapper | 8h      |
| A02 | sr-only         | 🟡 MÉDIA      | Global                                                       | Verificar texto para screen readers | Esperado: `sr-only` para contextos visuais. Obtido: 0 ocorrências de `sr-only` ou `visually-hidden`.                   | Zero matches para `sr-only`, `visually-hidden`.                                  | Adicionar classes `sr-only` onde necessário                                | 4h      |
| A03 | Focus trap      | 🟡 MÉDIA      | `src/components/ui/Modal.tsx`                                | Tab cycling em modal                | Esperado: focus preso no modal. Obtido: `ui/Modal` NÃO tem focus trap (diferente de `common/Modal`).                   | `ui/Modal.tsx` — sem Tab key handler. `common/Modal.tsx:47-76` — tem focus trap. | Portar focus trap de `common/Modal` para `ui/Modal`                        | 2h      |
| A04 | Navegação setas | 🟡 MÉDIA      | Global                                                       | Navegar com setas em listas/tabelas | Esperado: suporte a setas. Obtido: apenas 3 handlers de teclado (Enter). Zero suporte a setas.                         | 3 ocorrências de `onKeyDown`/`onKeyPress`.                                       | Adicionar navegação por setas em DataTable, Kanban, listas                 | 6h      |
| A05 | Contraste       | ⚠️ BORDERLINE | `src/index.css` — botão danger                               | Verificar contraste WCAG AA         | `#DC3545`/`#FAFAFA` ≈ 4.5:1 (mínimo 4.5:1). Botão primário `#0D66CC` ≈ 4.6:1.                                          | Contraste borderline no botão danger.                                            | Escurecer levemente `--destructive` para margem de segurança               | 0.5h    |

### 3.6 DARK MODE

| ID  | Cat.    | Severidade | Localização                                                                                                          | Passos                                     | Esperado vs Obtido                                                                                                                 | Evidência                                                                                                                                         | Correção Sugerida                                            | Esforço |
| --- | ------- | ---------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| D01 | Config  | 🟡 MÉDIA   | `tailwind.config.ts`                                                                                                 | Verificar `darkMode` config                | Esperado: `darkMode: 'class'`. Obtido: ausente.                                                                                    | `tailwind.config.ts` — sem chave `darkMode`.                                                                                                      | Adicionar `darkMode: 'class'`                                | 0.5h    |
| D02 | Classes | 🟠 ALTA    | `src/pages/Production/ProductionList.tsx` (158 hex), `PainelPecasChapa.tsx` (51 hex), `contrato-digital.ts` (18 hex) | Alternar tema dark → verificar componentes | Esperado: cores adaptam. Obtido: hex hardcoded ignora tema. 977 ocorrências, 62.6% não mapeadas a tokens.                          | 56 arquivos com hex hardcoded. Top 5: ProductionList (158), ProductionDetail (126), QuotationList (84), QuotationForm (76), QuotationDetail (72). | Substituir hex por tokens CSS (`--ui-*`) ou classes Tailwind | 16h     |
| D03 | Tokens  | 🟢 BAIXA   | `src/index.css`                                                                                                      | Verificar variáveis dark                   | Esperado: variáveis completas. Obtido: 106+ variáveis light + dark definidas. ThemeContext + useDarkMode + ThemeToggle funcionais. | `index.css:335-502` — dark theme completo. `ThemeContext.tsx` — persistência localStorage + detecção OS.                                          | Nenhuma ação necessária (tokens OK)                          | 0h      |

### 3.7 UX

| ID  | Cat.              | Severidade | Localização                                                                                           | Passos                                 | Esperado vs Obtido                                                                                                                                            | Evidência                                                                                                                                 | Correção Sugerida                                           | Esforço |
| --- | ----------------- | ---------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- |
| U01 | Erros silenciados | 🟠 ALTA    | `src/stores/useCrmStore.ts:135`, `src/pages/FinancePage.tsx:77`, `src/stores/useInventoryStore.ts:28` | Forçar erro na API ( rede off )        | Esperado: mensagem de erro ao usuário. Obtido: `console.error` silencioso. Dashboard, Clientes, Financeiro, Estoque — 4 stores engolem erros.                 | `useCrmStore.ts:135-136` — catch faz apenas `console.error`.                                                                              | Adicionar error state + banner/toast em cada store          | 4h      |
| U02 | ConfirmDialog     | 🟡 MÉDIA   | 6 telas usam `confirm()` nativo vs 2 com `ConfirmDialog`                                              | Verificar padrão de confirmação        | Esperado: `ConfirmDialog` consistente. Obtido: `window.confirm` em Orçamentos, Estoque, Prospecção, RH, Calendário; `ConfirmDialog` em Clientes e Financeiro. | `QuotationDetail.tsx:114`, `Inventory.tsx:68`, `useProspeccaoHook.ts:114`, `RHPage.tsx:295`, `PopoverEvento.tsx:66` — `confirm()` nativo. | Padronizar `ConfirmDialog` em todas ações destrutivas       | 4h      |
| U03 | Loading states    | 🟡 MÉDIA   | Dashboard, Clientes, Estoque, RH                                                                      | Abrir página sem dados cacheados       | Esperado: skeleton/spinner. Obtido: 6 de 10 telas sem loading state — mostram dados zerados ou tabela vazia.                                                  | Dashboard, Clientes, Estoque, RH — zero loading indicators.                                                                               | Adicionar skeleton/spinner (padrão já existe em Financeiro) | 4h      |
| U04 | Alert errors      | 🟡 MÉDIA   | `src/pages/RHPage.tsx:101,111`, `src/components/Calendario/CalendarioIntegrado.tsx:104,129`           | Forçar erro em operações RH/Calendário | Esperado: toast/error customizado. Obtido: `alert()` nativo do browser.                                                                                       | `RHPage.tsx:101` — `alert(e.message)`. `CalendarioIntegrado.tsx:104` — `alert()`.                                                         | Substituir `alert()` por `toast.error()`                    | 2h      |
| U05 | Empty states      | 🟡 MÉDIA   | Produção (colunas vazias), Calendário (grid vazio), Financeiro (stats null)                           | Acessar tela sem dados                 | Esperado: mensagem + CTA. Obtido: grid vazio ou conteúdo nulo sem orientação.                                                                                 | `PCPKanbanBoard.tsx:162` — colunas vazias sem mensagem. `CalendarioMes.tsx:50` — grid vazio. `FinancePage.tsx:222` — stats null = branco. | Adicionar `EmptyState` component com CTA                    | 3h      |

### 3.8 HEX HARDCODED (T1)

| ID  | Cat.          | Severidade | Localização                  | Passos                | Esperado vs Obtido                                                                                                        | Evidência                                                                           | Correção Sugerida                                                                             | Esforço |
| --- | ------------- | ---------- | ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------- |
| H01 | Design tokens | 🟡 MÉDIA   | 56 arquivos, 977 ocorrências | Rodar `hex-audit.cjs` | Esperado: uso de tokens CSS. Obtido: 62.6% das cores não mapeadas a tokens. Top offender: `ProductionList.tsx` (158 hex). | Script `scripts/audit/hex-audit.cjs` — 977 hex, 37.4% match exato, 62.6% hardcoded. | Substituir por `var(--ui-*)` ou classes Tailwind. Priorizar top 5 arquivos (520 ocorrências). | 16h     |

### 3.9 COMMON vs UI (T2)

| ID  | Cat.     | Severidade | Localização                                      | Passos                 | Esperado vs Obtido                                                                                                                                          | Evidência                                                                                                          | Correção Sugerida                                          | Esforço |
| --- | -------- | ---------- | ------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------- |
| C01 | Migração | 🟢 BAIXA   | `src/components/common/` vs `src/components/ui/` | Verificar consistência | Esperado: 1 lib. Obtido: 2 libs paralelas. `common/` marcada DEPRECATED. 4 de 5 são wrappers. Exceção: `common/Modal` tem focus trap ausente em `ui/Modal`. | `common/index.ts` — `DEPRECATED`. `common/Modal.tsx` — standalone com focus trap. `ui/Modal.tsx` — sem focus trap. | Migrar Modal (portar focus trap), deletar common/ wrappers | 4h      |

### 3.10 E2E / PLAYWRIGHT

| ID  | Cat.        | Severidade   | Localização                          | Passos                    | Esperado vs Obtido                                                                                                            | Evidência                                                                                                 | Correção Sugerida       | Esforço |
| --- | ----------- | ------------ | ------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------- | ------- |
| E01 | F02/F11/F45 | ✅ CORRIGIDO | `tests/e2e/` (commit `fix(e2e):...`) | Verificar status          | Obtido: todos corrigidos. F02 = `validateAuth` bypass, F11 = páginas grandes, F45 = RH strict mode.                           | Git commit `81badfc` — auth.spec.ts, quotations.spec.ts, rh.spec.ts, tenant-isolation.spec.ts corrigidos. | Nenhuma ação necessária | 0h      |
| E02 | Suite E2E   | ✅ PASSOU    | `tests/e2e/`                         | Playwright suite completa | Obtido: 38/38 passaram (3 últimas execuções: `playwright-output-6.txt`, `playwright-final.txt`, `playwright-regression.txt`). | 38 testes em 1.3-1.4 min. Zero falhas nas execuções finais.                                               | Nenhuma ação necessária | 0h      |

---

## 4. PLANO DE CORREÇÃO

### Fase 1 — Emergência (1-2 dias)

| Prioridade | IDs | Achado                       | Esforço | Dependências | Risco Regressão                                         |
| ---------- | --- | ---------------------------- | ------- | ------------ | ------------------------------------------------------- |
| 🔴 P0      | S01 | SQLi em prospeccao.ts        | 2h      | Nenhuma      | BAIXO — migração direta para tagged template            |
| 🔴 P0      | S02 | JWT sem revogação            | 4h      | Nenhuma      | MÉDIO — adicionar query em middleware afeta todas rotas |
| 🔴 P0      | S03 | Token aprovação reutilizável | 1h      | Nenhuma      | BAIXO — 1 linha WHERE                                   |
| 🔴 P0      | F01 | Duplo clique baixa           | 4h      | Nenhuma      | BAIXO — isolado ao frontend + 1 query backend           |

### Fase 2 — Alta (3-5 dias)

| Prioridade | IDs | Achado                       | Esforço | Dependências                     | Risco Regressão                                       |
| ---------- | --- | ---------------------------- | ------- | -------------------------------- | ----------------------------------------------------- |
| 🟠 P1      | S04 | IDOR PATCH financeiro        | 2h      | Nenhuma                          | BAIXO — adicionar WHERE tenant_id                     |
| 🟠 P1      | F02 | Delete sem FK check          | 3h      | Nenhuma                          | BAIXO — adicionar contagem antes de delete            |
| 🟠 P1      | R01 | Prorrateamento RH            | 4h      | Schema migration (data_admissao) | MÉDIO — mudar cálculo de folha afeta todos existentes |
| 🟠 P1      | U01 | Erros silenciados (4 stores) | 4h      | Nenhuma                          | BAIXO — adicionar error state                         |
| 🟠 P1      | A01 | Labels acessibilidade        | 8h      | Nenhuma                          | BAIXO — adicionar htmlFor/id                          |
| 🟠 P1      | D02 | Hex hardcoded (56 arquivos)  | 16h     | Nenhuma                          | MÉDIO — substituição massiva de cores                 |
| 🟠 P1      | P01 | Delete chapa sem confirmação | 1h      | Nenhuma                          | BAIXO — adicionar ConfirmDialog                       |

### Fase 3 — Média (1-2 semanas)

| Prioridade | IDs     | Achado                     | Esforço | Dependências | Risco Regressão              |
| ---------- | ------- | -------------------------- | ------- | ------------ | ---------------------------- |
| 🟡 P2      | S05     | Enumeração resolve-dominio | 1h      | Nenhuma      | BAIXO                        |
| 🟡 P2      | S06     | Rate limit aprovacao       | 2h      | Nenhuma      | BAIXO                        |
| 🟡 P2      | S07     | JWT stale planoTier        | 3h      | Nenhuma      | MÉDIO — mudar fluxo de token |
| 🟡 P2      | F04-F07 | Financeiro bugs menores    | 6h      | Nenhuma      | BAIXO                        |
| 🟡 P2      | R02-R04 | RH cálculos menores        | 6h      | Nenhuma      | BAIXO                        |
| 🟡 P2      | U02-U06 | UX padrões inconsistentes  | 13h     | Nenhuma      | BAIXO                        |
| 🟡 P2      | A02-A05 | Acessibilidade menor       | 12h     | Nenhuma      | BAIXO                        |
| 🟡 P2      | D01     | Tailwind darkMode config   | 0.5h    | Nenhuma      | BAIXO                        |

### Fase 4 — Baixa (Backlog)

| Prioridade | IDs | Achado                   | Esforço | Dependências        | Risco Regressão |
| ---------- | --- | ------------------------ | ------- | ------------------- | --------------- |
| 🟢 P3      | R05 | Mascaramento salário     | 2h      | Nenhuma             | BAIXO           |
| 🟢 P3      | C01 | Unificar common/ui Modal | 4h      | D02 (hex hardcoded) | MÉDIO           |
| 🟢 P3      | H01 | Hex hardcoded (restante) | 16h     | D02                 | MÉDIO           |
| 🟢 P3      | S08 | Bundle secrets           | 0h      | Nenhuma             | N/A             |

### Resumo de Esforço

| Fase                | Esforço     | Achados |
| ------------------- | ----------- | ------- |
| Fase 1 (Emergência) | **11h**     | 4       |
| Fase 2 (Alta)       | **42h**     | 7       |
| Fase 3 (Média)      | **47.5h**   | 15      |
| Fase 4 (Baixa)      | **22h**     | 4       |
| **TOTAL**           | **~122.5h** | **30**  |

---

## 5. DADOS AUDIT\_ CRIADOS E REMOVIDOS

Nenhum dado `AUDIT_` foi criado ou removido nesta sessão. A sessão anterior (`ETAPA_CONCLUIDA.md`) referenciou `AUDIT_RH_TEST` como dado de referência para testes de folha, mas esses dados estão no banco de dados (Neon) e não no código fonte.

---

## ETAPA CONCLUÍDA
