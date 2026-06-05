# RESUMO DE PROJETO: D'Luxury CRM
## Informações Gerais
- **Status Atual:** Correções de banco de dados e UI para Projetos, Estoque, SKUs, e Calendário concluídas.
- **Objetivo Central:** Garantir que o sistema de Gestão de Estoque Granular funcione, os formulários salvem e bugs sejam resolvidos de vez.
- **Última Atualização:** 05/06/2026 - 16:59

## Histórico de Alterações
- **05/06/2026 - 16:59:** Resolução de bugs relatados pelo usuário
  - Arquivos modificados: 
    - src/api-lib/projects.ts (Payload de save consertado)
    - src/components/projects/ProjectKanban.tsx (Encoding e campos arrumados)
    - src/components/skus/SKUPage.tsx (Encoding arrumado)
    - src/components/inventory/Inventory.tsx (Aba de Catálogo de SKUs incluída no Inventário local)
    - create-user.ts (Criação de usuário Admin)
  - Banco de Dados (Neon): Migration realizada para unificar SKUs em estoque_materiais_detalhado e criação de usuário admin@admin.com (senha: 123456)

