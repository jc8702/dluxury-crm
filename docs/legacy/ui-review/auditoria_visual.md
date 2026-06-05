# Auditoria Visual — D'Luxury CRM

Este documento consolida o mapeamento e diagnóstico visual das telas e componentes realizado no ERP D'Luxury CRM antes da padronização de UI/UX.

## 1. Mapeamento Geral do Codebase

O sistema possui uma arquitetura baseada em React (Vite + TypeScript) com estilização baseada no Tailwind CSS. Foram auditadas as interfaces de todas as páginas localizadas no diretório `src/pages/`, cobrindo os 18 módulos obrigatórios:

1. **Painel Geral (Dashboard)** (`src/pages/DashboardPage.tsx` / `Dashboard.tsx`)
2. **Clientes** (`src/pages/ClientesPage.tsx` / `Clientes.tsx`)
3. **Orçamentos** (`src/pages/OrcamentosPage.tsx` / `OrcamentoForm.tsx` etc.)
4. **Projetos** (`src/pages/ProjetosPage.tsx` / `Projetos.tsx`)
5. **Visitas** (`src/pages/VisitasPage.tsx` / `Visitas.tsx`)
6. **Produção** (`src/pages/ProducaoPage.tsx` / `Producao.tsx`)
7. **Plano de Corte** (`src/pages/PlanoCortePage.tsx`)
8. **Engenharia** (`src/pages/EngenhariaPage.tsx`)
9. **Calendário** (`src/pages/CalendarioPage.tsx`)
10. **Pós-Vendas** (`src/pages/PosVendasPage.tsx` / `AfterSalesPage.tsx`)
11. **Compras** (`src/pages/ComprasPage.tsx`)
12. **Estoque** (`src/pages/EstoquePage.tsx`)
13. **Fornecedores** (`src/pages/FornecedoresPage.tsx`)
14. **Financeiro** (`src/pages/FinanceiroPage.tsx` / `FinanceiroFluxoCaixaPage.tsx` / `FinanceiroClassesPage.tsx` etc.)
15. **Notificações** (`src/pages/NotificacoesPage.tsx`)
16. **Peças/SKUs** (`src/pages/PecasPage.tsx` / `SkusPage.tsx`)
17. **Relatórios** (`src/pages/ReportsPage.tsx`)
18. **Configurações** (`src/pages/Settings.tsx`)

---

## 2. Diagnóstico Visual por Categoria

### A. Estrutura de Cards

- **Antes:** Havia múltiplos estilos de cards criados com classes Tailwind ad-hoc (`bg-[#1c1c1e]`, `border-[#2c2c2e]`, `rounded-xl`, `p-5`, etc.). Alguns cards possuíam cantos excessivamente arredondados, enquanto outros não apresentavam bordas delimitadoras ou padding consistente.
- **Problema:** Falta de uniformidade estrutural na exibição de dados e métricas rápidas (KPIs).

### B. Janelas e Modais

- **Antes:** Modais declarados de forma manual embutidos em arquivos de páginas com marcações brutas de `div` fixa e z-indexes arbitrários.
- **Problema:** Modais que não capturavam a tecla `ESC` para fechamento, ausência de Focus Trap (permitindo focar em elementos fora do modal com o Tab) e scrolling duplo (o body de fundo continuava rolando atrás do modal aberto).

### C. Elementos de Ação (Botões)

- **Antes:** Botões com variações desnecessárias de cores laranjas (`bg-orange-600`, `bg-amber-500`, `hover:bg-orange-700`) e tamanhos com padding variável em cada formulário. Falta de estados visuais consistentes (disabled, focus, active, loading).
- **Problema:** Interações e cliques imprevisíveis. Ausência de indicadores de carregamento durante requisições de API (o botão simplesmente travava sem feedback visual).

### D. Rolagem (Scrollbars)

- **Antes:** Utilização das barras de rolagem padrões do navegador (Chrome, Firefox, Safari) com cores cinza claro nativas que contrastavam severamente com o tema escuro padrão (Dark Mode) da aplicação.
- **Problema:** Quebra estética grave nas listagens longas e tabelas.

### E. Paleta de Cores, Contraste e Acessibilidade

- **Antes:** Utilização de valores hexadecimais brutos e cores estáticas, impedindo a alternância correta de tema (Dark/Light). Algumas combinações de texto cinza sobre fundo escuro geravam problemas graves de contraste (violando as diretrizes WCAG AA).
- **Problema:** Dificuldade de legibilidade e acessibilidade.

---

## 3. Considerações de UX / Interação

- **Abertura/Fechamento de Modais:** Modais fechavam apenas ao clicar em botões específicos, ignorando o comportamento esperado de clique fora (overlay) ou a tecla ESC.
- **Retorno de Foco:** O foco do teclado não retornava para o botão de origem ao fechar o modal, desorientando usuários que dependem de navegação por teclado.
