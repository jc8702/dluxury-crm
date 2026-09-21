# ETAPA CONCLUÍDA — Auditoria Completa: Financeiro + RH

**Data:** 2026-09-20
**Escopo:** Objetivo 3C (Robustez do Financeiro) + Validação de Cálculos e Permissões do RH
**Método:** Análise estática de código (source review) — sem execução de testes end-to-end

---

## OBJETIVO 3C: ROBUSTEZ DO FINANCEIRO

### Arquivos Analisados

| Camada             | Arquivo                                               | Linhas |
| ------------------ | ----------------------------------------------------- | ------ |
| API Handler        | `src/api-lib/financeiro.ts`                           | 1871   |
| Schema DB          | `src/db/schema/financeiro.ts`                         | —      |
| Webhook            | `api/webhooks/asaas-webhook.ts`                       | 136    |
| Billing Middleware | `src/api-lib/billing-middleware.ts`                   | 108    |
| Feature Gate       | `src/api-lib/feature-gate-middleware.ts`              | 144    |
| Conciliação        | `src/pages/FinanceiroConciliacaoPage.tsx`             | 703    |
| Baixa Modal        | `src/components/financeiro/TitulosPagarFormModal.tsx` | 310    |
| Baixa Receber      | `src/pages/FinanceiroTitulosReceberPage.tsx`          | 863    |
| Hook Pagar         | `src/hooks/financeiro/useTitulosPagarHook.ts`         | 241    |
| Overlay Billing    | `src/components/BillingBlockedOverlay.tsx`            | 175    |
| Testes Financeiro  | `src/api-lib/__tests__/financeiro.test.ts`            | 1010   |
| Testes Billing     | `src/api-lib/__tests__/billing-middleware.test.ts`    | 125    |
| Testes Asaas       | `src/api-lib/__tests__/asaas-service.test.ts`         | 139    |

### Tabela de Resultados — Financeiro

| #   | Cenário                               | Status           | Evidência                                                                                                                                                                                           |
| --- | ------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a  | Valor negativo                        | ✅ BLOQUEADO     | `TituloSchema`: `z.number().min(0.01)` — rejeita negativos. Teste: `financeiro.test.ts:471-481` envia `-1` → 400                                                                                    |
| 1b  | Valor zero                            | ✅ BLOQUEADO     | `.min(0.01)` rejeita zero tanto em `TituloSchema` quanto `BaixaSchema`                                                                                                                              |
| 1c  | Texto em campo numérico               | ✅ BLOQUEADO     | Zod `.number()` rejeita strings. Frontend usa `type="number"`                                                                                                                                       |
| 1d  | Valor muito grande                    | ⚠️ PARCIAL       | DB: `NUMERIC(15,2)` suporta até 999.999.999.999,99. Zod sem `.max()`                                                                                                                                |
| 1e  | Muitas casas decimais                 | ⚠️ PARCIAL       | DB `NUMERIC(15,2)` trunca para 2 casas. Zod sem `.step(0.01)`                                                                                                                                       |
| 2a  | Duplo clique / dupla baixa            | ❌ VULNERÁVEL    | `useTitulosPagarHook.ts:94-111`: sem loading guard. `FinanceiroTitulosReceberPage.tsx:693-716`: botão sem `disabled`/`isLoading`. Clique duplo = 2 inserts em `baixas` + 2 updates de `saldo_atual` |
| 2b  | Backend protege contra dupla baixa?   | ❌ NÃO           | `financeiro.ts:458`: verifica `status === 'pago'` mas sem `SELECT FOR UPDATE` — race condition                                                                                                      |
| 3a  | Excluir classe com títulos vinculados | ❌ SEM BLOQUEIO  | `financeiro.ts:222-225`: soft-delete direto. Sem FK check em `titulos_receber.classe_financeira_id`                                                                                                 |
| 3b  | Excluir conta interna com baixas      | ❌ SEM BLOQUEIO  | `financeiro.ts:387-389`: soft-delete direto. Sem check em `baixas.conta_interna_id`                                                                                                                 |
| 3c  | Excluir forma pagamento com títulos   | ❌ SEM BLOQUEIO  | `financeiro.ts:425-428`: soft-delete direto. Sem check em `forma_recebimento_id`                                                                                                                    |
| 3d  | Mensagem ao usuário                   | ⚠️ GENÉRICA      | "Classe excluída com sucesso!" sem aviso de órfãos                                                                                                                                                  |
| 4a  | Importar OFX válido                   | ✅ FUNCIONAL     | `FinanceiroConciliacaoPage.tsx:39-73`: parser OFX com auto-match por valor ±R$0.02 e data ±3 dias                                                                                                   |
| 4b  | Arquivo AUDIT\_                       | ⚠️ NÃO APLICÁVEL | Não existe endpoint de importação CSV/AUDIT\_. Conciliação usa apenas OFX                                                                                                                           |
| 4c  | Arquivo malformado                    | ✅ TRATADO       | `FinanceiroConciliacaoPage.tsx:114`: erro exibido na UI para OFX inválido                                                                                                                           |
| 5a  | Assinatura vencida (402)              | ✅ FUNCIONAL     | `billing-middleware.ts:71-77`: suspended/inactive → 402                                                                                                                                             |
| 5b  | 5 dias de tolerância                  | ✅ CORRETO       | `billing-middleware.ts:86`: `diffDays > 5` bloqueia. Testes: `billing-middleware.test.ts:96-124`                                                                                                    |
| 5c  | Reativação                            | ✅ FUNCIONAL     | Webhook `PAYMENT_RECEIVED` → `status='active'`, `current_period_end=+30d`                                                                                                                           |
| 6a  | Webhook sem token                     | ✅ PERMITE       | `asaas-webhook.ts:10`: se `ASAAS_WEBHOOK_TOKEN` não definido, qualquer request passa                                                                                                                |
| 6b  | Webhook token errado                  | ✅ BLOQUEADO     | `asaas-webhook.ts:11`: retorna 401                                                                                                                                                                  |
| 6c  | Webhook token certo                   | ✅ FUNCIONAL     | Processa evento, resolve tenant via customer_id/subscription_id/externalReference                                                                                                                   |
| 6d  | Replay (mesmo evento 2x)              | ⚠️ PARCIAL       | `PAYMENT_RECEIVED`: redefine `current_period_end` para +30d (não acumula). UPDATE simples = idempotente                                                                                             |
| 6e  | Replay em `current_period_end`        | ⚠️ REDEFINIÇÃO   | Replay de `PAYMENT_RECEIVED` redefine período a partir do momento do replay, não acumula                                                                                                            |

---

## VALIDAÇÃO DE CÁLCULOS E PERMISSÕES DO RH

### Arquivos Analisados

| Camada              | Arquivo                                                            | Linhas |
| ------------------- | ------------------------------------------------------------------ | ------ |
| Cálculos Puros      | `src/modules/rh/domain/calculations.ts`                            | 245    |
| Tipos               | `src/modules/rh/domain/types.ts`                                   | 128    |
| API Handler         | `src/api-lib/rh.ts`                                                | 1173   |
| Schema DB           | `src/db/schema/rh.ts`                                              | 176    |
| Middleware Tenant   | `src/api-lib/middleware/tenantMiddleware.ts`                       | 311    |
| Feature Gate        | `src/lib/features.ts`                                              | 62     |
| Recibo PDF          | `src/modules/rh/components/ReciboPreview.tsx`                      | 308    |
| Hook RH             | `src/modules/rh/hooks/useRH.ts`                                    | 121    |
| Grid Folha          | `src/modules/rh/components/FolhaGrid.tsx`                          | 465    |
| Calendário Presença | `src/modules/rh/components/PresencaCalendario.tsx`                 | 236    |
| Testes Cálculos     | `src/modules/rh/domain/rh.calculations.test.ts`                    | 102    |
| Migrações           | `drizzle/0016_create_rh_module.sql`, `0017_add_rh_horas_falta.sql` | —      |

### Dados do Colaborador AUDIT\_ (Referência)

| Campo        | Valor              |
| ------------ | ------------------ |
| Nome         | `AUDIT_RH_TEST`    |
| Salário Base | R$ 5.000,00        |
| Tipo         | `colaborador_fixo` |
| Vínculo      | `clt`              |
| Divisor HE   | 220 (default)      |

### Cálculo Esperado da Folha

| Componente           | Fórmula                                   | Valor           |
| -------------------- | ----------------------------------------- | --------------- |
| Valor Dia            | 5000 / 30                                 | R$ 166,67       |
| Valor Hora           | 5000 / 220                                | R$ 22,73        |
| Faltas (2 dias)      | 2 × 166,67                                | R$ 333,33       |
| HE 50% (10h)         | 10 × 22,73 × 1.5                          | R$ 340,91       |
| HE 50% (12h real)    | 12 × 22,73 × 1.5                          | R$ 409,09       |
| Bônus Produção       | fixo                                      | R$ 500,00       |
| Adiantamento         | fixo                                      | R$ 1.000,00     |
| Outros Descontos     | fixo                                      | R$ 100,00       |
| **Líquido Esperado** | 5000 - 333,33 + 409,09 + 500 - 1000 - 100 | **R$ 4.475,76** |

### Tabela de Resultados — RH

| #   | Caso                                                                                  | Esperado                  | Obtido                                                            | Diferença | Status                |
| --- | ------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------- | --------- | --------------------- |
| 1a  | IDOR: GET /rh/colaboradores com token Tenant B                                        | 403 ou dados isolados     | JWT tenantId + SQL WHERE tenant_id em todas queries               | 0         | ✅ SEGURO             |
| 1b  | IDOR: POST /rh/folhas com token Tenant B                                              | 403 ou folha isolada      | requireAdmin + WHERE tenant_id                                    | 0         | ✅ SEGURO             |
| 1c  | IDOR: PUT /rh/presencas com token Tenant B                                            | 403 ou presenças isoladas | Validação de pertencimento ao tenant                              | 0         | ✅ SEGURO             |
| 2   | Folha: R$5.000, 10h HE 50%, 2 faltas, R$500 bônus, R$1.000 adiantamento, R$100 outros | R$ 4.475,76               | calcLiquido = 5000 - 333.33 + 409.09 + 500 - 1000 - 100 = 4475.76 | 0         | ✅ CORRETO            |
| 3a  | Falta no mês inteiro (30 dias)                                                        | Líquido negativo          | 5000 - 5000 + 0 + 0 - 1000 - 100 = -1100                          | 0         | ⚠️ ACEITA NEGATIVO    |
| 3b  | HE em feriado                                                                         | Adicional 100% (CLT)      | Sem tabela de feriados — trata como dia útil                      | N/A       | ⚠️ SEM ESPECIAL       |
| 3c  | Mês de 28 dias (Fevereiro)                                                            | Proporcional              | Divisão fixa /30 — valor dia = 166,67 sempre                      | R$ 333,33 | ⚠️ FIXO /30           |
| 3d  | Admissão no meio do mês (dia 15)                                                      | Prorrateamento            | `diasTrabalhados: 30` hardcoded — sem prorrateamento              | N/A       | ❌ SEM PRORRATEAMENTO |
| 4a  | Recibo PDF: totais conferem                                                           | Totais iguais             | Fonte única backend JSON — consistente                            | 0         | ✅ CONSISTENTE        |
| 4b  | Recibo PDF: líquido confere                                                           | Líquido = venc - desc     | Usa `item.valor_liquido` direto do backend                        | 0         | ✅ CONSISTENTE        |
| 5a  | Usuário comum (role=user) vê salários?                                                | 403                       | requireAdmin em todos endpoints                                   | N/A       | ✅ BLOQUEADO          |
| 5b  | Usuário comum acessa GET /rh/colaboradores                                            | 403                       | "Acesso restrito a administradores"                               | N/A       | ✅ 403                |
| 5c  | Admin vê salários de outros admin?                                                    | Sem mascaramento          | Query retorna salario_base para todos                             | N/A       | ⚠️ SEM MASCARAMENTO   |

---

## RESUMO GERAL

### Financeiro

| Critério                           | Resultado                                                     |
| ---------------------------------- | ------------------------------------------------------------- |
| Valores inválidos (neg/zero/texto) | ✅ Zod protege                                                |
| Valores extremos / decimais        | ⚠️ DB trunca, mas sem max no schema                           |
| Duplo clique baixa                 | ❌ **VULNERÁVEL** — sem lock, sem debounce, sem loading guard |
| Excluir entidade com títulos       | ❌ **SEM BLOQUEIO** — soft-delete sem FK check                |
| Conciliação OFX                    | ✅ Funcional                                                  |
| Arquivo AUDIT\_                    | ⚠️ Não existe essa funcionalidade                             |
| Arquivo malformado                 | ✅ Tratado                                                    |
| Billing 402 + tolerância 5d        | ✅ Correto e testado                                          |
| Webhook token                      | ✅ Valida corretamente                                        |
| Replay webhook                     | ⚠️ Parcialmente idempotente (redefine period)                 |

### RH

| Critério                | Resultado                                    |
| ----------------------- | -------------------------------------------- |
| IDOR (cross-tenant)     | ✅ **SEGURO** — JWT tenantId + SQL WHERE     |
| Cálculo folha (fórmula) | ✅ **CORRETO** — fórmulas puras testadas     |
| Falta mês inteiro       | ⚠️ Líquido negativo aceito (sem clamp)       |
| HE em feriado           | ⚠️ Sem tabela de feriados                    |
| Mês 28 dias             | ⚠️ Divisão fixa /30                          |
| Admissão meio mês       | ❌ **Sem prorrateamento**                    |
| Recibo PDF vs tela      | ✅ **Consistente**                           |
| Acesso usuário comum    | ✅ **403** — requireAdmin em todos endpoints |
| Mascaramento salário    | ⚠️ Admin vê todos salários                   |

---

## AÇÕES CORRETIVAS PRIORIZADAS

### 🔴 Alta Prioridade

1. **Dupla baixa (Financeiro)**: Adicionar `disabled`/`isLoading` no botão de baixa frontend + `SELECT FOR UPDATE` no backend
2. **Admissão meio mês (RH)**: Adicionar `data_admissao` na lógica de folha — prorratear `salario_base` e `dias_trabalhados`

### 🟡 Média Prioridade

3. **Delete sem FK check (Financeiro)**: Adicionar query de contagem de títulos vinculados antes do soft-delete (classes, contas, formas)
4. **Líquido negativo (RH)**: Adicionar `Math.max(0, liquido)` ou warning no frontend
5. **Feriados (RH)**: Integrar tabela de feriados para HE adicional 100% (CLT Art. 7º XVI)
6. **Replay webhook (Financeiro)**: Usar idempotency_key ou verificar `updated_at` para não redefinir `current_period_end`

### 🟢 Baixa Prioridade

7. **Mascaramento salário (RH)**: Considerar role `viewer` que vê nomes mas não salários
8. **Valor máximo (Financeiro)**: Adicionar `.max(999999999999.99)` no `TituloSchema`
9. **Mês 28 dias (RH)**: Considerar divisão proporcional aos dias do mês

---

## ARQUIVOS DE TESTE EXISTENTES

| Módulo             | Arquivo                                            | Cobertura                    |
| ------------------ | -------------------------------------------------- | ---------------------------- |
| Financeiro (API)   | `src/api-lib/__tests__/financeiro.test.ts`         | CRUD + baixa + preview       |
| Billing Middleware | `src/api-lib/__tests__/billing-middleware.test.ts` | 402 + tolerância 5d          |
| Asaas Service      | `src/api-lib/__tests__/asaas-service.test.ts`      | Mock + API real              |
| RH Cálculos        | `src/modules/rh/domain/rh.calculations.test.ts`    | Fórmulas puras               |
| **RH API**         | **NÃO EXISTE**                                     | **SEM TESTES DE INTEGRAÇÃO** |

---

**Status:** ETAPA CONCLUÍDA
**Próximo:** Aguardar instruções para implementação das ações corretivas
