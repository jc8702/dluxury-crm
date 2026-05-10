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
      const nomeFinal = item.nome || item.Designação || item.designacao || 'Item sem nome';
      const qtdVal = parseFloat((item.quantidade || item.Qtd || 1).toString()) || 1;
      
      const largura = parseFloat((item.largura || item.Larg || '0').toString()) || 0;
      const altura = parseFloat((item.altura || item.Comp || '0').toString()) || 0;
      const espessura = parseFloat((item.espessura || item.Esp || '0').toString()) || 0;
      const material = item.material || item.Material || '';

      let custoUnitario = 0;
      let precoVenda = 0;
      let skuId = null;
      let skuCodigo = '';
      let skuDescricao = '';
      let matchedSKU = null;

      // Truncar strings para evitar erros de limite do banco (VARCHAR 255)
      const nomeFinalTrunc = nomeFinal.slice(0, 250);
      const materialTrunc = material.slice(0, 250);

      // ✅ ESTRATÉGIA DE MATCHING INTELIGENTE
      
      // 1. Se vier SKU explícito no CSV, usar direto
      const skuCsvExplicito = item['SKU Banco'] || item.sku || item.SKU || null;
      
      if (skuCsvExplicito) {
        try {
          // Buscar por código exato
          const componente = await db.query.skuComponente.findFirst({
            where: eq(skuComponente.codigo, skuCsvExplicito)
          });

          if (componente) {
            skuId = componente.id;
            skuCodigo = componente.codigo;
            skuDescricao = componente.nome;
            custoUnitario = parseFloat(componente.precoUnitario?.toString() || '0');
            precoVenda = parseFloat(componente.precoVenda?.toString() || (custoUnitario * 1.3).toString());
            matchedSKU = componente.id;
            countComSKU++;
            console.log(`✅ [MATCH] SKU ${skuCodigo} encontrado por código explícito`);
          }
        } catch (err) {
          console.warn(`⚠️ [MATCH] Erro ao buscar SKU ${skuCsvExplicito}:`, err);
        }
      }

      // 2. Se não encontrou por código, tentar match por dimensões + material
      if (!matchedSKU && largura > 0 && altura > 0 && espessura > 0) {
        try {
          const matchPorDimensoes = await db.execute(sql`
            SELECT 
              id, codigo, nome, preco_unitario, preco_venda
            FROM sku_componente
            WHERE 
              ABS(CAST(dimensoes->>'largura' AS FLOAT) - ${largura}) < 5 
              AND ABS(CAST(dimensoes->>'altura' AS FLOAT) - ${altura}) < 5 
              AND ABS(CAST(dimensoes->>'espessura' AS FLOAT) - ${espessura}) < 2
              ${material ? sql`AND LOWER(nome) LIKE LOWER(${'%' + material + '%'})` : sql``}
            ORDER BY 
              (ABS(CAST(dimensoes->>'largura' AS FLOAT) - ${largura}) + ABS(CAST(dimensoes->>'altura' AS FLOAT) - ${altura}) + ABS(CAST(dimensoes->>'espessura' AS FLOAT) - ${espessura}))
            LIMIT 1
          `);

          if (matchPorDimensoes.rows.length > 0) {
            const comp = matchPorDimensoes.rows[0] as any;
            skuId = comp.id;
            skuCodigo = comp.codigo;
            skuDescricao = comp.nome;
            custoUnitario = parseFloat(comp.preco_unitario?.toString() || '0');
            precoVenda = parseFloat(comp.preco_venda?.toString() || (custoUnitario * 1.3).toString());
            matchedSKU = comp.id;
            countComSKU++;
            console.log(`✅ [MATCH] SKU ${skuCodigo} encontrado por dimensões similares`);
          }
        } catch (err) {
          console.warn(`⚠️ [MATCH] Erro ao buscar por dimensões:`, err);
        }
      }

      // 3. Se não encontrou por dimensões, tentar match por nome similar
      if (!matchedSKU) {
        try {
          const nomeClean = nomeFinal
            .toLowerCase()
            .replace(/[#_]/g, ' ')
            .trim();

          const matchPorNome = await db.execute(sql`
            SELECT 
              id, codigo, nome, preco_unitario, preco_venda
            FROM sku_componente
            WHERE 
              LOWER(nome) LIKE LOWER(${'%' + nomeClean.split(' ')[0] + '%'})
              OR LOWER(codigo) LIKE LOWER(${'%' + nomeClean.split(' ')[0] + '%'})
            LIMIT 1
          `);

          if (matchPorNome.rows.length > 0) {
            const comp = matchPorNome.rows[0] as any;
            skuId = comp.id;
            skuCodigo = comp.codigo;
            skuDescricao = comp.nome;
            custoUnitario = parseFloat(comp.preco_unitario?.toString() || '0');
            precoVenda = parseFloat(comp.preco_venda?.toString() || (custoUnitario * 1.3).toString());
            matchedSKU = comp.id;
            countComSKU++;
            console.log(`✅ [MATCH] SKU ${skuCodigo} encontrado por similaridade de nome`);
          }
        } catch (err) {
          console.warn(`⚠️ [MATCH] Erro ao buscar por nome:`, err);
        }
      }

      // Se não encontrou nada, marca como sem SKU
      if (!matchedSKU) {
        countSemSKU++;
        console.log(`⚠️ [MATCH] Item "${nomeFinal}" sem SKU encontrado - será adicionado como avulso`);
      }

      const observacoes = [
        material ? `Material: ${material}` : '',
        item.Status ? `Status: ${item.Status}` : '',
        item['SKU Banco'] ? `SKU CSV: ${item['SKU Banco']}` : ''
      ].filter(Boolean).join(' | ');

      itensProcessados.push({
        orcamento_id,
        nome_customizado: nomeFinalTrunc,
        quantidade: isNaN(qtdVal) ? 1 : qtdVal,
        largura: (isNaN(largura) ? 0 : largura).toString().slice(0, 20),
        altura: (isNaN(altura) ? 0 : altura).toString().slice(0, 20),
        espessura: (isNaN(espessura) ? 0 : espessura).toString().slice(0, 20),
        material: materialTrunc || 'A definir',
        sku_componente_id: skuId,
        sku_codigo: (skuCodigo || '').slice(0, 100),
        sku_descricao: skuDescricao,
        custo_unitario_calculado: isNaN(custoUnitario) ? 0 : custoUnitario,
        preco_venda_unitario: isNaN(precoVenda) ? 0 : precoVenda,
        observacoes: (observacoes || '').slice(0, 500),
        _matchedSKU: matchedSKU
      });
    }

    console.log(`📝 [IMPORTAÇÃO] Inserindo ${itensProcessados.length} itens no banco...`);
    console.log(`📊 [RESUMO] ${countComSKU} com SKU | ${countSemSKU} sem SKU`);

    const itensInseridos = [];
    
    for (const bit of itensProcessados) {
      try {
        const resItem = await db.execute(sql`
          INSERT INTO orcamento_itens (
            orcamento_id, nome_customizado, quantidade, 
            largura, altura, espessura, material,
            sku_componente_id, sku_codigo, sku_descricao,
            custo_unitario_calculado, preco_venda_unitario, observacoes
          )
          VALUES (
            ${bit.orcamento_id}, ${bit.nome_customizado}, ${bit.quantidade}, 
            ${bit.largura}, ${bit.altura}, ${bit.espessura}, ${bit.material},
            ${bit.sku_componente_id}, ${bit.sku_codigo}, ${bit.sku_descricao},
            ${bit.custo_unitario_calculado}, ${bit.preco_venda_unitario}, ${bit.observacoes}
          )
          RETURNING *
        `);
        
        if (resItem.rows.length > 0) {
          const inserted = resItem.rows[0] as any;
          itensInseridos.push(inserted);

          // Se houve match de SKU, adiciona na lista explodida
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
                ${bit.custo_unitario_calculado}, 'IMPORT_AUTO'
              )
            `);
          }
        }
      } catch (insErr: any) {
        console.error(`❌ [IMPORTAÇÃO] Falha ao inserir item "${bit.nome_customizado}":`, insErr.message);
      }
    }

    // Recalcular totais do orçamento
    if (itensInseridos.length > 0) {
      try {
        await recalcularOrcamento(orcamento_id);
        console.log(`💰 [IMPORTAÇÃO] Orçamento recalculado com sucesso.`);
      } catch (recalcErr) {
        console.error('❌ [IMPORTAÇÃO] Erro no recalculo:', recalcErr);
      }
    }

    console.log(`✅ [IMPORTAÇÃO] Sucesso: ${itensInseridos.length}/${itensProcessados.length} itens importados.`);

    return res.status(200).json({
      success: true,
      itens_inseridos: itensInseridos.length,
      resumo: `${itensInseridos.length} itens importados | ${countComSKU} com SKU | ${countSemSKU} aguardando definição`,
      detalhes: {
        com_sku: countComSKU,
        sem_sku: countSemSKU,
        total: itensInseridos.length
      },
      itens: itensInseridos.map(i => ({
        id: i.id,
        nome: i.nome_customizado,
        sku_codigo: i.sku_codigo,
        preco: i.preco_venda_unitario
      }))
    });

  } catch (error: any) {
    console.error('❌ [IMPORTAÇÃO] Erro Crítico no Handler:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar importação',
      details: error.message,
      stack: error.stack,
      success: false
    });
  }
}

export const handleImportarItensOrcamento = handler;
