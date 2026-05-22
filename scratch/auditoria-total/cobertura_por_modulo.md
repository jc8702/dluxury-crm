# Cobertura de Testes por Módulo

Este documento apresenta a cobertura de testes automatizados para cada módulo do escopo de auditoria.

## Mapeamento de Testes Existentes

| Módulo | Testes Automatizados Existentes | Status | Observações |
|--------|--------------------------------|--------|-------------|
| 1. painel geral | Nen teste específico encontrado | ❌ Sem teste automatizado | Alguns componentes podem ser cobertos indiretamente |
| 2. clientes | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 3. orçamentos | `src/api-lib/__tests__/orcamentos_pro.test.ts` | ⚠️ Parcial | Teste específico para orcamentos_pro do api-lib |
| 4. projetos | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 5. visitas | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 6. produção | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 7. plano de corte | `src/modules/plano-corte/__tests__/*.test.ts` (5 arquivos) | ✅ Boa cobertura | Testes unitários para otimizadores, validação industrial e comparação |
| 8. engenharia | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 9. calendário | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 10. pós-vendas | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 11. compras | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 12. estoque | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 13. fornecedores | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 14. financeiro | Nen teste específico encontrado | ❌ Sem teste automatizado | Apesar de ter múltiplas páginas, nenhum teste específico encontrado |
| 15. notificações | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 16. peças / skus | `src/api-lib/__tests__/sku-parser.test.ts` | ⚠️ Parcial | Teste para parser de SKU no api-lib |
| 17. relatórios | Nen teste específico encontrado | ❌ Sem teste automatizado |  |
| 18. configurações | Nen teste específico encontrado | ❌ Sem teste automatizado |  |

## Testes Existentes por Categoria

### 1. Testes de API-Lib (`src/api-lib/__tests__/`)
- `ai-chat.test.ts`: Testes para funcionalidade de chat com IA
- `orcamentos_pro.test.ts`: Testes para processamento profissional de orçamentos
- `sku-parser.test.ts`: Testes para parser de SKU

### 2. Testes de Design System (`src/design-system/components/__tests__/`)
- `Button.test.tsx`: Testes para componente Button
- `Modal.test.tsx`: Testes para componente Modal

### 3. Testes de Hooks (`src/hooks/__tests__/`)
- `useEscClose.test.ts`: Testes para hook useEscClose

### 4. Testes de Plano de Corte (`src/modules/plano-corte/__tests__/`)
- `Comparacao.test.ts`: Testes para comparação de algoritmos de corte
- `GuillotineOptimizer.test.ts`: Testes para otimizador Guillotine
- `HybridOptimizer.test.ts`: Testes para otimizador Híbrido
- `IndustrialValidation.test.ts`: Testes para validação industrial
- `MaxRectsOptimizer.test.ts`: Testes para otimizador MaxRects

## Análise de Gaps

### Módulos com Cobertura Parcial (⚠️):
1. **orçamentos**: Apenas teste para orcamentos_pro no api-lib, faltam testes para fluxo completo de criação, edição, aprovação
2. **peças / skus**: Apenas teste para sku-parser no api-lib, faltam testes para gestão completa de SKUs

### Módulos com Boa Cobertura (✅):
1. **plano de corte**: Boa cobertura de testes unitários para algoritmos de otimização e validação

### Módulos sem Testes (❌):
Os restantes 15 módulos não possuem testes automatizados específicos identificados.

## Recomendações para Melhoria de Cobertura

1. **Prioridade Alta**: Criar testes para módulos críticos de negócio (orçamentos, financeiro, estoque, compras)
2. **Prioridade Média**: Criar testes para módulos operacionais (clientes, projetos, visitas, produção)
3. **Prioridade Baixa**: Criar testes para módulos de suporte (notificações, configurações, relatórios)

**Próximos passos**: Proseguir com FASE 3 - Smoke Test Funcional Obrigatório para validar funcionalidade básica de cada módulo.