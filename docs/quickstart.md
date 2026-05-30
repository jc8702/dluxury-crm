# Guia de Início Rápido (Quickstart) & Onboarding

Bem-vindo ao **D'Luxury CRM (Fatto OS)**. Este documento tem como objetivo auxiliar o onboarding de novos colaboradores e o treinamento no uso do sistema.

## 🧭 Conhecendo o Painel Principal (Dashboard)

Ao efetuar login no sistema (via `/login`), você será redirecionado para o **Dashboard**.
O Dashboard é sua visão global de tudo o que está acontecendo:
- **Indicadores Rápidos:** Conversões de orçamentos, ticket médio mensal, projetos pendentes de aprovação e métricas de lucratividade.
- **Gráficos Analíticos:** Evolução das vendas, despesas vs. receitas, e status de produção da marcenaria em tempo real.
- **Notificações Recentes:** Alertas de estoque baixo, prazos apertados e novos orçamentos aprovados.

## 👥 Gestão de Clientes (CRM)

### Como Cadastrar um Novo Cliente
1. Acesse o menu lateral na seção **Vendas > Clientes**.
2. Clique no botão **"Novo Cliente"**.
3. Preencha os dados (Pessoa Física ou Pessoa Jurídica). O Fatto OS aceita classificação de clientes VIP (A) ou standard.
4. Salve para gerar a Ficha do Cliente, onde é possível adicionar Arquivos, visualizar Orçamentos Anteriores e Contratos.

## 💰 Orçamentos e Vendas

Existem duas formas principais de orçar:
- **Orçamento Simplificado:** Valor fechado ou inserção de Itens Manuais (nome, valor e descrição). Ideal para pequenos serviços, reparos ou serviços de parceiros.
- **Orçamento Paramétrico (Inteligente):** Criação de ambientes utilizando as "Fórmulas/Modelos de SKU". 
  1. Vá em **Vendas > Orçamentos**.
  2. Escolha **"Novo Orçamento Paramétrico"**.
  3. Adicione Ambientes (ex: Cozinha, Quarto).
  4. Insira os Módulos (ex: Gaveteiro, Porta de Giro) e o sistema irá calcular os Custos Base (Insumos), Margens e Valores de Venda automaticamente.

### Aprovação de Orçamentos
Uma vez que o cliente concorde, altere o status do Orçamento para **Aprovado**. Isso irá:
- Liberar a aba de Contratos para a geração do contrato digital.
- Alimentar o pipeline de Receitas no Financeiro.
- Mover a demanda para a aba de **Engenharia e Projetos**.

## 📐 Engenharia e Planejamento (PCP)

### 1. Projetos 3D e Aprovação Técnica
A equipe de Engenharia acessa **Engenharia > Projetos** e anexa as plantas baixas e renderizações 3D (imagens, pdfs) e envia para a aprovação final com o Cliente (workflow). 

### 2. Kanban de Produção
Quando o projeto é assinado (liberado para produção):
1. Acesse **Produção > Kanban**.
2. Os cards entram na coluna "A Iniciar".
3. A equipe arrasta os cards para as próximas etapas ("Corte", "Fita de Borda", "Furação", "Montagem", "Finalizado").
4. A mudança de colunas envia eventos e atualiza o prazo previsto de entrega.

### 3. Calendário (Agenda de Instalação)
- Vá em **Produção > Calendário**.
- Agende eventos de medição final, reuniões na obra e datas exatas de expedição e montagem dos móveis.

## 📦 Gestão de Estoque (Almoxarifado)
Evite que a produção pare por falta de material!
- **Catálogo de Matérias-Primas:** MDF, Ferragens (corrediças, dobradiças), Fitas de Borda.
- **Entradas e Saídas:** Sempre que finalizar um orçamento (ou um lote de produção), registre a **Baixa de Estoque**. O painel notificará se um insumo (ex: *Dobradiça Slowmotion*) chegar na sua Quantidade Mínima de Segurança.

## 📈 Financeiro
- Contas a Pagar (Custos da marcenaria, energia, funcionários, compras de material).
- Contas a Receber (Parcelas do cliente).
- Fluxo de Caixa (Conciliação).
  
## 💡 Dicas de Ouro
1. **Atalhos Rápidos:** Use a navegação lateral para pular de Módulo em Módulo. 
2. **Tema Escuro (Dark Mode):** Cansado no fim do dia? Clique na engrenagem ou botão de tema no canto superior para trocar para o visual noturno.
3. **Exportar Relatórios:** No Financeiro e em Vendas, você pode gerar relatórios executivos direto do Dashboard.

---
> **Dúvidas Técnicas?** Caso encontre um problema ou bug na plataforma, contate o administrador global do sistema para checagem dos logs e do painel de infraestrutura (Vercel).
