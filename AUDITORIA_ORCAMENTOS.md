# 🔍 AUDITORIA E PLANO DE INTEGRAÇÃO - MÓDULO DE ORÇAMENTOS PRO
**Data:** 26 de maio de 2026  
**Status:** Módulo funcional de forma isolada, necessitando de integrações automáticas críticas de fluxo de processo (PCP, Financeiro e Estoque) para ser comercializável.

---

## 📊 1. ANÁLISE DE ARQUITETURA E INCONSISTÊNCIAS

Durante a auditoria profunda do código-fonte, identificamos uma redundância crítica no módulo de orçamentos:

### ⚠️ Duplicação e Código Órfão no Codebase
* **Interface Comercial Antiga (Inativa):** O diretório `src/components/orcamentos/` (`Orcamentos.tsx`, `PropostaTemplate.tsx` e `technical/CompositorOrcamento.tsx`) está órfão. Ele utiliza a tabela de banco de dados legada `orcamentos` e a rota legada `/api/orcamentos`.
* **Interface Industrial PRO (Ativa):** A rota principal no `src/App.tsx` aponta `/orcamentos` para `src/modules/orcamentos/pages/OrcamentoForm.tsx`, que opera inteiramente sobre a nova arquitetura do `orcamentos_pro.ts` no backend, utilizando Drizzle ORM e as tabelas `orcamentos_pro`, `orcamento_itens` e `orcamento_lista_explodida`.

> [!WARNING]  
> **Recomendação Imediata:** Excluir fisicamente a pasta legada `src/components/orcamentos/` para evitar confusões de manutenção e reduzir o peso do codebase.

---

## 🚨 2. GAPS DE INTEGRAÇÃO CRÍTICOS (GARGALOS OPERACIONAIS)

Atualmente, o fluxo comercial do Orçamento PRO está isolado dos demais módulos. A tabela abaixo detalha o que ocorre hoje e qual seria o comportamento ideal de um ERP integrado:

| Fluxo de Integração | Estado Atual | Comportamento Ideal (Integrado) | Gravidade |
|--------------------|--------------|---------------------------------|-----------|
| **Sincronização Financeira** | A alteração de status para `APROVADO` no orçamento PRO apenas altera o campo no banco. **Nenhum título financeiro é gerado.** | Ao aprovar, o sistema deve ler a condição de pagamento e gerar automaticamente parcelas na tabela `titulos_receber` integradas ao faturamento. | 🔴 **Crítico** |
| **Explosão no PCP (Produção)** | Ao aprovar, o orçamento PRO permanece comercial. **Nenhuma ordem de produção é criada.** | O PCP deve gerar automaticamente uma Ordem de Produção (`ordens_producao`) para cada móvel do orçamento, listando as peças e operações. | 🔴 **Crítico** |
| **Baixa e Reserva de Estoque** | Nenhum insumo (chapas de MDF, dobradiças, puxadores) é reservado ou debitado do estoque. | O sistema deve ler a tabela `orcamento_lista_explodida` e lançar reservas de estoque (`movimentacoes_estoque`) vinculadas à Ordem de Produção. | 🔴 **Crítico** |
| **Cálculo de Precificação** | Usa markup simples: $Preço = Custo \times (1 + Margem/100)$. | Deve ler a tabela `configuracoes_precificacao` e incorporar impostos, perdas estruturais e taxas financeiras sobre a base de custo real. | ⚠️ **Média** |

---

## 🏗️ 3. PROPOSTA DE ARQUITETURA DE INTEGRAÇÃO

Abaixo, ilustramos o ciclo de vida ideal de um orçamento PRO aprovado dentro do ERP D'Luxury:

```mermaid
graph TD
    A[Orçamento Rascunho / Enviado] -->|Aprovação do Cliente| B(PATCH /api/orcamentos-pro?action=aprovar)
    B --> C{Transação Atômica DB}
    
    C -->|Passo 1| D[Atualiza Status para APROVADO]
    
    C -->|Passo 2| E[Financeiro: Cria Parcelas em titulos_receber]
    E -->|Associa| E1[condicao_pagamento_id]
    
    C -->|Passo 3| F[Produção PCP: Cria OPs em ordens_producao]
    F -->|Exporta Peças| F1[orcamento_lista_explodida]
    
    C -->|Passo 4| G[Estoque: Lança Reservas em movimentacoes_estoque]
    G -->|Debita Insumos| G1[materiais / erp_chapas]
    
    C -->|Passo 5| H[Auditoria: Loga APROVAÇÃO do Orçamento]
    
    classDef success fill:#4ade80,stroke:#166534,color:#000;
    classDef warning fill:#facc15,stroke:#854d0e,color:#000;
    classDef error fill:#f87171,stroke:#991b1b,color:#fff;
    classDef info fill:#60a5fa,stroke:#1e40af,color:#fff;
    
    class A,B warning;
    class C info;
    Def success class D,E,F,G,H;
```

---

## 🛠️ 4. PLANO DE EXECUÇÃO TÉCNICO (ROADMAP)

### Fase 1: Integração Financeira & Condições de Pagamento (P0)
* **Objetivo:** Garantir que orçamentos PRO aprovados alimentem o fluxo de caixa do módulo financeiro.
* **Ações:**
  1. Adicionar lógica no endpoint `PUT /api/orcamentos-pro` (ação `aprovar`) para ler a condição de pagamento associada no cabeçalho do orçamento.
  2. Gerar parcelas proporcionais de contas a receber (`titulos_receber`) associando o `cliente_id`, `orcamento_id` e gerando as datas de vencimento com saltos mensais de 30 dias.
  3. Lançar o custo financeiro e taxas com base nas variáveis do faturamento.

### Fase 2: Integração com PCP (Produção) & Listas Explodidas (P0)
* **Objetivo:** Enviar os dados de engenharia do orçamento diretamente para a linha de produção fabril.
* **Ações:**
  1. Ler todos os itens em `orcamento_itens` que possuem um `skuEngenhariaId` associado.
  2. Criar uma Ordem de Produção (`ordens_producao`) para cada item aprovado.
  3. Mapear as dimensões (largura, altura, espessura) e a lista explodida de componentes cadastrados em `orcamento_lista_explodida` e injetar no campo `pecas` (JSONB) da OP, permitindo que o operador da fábrica veja as peças no painel de produção.

### Fase 3: Reserva Inteligente de Estoque (P0)
* **Objetivo:** Evitar furos de estoque reservando fisicamente as chapas e ferragens do orçamento aprovado.
* **Ações:**
  1. Ler a lista de peças em `orcamento_lista_explodida` (que contêm o `skuComponenteId` e a quantidade calculada).
  2. Inserir registros na tabela `movimentacoes_estoque` com tipo `'saida_reserva'`, vinculando ao `orcamento_id` e reduzindo temporariamente a quantidade disponível para impedir que os mesmos materiais sejam vendidos ou otimizados em outros planos de corte.

### Fase 4: Otimização de Precificação por Variáveis de Engenharia (P1)
* **Objetivo:** Adicionar os custos operacionais implícitos da empresa à precificação do orçamento.
* **Ações:**
  1. Alterar a rotina `recalcularOrcamento` no backend para buscar as configurações da tabela `configuracoes_precificacao` (alíquota de imposto, fator de perda padrão, percentual de mão de obra de produção e de instalação).
  2. Ajustar a fórmula do custo base de fabricação para:
     $$CustoFabricacao = CustoComponentes \times (1 + FatorPerda/100) \times (1 + MãoDeObraProdução/100)$$
  3. Aplicar o markup comercial e, no valor final, adicionar a alíquota tributária.

---

## 💻 5. EXEMPLO DE CÓDIGO DA SOLUÇÃO (BACKEND)

Aqui está um rascunho de como seria o método de aprovação no arquivo [orcamentos_pro.ts](file:///c:/Users/jc-pr/.gemini/antigravity/scratch/dluxury-crm/src/api-lib/orcamentos_pro.ts) implementando a transação atômica das Fases 1, 2 e 3:

```typescript
import { db } from './drizzle-db.js';
import { orcamentos, orcamentoItens, orcamentoListaExplodida } from '../db/schema/engenharia-orcamentos.js';
import { titulosReceber, condicoesPagamento } from '../db/schema/financeiro.js';
import { eq, and } from 'drizzle-orm';
import { sql } from './_db.js';

export async function aprovarOrcamentoPro(orcId: string, tenantId: string, userId: string) {
  return await db.transaction(async (tx) => {
    // 1. Atualizar o status do orçamento
    const [orc] = await tx.update(orcamentos)
      .set({ status: 'APROVADO', updatedAt: new Date() })
      .where(and(eq(orcamentos.id, orcId), eq(orcamentos.tenantId, tenantId)))
      .returning();

    if (!orc) throw new Error('Orçamento não encontrado');

    // 2. FASE 1: Gerar Títulos a Receber (Financeiro)
    if (orc.condicaoPagamentoId) {
      const cond = await tx.query.condicoesPagamento.findFirst({
        where: and(eq(condicoesPagamento.id, orc.condicaoPagamentoId), eq(condicoesPagamento.tenantId, tenantId))
      });

      if (cond) {
        const totalParcelas = cond.parcelas || 1;
        const valorFinal = Number(orc.valorTotalVenda) || 0;
        const valorParcela = valorFinal / totalParcelas;
        const dataEmissao = new Date();

        for (let i = 1; i <= totalParcelas; i++) {
          const vencimento = new Date();
          vencimento.setMonth(vencimento.getMonth() + (i - 1));

          // Inserção na tabela titulos_receber
          await tx.execute(dsql`
            INSERT INTO titulos_receber (
              numero_titulo, cliente_id, orcamento_id,
              valor_original, valor_liquido, valor_aberto,
              data_emissao, data_vencimento, data_competencia,
              classe_financeira_id, forma_recebimento_id,
              status, parcela, total_parcelas, tenant_id
            ) VALUES (
              ${`REC-PRO-${orc.numeroOrcamento}-${i}`}, 
              ${orc.clienteId}::uuid, 
              ${orc.id}::uuid,
              ${valorParcela}, ${valorParcela}, ${valorParcela},
              ${dataEmissao}, ${vencimento}, ${dataEmissao},
              (SELECT id FROM classes_financeiras WHERE codigo = '1.1.1' AND tenant_id = ${tenantId}::uuid LIMIT 1),
              (SELECT id FROM formas_pagamento WHERE tenant_id = ${tenantId}::uuid LIMIT 1),
              'aberto', ${i}, ${totalParcelas}, ${tenantId}::uuid
            )
          `);
        }
      }
    }

    // 3. FASE 2: Gerar PCP (Ordens de Produção)
    const itens = await tx.query.orcamentoItens.findMany({
      where: eq(orcamentoItens.orcamentoId, orcId),
      with: {
        listaExplodida: true
      }
    });

    for (const item of itens) {
      if (item.skuEngenhariaId) {
        const opId = `OP-${orc.numeroOrcamento}-${Math.floor(100 + Math.random() * 900)}`;
        
        // Mapear peças explodidas para JSON
        const pecas = item.listaExplodida.map((l: any) => ({
          skuComponenteId: l.skuComponenteId,
          quantidade: l.quantidadeAjustada || l.quantidadeCalculada,
          custoUnitario: l.custoUnitario
        }));

        // Inserir OP na tabela ordens_producao
        await tx.execute(dsql`
          INSERT INTO ordens_producao (
            op_id, produto, pecas, status, orcamento_id, tenant_id
          ) VALUES (
            ${opId}, 
            ${item.nomeCustomizado || 'Módulo de Engenharia'}, 
            ${JSON.stringify(pecas)}::jsonb, 
            'AGUARDANDO', 
            ${orcId}, 
            ${tenantId}::uuid
          )
        `);

        // 4. FASE 3: Reservar Estoque
        for (const peca of pecas) {
          await tx.execute(dsql`
            INSERT INTO erp_movimentacoes_industrial (
              tipo, item_tipo, chapa_id, quantidade, motivo, tenant_id
            ) VALUES (
              'saida_reserva', 
              'chapa', 
              ${peca.skuComponenteId}::uuid, 
              ${Math.ceil(Number(peca.quantidade))}, 
              ${`Reserva para OP ${opId} - Orçamento ${orc.numeroOrcamento}`}, 
              ${tenantId}::uuid
            )
          `);
        }
      }
    }

    return orc;
  });
}
```
