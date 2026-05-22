# Cobertura de Testes por Módulo (Fase 2)

Este documento apresenta a matriz detalhada da cobertura de testes automatizados unitários/integração para cada um dos 18 módulos do ERP D'Luxury.

| ID | Módulo | Testes Automatizados Existentes | Cobertura Estimada | Status de Teste |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Painel Geral** | Nenhum | 0% | Sem teste automatizado |
| 2 | **Clientes** | Nenhum | 0% | Sem teste automatizado |
| 3 | **Orçamentos** | `src/api-lib/__tests__/orcamentos_pro.test.ts` | Parcial (PRO >80%, Legado 0%) | Possui cobertura unitária em Orçamentos PRO |
| 4 | **Projetos** | Nenhum | 0% | Sem teste automatizado |
| 5 | **Visitas** | Nenhum | 0% | Sem teste automatizado |
| 6 | **Produção** | Nenhum | 0% | Sem teste automatizado |
| 7 | **Plano de Corte** | 5 arquivos em `src/modules/plano-corte/__tests__/` (Comparacao, GuillotineOptimizer, HybridOptimizer, IndustrialValidation, MaxRectsOptimizer) | Alta (>80%) | Cobertura unitária e matemática forte |
| 8 | **Engenharia** | Mocks de roteamento em `src/api-lib/__tests__/ai-chat.test.ts` | Indireta (0% direta) | Mocado de forma indireta |
| 9 | **Calendário** | Nenhum | 0% | Sem teste automatizado |
| 10 | **Pós-Vendas** | Nenhum | 0% | Sem teste automatizado (Gera erro crítico HTTP 500) |
| 11 | **Compras** | Nenhum | 0% | Sem teste automatizado |
| 12 | **Estoque** | Nenhum | 0% | Sem teste automatizado |
| 13 | **Fornecedores** | Nenhum | 0% | Sem teste automatizado |
| 14 | **Financeiro** | Nenhum | 0% | Sem teste automatizado |
| 15 | **Notificações** | Nenhum | 0% | Sem teste automatizado |
| 16 | **Peças / SKUs** | `src/api-lib/__tests__/sku-parser.test.ts` | Alta (Parser >85%) | Cobertura unitária no parser de SKUs |
| 17 | **Relatórios** | Nenhum | 0% | Sem teste automatizado |
| 18 | **Configurações** | Nenhum | 0% | Sem teste automatizado |

---

### Lacunas e Recomendações
1. **Financeiro (P2):** O arquivo de lógica do financeiro possui 71KB de código de produção estruturando fluxos de DRE, aging, conciliação e faturamento. A ausência de testes neste módulo representa um risco elevado de regressão. Recomenda-se criar `src/api-lib/__tests__/financeiro.test.ts`.
2. **Pós-Vendas (P0):** O módulo possui erros relacionais no SQL e zero testes automatizados. O bug HTTP 500 teria sido detectado automaticamente em CI caso houvesse um teste básico de GET na API. Recomenda-se criar `src/api-lib/__tests__/after_sales.test.ts`.
3. **Projetos (P0):** A migração silenciosa quebrada de `kanban_items` em projetos passou despercebida pela falta de testes de migração de banco de dados. Recomenda-se criar testes unitários para validar a importação e migração de registros.
