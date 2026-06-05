# Changelog UI — Refatoração e Padronização Visual

Este documento registra as alterações técnicas de UI/UX efetuadas em cada um dos 18 módulos do ERP D'Luxury CRM para a conformidade com o novo Design System.

## 1. Mapeamento de Módulos e Componentes Alterados

### 1. Painel Geral (Dashboard)

- **Arquivos:** `src/pages/DashboardPage.tsx`
- **Mudanças:** Substituição de cards estáticos CSS por `<Card>`, `<CardHeader>`, `<CardTitle>` e `<CardContent>`. Padronização dos botões de filtro e período com variantes `<Button>`. Alinhamento dos grafismos e barras de progresso para a paleta HSL do tema.

### 2. Clientes

- **Arquivos:** `src/pages/ClientsPage.tsx`
- **Mudanças:** Substituição do modal nativo bruto de criação/edição de cliente pelo componente `<Modal>` com suporte a focus trap e ESC. Troca de botões e badges de status para `<Button>` e `<Badge>` do design system.

### 3. Orçamentos

- **Arquivos:** `src/pages/AprovacaoPage.tsx` / `src/pages/PlanoCorteDemo.tsx`
- **Mudanças:** Refatoração de listagens de orçamentos e aprovações. Substituição dos cards de proposta por componentes `<Card>` estruturados. Modais de visualização técnica migrados para `<Modal>`.

### 4. Projetos

- **Arquivos:** `src/pages/ProjectsPage.tsx`
- **Mudanças:** Padronização do quadro Kanban de projetos. Os cards de projetos individuais agora herdam o estilo do `<Card>` com estados visuais corretos de arraste e interação. Substituição dos inputs de filtro por `<Input>` e `<Select>`.

### 5. Visitas

- **Arquivos:** `src/pages/VisitsPage.tsx`
- **Mudanças:** Adaptação da agenda e cards de visitas. Padronização dos modais de agendamento e cancelamento de visitas técnicas para usar o design system, com validação e ESC ativo.

### 6. Produção

- **Arquivos:** `src/pages/ProductionPage.tsx`
- **Mudanças:** Alinhamento visual das ordens de produção (OPs). Integração com `<Card>` nas listagens de etapas de marcenaria, pintura e montagem. Substituição de formulários de status por componentes `<Input>` e `<Button>` padronizados.

### 7. Plano de Corte

- **Arquivos:** `src/pages/PlanoCorteIndustrialPage.tsx`
- **Mudanças:** Padronização do canvas de corte e controle de retalhos. Os painéis de dados de peças a cortar e materiais cadastrados foram organizados usando `<Card>`. Os modais de visualização e geração de relatórios de corte adotaram o `<Modal>` oficial.

### 8. Engenharia

- **Arquivos:** `src/pages/EngineeringPage.tsx`
- **Mudanças:** Substituição da listagem técnica de BOM (Bill of Materials) e diagramas. Inputs de upload de desenho CAD/PDF substituídos por componentes `<Input>` padronizados com estados visuais de loading.

### 9. Calendário

- **Arquivos:** `src/pages/CalendarioPage.tsx`
- **Mudanças:** Estilização das datas e modais de agendamento rápido de atividades. Padronização completa do modal de criação de evento (`ModalEvento.tsx`) utilizando o design system.

### 10. Pós-Vendas

- **Arquivos:** `src/pages/PosVendaPage.tsx` (AfterSales)
- **Mudanças:** Organização de chamados abertos e reclamações usando o componente `<Card>`. Modais de feedback e abertura de chamados migrados para `<Modal>`. Badges de criticidade e status agora utilizam o `<Badge>`.

### 11. Compras

- **Arquivos:** `src/pages/ComprasPage.tsx`
- **Mudanças:** Padronização de ordens de compra e cotações em andamento. Substituição completa do modal de nova cotação pelo padrão unificado.

### 12. Estoque

- **Arquivos:** `src/pages/InventoryPage.tsx` (Estoque / Retalhos)
- **Mudanças:** Alinhamento de tabelas de SKUs físicas e controle de retalhos de MDF. Filtros rápidos de estoque usando `<Input>` e botões de reabastecimento usando `<Button>`.

### 13. Fornecedores

- **Arquivos:** `src/pages/SuppliersPage.tsx` / `src/pages/FornecedorFormModal.tsx`
- **Mudanças:** Refatoração do fluxo de cadastro e listagem de fornecedores parceiros. Migração do formulário flutuante para `<Modal>` com ESC e inputs encapsulados.

### 14. Financeiro

- **Arquivos:** `src/pages/FinancePage.tsx` / `src/pages/FinanceiroFluxoCaixaPage.tsx` / `src/pages/FinanceiroClassesPage.tsx` / `src/pages/FinanceiroCondicoesPage.tsx` / `src/pages/FinanceiroFormasPage.tsx` / `src/pages/FinanceiroDREPage.tsx` / `src/pages/FinanceiroConciliacaoPage.tsx` etc.
- **Mudanças:** Refatoração profunda de todas as subpáginas financeiras (Fluxo de Caixa, Contas a Pagar/Receber, DRE, Conciliação Bancária). Substituição das tabelas ad-hoc por tabelas limpas envoltas em `<Card>`. Modais de lançamentos manuais, wizards de importação de OFX e telas de configuração de formas/condições de pagamento padronizados.

### 15. Notificações

- **Arquivos:** `src/pages/NotificacoesPage.tsx`
- **Mudanças:** Substituição do container de notificações e alertas. Badges de leitura e botão de limpar todos alinhados com os padrões visuais oficiais.

### 16. Peças / SKUs

- **Arquivos:** `src/pages/SKUsPage.tsx`
- **Mudanças:** Padronização das visualizações de componentes de marcenaria cadastrados e SKUs gerais. Substituição de formulários de edição rápida pelo componente `<Modal>`.

### 17. Relatórios

- **Arquivos:** `src/pages/ReportsPage.tsx`
- **Mudanças:** Organização de gráficos DRE, vendas e produtividade em `<Card>`s individuais. Substituição de botões de exportação (PDF/Excel) por `<Button>` com ícones apropriados e estados visuais de loading.

### 18. Configurações

- **Arquivos:** `src/pages/SettingsPage.tsx` / `src/pages/Settings.tsx`
- **Mudanças:** Substituição completa de todos os inputs manuais e modais não padronizados pelos componentes oficiais `<Card>`, `<Modal>`, `<Button>`, `<Badge>` e `<Input>` do design system. Remoção das constantes de estilos redundantes (`inputStyle`, etc.).

---

## 2. Remoção de Código Legado / Estilos Inconsistentes

- Exclusão de classes inline repetitivas como `bg-[#1a1a1c]`, `text-orange-500` e similares nas páginas.
- Limpeza de listeners redundantes de teclado (`window.addEventListener('keydown')`) em páginas individuais, visto que o comportamento de fechar no ESC foi herdado globalmente pelo componente `<Modal>`.
