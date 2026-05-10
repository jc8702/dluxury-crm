import { db } from '../../src/api-lib/drizzle-db.js';
import { orcamentoItens, skuComponente, orcamentoListaExplodida } from '../../src/db/schema/engenharia-orcamentos.js';
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
    let countComSKU = 0;
    let countSemSKU = 0;

    for (const item of itens) {
      // Requisito: Nome e Quantidade são básicos
      const nomeFinal = item.nome || item.Designação || 'Item sem nome';
      const qtdVal = parseFloat((item.quantidade || item.Qtd || 1).toString()) || 1;
      
      let custoUnitario = 0;
      let skuId = item.produto_id || item.sku_encontrado_id || null;
      let matchedSKU = null;

      // 1. Tentar encontrar o SKU se informado
      if (skuId) {
        try {
          // Tenta na tabela de componentes (SKUs Industriais)
          const componente = await db.query.skuComponente.findFirst({
            where: eq(skuComponente.id, skuId)
          });

          if (componente) {
            custoUnitario = parseFloat(componente.precoUnitario?.toString() || '0');
            matchedSKU = skuId;
            countComSKU++;
          } else {
            // Tenta na tabela de materiais (Comercial)
            const resMat = await db.execute(sql`SELECT id, nome, preco_custo FROM materiais WHERE id::text = ${skuId} LIMIT 1`);
            if (resMat.rows.length > 0) {
              const mat = resMat.rows[0] as any;
              custoUnitario = parseFloat(mat.preco_custo?.toString() || '0');
              matchedSKU = mat.id;
              countComSKU++;
            } else {
              console.warn(`⚠️ [IMPORTAÇÃO] SKU informado ${skuId} não encontrado no banco.`);
              countSemSKU++;
            }
          }
        } catch (skuErr) {
          console.error(`❌ [IMPORTAÇÃO] Erro ao buscar SKU ${skuId}:`, skuErr);
        }
      } else {
        countSemSKU++;
      }

      if (isNaN(custoUnitario)) custoUnitario = 0;

      // 2. Preparar dados do item (Inclusão de dimensões)
      // Nota: No SketchUp/CutList 'altura' costuma ser o Comprimento (dimensão maior)
      const largura = (item.largura || item.Larg || '').toString();
      const altura = (item.altura || item.Comp || '').toString(); // Mapeando Comp para altura
      const espessura = (item.espessura || item.Esp || '').toString();
      const material = item.material || item.Material || 'A definir';

      const observacoes = [
        item.observacoes,
        material !== 'A definir' ? `Material: ${material}` : '',
        item.Status ? `Status: ${item.Status}` : ''
      ].filter(Boolean).join(' | ');

      itensProcessados.push({
        orcamento_id,
        nome_customizado: nomeFinal,
        quantidade: qtdVal,
        largura,
        altura,
        espessura,
        custo_unitario_calculado: custoUnitario,
        preco_venda_unitario: 0,
        observacoes,
        _matchedSKU: matchedSKU,
        _custoOriginal: custoUnitario
      });
    }

    console.log(`📝 [IMPORTAÇÃO] Inserindo ${itensProcessados.length} itens no banco...`);

    const itensInseridos = [];
    
    for (const bit of itensProcessados) {
      try {
        const resItem = await db.execute(sql`
          INSERT INTO orcamento_itens (
            orcamento_id, nome_customizado, quantidade, 
            largura, altura, espessura, 
            custo_unitario_calculado, preco_venda_unitario, observacoes
          )
          VALUES (
            ${bit.orcamento_id}, ${bit.nome_customizado}, ${bit.quantidade}, 
            ${bit.largura}, ${bit.altura}, ${bit.espessura}, 
            ${bit.custo_unitario_calculado}, ${bit.preco_venda_unitario}, ${bit.observacoes}
          )
          RETURNING id, quantidade
        `);
        
        if (resItem.rows.length > 0) {
          const inserted = resItem.rows[0] as any;
          itensInseridos.push(inserted);

          // Se houve match de SKU, adiciona na lista explodida para permitir controle de estoque/custo futuro
          if (bit._matchedSKU) {
            await db.execute(sql`
              INSERT INTO orcamento_lista_explodida (
                orcamento_item_id, sku_componente_id, 
                quantidade_calculada, quantidade_ajustada, 
                custo_unitario, origem
              )
              VALUES (
                ${inserted.id}, ${bit._matchedSKU}, 
                ${inserted.quantidade}, ${inserted.quantidade}, 
                ${bit._custoOriginal}, 'IMPORT'
              )
            `);
          }
        }
      } catch (insErr: any) {
        console.error(`❌ [IMPORTAÇÃO] Falha ao inserir item "${bit.nome_customizado}":`, insErr.message);
        // Não interrompe o loop, tenta inserir os próximos
      }
    }

    // 3. Recalcular totais do orçamento
    if (itensInseridos.length > 0) {
      try {
        await recalcularOrcamento(orcamento_id);
      } catch (recalcErr) {
        console.error('❌ [IMPORTAÇÃO] Erro no recalculo:', recalcErr);
      }
    }

    console.log(`✅ [IMPORTAÇÃO] Sucesso: ${itensInseridos.length}/${itensProcessados.length} itens importados.`);

    return res.status(200).json({
      success: true,
      itens_inseridos: itensInseridos.length,
      resumo: `${itensInseridos.length} itens importados. ${countSemSKU} itens aguardando definição de SKU.`
    });

  } catch (error: any) {
    console.error('❌ [IMPORTAÇÃO] Erro Crítico no Handler:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar importação',
      details: error.message,
      success: false
    });
  }
}

export const handleImportarItensOrcamento = handler;

