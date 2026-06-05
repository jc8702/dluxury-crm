# 🗄️ AUDITORIA E CONSOLIDAÇÃO DE BANCO DE DADOS

## Resolver Redundância de Tabelas no Neon

---

## 🔴 PROBLEMA IDENTIFICADO

### Tabelas Duplicadas/Redundantes Encontradas

```
MÓDULO ORÇAMENTOS - PROBLEMA CRÍTICO:
├─ orcamentos              ← Tabela principal?
├─ orcamentos_pro          ← Versão "pro"? (por quê?)
├─ orcamento_items         ← Items do orçamento
├─ orcamento_moveis        ← Apenas móveis?
├─ orcamento_pecas         ← Apenas peças?
├─ orcamento_ferragens     ← Apenas ferragens?
├─ orcamento_ambientes     ← Ambientes/cômodos?
├─ orcamento_custos_extras ← Custos adicionais?
├─ orcamento_lista_explodida ← BOM explodido?
└─ ❌ REDUNDÂNCIA SEVERA

DIAGNÓSTICO:
- 9 tabelas para 1 conceito (Orçamento)
- Sem schema claro
- Relacionamentos confusos
- Queries duplicadas
- Migrações difíceis
- Tech debt massivo
```

---

## 📋 FASE 2 EXPANDIDA: CONSOLIDAÇÃO DE BANCO DE DADOS

Esta seção **SUBSTITUI e EXPANDE** a Fase 2 do plano original.

### Estrutura Corrigida do Projeto

```
src/
├── modules/
│   ├── clients/
│   │   ├── types/
│   │   │   └── client.types.ts
│   │   ├── services/
│   │   │   ├── clientService.ts
│   │   │   └── clientValidator.ts
│   │   └── hooks/
│   │       ├── useClients.ts
│   │       └── useClientForm.ts
│   │
│   ├── quotations/          ← NOVO NOME (era "orçamentos")
│   │   ├── types/
│   │   │   ├── quotation.types.ts
│   │   │   ├── quotationItem.types.ts
│   │   │   ├── quotationBOM.types.ts
│   │   │   └── quotationCalculations.types.ts
│   │   ├── services/
│   │   │   ├── quotationService.ts
│   │   │   ├── quotationItemService.ts
│   │   │   ├── quotationCalculator.ts
│   │   │   ├── quotationBOMService.ts
│   │   │   └── quotationValidator.ts
│   │   ├── hooks/
│   │   │   ├── useQuotation.ts
│   │   │   ├── useQuotationItems.ts
│   │   │   ├── useQuotationCalculations.ts
│   │   │   └── useQuotationBOM.ts
│   │   └── pages/
│   │       ├── QuotationList.tsx
│   │       ├── QuotationCreate.tsx
│   │       ├── QuotationEdit.tsx
│   │       └── QuotationDetail.tsx
│   │
│   ├── products/
│   │   ├── types/
│   │   │   ├── sku.types.ts
│   │   │   └── category.types.ts
│   │   ├── services/
│   │   │   ├── skuService.ts
│   │   │   └── skuValidator.ts
│   │   └── hooks/
│   │       ├── useSKU.ts
│   │       └── useCategories.ts
│   │
│   ├── production/
│   │   ├── types/
│   │   │   ├── productionOrder.types.ts
│   │   │   ├── cuttingPlan.types.ts
│   │   │   └── bom.types.ts
│   │   ├── services/
│   │   │   ├── productionOrderService.ts
│   │   │   ├── cuttingPlanService.ts
│   │   │   └── bomService.ts
│   │   └── hooks/
│   │       ├── useProductionOrder.ts
│   │       ├── useCuttingPlan.ts
│   │       └── useBOM.ts
│   │
│   ├── inventory/
│   │   ├── types/
│   │   │   ├── stock.types.ts
│   │   │   └── movement.types.ts
│   │   ├── services/
│   │   │   ├── stockService.ts
│   │   │   └── movementService.ts
│   │   └── hooks/
│   │       ├── useStock.ts
│   │       └── useMovements.ts
│   │
│   ├── finance/
│   │   ├── types/
│   │   │   ├── invoice.types.ts
│   │   │   └── payment.types.ts
│   │   ├── services/
│   │   │   ├── invoiceService.ts
│   │   │   └── paymentService.ts
│   │   └── hooks/
│   │       ├── useInvoices.ts
│   │       └── usePayments.ts
│   │
│   └── reports/
│       ├── types/
│       │   └── report.types.ts
│       ├── services/
│       │   └── reportService.ts
│       └── hooks/
│           └── useReports.ts
│
db/
├── schema/
│   ├── clients.ts
│   ├── quotations.ts         ← CONSOLIDADO
│   ├── quotationItems.ts     ← CONSOLIDADO
│   ├── quotationBOM.ts       ← NOVO (era lista_explodida)
│   ├── products.ts
│   ├── production.ts
│   ├── inventory.ts
│   ├── finance.ts
│   ├── users.ts
│   ├── audit.ts
│   └── relations.ts
│
└── migrations/
    ├── 001_initial_schema.ts
    ├── 002_consolidate_quotations.ts
    ├── 003_cleanup_redundant_tables.ts
    └── 004_add_audit_trail.ts
```

---

## 🔍 AUDITORIA COMPLETA DE TABELAS

### Tarefa 2.1: Mapear TODAS as Tabelas Atuais

```
MAPEAMENTO ATUAL DO NEON (Verificar se há mais):

MÓDULO: ORÇAMENTOS (9 tabelas - CONSOLIDAR PARA 3)
┌─ orcamentos
│  Uso: ???
│  Campos: ???
│  Relacionamentos: ???
│
├─ orcamentos_pro
│  Uso: Versão "pro" ou profissional?
│  Diferença de "orcamentos": ???
│  Por que separada?: ???
│
├─ orcamento_items
│  Uso: Items do orçamento (correto)
│  Campos: sku_id, quantity, price, etc
│  Relacionamento: orcamentos (1:N)
│
├─ orcamento_moveis
│  Uso: Apenas móveis? (por que separado?)
│  Não deveria ser apenas um campo em items?
│
├─ orcamento_pecas
│  Uso: Apenas peças? (por que separado?)
│  Relacionamento com items: ???
│
├─ orcamento_ferragens
│  Uso: Apenas ferragens? (por que separado?)
│  Deveria ser subcategoria de items?
│
├─ orcamento_ambientes
│  Uso: Ambientes/cômodos? (deveria ser em Client?)
│  Relacionamento: client_id ou quotation_id?
│
├─ orcamento_custos_extras
│  Uso: Custos adicionais (portas, vidro, etc)
│  Relacionamento: quotation_id ou item_id?
│
└─ orcamento_lista_explodida
   Uso: BOM expandido? (deveria ser generated_at_runtime)
   Realmente precisa de tabela?

OUTROS MÓDULOS (VERIFICAR):
- Há redundância em production?
- Há redundância em inventory?
- Há redundância em clients?
```

### Tarefa 2.2: Entender Propósito de CADA Tabela

Para CADA tabela redundante:

```
TEMPLATE DE INVESTIGAÇÃO:

Tabela: orcamentos_pro

Perguntas:
[ ] Por que existe?
[ ] Como diferencia de "orcamentos"?
[ ] Qual é o propósito do "_pro"?
[ ] Tem dados históricos importantes?
[ ] Pode ser consolidada?

Investigação SQL:
- SELECT COUNT(*) FROM orcamentos_pro;
- SELECT * FROM orcamentos_pro LIMIT 1;
- Comparar schema com "orcamentos"

Resultado:
[ ] REMOVER (duplicada)
[ ] CONSOLIDAR (mesclar com principal)
[ ] MANTER (tem propósito diferente)
[ ] REFATORAR (renomear, esclarecer)
```

---

## 📊 PLANO DE CONSOLIDAÇÃO

### Consolidação Proposta do Módulo ORÇAMENTOS

```
ANTES (9 tabelas):
orcamentos
├─ orcamentos_pro
├─ orcamento_items
├─ orcamento_moveis
├─ orcamento_pecas
├─ orcamento_ferragens
├─ orcamento_ambientes
├─ orcamento_custos_extras
└─ orcamento_lista_explodida

DEPOIS (3 tabelas limpas):
quotations
├─ quotation_items
└─ quotation_bom

ESTRUTURA PROPOSTA:

1. TABELA: quotations
   Campos:
   - id (PK)
   - client_id (FK → clients)
   - number (número sequencial)
   - description
   - status (DRAFT, SENT, APPROVED, REJECTED)
   - margin_percentage
   - notes
   - created_at
   - updated_at
   - deleted_at (soft delete)

2. TABELA: quotation_items
   Campos:
   - id (PK)
   - quotation_id (FK → quotations)
   - sku_id (FK → products/skus)
   - quantity
   - unit_price
   - subtotal
   - extra_costs (JSON: {door: 50, glass: 30, finish: 20})
   - description (override de SKU)
   - order_position
   - created_at
   - updated_at

3. TABELA: quotation_bom
   Campos:
   - id (PK)
   - quotation_id (FK → quotations)
   - item_id (FK → quotation_items)
   - component_sku_id (FK → products/skus)
   - component_quantity
   - generated_at
   - is_valid
   - notes

VANTAGENS:
✅ Schema limpo e intuitivo
✅ Sem redundância
✅ Relacionamentos claros
✅ Fácil de queryar
✅ Fácil de escalar
```

---

## 🔧 FASE 2 EXPANDIDA: TAREFAS DE CONSOLIDAÇÃO

### 2.1: Auditoria de Banco de Dados (Novo)

**Objetivo:** Mapeamento completo de todas as tabelas e redundâncias

#### Tarefa 2.1.1: Listar Todas as Tabelas

```
Ação: Conectar ao Neon e executar:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

Documentar:
- Nome de cada tabela
- Número de registros (COUNT)
- Tamanho
- Chaves estrangeiras
- Índices

Resultado: Spreadsheet com todas tabelas
```

#### Tarefa 2.1.2: Identificar Redundâncias

```
Para CADA tabela que parece duplicada:

1. Comparar schema (DESCRIBE table1 vs table2)
2. Comparar dados (amostra)
3. Comparar relacionamentos
4. Entender propósito

Template:
Tabela A: orcamentos
Tabela B: orcamentos_pro
Redundância?: SIM/NÃO
Consolidar em: [qual tabela?]
Ação: MESCLAR / REMOVER / MANTER
```

#### Tarefa 2.1.3: Mapear Relacionamentos Atuais

```
Criar diagrama:
- clients → quotations (1:N)
- quotations → quotation_items (1:N)
- quotation_items → skus (N:1)
- etc

Identificar:
- Relacionamentos órfãos
- Chaves estrangeiras quebradas
- Dados inconsistentes
```

#### Tarefa 2.1.4: Validar Integridade de Dados

```
Queries de validação:
- Registros órfãos (items sem quotation)
- Duplicatas
- Valores nulos em colunas obrigatórias
- Dados inválidos (preços negativos, etc)

Documentar:
- Quantos registros problemáticos
- Qual ação tomar (limpar, corrigir, manter)
```

### 2.2: Design do Novo Schema (Novo)

**Objetivo:** Definir schema limpo e consolidado

#### Tarefa 2.2.1: Definir Schema por Módulo

```
Para cada módulo:

MÓDULO: quotations
Tabelas necessárias:
- quotations (principal)
- quotation_items (detalhes)
- quotation_bom (lista de materiais)
- quotation_audit (histórico de alterações)

MÓDULO: products
Tabelas necessárias:
- products/skus
- product_categories
- product_stock

MÓDULO: production
Tabelas necessárias:
- production_orders
- production_order_items
- cutting_plans
- production_audit

[... continuar para cada módulo ...]
```

#### Tarefa 2.2.2: Definir Tipos de Dados Corretos

```
Validar tipo de dados para cada campo:

Campo: quotation.status
Tipo ERRADO: VARCHAR(50) (muito flexível)
Tipo CORRETO: ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED')

Campo: quotation.margin_percentage
Tipo ERRADO: VARCHAR (permite texto)
Tipo CORRETO: DECIMAL(5,2)

[... validar todos campos ...]
```

#### Tarefa 2.2.3: Definir Chaves Estrangeiras

```
Para cada relacionamento:

quotation_items.quotation_id → quotations.id
- Tipo: ON DELETE CASCADE (deletar items ao deletar quotation)
- Índice: SIM (melhor performance)

quotation_items.sku_id → products.id
- Tipo: ON DELETE RESTRICT (não deletar SKU se usado)
- Índice: SIM

[... validar todos relacionamentos ...]
```

#### Tarefa 2.2.4: Criar Arquivo de Schema Drizzle

```
Arquivo: db/schema/quotations.ts

Estrutura:
export const quotations = pgTable('quotations', {
  id: serial().primaryKey(),
  clientId: integer().references(() => clients.id),
  number: varchar().notNull().unique(),
  description: varchar(),
  status: pgEnum('quotation_status', [
    'DRAFT',
    'SENT',
    'APPROVED',
    'REJECTED'
  ]).notNull(),
  marginPercentage: decimal('5,2'),
  notes: text(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp(),
  deletedAt: timestamp(),
});

[... similar para items, bom, etc ...]
```

### 2.3: Migração de Dados (Novo - CRÍTICO)

**Objetivo:** Migrar dados das tabelas antigas para novo schema SEM PERDER DADOS

#### Tarefa 2.3.1: Criar Script de Backup

```
Ação 1: Fazer backup completo do banco ANTES de mexer
```

BACKUP*FULL=$(date +%s)
pg_dump $DATABASE_URL > backup*$BACKUP_FULL.sql

```

Armazenar backup com data

Ação 2: Testar restore em environment local
- Restaurar backup em local/staging
- Validar que todos dados estão lá
- Confirmar integridade
```

#### Tarefa 2.3.2: Escrever Migrations Drizzle

```
Arquivo: db/migrations/001_consolidate_quotations.ts

Passos de migration:
1. Criar novas tabelas (quotations, quotation_items, quotation_bom)
2. Copiar dados das antigas:
   - INSERT INTO quotations SELECT * FROM orcamentos
   - INSERT INTO quotation_items SELECT * FROM orcamento_items
   - etc
3. Validar contagens (SELECT COUNT antes e depois)
4. Criar índices e chaves estrangeiras
5. Remover tabelas antigas (com cautela)

Rollback:
- Se algo der errado, poder voltar ao schema anterior
```

#### Tarefa 2.3.3: Validar Integridade Pós-Migração

```
Queries de validação:
- SELECT COUNT(*) FROM quotations (deve bater com orcamentos)
- SELECT COUNT(*) FROM quotation_items (deve bater com orcamento_items)
- Verificar relacionamentos (nenhum item órfão)
- Verificar valores (nenhum preço negativo)
- Verificar datas (created_at <= updated_at)

Resultado: Relatório de validação
```

### 2.4: Atualizar Código (Novo - GRANDE)

**Objetivo:** Atualizar todo código TypeScript/React para novo schema

#### Tarefa 2.4.1: Atualizar Types

```
Antes:
export interface Orcamento { ... }
export interface OrcamentoItem { ... }
export interface OrcamentoPro { ... }

Depois:
export interface Quotation { ... }
export interface QuotationItem { ... }
export interface QuotationBOM { ... }

Consolidar em:
src/modules/quotations/types/quotation.types.ts
```

#### Tarefa 2.4.2: Atualizar Services

```
Antes:
- quotationService (usa orcamentos)
- quotationProService (usa orcamentos_pro)
- quotationItemsService (usa orcamento_items)
- quotationMoveisService (usa orcamento_moveis)

Depois:
- quotationService (usa quotations)
- quotationItemService (usa quotation_items)
- quotationBOMService (usa quotation_bom)

Consolidar em:
src/modules/quotations/services/
```

#### Tarefa 2.4.3: Atualizar Queries/API

```
Antes:
POST /api/orcamentos
GET /api/orcamentos/:id
GET /api/orcamentos_pro
POST /api/orcamento_items/:quotation_id
etc (múltiplos endpoints)

Depois:
POST /api/quotations
GET /api/quotations/:id
POST /api/quotations/:id/items
GET /api/quotations/:id/bom
(endpoints únicos e claros)
```

#### Tarefa 2.4.4: Atualizar Componentes React

```
Antes:
- OrcamentoList.tsx
- OrcamentoProList.tsx
- OrcamentoPro.tsx
- AddOrcamentoItem.tsx
- AddPeca.tsx
- AddFerragemn.tsx
(múltiplos componentes confusos)

Depois:
- QuotationList.tsx
- QuotationCreate.tsx
- QuotationEdit.tsx
- QuotationItemEditor.tsx
- QuotationBOMViewer.tsx
(componentes organizados)
```

#### Tarefa 2.4.5: Atualizar Hooks

```
Consolidar em src/modules/quotations/hooks/:
- useQuotation (um só hook para quotations)
- useQuotationItems (um só hook para items)
- useQuotationBOM (um só hook para bom)
- useQuotationCalculations (cálculos centralizados)
```

### 2.5: Validação de Consolidação

#### Tarefa 2.5.1: Testes Funcionais

```
Para cada funcionalidade antiga:
- Criar novo orçamento: ✓
- Adicionar items: ✓
- Editar item com fita de borda: ✓
- Deletar item: ✓
- Calcular margem: ✓
- Export PDF: ✓
- Import CSV: ✓

Resultado: Teste report com status
```

#### Tarefa 2.5.2: Testes de Dados

```
Validar que dados migrados corretamente:
- Contagem de registros: ✓
- Valores preservados: ✓
- Relacionamentos intactos: ✓
- Datas não alteradas: ✓
- Nenhum dato perdido: ✓

Resultado: Data validation report
```

#### Tarefa 2.5.3: Performance

```
Medir antes vs depois:
- Tempo de lista de orçamentos
- Tempo de busca
- Tempo de cálculos
- Tamanho do banco de dados

Resultado: Performance report
```

---

## 📋 VERIFICAÇÃO DE OUTROS MÓDULOS

### Módulo: PRODUÇÃO

Listar tabelas atuais:

```
production_orders
production_order_items
production_orden_status (se existe)
cutting_plans
cutting_plan_items
[outras]
```

**Ação:** Aplicar mesma consolidação

### Módulo: ESTOQUE

Listar tabelas atuais:

```
stock
stock_movements
stock_entry
stock_exit
inventory
[outras]
```

**Ação:** Consolidar em:

- `inventory` (estoque atual)
- `inventory_movements` (histórico)

### Módulo: CLIENTES

Listar tabelas atuais:

```
clients
customers
client_addresses
client_preferences
[outras]
```

**Ação:** Consolidar se houver redundância

### Módulo: FINANCEIRO

Listar tabelas atuais:

```
invoices
payments
financial_transactions
[outras]
```

**Ação:** Consolidar se necessário

---

## 🔄 ATUALIZAÇÃO DA FASE 2

### Fase 2 Revisada: Refatoração Estrutural (Semanas 2-4)

```
2.1: AUDITORIA DE BANCO DE DADOS (NOVO - 2-3 dias)
   └─ Mapear todas tabelas
   └─ Identificar redundâncias
   └─ Entender propósito de cada uma
   └─ Validar integridade de dados

2.2: DESIGN DO NOVO SCHEMA (NOVO - 2-3 dias)
   └─ Consolidar tabelas redundantes
   └─ Definir tipos de dados corretos
   └─ Definir relacionamentos claros
   └─ Criar schema Drizzle

2.3: MIGRAÇÃO DE DADOS (NOVO - 3-4 dias)
   └─ Backup completo
   └─ Escrever migrations
   └─ Executar com validação
   └─ Testar rollback

2.4: ATUALIZAR CÓDIGO (NOVO - 5-7 dias)
   └─ Types consolidados
   └─ Services consolidados
   └─ APIs limpas
   └─ Componentes reorganizados

2.5: VALIDAÇÃO COMPLETA (NOVO - 2-3 dias)
   └─ Testes funcionais
   └─ Testes de dados
   └─ Performance
   └─ Segurança

2.6: DESIGN SYSTEM BASE (MANTIDO - 2-3 dias)
   └─ Paleta de cores
   └─ Tipografia
   └─ Spacing

2.7: REFATORAR COMPONENTES (MANTIDO - 2-3 dias)
   └─ Componentes comuns
   └─ Dark mode
   └─ Reutilização

TOTAL FASE 2: 3-4 SEMANAS (vs 2 semanas antes)
```

---

## 📊 CHECKLIST DE CONSOLIDAÇÃO

### Pré-Consolidação

- [ ] Backup completo do banco
- [ ] Documentação de todas tabelas atuais
- [ ] Entendimento de propósito de cada tabela
- [ ] Identificação de redundâncias 100%
- [ ] Consenso no novo schema

### Durante Consolidação

- [ ] Migration script escrito
- [ ] Validações de integridade criadas
- [ ] Rollback procedure pronto
- [ ] Testes em staging antes de produção
- [ ] Zero perda de dados

### Pós-Consolidação

- [ ] Código atualizado 100%
- [ ] Testes funcionais passando
- [ ] Performance igual ou melhor
- [ ] Documentação atualizada
- [ ] Time treinado no novo schema

---

## 🚨 RISCOS E CONTINGÊNCIA

### Risco 1: Perda de Dados na Migração

**Mitigação:**

- Backup antes de começar
- Testar migration em environment separado
- Validações de contagem antes/depois
- Rollback procedure testada

### Risco 2: Quebra de Funcionalidades

**Mitigação:**

- Atualizar código incrementalmente
- Testar após cada atualização
- Manter tabelas antigas durante transição
- Dual-write (escrever em ambas tabelas) se necessário

### Risco 3: Performance Degradada

**Mitigação:**

- Criar índices necessários
- Testar queries antes de executar
- Medir performance antes e depois
- Ajustar se necessário

---

## ✅ CRITÉRIOS DE SUCESSO

```
BANCO DE DADOS:
✓ Zero redundância
✓ Schema limpo e intuitivo
✓ Relacionamentos claros
✓ Integridade de dados 100%

CÓDIGO:
✓ Sem imports quebrados
✓ Types consolidados
✓ Services unificados
✓ Componentes reorganizados

FUNCIONALIDADE:
✓ Todas features funcionam
✓ Dados íntegros
✓ Performance OK
✓ Zero regressão

DOCUMENTAÇÃO:
✓ Schema documentado
✓ Migrations explicadas
✓ Guia de novo schema criado
```

---

**Esta expansão de Fase 2 é CRÍTICA para o sucesso da refatoração.**

**Sem consolidar banco de dados, o resto da refatoração será prejudicado.**

**Tempo estimado: Adiciona 1-1.5 semana (total 3-4 semanas para Fase 2)**

**Próximo passo: Validar redundâncias no seu Neon e confirmar consolidação proposta**
