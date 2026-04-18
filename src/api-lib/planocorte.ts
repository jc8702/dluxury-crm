import { sql } from './_db.js';

/**
 * MÓDULO PLANO DE CORTE INDUSTRIAL
 */

export async function handlePlanoCorte(req: any, res: any) {
  const method = req.method;
  const { action, id, plano_id, material_id, orcamento_id } = req.query || {};

  try {
    switch (action) {
      // --- PLANOS ---
      case 'listar_planos_corte':
        const planos = await sql`SELECT * FROM planos_corte ORDER BY criado_em DESC`;
        return res.status(200).json({ success: true, data: planos });

      case 'buscar_plano_completo':
        if (!id) return res.status(400).json({ success: false, error: 'ID do plano necessário' });
        const [plano] = await sql`SELECT * FROM planos_corte WHERE id = ${id}`;
        if (!plano) return res.status(404).json({ success: false, error: 'Plano não encontrado' });

        const grupos = await sql`SELECT * FROM plano_grupos_material WHERE plano_id = ${id} ORDER BY ordem ASC`;
        const pecas = await sql`SELECT * FROM plano_corte_pecas WHERE plano_id = ${id}`;
        const resultados = await sql`SELECT * FROM plano_corte_resultado WHERE plano_id = ${id}`;
        const sobras = await sql`SELECT * FROM plano_sobras WHERE plano_id = ${id}`;

        return res.status(200).json({ success: true, data: { ...plano, grupos, pecas, resultados, sobras } });

      case 'criar_plano':
        const { nome, projeto_id, orcamento_id: oid, material_id: mid, sku } = req.body;
        const [novoPlano] = await sql`
          INSERT INTO planos_corte (nome, projeto_id, orcamento_id, material_id, sku)
          VALUES (${nome}, ${projeto_id}, ${oid}, ${mid}, ${sku})
          RETURNING *
        `;
        return res.status(201).json({ success: true, data: novoPlano });

      case 'salvar_resultado_corte':
        const { plano_id: pid, grupos: gruposResult, resultados: resPos, sobras: sobRes, KPIs } = req.body;
        
        // Atômico: Limpar resultados anteriores e salvar novos
        await sql.begin(async (sql) => {
          await sql`DELETE FROM plano_corte_resultado WHERE plano_id = ${pid}`;
          await sql`DELETE FROM plano_sobras WHERE plano_id = ${pid}`;

          // Atualizar KPIs do plano
          await sql`
            UPDATE planos_corte 
            SET total_pecas = ${KPIs.totalPecas},
                total_chapas_necessarias = ${KPIs.totalChapas},
                total_retalhos_usados = ${KPIs.totalRetalhos},
                aproveitamento_pct = ${KPIs.aproveitamento},
                custo_total_material = ${KPIs.custoTotal},
                tempo_calculo_ms = ${KPIs.tempoCalculo},
                atualizado_em = NOW()
            WHERE id = ${pid}
          `;

          // Salvar Grupos Atualizados (KPIs por grupo)
          for (const g of gruposResult) {
            await sql`
              UPDATE plano_grupos_material
              SET chapas_inteiras_necessarias = ${g.totalChapas},
                  retalhos_usados = ${g.totalRetalhos},
                  aproveitamento_pct = ${g.aproveitamento},
                  custo_grupo = ${g.custoTotal}
              WHERE id = ${g.id}
            `;
          }

          // Inserir resultados de posicionamento (Bulk)
          if (resPos.length > 0) {
            await sql`
              INSERT INTO plano_corte_resultado 
              ${sql(resPos, 'plano_id', 'grupo_material_id', 'numero_chapa', 'peca_id', 'pos_x_mm', 'pos_y_mm', 'largura_final_mm', 'altura_final_mm', 'rotacionada', 'e_retalho', 'retalho_id', 'area_m2', 'custo_proporcional')}
            `;
          }

          // Inserir sobras (Bulk)
          if (sobRes.length > 0) {
            await sql`
              INSERT INTO plano_sobras
              ${sql(sobRes, 'plano_id', 'grupo_material_id', 'numero_chapa', 'pos_x_mm', 'pos_y_mm', 'largura_mm', 'altura_mm', 'area_m2', 'aproveitavel')}
            `;
          }
        });
        return res.status(200).json({ success: true });

      // --- GRUPOS ---
      case 'adicionar_grupo_material':
        const gData = req.body;
        const [novoGrupo] = await sql`
          INSERT INTO plano_grupos_material 
          (plano_id, material_id, sku, nome_material, largura_chapa_mm, altura_chapa_mm, espessura_mm, preco_chapa, ordem)
          VALUES (${gData.plano_id}, ${gData.material_id}, ${gData.sku}, ${gData.nome_material}, ${gData.largura_chapa_mm}, ${gData.altura_chapa_mm}, ${gData.espessura_mm}, ${gData.preco_chapa}, ${gData.ordem || 0})
          RETURNING *
        `;
        return res.status(201).json({ success: true, data: novoGrupo });

      case 'remover_grupo_material':
        await sql`DELETE FROM plano_grupos_material WHERE id = ${id}`;
        return res.status(200).json({ success: true });

      // --- PEÇAS ---
      case 'adicionar_peca':
        const pData = req.body;
        const [novaPeca] = await sql`
          INSERT INTO plano_corte_pecas (plano_id, grupo_material_id, descricao, largura_mm, altura_mm, quantidade, pode_rotacionar, ambiente, movel, cor_etiqueta, observacao)
          VALUES (${pData.plano_id}, ${pData.grupo_material_id}, ${pData.descricao}, ${pData.largura_mm}, ${pData.altura_mm}, ${pData.quantidade}, ${pData.pode_rotacionar}, ${pData.ambiente}, ${pData.movel}, ${pData.cor_etiqueta}, ${pData.observacao})
          RETURNING *
        `;
        return res.status(201).json({ success: true, data: novaPeca });

      case 'importar_pecas_orcamento':
        const { orcamento_id: oID, plano_id: pID } = req.body;
        // Puxar itens do orçamento e converter em peças do plano
        const itens = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${oID}`;
        
        // Aqui teríamos uma lógica para sugerir grupos baseados no material do item
        // Simplificado: vamos retornar os itens para o frontend decidir
        return res.status(200).json({ success: true, data: itens });

      // --- RETALHOS ---
      case 'listar_retalhos':
        const query = material_id 
          ? sql`SELECT * FROM retalhos_estoque WHERE material_id = ${material_id} AND disponivel = TRUE`
          : sql`SELECT * FROM retalhos_estoque WHERE disponivel = TRUE`;
        const retalhos = await query;
        return res.status(200).json({ success: true, data: retalhos });

      case 'salvar_sobras_como_retalho':
        const { sobras } = req.body;
        if (sobras.length > 0) {
          const inserted = await sql`
            INSERT INTO retalhos_estoque (material_id, sku, largura_mm, altura_mm, espessura_mm, origem)
            VALUES ${sql(sobras.map((s: any) => [s.material_id, s.sku, s.largura_mm, s.altura_mm, s.espessura_mm, s.origem]))}
            RETURNING *
          `;
          // Marcar sobras como convertidas
          const ids = sobras.map((s: any) => s.sobra_id).filter(Boolean);
          if (ids.length > 0) {
            await sql`UPDATE plano_sobras SET convertida_em_retalho = TRUE WHERE id IN (${ids})`;
          }
          return res.status(201).json({ success: true, data: inserted });
        }
        return res.status(400).json({ success: false, error: 'Lista de sobras vazia' });

      default:
        return res.status(404).json({ success: false, error: 'Ação não encontrada' });
    }
  } catch (err: any) {
    console.error('PLANO_CORTE_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
