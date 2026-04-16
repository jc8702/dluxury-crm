import { sql, validateAuth } from './lib/_db.js';
import { calculateBOM } from './lib/_bomEngine.js';
import { reserveStockForProject } from './lib/_inventory.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });

  if (req.method === 'GET') {
    const { id } = req.query;
    try {
      if (id) {
        const orcamento = await sql`SELECT * FROM orcamentos WHERE id = ${id}`;
        if (orcamento.length === 0) return res.status(404).json({ error: 'Orçamento não encontrado' });
        
        const itens = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${id} ORDER BY id ASC`;
        return res.status(200).json({ ...orcamento[0], itens });
      }

      const orcamentos = await sql`
        SELECT o.*, c.nome as cliente_nome 
        FROM orcamentos o
        LEFT JOIN clients c ON o.cliente_id::text = c.id::text
        ORDER BY o.criado_em DESC
      `.catch(err => {
        console.error('SQL Error in getOrcamentos:', err);
        throw err;
      });
      return res.status(200).json(orcamentos);
    } catch (e: any) {
      console.error('Handler Error:', e);
      return res.status(500).json({ error: e.message, details: e.stack });
    }
  }

  if (req.method === 'POST') {
    const { 
      cliente_id, projeto_id, status, valor_base, taxa_mensal, 
      condicao_pagamento_id, valor_final, prazo_entrega_dias, 
      prazo_tipo, adicional_urgencia_pct, observacoes, itens, materiais_consumidos 
    } = req.body;

    try {
      // Gerar número sequencial ORC-2024-XXX
      const year = new Date().getFullYear();
      const lastOrc = await sql`SELECT numero FROM orcamentos WHERE numero LIKE ${`ORC-${year}-%`} ORDER BY numero DESC LIMIT 1`;
      let nextNum = 1;
      if (lastOrc.length > 0) {
        const parts = lastOrc[0].numero.split('-');
        nextNum = parseInt(parts[2]) + 1;
      }
      const numero = `ORC-${year}-${nextNum.toString().padStart(3, '0')}`;

      const projId = projeto_id || null;
      const matConsumidos = materiais_consumidos ? JSON.stringify(materiais_consumidos) : '[]';

      // Inserir Cabeçalho
      const orc = await sql`
        INSERT INTO orcamentos (
          cliente_id, projeto_id, numero, status, valor_base, taxa_mensal,
          condicao_pagamento_id, valor_final, prazo_entrega_dias,
          prazo_tipo, adicional_urgencia_pct, observacoes, materiais_consumidos
        )
        VALUES (
          ${cliente_id}, ${projId}, ${numero}, ${status || 'rascunho'},
          ${valor_base}, ${taxa_mensal}, ${condicao_pagamento_id}, ${valor_final},
          ${prazo_entrega_dias}, ${prazo_tipo || 'padrao'}, ${adicional_urgencia_pct}, ${observacoes || null},
          ${matConsumidos}::jsonb
        )
        RETURNING *
      `;

      const orcamentoId = orc[0].id;

      // Inserir Itens
      if (Array.isArray(itens) && itens.length > 0) {
        for (const item of itens) {
          await sql`
            INSERT INTO itens_orcamento (
              orcamento_id, descricao, ambiente, largura_cm, altura_cm, 
              profundidade_cm, material, acabamento, quantidade, 
              valor_unitario, valor_total
            )
            VALUES (
              ${orcamentoId}, ${item.descricao}, ${item.ambiente}, ${item.largura_cm}, 
              ${item.altura_cm}, ${item.profundidade_cm}, ${item.material}, 
              ${item.acabamento}, ${item.quantidade || 1}, ${item.valor_unitario}, ${item.valor_total}
            )
          `;
        }
      }

      return res.status(201).json({ ...orc[0], itens });
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { 
      status, valor_base, taxa_mensal, condicao_pagamento_id, 
      valor_final, prazo_entrega_dias, prazo_tipo, 
      adicional_urgencia_pct, observacoes, itens, materiais_consumidos
    } = req.body;



    try {
      const orc = await sql`
        UPDATE orcamentos SET
          status = COALESCE(${status}, status),
          valor_base = COALESCE(${valor_base}, valor_base),
          taxa_mensal = COALESCE(${taxa_mensal}, taxa_mensal),
          condicao_pagamento_id = COALESCE(${condicao_pagamento_id}, condicao_pagamento_id),
          valor_final = COALESCE(${valor_final}, valor_final),
          prazo_entrega_dias = COALESCE(${prazo_entrega_dias}, prazo_entrega_dias),
          prazo_tipo = COALESCE(${prazo_tipo}, prazo_tipo),
          adicional_urgencia_pct = COALESCE(${adicional_urgencia_pct}, adicional_urgencia_pct),
          observacoes = COALESCE(${observacoes}, observacoes),
          materiais_consumidos = COALESCE(${materiais_consumidos ? JSON.stringify(materiais_consumidos) : null}::jsonb, materiais_consumidos),

          atualizado_em = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (orc.length === 0) return res.status(404).json({ error: 'Orçamento não encontrado' });

      // Atualizar Itens (simplificado: remove e reinsere)
      if (Array.isArray(itens)) {
        await sql`DELETE FROM itens_orcamento WHERE orcamento_id = ${id}`;

        for (const item of itens) {
          await sql`
            INSERT INTO itens_orcamento (
              orcamento_id, descricao, ambiente, largura_cm, altura_cm, 
              profundidade_cm, material, acabamento, quantidade, 
              valor_unitario, valor_total
            )
            VALUES (
              ${id}, ${item.descricao}, ${item.ambiente}, ${item.largura_cm}, 
              ${item.altura_cm}, ${item.profundidade_cm}, ${item.material}, 
              ${item.acabamento}, ${item.quantidade || 1}, ${item.valor_unitario}, ${item.valor_total}
            )
          `;
        }
      }

      // ─── GATILHO INDUSTRIAL: RESERVA DE ESTOQUE ───
      if (status === 'aprovado') {
        // Buscar itens deste orçamento que tenham vinculação industrial
        const itms = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${id} AND erp_product_id IS NOT NULL`;
        
        for (const itm of itms) {
          // 1. Buscar a BOM do produto industrial
          const bom = await sql`SELECT * FROM erp_product_bom WHERE product_id = ${itm.erp_product_id}`;
          
          if (bom.length > 0) {
            // 2. Explodir Consumo
            const results = await calculateBOM(itm.erp_parametros, bom as any);
            
            // 3. Persistir Resultados e Reservar
            // Primeiro criamos a "instância" industrial do item se não existir
            const projectItem = await sql`
              INSERT INTO erp_project_items (project_id, product_id, label, parametros_definidos, status)
              VALUES (${orc[0].projeto_id || id}, ${itm.erp_product_id}, ${itm.descricao}, ${itm.erp_parametros}, 'aprovado')
              RETURNING id
            `;
            
            const projectItemId = projectItem[0].id;
            
            for (const res of results) {
              await sql`
                INSERT INTO erp_consumption_results (project_item_id, sku_id, quantidade_liquida, quantidade_com_perda)
                VALUES (${projectItemId}, ${res.sku_id}, ${res.quantidade_liquida}, ${res.quantidade_com_perda})
              `;
            }
            
            // 4. Efetivar a Reserva
            await reserveStockForProject(projectItemId);
          }
        }
      }

      return res.status(200).json({ ...orc[0], itens });
    } catch (e: any) {
      console.error('Erro na aprovação industrial:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await sql`DELETE FROM orcamentos WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  res.status(405).end('Method Not Allowed');
}
