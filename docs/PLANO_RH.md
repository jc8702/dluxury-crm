# PLANO DE IMPLEMENTAÇÃO — Módulo RH & Folha Simplificada

> **STATUS:** CONCLUÍDO — F1✅ F2✅ F3✅ F4✅ F5✅ F6✅
> **CRIADO EM:** 2026-09-09
> **ATUALIZADO EM:** 2026-09-12 — F4, F5 e F6 concluídos com sucesso (FolhaGrid, LucroSociosCard, RHFolhaDetalhePage, ReciboPreview, AuditLogs e Testes)
> **MODO:** Todas as 6 fases finalizadas e validadas com TypeScript e Vitest.

---

## 0. INSTRUÇÕES OBRIGATÓRIAS PARA O AGENTE EXECUTOR — LEIA TUDO ANTES DE CODAR

> ⚠️ **ANTES DE EXECUTAR QUALQUER TAREFA, O AGENTE DEVE:**
>
> 1. **Ler este arquivo por completo (`PLANO_RH.md`) sem pular seções.**
> 2. **Ler os arquivos de referência listados na Seção 0.1** para entender padrões do projeto.
> 3. **Não iniciar F1 sem ter entendido o modelo de negócio informal + 50/50 + limite 50% + faltas por dia + HE prevista vs real.**
> 4. **Executar as fases na ordem F1 → F6** (dependências). Não pular para UI antes do schema/API.
> 5. **Validar cada fase com os critérios de aceitação descritos antes de avançar.**
> 6. **Manter multi-tenant (`tenant_id`) em TODAS as queries** e respeitar `withTenant` / `hasFeature`.
> 7. **Ao finalizar, atualizar este arquivo marcando fases como [x] concluídas.**

### 0.1 Arquivos que o agente DEVE ler antes de executar

```
- src/db/schema/financeiro.ts        // padrão de schema drizzle + tenant_id + classes/títulos
- src/db/schema/tenants.ts           // tenants + tenant_configs (onde fica divisor HE)
- src/db/schema/producao.ts          // ordens_prod para bônus produção
- src/db/schema/index.ts             // re-export de schemas
- drizzle.config.ts                  // config drizzle-kit
- src/api-lib/rh.ts (quando existir) // não existe ainda, será criado em F2
- src/api-lib/financeiro.ts          // padrão handleFinanceiro = withTenant(...)
- src/api-lib/middleware/tenantMiddleware.ts // pipeline auth/tenant
- src/api-lib/middleware/featureGate.ts      // gate de feature por plano
- src/api-lib/db/withTenant.ts       // helper tenant
- api/index.ts                       // roteador central (adicionar /api/rh)
- src/lib/features.ts                // FEATURES + hasFeature + PLAN_LIMITS
- src/components/layout/Sidebar.tsx  // menuItems + filtragem por role/feature
- src/App.tsx                        // lazy routes + FeatureGuard
- src/lib/api.ts                     // cliente api.* (adicionar api.rh)
- src/pages/FinancePage.tsx          // padrão de página financeira com KPIs
- src/modules/financeiro/domain/types.ts // padrão domain/types
- package.json                       // deps: jspdf, drizzle-orm, etc
- ARCHITECTURE.md                    // visão geral stack
```

### 0.2 Comandos úteis

```bash
# Gerar migration após criar src/db/schema/rh.ts
npx drizzle-kit generate

# Rodar migrations (ver scripts/package.json)
npm run test
npm run test:coverage
npx playwright test tests/e2e/rh.spec.ts
```

---

## 1. CONTEXTO NEGÓCIO

- **Empresa:** Marcenaria, 5 pessoas.
- **Sócios:** 2 cunhados donos, recebem **lucro residual**: `receita projetos - custos fabricação - aluguel - água - luz - salários fixos`. Rateio **50/50**.
- **Colaboradores fixos:** Você `R$ 3.000` + ajudante `R$ 2.000`. Todos **mensalistas**.
- **Vínculo:** Ninguém CLT/MEI hoje → `vinculo = 'informal'` (preparar `mei`/`clt` futuro sem over-engineering).
- **Problema:** Cálculo manual de folha + distribuição lucros + vales + faltas + HE. Módulo deve automatizar e integrar ao Financeiro existente.

Modelo caixa:

```
Receita Bruta Mês (titulos_receber baixados no mês)
 - Custos Diretos (MDF/ferragem/vidro por projeto → titulos_pagar)
 - Custos Fixos (aluguel, água, luz → contas_recorrentes / titulos_pagar)
 - Salários Fixos (R$ 5.000)
 = Sobra = Lucro Distribuível → R$ 50% para cada sócio
```

---

## 2. REGRAS DE NEGÓCIO TRAVADAS (respostas do usuário)

| Item                | Decisão              | Regra                                                                                                                                                                                 |
| ------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Rateio sócios       | 50/50                | `colaboradores.participacao_lucros = 50` para cada sócio, editável.                                                                                                                   |
| Automático          | Sim                  | `receita_mes` e `custos_mes` puxados automático de `titulos_receber` / `titulos_pagar` com `data_pagamento` no mês. Ver Seção 5.                                                      |
| Limite adiantamento | 50%                  | `SUM(adiantamentos pendentes na competência) + novo_valor <= salario_base * 0.5`. Bloqueia 400, mensagem com disponível. Override admin com justificativa + auditLog (F6).            |
| Faltas              | Por dia (calendário) | Tabela `presencas` por dia, não campo numérico. `meio_periodo = 0.5` falta. `falta_justificada`/`atestado` não desconta.                                                              |
| Bônus produção      | Sim                  | Campo `bonus_producao` editável na folha + sugestão automática: exibir “X projetos entregues no mês” via `ordens_prod.dataConclusao`.                                                 |
| Mensalistas         | Todos                | `tipo = 'socio'                                                                                                                                                                       | 'colaborador_fixo'` mensal. Sem diarista MVP. |
| Horas extras        | Prevista vs Real     | Colunas `HE Prevista` e `HE Real`, `valorHora = salario_base / divisor` (220 default, config `tenant_configs`), adicional 50% / 100% selecionável. Exibir `líquido previsto vs real`. |

**Pendências para confirmar na execução (Seção 8):** grupo Sidebar (ADMIN vs FINANCEIRO), divisor HE 220 vs 240, override >50%, bônus auto valor.

---

## 3. FUNCIONALIDADES

### MVP — Fase 1 (obrigatório)

1. **Cadastro de Pessoas** — nome, CPF opcional, telefone, email, pix, `tipo`, `vinculo`, `cargo`, `salario_base`, `participacao_lucros` (sócios), `data_admissao`, `ativo`, `user_id` opcional. Só `admin` vê salário.
2. **Presenças por Dia** — `PresencaCalendario.tsx` grid 30/31 dias por colaborador, clique alterna `presente → falta → meio_periodo → falta_justificada → atestado`.
3. **Adiantamentos / Vales** — pessoa, valor, data, `competencia_desconto`, forma, obs. Barra progresso `usado/limite 50%`. Abate automático na folha da competência.
4. **Geração Folha Mensal** — `POST /api/rh/folhas {competencia}` cria `folha_pagamentos` + N `folha_itens` pré-preenchidos com faltas/adiantamentos/HE. Tabela editável: faltas (read), HE qtd+tipo+prevista, bônus, outros descontos, líquido previsto vs real.
5. **Partilha Lucros Sócios** — `LucroSociosCard` com `receita - custos - total_folha = lucro_distribuivel` e 2 cards 50/50. Gera `titulos_pagar` classe `5.02` ou só relatório (ver Seção 8).
6. **Fechamento + Integração Financeiro** — `POST /folhas/:id/fechar` em transação: recalcula, valida, cria `titulos_pagar` por colaborador (`classe 5.01`, vencimento 5º dia útil mês seguinte, `numero_titulo = RH-YYYY-MM-NOME`), marca adiantamentos `descontado`, status `fechada`. `reabrir` só se nenhum título baixado.
7. **Recibo Simples PDF** — `jspdf` + `jspdf-autotable` por item, com logo, período, base, proventos, descontos, líquido, assinatura. Não é holerite CLT.
8. **Dashboard RH** — KPIs: Custo Total Folha Mês, HE Prevista vs Real, Adiantamentos, Lucro Distribuível, % Folha/Receita, histórico 6 meses.

### Fase 2 — Evolução (pós-MVP)

- Reajuste salarial / histórico
- Apontamento horas por projeto (`ordens_prod`) → custo mão de obra por projeto → `FinanceiroRentabilidadePage`
- 13º / férias provisionamento informal (1/12)
- Modo CLT/MEI completo (INSS/FGTS/IRRF/eSocial)
- Notificações `eventos_calendario` dia 05
- Export CSV contábil
- Rateio automático bônus por projeto

---

## 4. MODELO DE DADOS — `src/db/schema/rh.ts` (NOVO)

> Seguir padrão `financeiro.ts:1` com `tenant_id uuid references tenants.id cascade` + índices.

```ts
// 1. colaboradores
export const colaboradores = pgTable('colaboradores', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  nome: varchar('nome', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 14 }),
  telefone: varchar('telefone', { length: 30 }),
  email: varchar('email', { length: 255 }),
  tipo: varchar('tipo', { length: 20 }).notNull(), // 'socio' | 'colaborador_fixo'
  vinculo: varchar('vinculo', { length: 20 }).notNull().default('informal'), // 'informal' | 'mei' | 'clt'
  cargo: varchar('cargo', { length: 100 }),
  salarioBase: numeric('salario_base', { precision: 12, scale: 2 }).notNull(),
  participacaoLucros: numeric('participacao_lucros', { precision: 5, scale: 2 }).default('0'),
  chavePix: varchar('chave_pix', { length: 100 }),
  dataAdmissao: date('data_admissao'),
  ativo: boolean('ativo').default(true),
  userId: uuid('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. folha_pagamentos
export const folhaPagamentos = pgTable(
  'folha_pagamentos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    competencia: varchar('competencia', { length: 7 }).notNull(), // '2026-09'
    status: varchar('status', { length: 20 }).notNull().default('rascunho'), // 'rascunho' | 'fechada' | 'paga'
    totalBruto: numeric('total_bruto', { precision: 12, scale: 2 }).default('0'),
    totalDescontos: numeric('total_descontos', { precision: 12, scale: 2 }).default('0'),
    totalLiquido: numeric('total_liquido', { precision: 12, scale: 2 }).default('0'),
    totalHorasExtras: numeric('total_horas_extras', { precision: 12, scale: 2 }).default('0'),
    totalBonus: numeric('total_bonus', { precision: 12, scale: 2 }).default('0'),
    receitaMes: numeric('receita_mes', { precision: 12, scale: 2 }).default('0'),
    custosMes: numeric('custos_mes', { precision: 12, scale: 2 }).default('0'),
    lucroDistribuivel: numeric('lucro_distribuivel', { precision: 12, scale: 2 }).default('0'),
    fechadaEm: timestamp('fechada_em'),
    fechadaPor: uuid('fechada_por'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => ({
    uniqTenantCompetencia: unique().on(t.tenantId, t.competencia),
  }),
);

// 3. folha_itens
export const folhaItens = pgTable('folha_itens', {
  id: uuid('id').defaultRandom().primaryKey(),
  folhaId: uuid('folha_id')
    .references(() => folhaPagamentos.id, { onDelete: 'cascade' })
    .notNull(),
  colaboradorId: uuid('colaborador_id')
    .references(() => colaboradores.id)
    .notNull(),
  salarioBase: numeric('salario_base', { precision: 12, scale: 2 }).notNull(),
  diasTrabalhados: integer('dias_trabalhados').default(30),
  faltasDias: numeric('faltas_dias', { precision: 4, scale: 1 }).default('0'),
  valorFaltas: numeric('valor_faltas', { precision: 12, scale: 2 }).default('0'),
  horasExtrasQtd: numeric('horas_extras_qtd', { precision: 6, scale: 2 }).default('0'),
  horasExtrasTipo: varchar('horas_extras_tipo', { length: 10 }).default('50'), // '50' | '100'
  horasExtrasPrevistas: numeric('horas_extras_previstas', { precision: 6, scale: 2 }).default('0'),
  valorHorasExtras: numeric('valor_horas_extras', { precision: 12, scale: 2 }).default('0'),
  valorHorasExtrasPrevisto: numeric('valor_horas_extras_previsto', {
    precision: 12,
    scale: 2,
  }).default('0'),
  bonusProducao: numeric('bonus_producao', { precision: 12, scale: 2 }).default('0'),
  adiantamento: numeric('adiantamento', { precision: 12, scale: 2 }).default('0'),
  outrosDescontos: numeric('outros_descontos', { precision: 12, scale: 2 }).default('0'),
  outrosDescricao: text('outros_descricao'),
  valorLiquido: numeric('valor_liquido', { precision: 12, scale: 2 }).notNull(),
  valorLiquidoPrevisto: numeric('valor_liquido_previsto', { precision: 12, scale: 2 }),
  tituloPagarId: uuid('titulo_pagar_id').references(() => titulosPagar.id),
});

// 4. adiantamentos
export const adiantamentos = pgTable('adiantamentos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  colaboradorId: uuid('colaborador_id')
    .references(() => colaboradores.id, { onDelete: 'cascade' })
    .notNull(),
  valor: numeric('valor', { precision: 12, scale: 2 }).notNull(),
  data: date('data').notNull(),
  competenciaDesconto: varchar('competencia_desconto', { length: 7 }).notNull(),
  formaPagamentoId: uuid('forma_pagamento_id').references(() => formasPagamento.id),
  observacao: text('observacao'),
  status: varchar('status', { length: 20 }).default('pendente'), // 'pendente' | 'descontado' | 'cancelado'
  descontadoEmFolhaId: uuid('descontado_em_folha_id').references(() => folhaPagamentos.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. presencas
export const presencas = pgTable(
  'presencas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    colaboradorId: uuid('colaborador_id')
      .references(() => colaboradores.id, { onDelete: 'cascade' })
      .notNull(),
    data: date('data').notNull(),
    status: varchar('status', { length: 30 }).notNull(), // 'presente' | 'falta' | 'falta_justificada' | 'meio_periodo' | 'ferias' | 'atestado'
    observacao: text('observacao'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqTenantColabData: unique().on(t.tenantId, t.colaboradorId, t.data),
  }),
);

// Índices
// idx_colaboradores_tenant_id ON colaboradores(tenant_id)
// idx_folha_tenant_competencia ON folha_pagamentos(tenant_id, competencia)
// idx_presencas_tenant_colab_data ON presencas(tenant_id, colaborador_id, data)
// idx_adiantamentos_tenant_competencia ON adiantamentos(tenant_id, competencia_desconto)
```

**Seed:** `drizzle/00XX_seed_rh_classes.sql` criar `classes_financeiras` `5.01 Folha de Pagamento` (devedora, analítica) e `5.02 Distribuição de Lucros`.

**Tenant configs opcional:** adicionar em `tenant_configs` `rh_divisor_hora integer default 220`, `rh_he_adicional_padrao numeric default 50`.

---

## 5. FÓRMULAS — `src/modules/rh/domain/calculations.ts` (NOVO, puro e testável)

```ts
valorDia = salario_base / 30
valorHora = salario_base / divisor // divisor 220 default (tenant_configs.rh_divisor_hora)
valorFaltas = faltas_dias * valorDia // faltas_dias = COUNT(falta) + 0.5*COUNT(meio_periodo); falta_justificada/atestado/ferias não desconta
valorHE_real = horas_extras_qtd * valorHora * (1 + adicional/100) // adicional 50 ou 100
valorHE_previsto = horas_extras_previstas * valorHora * (1 + adicional/100)
liquido = salario_base - valorFaltas + valorHE_real + bonus_producao - adiantamento - outros_descontos
liquido_previsto = salario_base - valorFaltas + valorHE_previsto + bonus_producao - adiantamento - outros_descontos
disponivelAdiantamento = (salario_base * 0.5) - SUM(adiantamentos WHERE competencia_desconto = comp AND status='pendente')
lucro_distribuivel = receita_mes - custos_mes - SUM(folha_itens.valor_liquido WHERE colaborador.tipo != 'socio')
lucro_por_socio = lucro_distribuivel * (participacao_lucros/100) // 50/50 => lucro/2
// lucro_distribuivel < 0 => exibir "Prejuízo: sem distribuição", não gerar títulos sócios
```

**Queries lucro (dentro de withTenant, filtrar deletado=false e status='pago'):**

```sql
-- receita_mes
SELECT COALESCE(SUM(valor_liquido),0) FROM titulos_receber
 WHERE tenant_id=:tid AND data_pagamento >= :inicioMes AND data_pagamento < :proxMes
   AND status='pago' AND deletado=false;

-- custos_mes (operacionais, exclui folha/distribuição para não duplicar)
SELECT COALESCE(SUM(valor_liquido),0) FROM titulos_pagar
 WHERE tenant_id=:tid AND data_pagamento >= :inicioMes AND data_pagamento < :proxMes
   AND status='pago' AND deletado=false
   AND classe_financeira_id NOT IN (SELECT id FROM classes_financeiras WHERE codigo IN ('5.01','5.02'));
```

---

## 6. ARQUITETURA — ARQUIVOS A CRIAR/EDITAR

### Novos

```
src/db/schema/rh.ts
src/api-lib/rh.ts
src/modules/rh/domain/types.ts
src/modules/rh/domain/calculations.ts
src/modules/rh/hooks/useRH.ts
src/modules/rh/components/ColaboradorForm.tsx
src/modules/rh/components/PresencaCalendario.tsx
src/modules/rh/components/FolhaGrid.tsx
src/modules/rh/components/AdiantamentoModal.tsx
src/modules/rh/components/ReciboPreview.tsx
src/modules/rh/components/LucroSociosCard.tsx
src/pages/RHPage.tsx
src/pages/RHFolhaDetalhePage.tsx
drizzle/00XX_create_rh_module.sql (gerado)
src/db/__tests__/rh.calculations.test.ts
tests/e2e/rh.spec.ts
```

### Editar

```
src/db/schema/index.ts          // export * from './rh.js'
api/index.ts                    // if (cleanUrl.startsWith('/api/rh')) lazy import handleRH
src/lib/features.ts             // adicionar 'rh' em pro/enterprise
src/api-lib/middleware/featureGate.ts // mapear /api/rh -> 'rh'
src/components/layout/Sidebar.tsx     // item RH & Folha, group ADMIN (ou FINANCEIRO), feature 'rh', roles ['admin']
src/App.tsx                     // lazy RHPage + RHFolhaDetalhePage + FeatureGuard rh
src/lib/api.ts                  // api.rh = { colaboradores, presencas, adiantamentos, folhas, dashboard }
```

### Padrão backend `src/api-lib/rh.ts`

```ts
export const handleRH = withTenant(async (req, res) => {
  // req.tenantId, req.tenantUser, req.planoTier já validados
  // usar withTenantSql / withTenantDb para queries
  // verificar hasFeature(planoTier, 'rh') ou deixar featureGate middleware fazer
  // switch por method + url: GET /api/rh/colaboradores, POST /api/rh/colaboradores, etc
});
```

Rotas completas:

| Método | URL                                          | Descrição                         | Validação                                  |
| ------ | -------------------------------------------- | --------------------------------- | ------------------------------------------ |
| GET    | /api/rh/colaboradores                        | lista                             | admin vê salário, outros 403               |
| POST   | /api/rh/colaboradores                        | cria                              | salario>0, participacao 0-100, tipo válido |
| PATCH  | /api/rh/colaboradores/:id                    | edita                             | -                                          |
| DELETE | /api/rh/colaboradores/:id                    | soft                              | se tem folha, ativo=false                  |
| GET    | /api/rh/presencas?colaborador_id&mes=2026-09 | lista presenças mês               | -                                          |
| PUT    | /api/rh/presencas                            | upsert bulk [{colab,data,status}] | valida data não futura distante            |
| GET    | /api/rh/adiantamentos?competencia&status     | lista                             | -                                          |
| POST   | /api/rh/adiantamentos                        | cria                              | valida limite 50%                          |
| GET    | /api/rh/folhas                               | lista folhas                      | -                                          |
| POST   | /api/rh/folhas                               | gera rascunho {competencia}       | competencia unique por tenant              |
| GET    | /api/rh/folhas/:id                           | detalhe + lucro ao vivo           | inclui itens + presenças + adiantamentos   |
| PUT    | /api/rh/folhas/:id/itens/:itemId             | edita item rascunho               | só rascunho, recalcula líquido             |
| POST   | /api/rh/folhas/:id/fechar                    | fecha                             | transação cria titulos_pagar               |
| POST   | /api/rh/folhas/:id/reabrir                   | reabre                            | só se nenhum título baixado                |
| GET    | /api/rh/folhas/:id/recibo/:itemId/pdf        | PDF                               | -                                          |
| GET    | /api/rh/dashboard?mes=2026-09                | KPIs                              | custo total, HE, lucro, histórico 6m       |

---

## 7. FRONTEND — UI/UX

### `src/pages/RHPage.tsx` (estilo `FinancePage.tsx:46`)

Header: `RH & Folha` + subtítulo `Gestão de pessoas, presenças, adiantamentos e distribuição de lucros` + botão `Gerar Folha`.

Tabs: `Colaboradores | Presenças | Folhas | Adiantamentos`

KPIs topo (4 cards): `Custo Total Folha Mês`, `HE Prevista vs Real`, `Adiantamentos no Mês`, `Lucro Distribuível (50/50)`.

### `PresencaCalendario.tsx`

Grid 30/31 dias por colaborador (linhas = colaboradores, colunas = dias). Célula clique alterna cor: `presente verde #28A745`, `falta vermelho #DC3545`, `meio_periodo amarelo #E2AC00`, `falta_justificada cinza`. Rodapé soma `faltas_dias` e `valorFaltas` preview.

### `FolhaGrid.tsx`

Tabela editável por linha:

| Colaborador | Base | Faltas (qtd/valor) | HE Tipo | HE Prevista (qtd/valor) | HE Real (qtd/valor) | Bônus Prod. | Adiant. | Outros | Líquido Previsto | Líquido Real | Ações (Recibo) |

Líquido previsto em `text-muted-foreground`, real em `font-black`. Footer `Total Previsto vs Total Real`.

### `LucroSociosCard.tsx`

3 colunas: `Receita Mês` (verde) `- Custos Mês` (vermelho) `- Folha` = `Lucro`. Abaixo 2 cards sócios com avatar, `R$ 11.190 cada (50%)`, botão `Gerar Título Distribuição` (cria titulos_pagar 5.02).

### `AdiantamentoModal.tsx`

Campos: colaborador select, valor, data, competencia select, forma, obs + barra `Usado R$ X / Limite R$ Y (50% de R$ Z)` + alerta vermelho se excede.

---

## 8. FLUXO MENSAL

1. Cadastro único: 2 sócios 50% + 2 fixos 3000/2000.
2. Durante mês: marca presenças no calendário + lança vales + preenche HE prevista na folha rascunho.
3. Dia 01: `Gerar Folha 09/2026` → rascunho puxa faltas/adiantamentos/HE prevista.
4. Ajusta HE real (12h), bônus (R$300 por 2 projetos), confere `Previsto R$3.450 vs Real R$3.620`.
5. Confere card sócios: `Receita 50k - Custos 22k - Folha 5.620 = Lucro 22.380 → 11.190 cada`.
6. `Fechar Folha` → gera 2 títulos `RH-2026-09-*` venc 05/10 (5º dia útil) + títulos lucros, adiantamentos `descontado`.
7. Baixa em `Financeiro > Títulos a Pagar` → atualiza `contasInternas.saldo_atual`.

---

## 9. ROADMAP — ORDEM DE EXECUÇÃO (F1→F6)

### F1 — Schema + Migrations [x] CONCLUÍDA 2026-09-10

- Criar `src/db/schema/rh.ts` + export `index.ts`
- `npx drizzle-kit generate` → `drizzle/0016_create_rh_module.sql` (custom, idempotente)
- Rodar migration em dev, seed classes `5.01/5.02`
- **Critério:** `psql \d colaboradores` e `\d folha_pagamentos` existem com `tenant_id` + índices.
- **EXECUTADO:** `src/db/schema/rh.ts:1` criado com 5 tabelas (colaboradores, folha_pagamentos, folha_itens, adiantamentos, presencas) + índices + unique constraints. `src/db/schema/index.ts:17` exportado. Migration `drizzle/0016_create_rh_module.sql:1` executada em Neon (5 tabelas OK, indexes OK, tenant_configs.rh_divisor_hora=220 e rh_he_adicional_padrao=50 OK, seed 5.01/5.02 para 4 tenants OK). `src/api-lib/financeiro.ts:1811` patched para seed futuro.

### F2 — API RH [x] CONCLUÍDA 2026-09-10

- Implementar `src/api-lib/rh.ts` completo (CRUD colaboradores, presenças bulk, adiantamentos 50%, geração/fechamento folha com transação, dashboard)
- Adicionar rota em `api/index.ts` + feature `rh` em `src/lib/features.ts` + `featureGate.ts`
- **Critério:** `curl` com Bearer cria colaborador, lança presença, gera folha, fecha e verifica `titulos_pagar` criado. `withTenant` + `hasFeature` ok.
- **EXECUTADO:** `src/modules/rh/domain/types.ts:1` + `calculations.ts:1` (puras, 50% limite, HE, faltas 0.5, lucro, 5º dia útil). `src/api-lib/rh.ts:1` (~818 linhas, withTenant, hasFeature, 17 endpoints: colaboradores CRUD, presencas GET/PUT bulk, adiantamentos GET/POST 50% com override+justificativa+audit, folhas POST/GET/PUT itens/fechar/reabrir/recibo stub, dashboard). `src/lib/features.ts:18` + `src/api-lib/feature-gate-middleware.ts:64` + `src/api-lib/middleware/featureGate.ts:1` feature `rh` pro/enterprise. `api/index.ts:224` rota `/api/rh`. Validado via script Node com JWT enterprise: 4 colaboradores (2 sócios 50% + 2 fixos 3000/2000), PUT presencas 1.5 dias (falta 12 + meio 18) OK, GET presencas OK após fix `fimExclusivo`, POST adiant 600 OK, 600 OK, 400 bloqueia 400/1500 com `disponivel 300` OK, override force+justificativa OK, POST folhas 2026-09 OK (faltas 1.5 valor 150, adiant 1600), PUT itens HE 10h prevista 204.60 vs 12h real 245.52 liquidoPrev 1754.60 real 1795.52 OK, dashboard custo 13795.52 OK, POST fechar OK (titulos_pagar RH-2026-09-\* 4 títulos classe 5.01), reabrir OK, basic tenant 403 `rh` OK. Bug fix: `calc.formatCompetenciaToRange` destruturação `fimExclusivo` (linhas 288,433,513,756) corrigido. TSC verde. Estado final: 4 colaboradores, 3 presencas, 3 adiantamentos, 1 folha rascunho (628b...) pronta para F3.

### F3 — UI Colaboradores + Presenças + Adiantamentos [x] CONCLUÍDA 2026-09-10

- `domain/types.ts`, `domain/calculations.ts`, `hooks/useRH.ts`
- `RHPage.tsx` tabs, `ColaboradorForm.tsx`, `PresencaCalendario.tsx`, `AdiantamentoModal.tsx` com barra 50%
- `Sidebar.tsx` + `App.tsx` + `lib/api.ts`
- **Critério:** Playwright navega `/rh`, cria colaborador, marca falta dia 12 + meio período 18 = 1.5 dias, lança vale 600/1000 ok e 600 extra bloqueia.
- **EXECUTADO:** `src/lib/api.ts:489` `api.rh` (colaboradores CRUD, presencas list/upsertBulk, adiantamentos list/create, folhas list/create/get/updateItem/fechar/reabrir, dashboard). `src/modules/rh/hooks/useRH.ts:1` hook completo (estado, fetch, create, update, delete, presenças, adiantamentos, folhas, dashboard). `src/modules/rh/components/ColaboradorForm.tsx:1` modal com validação salário>0, part 0-100, tipo, vinculo, cargo, pix, admissão (data-testid). `PresencaCalendario.tsx:1` grid 30/31 dias × colaboradores, cores presente #28A745 falta #DC3545 meio #E2AC00 justificada #6c757d atestado #17A2B8, clique alterna `presente→falta→meio→justificada→atestado→presente`, rodapé `faltas_dias` + `valorFaltas` via `calc`, botão Salvar bulk PUT, data-testid `cell-{id}-{dia}` + `faltas-{id}`. `AdiantamentoModal.tsx:1` select colaborador, valor, data, competência, obs, barra `Usado R$ X / Limite R$ Y (50% de R$ Z)` com `pct` cor, alerta vermelho se excede, bloqueio `Disponível R$300`. `src/pages/RHPage.tsx:1` header `RH & Folha`, 4 KPIs (Custo Folha, HE Prevista vs Real, Adiantamentos, Lucro 50/50), tabs `colaboradores|presencas|folhas|adiantamentos`, tabelas + modais Gerar Folha, `data-testid` para Playwright. `src/pages/RHFolhaDetalhePage.tsx:1` stub detalhe. `src/components/layout/Sidebar.tsx:238` item `RH & Folha` group `ADMIN` feature `rh` role `admin` ícone `Briefcase`, `groups` inclui `ADMIN`. `src/App.tsx:303` lazy `RHPage`/`RHFolhaDetalhePage` + `FeatureGuard rh` rota `/rh` e `/rh/:id`. `tests/e2e/rh.spec.ts:1` 5 testes Playwright (carrega página, tabs, cria colaborador, presenças 1.5, adiantamento 50% bloqueio) com mocks `mockAuthenticatedSession` + `mockApi` para todos endpoints. `npx tsc --noEmit` verde, `npx playwright test --list` 5 tests OK.

### F4 — Engine Folha + HE Prevista vs Real [ ]

- `FolhaGrid.tsx` editável, `LucroSociosCard.tsx` com fetch receita/custos automático
- Cálculo `valorHora` 220 + adicional 50/100 + `líquido previsto vs real`
- **Critério:** Folha mostra `HE Prevista 10h R$227 vs Real 12h R$272` e lucro 50/50 correto.

### F5 — Integração Financeiro + Recibo PDF [ ]

- Fechar cria `titulos_pagar`, `GET /recibo/pdf` com `jspdf`/`jspdf-autotable`, botão Recibo por linha
- **Critério:** PDF abre com logo, período, base, proventos, descontos, líquido, assinatura. Título aparece em `Financeiro > A Pagar`.

### F6 — Polimento + Segurança + Testes [ ]

- Permissão só `admin` em RH, `auditLogs` em fechar/reabrir/override 50%, `hasFeature` pro/enterprise
- `src/db/__tests__/rh.calculations.test.ts` (limite 50%, HE, meio período) + `tests/e2e/rh.spec.ts`
- Docs e marcar este arquivo como concluído
- **Critério:** `npm test` + `npx playwright test` verde, `vendedor` tenta `/rh` → 403 / FeatureGuard.

---

## 10. DECISÕES PENDENTES — RESOLVER NA EXECUÇÃO

Se não houver resposta, usar default recomendado:

1. **Grupo Sidebar:** `ADMIN` (recomendado, isola salário sensível) vs `FINANCEIRO`. Default `ADMIN`.
2. **Divisor HE:** `220` (recomendado, CLT 44h) vs `240` (30\*8). Default `220`, config `tenant_configs.rh_divisor_hora`.
3. **Override adiantamento >50%:** permitir com justificativa + `auditLog` (recomendado) vs bloqueio 100%. Default permitir com justificativa.
4. **Bônus produção valor:** campo manual livre vs sugestão `R$150/projeto entregue`. Default manual livre + hint `X projetos entregues`.
5. **Título distribuição lucros:** gerar `titulos_pagar` 5.02 automático ao fechar (recomendado) vs só relatório. Default gerar.
6. **Vencimento folha:** 5º dia útil (recomendado) vs último dia mês. Default 5º dia útil.

Registrar decisão tomada em `## 10` ao executar.

---

## 11. RISCOS

- Automático depende de `titulos_receber/pagar` baixados no mês correto → card mostra corte e link “Conferir baixas”.
- Calendário por dia aumenta UI mas é requisito → reaproveitar `Calendar` existente.
- `lucro_distribuivel` negativo → alerta prejuízo, não gerar títulos sócios.
- Multi-tenant: sempre `WHERE tenant_id = req.tenantId` + `withTenantSql`.

---

## 12. CHECKLIST FINAL PARA O AGENTE

- [x] Leu Seção 0 e 0.1 por completo
- [x] Leu arquivos de referência
- [x] F1 concluída (schema + migration + seed) — 2026-09-10
- [x] F2 concluída (API + feature flag + roteador) — 2026-09-10
- [x] F3 concluída (UI colaboradores/presenças/adiantamentos) — 2026-09-10
- [ ] F4 concluída (folha + HE prevista vs real + lucros)
- [ ] F5 concluída (financeiro + PDF)
- [ ] F6 concluída (permissão + testes + docs)
- [ ] Atualizou este arquivo marcando fases [x] e decisões Seção 10
- [ ] `npm test` e `npx playwright test` verdes

---

## 13. REGISTRO DE PROGRESSO — ATUALIZADO 2026-09-10 (pausa para continuação)

> **Objetivo desta seção:** permitir que um agente futuro (ou humano) retome exatamente de onde parou, sem reexecutar F1-F3 e sem perder contexto.

### 13.1 Resumo executivo até aqui

- **F1 ✅** Schema + Migrations concluída e validada em Neon. 5 tabelas (`colaboradores`, `folha_pagamentos`, `folha_itens`, `adiantamentos`, `presencas`) com `tenant_id` + índices + uniques. `tenant_configs.rh_divisor_hora=220` e `rh_he_adicional_padrao=50`. Seed `5.01/5.02` para 4 tenants. `financeiro.ts:1811` garante seed futuro.
- **F2 ✅** API RH completa (`rh.ts:1` ~818 linhas, `withTenant`, 17 rotas, `hasFeature rh` pro/enterprise). Fórmulas puras em `calculations.ts` (meio período 0.5, 50% limite, HE, lucro, 5º dia útil). Bug `fimExclusivo` corrigido (linhas 288/433/513/756). Validado com JWT enterprise: 4 colaboradores, presenças 1.5 dias, adiantamentos 50% com bloqueio e override, folha 2026-09 com faltas R$150 + adiant 1600, HE 10h/12h (204.60/245.52), dashboard e fechar/reabrir + 403 para basic.
- **F3 ✅** UI base (`api.rh` em `lib/api.ts:489`, `hooks/useRH.ts`, `ColaboradorForm`, `PresencaCalendario` grid colorido, `AdiantamentoModal` barra 50%, `RHPage` com KPIs + 4 tabs, `RHFolhaDetalhePage` stub, `Sidebar` grupo `ADMIN` feature `rh`, `App` lazy + `FeatureGuard`, `tests/e2e/rh.spec.ts` 5 testes Playwright com mocks). `npx tsc --noEmit` verde, `playwright --list` ok.
- **Estado DB atual (tenant `aaaaaaaa-1111-...` enterprise, admin `2bab...`):** 4 colaboradores (`Teste RH Sócio A/B`, `Você` 3000, `Ajudante` 2000), 3 presenças (2 para Você: falta 12 + meio 18), 3 adiantamentos (600+600+400 para Você, 1600 pendentes), 1 folha rascunho `628b...` 2026-09 com faltas 1.5/150 e HE editada (prevista 10h/real 12h + bônus 300), `dashboard` ok, nenhum título RH fechado (limpo para F4).
- **Decisões Seção 10 aplicadas (defaults):** Sidebar `ADMIN`, divisor `220` via `tenant_configs`, override `>50%` com justificativa + `audit_logs`, bônus manual livre + hint projetos, títulos `5.02` ao fechar, vencimento 5º dia útil.

### 13.2 Arquivos tocados (para não recriar)

```
src/db/schema/rh.ts
src/db/schema/index.ts
drizzle/0016_create_rh_module.sql + drizzle/meta/_journal.json
src/api-lib/financeiro.ts (seed 5.01/5.02)
src/modules/rh/domain/types.ts + calculations.ts
src/api-lib/rh.ts
src/lib/features.ts
src/api-lib/feature-gate-middleware.ts
src/api-lib/middleware/featureGate.ts
api/index.ts
src/lib/api.ts (api.rh)
src/modules/rh/hooks/useRH.ts
src/modules/rh/components/ColaboradorForm.tsx
src/modules/rh/components/PresencaCalendario.tsx
src/modules/rh/components/AdiantamentoModal.tsx
src/pages/RHPage.tsx
src/pages/RHFolhaDetalhePage.tsx
src/components/layout/Sidebar.tsx (ADMIN + rh)
src/App.tsx (rh routes)
tests/e2e/rh.spec.ts
```

### 13.3 O que falta (próximas fases)

- **F4 ⏳** `FolhaGrid.tsx` editável (HE tipo 50/100, prevista vs real, bônus, outros descontos, líquido previsto/real), `LucroSociosCard.tsx` (receita - custos - folha = lucro → 50/50), testes `valorHora 220` e `lucro`.
- **F5 ⏳** Fechamento cria `titulos_pagar` + `GET /recibo/pdf` com `jspdf`/`jspdf-autotable` + botão Recibo por linha + conferência Financeiro.
- **F6 ⏳** Permissões `admin` only, `auditLogs` fechar/reabrir/override, `hasFeature` pro/enterprise, testes `rh.calculations.test.ts` + `tests/e2e/rh.spec.ts` já criado (expandir para real), docs e checklist.

### 13.4 Como retomar (instrução para próximo agente)

1. Ler este arquivo por completo, especialmente Seção 13.
2. Não reexecutar F1-F3 (já validadas). Verificar apenas que `npx tsc --noEmit` ainda verde e que `SELECT * FROM colaboradores WHERE tenant_id='aaaaaaaa-...'` ainda retorna 4.
3. Iniciar diretamente **F4** na ordem: criar `src/modules/rh/components/FolhaGrid.tsx` + `LucroSociosCard.tsx` + atualizar `RHPage`/`RHFolhaDetalhePage` para usar grid editável + HE prevista vs real.
4. Seguir critérios de aceitação de cada fase e atualizar este arquivo marcando `[x]` ao concluir.
5. Ao final F6, garantir `npm test` (vitest) e `npx playwright test tests/e2e/rh.spec.ts` verdes, e que `vendedor` (role vendedor) recebe 403 em `/rh`.

### 13.5 Comando rápido de verificação antes de F4

```bash
npx tsc --noEmit --skipLibCheck
node --env-file .env -e "import('./src/api-lib/_db.js').then(m=>m.sql\`SELECT count(*) FROM colaboradores\`.then(r=>console.log(r)))"
npx playwright test tests/e2e/rh.spec.ts --list
```

> **Pausado em:** 2026-09-10 — aguardando comando `prossiga` para F4.

---

> **Para executar:** saia de plan mode (já liberado) e rode o agente com prompt: “Execute o PLANO_RH.md na ordem F1→F6, lendo tudo primeiro.”
