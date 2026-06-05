# Inventário de Módulos do Sistema DLuxury CRM

Este documento lista todos os módulos mapeados do escopo de auditoria, com seus respectivos arquivos e rotas identificadas no código-fonte.

## Mapeamento de Módulos

| Módulo (Escopo)   | Arquivos/Rotas Identificadas                                                                                               | Observações                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1. painel geral   | `src/pages/DashboardPage.tsx`                                                                                              | Página principal do dashboard                |
| 2. clientes       | `src/pages/ClientsPage.tsx`                                                                                                | Tela de listagem e gestão de clientes        |
| 3. orçamentos     | `src/pages/AprovacaoPage.tsx`, `src/modules/orcamentos/`                                                                   | Módulo de orçamentos com página de aprovação |
| 4. projetos       | `src/pages/ProjectsPage.tsx`                                                                                               | Tela de listagem e gestão de projetos        |
| 5. visitas        | `src/pages/VisitsPage.tsx`                                                                                                 | Tela de listagem e gestão de visitas         |
| 6. produção       | `src/pages/ProductionPage.tsx`                                                                                             | Tela de listagem e gestão de produção        |
| 7. plano de corte | `src/pages/CuttingPlanPage.tsx`, `src/pages/PlanoCorteDemo.tsx`, `src/modules/plano-corte/`                                | Módulo de planejamento de corte              |
| 8. engenharia     | `src/pages/EngineeringPage.tsx`, `src/modules/engenharia/`                                                                 | Módulo de engenharia                         |
| 9. calendário     | `src/pages/CalendarioPage.tsx`, `src/modules/agenda/`                                                                      | Módulo de calendário/agenda                  |
| 10. pós-vendas    | `src/pages/PosVendaPage.tsx`                                                                                               | Tela de gestão de pós-vendas                 |
| 11. compras       | `src/pages/ComprasPage.tsx`                                                                                                | Tela de listagem e gestão de compras         |
| 12. estoque       | `src/pages/InventoryPage.tsx`                                                                                              | Tela de listagem e gestão de estoque         |
| 13. fornecedores  | `src/pages/SuppliersPage.tsx`                                                                                              | Tela de listagem e gestão de fornecedores    |
| 14. financeiro    | `src/pages/FinancePage.tsx`, `src/modules/financeiro/`, diversas páginas de finanças (FluxoCaixa, DRE, TitulosPagar, etc.) | Módulo financeiro com múltiplas telas        |
| 15. notificações  | `src/pages/NotificacoesPage.tsx`                                                                                           | Tela de notificações                         |
| 16. peças / skus  | `src/pages/SKUsPage.tsx`                                                                                                   | Tela de listagem e gestão de SKUs/peças      |
| 17. relatórios    | `src/pages/ReportsPage.tsx`                                                                                                | Tela de geração de relatórios                |
| 18. configurações | `src/pages/SettingsPage.tsx`                                                                                               | Tela de configurações do sistema             |

## Estrutura de Módulos Encontrada

- `src/modules/`: contém módulos específicos (agenda, engenharia, financeiro, orcamentos, plano-corte)
- `src/pages/`: contém páginas correspondentes às telas dos módulos
- `src/components/`, `src/context/`, `src/hooks/`, `src/services/`: arquivos de suporte compartilhados
- `backend/`: API Python para importação de CAD
- `api-lib/`: provavelmente cliente para comunicação com API

## Observações Iniciais

- Alguns módulos possuem tanto página quanto módulo dedicado (ex: financeiro, orcamentos, plano-corte)
- Outros possuem apenas página (ex: clientes, projetos, visitas, estoque, fornecedores, etc.)
- O módulo de peças/skus está representado pela página SKUsPage
- O módulo de relatórios está representado pela página ReportsPage
- O módulo de configurações está representado pela página SettingsPage
- O módulo de pós-vendas está representado pela página PosVendaPage
- O módulo de visitas está representado pela página VisitsPage
- O módulo de produção está representado pela página ProductionPage
- O módulo de calendário possui tanto página quanto módulo (agenda)

Este inventário será utilizado para orientar as fases subsequentes de auditoria e teste.
