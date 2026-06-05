# Débito Técnico: Queries Órfãs de orcamentos

**Status:** REFATORADO ✅ (PROMPT 4, 2026-06-04)

## Resumo

17 queries em 7 arquivos que usavam `FROM orcamentos` foram refatoradas para `quotations` via Drizzle ORM.

Tabela `orcamentos` foi deletada em PROMPT 1, causando 500 errors. PROMPT 4 refatorou todas.

## Queries por Arquivo e Status

### 1. /api/aprovacao/* (5 queries)
- [x] Query "aprovar por token" ✅ REFATORADA
- [x] Query "listar aprovações pendentes" ✅ REFATORADA
- [x] Query "aprovar documento" ✅ REFATORADA
- [x] Query "rejeitar documento" ✅ REFATORADA
- [x] Query "validar token" ✅ REFATORADA

Status: ✅ COMPLETO (5/5 refatoradas)

### 2. /api/contratos/* (5 queries)
- [x] Query "gerar contrato" ✅ REFATORADA
- [x] Query "webhook assinatura" ✅ REFATORADA
- [x] Query "listar contratos por status" ✅ REFATORADA
- [x] Query "atualizar status contrato" ✅ REFATORADA
- [x] Query "obter contrato digital" ✅ REFATORADA

Status: ✅ COMPLETO (5/5 refatoradas)

### 3. DELETE /api/clients/:id (1 query)
- [x] Query "soft-delete orçamentos de cliente" ✅ REFATORADA

Status: ✅ COMPLETO (1/1 refatorada)

### 4. POST /api/estoque/finalizar-op (1 query)
- [x] Query "obter orçamento para finalizar OP" ✅ REFATORADA

Status: ✅ COMPLETO (1/1 refatorada)

### 5. POST /api/notificacoes/gerar (1 query)
- [x] Query "orçamentos sem resposta por 7 dias" ✅ REFATORADA

Status: ✅ COMPLETO (1/1 refatorada)

### 6. GET /api/projects (3 queries)
- [x] Query "SUM valor_orcamento" ✅ REFATORADA
- [x] Query "SELECT orçamentos do projeto" ✅ REFATORADA
- [x] Query "UPDATE valor_orcamento_atual" ✅ REFATORADA

Status: ✅ COMPLETO (3/3 refatoradas)

### 7. Função migrarOrcamentoLegadoParaPro (1 query)
- [x] Dead code ✅ DELETADO

Status: ✅ DELETADO (1/1)

## Totais

- **Queries originalmente órfãs:** 17
- **Queries refatoradas para Drizzle:** 16
- **Queries deletadas (dead code):** 1
- **Status:** ✅ 100% COMPLETO

## Impacto

Todas as rotas que usavam `FROM orcamentos` agora usam `quotations` via Drizzle ORM.
Não há mais 500 errors por "relation orcamentos does not exist".

## Próximos Passos

PROMPT 3: Aumentar cobertura de testes para 80%
