# Inventário de Módulos (ERP D'Luxury)

Este documento descreve a estrutura técnica completa para cada um dos 18 módulos mapeados no ERP D'Luxury.

---

### 1. Painel Geral (Dashboard)
* **Rotas/Páginas Frontend:** `/painel` (Componente: `DashboardPage.tsx`, carregando `src/components/dashboard/*`)
* **Serviços/APIs Backend:**
  * GET `/api/goals` (Gerenciado em `src/api-lib/crm.ts`)
  * GET `/api/kanban` (Gerenciado em `src/api-lib/crm.ts`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Falta de testes unitários para a agregação de metas mensais e contagem de itens por status de Kanban no dashboard.

### 2. Clientes
* **Rotas/Páginas Frontend:** `/clientes` (Componente: `ClientsPage.tsx`, carregando `src/components/clients/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/clients` (Gerenciado em `src/api-lib/crm.ts` -> `handleClients`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Validação de CPF/CNPJ, lógica de inserção e atualização de clientes no banco.

### 3. Orçamentos
* **Rotas/Páginas Frontend:** `/orcamentos` (Componente: `src/components/orcamentos/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/orcamentos` (Gerenciado em `src/api-lib/orcamentos.ts` -> `handleOrcamentos`)
  * GET/POST/PUT/DELETE `/api/orcamentos-pro` (Gerenciado em `src/api-lib/orcamentos_pro.ts` -> `handleOrcamentosPro`)
  * POST `/api/orcamentos/importar-itens` (`api/orcamentos/importar-itens.ts`)
  * GET `/api/orcamentos/export-pdf` (`api/orcamentos/exportar-pdf.ts`)
  * GET/POST `/api/orcamento-tecnico` (Gerenciado em `src/api-lib/orcamentos.ts`)
* **Testes Existentes:**
  * `src/api-lib/__tests__/orcamentos_pro.test.ts` (Cobrando validações de margens, BOM, cálculo acumulado, validação de inputs negativos)
* **Lacunas de Teste:** Testes para a exportação de PDF e o processamento de importação de planilhas.

### 4. Projetos
* **Rotas/Páginas Frontend:** `/projetos` (Componente: `ProjectsPage.tsx`, carregando `src/components/projects/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/projects` (Gerenciado em `src/api-lib/projects.ts` -> `handleProjects`)
  * POST `/api/importar-projeto` (`src/api-lib/importacao-projetos.ts`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Teste da migração legada de `kanban_items` para `projects`, criação física de novos projetos vinculados a clientes.

### 5. Visitas
* **Rotas/Páginas Frontend:** `/visitas` (Componente: `VisitsPage.tsx`, carregando `src/components/visits/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/kanban` (Gerenciado em `src/api-lib/crm.ts`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Lógica de agendamento de visitas vinculadas a leads de vendas.

### 6. Produção
* **Rotas/Páginas Frontend:** `/producao` (Componente: `ProductionPage.tsx`, carregando `src/components/production/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/production` (Gerenciado em `src/api-lib/production.ts` -> `handleProduction`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Lógica de avanço de fases de produção (Ex: "Corte", "Engenharia", "Montagem") e validação de restrições de capacidade.

### 7. Plano de Corte
* **Rotas/Páginas Frontend:** `/plano-de-corte` (Componente: `CuttingPlanPage.tsx` e `PlanoCorteDemo.tsx`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/plano-corte` (Gerenciado em `src/api-lib/planocorte.ts` -> `handlePlanoCorte`)
  * GET/POST/PUT/DELETE `/api/chapas` (Gerenciado em `src/api-lib/planocorte.ts`)
  * POST `/api/plano-corte/importar-desenho` (Gerenciado em `src/api-lib/planocorte.ts`)
  * GET/POST/PUT/DELETE `/api/retalhos` (Gerenciado em `src/api-lib/retalhos.ts` -> `handleRetalhos`)
* **Testes Existentes:**
  * `src/modules/plano-corte/__tests__/` (Vários arquivos: Guillotine, MaxRects, Otimizador, Comparacao, Retalhos)
* **Lacunas de Teste:** Integração real com retalhos salvos no PostgreSQL durante a otimização.

### 8. Engenharia
* **Rotas/Páginas Frontend:** `/engenharia` (Componente: `EngineeringPage.tsx`, carregando `src/components/engineering/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/engineering` (Gerenciado em `src/api-lib/projects.ts` -> `handleEngineering`)
  * GET/POST/PUT/DELETE `/api/engenharia/skus` (Gerenciado em `src/api-lib/planocorte.ts`)
* **Testes Existentes:** Mocks indiretos de RAG em `ai-chat.test.ts`
* **Lacunas de Teste:** Geração automática de estrutura de peças (BOM) a partir de desenhos técnicos na API.

### 9. Calendário
* **Rotas/Páginas Frontend:** `/calendario` (Componente: `CalendarioPage.tsx`, carregando `src/components/agenda/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/agenda` (Gerenciado em `src/api-lib/agenda.ts` -> `handleAgenda`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Validação de colisões de datas/horários e persistência de compromissos.

### 10. Pós-Vendas
* **Rotas/Páginas Frontend:** `/pos-venda` (Componente: `PosVendaPage.tsx`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/after-sales` (Gerenciado em `src/api-lib/after_sales.ts` -> `handleAfterSales`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Integração relacional (JOINs) entre chamados, clientes e projetos no banco de dados.

### 11. Compras
* **Rotas/Páginas Frontend:** `/compras` (Componente: `ComprasPage.tsx`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/compras` (Gerenciado em `src/api-lib/compras.ts` -> `handleCompras`)
  * GET/POST/PUT/DELETE `/api/aprovacao` (Gerenciado em `src/api-lib/aprovacao.js` -> `handleAprovacao`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Alçada de aprovações de compras com base no valor do pedido e alocação de centro de custo.

### 12. Estoque
* **Rotas/Páginas Frontend:** `/estoque`, `/retalhos` (Componente: `InventoryPage.tsx` e `RetalhosPage.tsx`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/estoque` (Gerenciado em `src/api-lib/estoque.ts` -> `handleEstoque`)
  * GET/POST/PUT/DELETE `/api/retalhos` (Gerenciado em `src/api-lib/retalhos.ts` -> `handleRetalhos`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Lógica de entrada/saída física de insumos do estoque e controle de saldo mínimo de chapas/acessórios.

### 13. Fornecedores
* **Rotas/Páginas Frontend:** `/fornecedores` (Componente: `SuppliersPage.tsx`, carregando `src/components/suppliers/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/forn` (Gerenciado em `src/api-lib/estoque.ts` -> `handleEstoque`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Cadastro e listagem de fornecedores vinculados à compra de insumos.

### 14. Financeiro
* **Rotas/Páginas Frontend:** `/financeiro` + 11 sub-páginas (Componentes em `src/modules/financeiro/*` e `src/pages/Finance*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/financeiro/*` (Gerenciado em `src/api-lib/financeiro.ts` -> `handleFinanceiro`)
  * GET/POST/PUT/DELETE `/api/billings` (Gerenciado em `src/api-lib/financeiro.ts`)
  * GET/POST/PUT/DELETE `/api/condicoes-pagamento` (Gerenciado em `src/api-lib/financeiro.ts`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Cálculo do DRE gerencial, fluxo de caixa, conciliação de arquivos OFX bancários e rateio por centros de custo.

### 15. Notificações
* **Rotas/Páginas Frontend:** `/notificacoes` (Componente: `NotificacoesPage.tsx`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/notificacoes` (Gerenciado em `src/api-lib/notificacoes.ts` -> `handleNotificacoes`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Lógica de leitura/marcação de lida, persistência de alertas sistêmicos.

### 16. Peças / SKUs
* **Rotas/Páginas Frontend:** `/pecas` (Componente: `SKUsPage.tsx`, carregando `src/components/skus/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/skus` (Gerenciado em `src/api-lib/projects.ts` -> `handleSKUs`)
  * POST `/api/match-skus` (`src/api-lib/match-skus.ts`)
* **Testes Existentes:**
  * `src/api-lib/__tests__/sku-parser.test.ts` (Validações de parsing e categorização de SKUs)
* **Lacunas de Teste:** Correspondência automática de peças (matching) e persistência de novos SKUs gerados por regras.

### 17. Relatórios
* **Rotas/Páginas Frontend:** `/relatorios` (Componente: `ReportsPage.tsx`, carregando `src/components/reports/*`)
* **Serviços/APIs Backend:**
  * GET `/api/reports` (Gerenciado em `src/api-lib/projects.ts` -> `handleReports`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Agrupamento estatístico e integridade matemática dos relatórios de vendas e produção.

### 18. Configurações
* **Rotas/Páginas Frontend:** `/configuracoes` (Componente: `SettingsPage.tsx`, carregando `src/components/settings/*`)
* **Serviços/APIs Backend:**
  * GET/POST/PUT/DELETE `/api/users` (Gerenciado em `src/api-lib/auth.js` -> `handleUsers`)
* **Testes Existentes:** Nenhum
* **Lacunas de Teste:** Persistência de preferências de usuário, troca de senha e autorização por nível de acesso (RBAC).
