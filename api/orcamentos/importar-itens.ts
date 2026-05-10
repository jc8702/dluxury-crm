import { db } from '../../src/api-lib/drizzle-db.js';
import { orcamentoItens, orcamentoListaExplodida } from '../../src/db/schema/engenharia-orcamentos.js';
import { recalcularOrcamento } from '../../src/api-lib/orcamentos_pro.js';
import { eq, sql } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('📥 [IMPORTAÇÃO] Iniciando processamento de itens...');

  try {
    const { orcamento_id, itens } = req.body;

    if (!orcamento_id || !Array.isArray(itens) || itens.length === 0) {
      console.warn('⚠️ [IMPORTAÇÃO] Dados inválidos recebidos:', { orcamento_id, itensCount: itens?.length });
      return res.status(400).json({ 
        error: 'orcamento_id e itens são obrigatórios' 
      });
    }

    const itensProcessados = [];
    
    // Processamento sequencial para garantir integridade e facilitar log
    for (const item of itens) {
      try {
        console.log(`🔹 [IMPORTAÇÃO] Inserindo item: ${item.nome}`);

        // 1. Inserir Item do Orçamento usando Drizzle
        const [newItem] = await db.insert(orcamentoItens).values({
          orcamentoId: orcamento_id,
          nomeCustomizado: item.nome,
          quantidade: item.quantidade.toString(),
          largura: item.largura?.toString() || null,
          altura: item.altura?.toString() || null,
          espessura: item.espessura?.toString() || null,
          material: item.material || null,
          custoUnitarioCalculado: (item.match_sugerido?.custoUnitario || 0).toString(),
          observacoes: `Importado via CSV: ${item.nome}`
        }).returning();

        // 2. Se houver um SKU correspondente, adicionar na lista explodida (BOM)
        const skuId = item.produto_id || item.match_sugerido?.sku_componente_id;
        
        if (skuId) {
          await db.insert(orcamentoListaExplodida).values({
            orcamentoItemId: newItem.id,
            skuComponenteId: skuId,
            quantidadeCalculada: '1',
            quantidadeAjustada: '1',
            custoUnitario: (item.match_sugerido?.custoUnitario || 0).toString(),
            origem: 'IMPORT',
            observacoes: `Match automático: ${item.match_sugerido?.nome || 'SKU'}`
          });
        }

        itensProcessados.push({ id: newItem.id, nome: item.nome });

      } catch (itemError: any) {
        console.error(`❌ [IMPORTAÇÃO] Erro no item ${item.nome}:`, itemError);
      }
    }

    // 3. Recalcular totais do orçamento após a importação massiva
    console.log('🔄 [IMPORTAÇÃO] Recalculando totais do orçamento...');
    await recalcularOrcamento(orcamento_id);

    console.log(`✨ [IMPORTAÇÃO] Concluída com sucesso. ${itensProcessados.length} itens processados.`);

    return res.status(200).json({ 
      success: true, 
      message: `${itensProcessados.length} itens importados com sucesso`,
      data: itensProcessados
    });

  } catch (error: any) {
    console.error('💥 [IMPORTAÇÃO] Erro crítico:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar importação',
      details: error.message 
    });
  }
}

export const handleImportarItensOrcamento = handler;
