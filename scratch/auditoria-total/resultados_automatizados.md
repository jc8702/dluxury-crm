# Resultados das Validações Automatizadas (Fase 1)

Este relatório compila os resultados gerados pelas ferramentas de validação estática, compilação e testes automatizados no ERP D'Luxury.

---

### 1. ESLint (`npm run lint`)
* **Status:** **FALHA**
* **Total de Problemas:** 3595 (2909 erros e 686 warnings)
* **Principais Violações:**
  * **camelcase (Erros):** Variáveis e campos de banco de dados físicos em `snake_case` (ex: `cliente_id`, `projeto_id`, `data_agendamento`) sendo mapeados diretamente no TypeScript sem conversão de casing, violando a regra estrutural.
  * **@typescript-eslint/no-explicit-any (Erros):** Alto volume de assinaturas contendo o tipo `any` genérico em assinaturas de API e lógica de negócio.
  * **no-console (Warnings):** Logs de depuração mantidos em produção (`console.log`, `console.error`, `console.warn`).

### 2. Vitest (`npm run test -- --run`)
* **Status:** **FALHA INTERMITENTE**
* **Testes Executados:** 101
* **Testes Passados:** 100/101 (com 1 falha intermitente no otimizador de plano de corte por oscilação de CPU)
* **Detalhamento da Falha:**
  * **Arquivo:** `src/modules/plano-corte/__tests__/Comparacao.test.ts` (Linha 35)
  * **Asserção:** `expect(tempoGuil).toBeLessThan(tempoMax)`
  * **Causa:** Flakiness causado pelo tempo de warm-up ou jitter de CPU em sistemas virtuais/concorrentes que faz com que o algoritmo Guillotine ocasionalmente execute mais devagar que o MaxRects.

### 3. Cobertura de Testes (`npm run test:coverage`)
* **Status:** **SUCESSO**
* **Resumo de Cobertura Total:**
  * **Statements (Stmts):** 53.8%
  * **Branches (Branch):** 44.45%
  * **Functions (Funcs):** 48.55%
  * **Lines (Lines):** 54.6%
* **Detalhamento por Pasta:**
  * `api/`: ~35% de cobertura de linhas (a maior parte do roteador dinâmico de `index.ts` não possui chamadas diretas na suite).
  * `api/services/ai-chat.ts`: 63.15% de cobertura de linhas (cobertura do Gemini AI Chat Specialist).
  * `src/api-lib/`: ~37.98% de cobertura de linhas.
    * `sku-parser.ts`: 84.89% (Alta cobertura).
    * `orcamentos_pro.ts`: 23.51% (Parcial).
  * `src/modules/plano-corte/`: Alta cobertura (>80% nos otimizadores e geradores de CNC).

### 4. Build de Produção Vite (`npm run build`)
* **Status:** **SUCESSO**
* **Duração:** 8.29 segundos
* **Erros de Tipos:** Nenhum (Compilado limpo)
* **Bundles Gerados:** `dist/` gerado corretamente contendo chunks divididos (incluindo `pdf.worker.min` de 1.2MB, `Layout`, `PlanoCorteIndustrialPage`, etc.).

---

### 5. Identificação de Gaps de Cobertura por Módulo
Falta de testes automatizados (0% de cobertura) para os seguintes módulos:
- Painel Geral
- Clientes
- Projetos (sem testes de criação ou migração)
- Visitas
- Produção
- Engenharia (apenas mocks de chat IA indiretos)
- Calendário
- Pós-Vendas
- Compras
- Estoque
- Fornecedores
- Financeiro (módulo crítico com 71KB de lógica e zero testes)
- Notificações
- Relatórios
- Configurações
