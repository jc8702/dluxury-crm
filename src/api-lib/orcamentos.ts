import { sql, validateAuth } from './_db.js';
import { calculateBOM } from './_bomEngine.js';
import { reserveStockForProject } from './_inventory.js';
import { Orcamento } from './types.js';

export async function handleOrcamentos(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const { id } = req.query;

    if (req.method === 'GET') {
      if (id) {
        const orc = (await sql`SELECT * FROM orcamentos WHERE id = ${id}`)[0];
        const itms = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${id} ORDER BY id ASC`;
        return res.status(200).json({ success: true, data: { ...orc, itens: itms } });
      }
      const result = await sql`SELECT o.*, c.nome as cliente_nome FROM orcamentos o LEFT JOIN clients c ON o.cliente_id::text = c.id::text ORDER BY o.criado_em DESC`;
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const f = req.body;
      
      // Nova Lógica de Numeração PRO-DIA-MES-ANO-REVISAO-CLIENTE
      const now = new Date();
      const dia = now.getDate().toString().padStart(2, '0');
      const mes = (now.getMonth() + 1).toString().padStart(2, '0');
      const ano = now.getFullYear();
      const dataStr = `${dia}${mes}${ano}`;

      // Busca nome do cliente para o sufixo
      const client = (await sql`SELECT nome FROM clients WHERE id = ${f.cliente_id}`)[0];
      const clientSuffix = (client?.nome || 'AVULSO').split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Contador de revisões para este prefixo no dia
      const prefix = `PRO-${dataStr}-REV`;
      const relatives = await sql`SELECT numero FROM orcamentos WHERE numero LIKE ${prefix + '%'}`;
      const revNum = relatives.length.toString().padStart(2, '0');
      
      const num = `PRO-${dataStr}-REV${revNum}-${clientSuffix}`;

      const orc = await sql`
        INSERT INTO orcamentos (
          cliente_id, projeto_id, numero, status, valor_base, taxa_mensal, 
          condicao_pagamento_id, valor_final, prazo_entrega_dias, prazo_tipo, 
          adicional_urgencia_pct, observacoes, materiais_consumidos
        ) VALUES (
          ${f.cliente_id}, 
          ${f.projeto_id || null}, 
          ${num}, 
          ${f.status || 'rascunho'}, 
          ${Number(f.valor_base) || 0}, 
          ${Number(f.taxa_mensal) || 0}, 
          ${f.condicao_pagamento_id || null}, 
          ${Number(f.valor_final) || 0}, 
          ${Number(f.prazo_entrega_dias) || 45}, 
          ${f.prazo_tipo || 'uteis'}, 
          ${Number(f.adicional_urgencia_pct) || 0}, 
          ${f.observacoes || ''}, 
          ${f.materiais_consumidos ? JSON.stringify(f.materiais_consumidos) : '[]'}::jsonb
        ) RETURNING *`;
      const orcId = orc[0].id;
      
      if (Array.isArray(f.itens)) {
        for (const itm of f.itens) {
          await sql`INSERT INTO itens_orcamento (orcamento_id, descricao, ambiente, largura_cm, altura_cm, profundidade_cm, material, acabamento, quantidade, valor_unitario, valor_total) VALUES (${orcId}, ${itm.descricao}, ${itm.ambiente}, ${itm.largura_cm}, ${itm.altura_cm}, ${itm.profundidade_cm}, ${itm.material}, ${itm.acabamento}, ${itm.quantidade || 1}, ${itm.valor_unitario}, ${itm.valor_total})`;
        }
      }
      return res.status(201).json({ success: true, data: { ...orc[0], itens: f.itens } });
    }

    if (req.method === 'PATCH') {
      const f = req.body;
      const orc = await sql`UPDATE orcamentos SET status = COALESCE(${f.status}, status), valor_base = COALESCE(${f.valor_base}, valor_base), taxa_mensal = COALESCE(${f.taxa_mensal}, taxa_mensal), condicao_pagamento_id = COALESCE(${f.condicao_pagamento_id}, condicao_pagamento_id), valor_final = COALESCE(${f.valor_final}, valor_final), prazo_entrega_dias = COALESCE(${f.prazo_entrega_dias}, prazo_entrega_dias), prazo_tipo = COALESCE(${f.prazo_tipo}, prazo_tipo), adicional_urgencia_pct = COALESCE(${f.adicional_urgencia_pct}, adicional_urgencia_pct), observacoes = COALESCE(${f.observacoes}, observacoes), materiais_consumidos = COALESCE(${f.materiais_consumidos ? JSON.stringify(f.materiais_consumidos) : null}::jsonb, materiais_consumidos), atualizado_em = NOW() WHERE id = ${id} RETURNING *`;
      if (Array.isArray(f.itens)) {
        await sql`DELETE FROM itens_orcamento WHERE orcamento_id = ${id}`;
        for (const itm of f.itens) {
          await sql`INSERT INTO itens_orcamento (orcamento_id, descricao, ambiente, largura_cm, altura_cm, profundidade_cm, material, acabamento, quantidade, valor_unitario, valor_total) VALUES (${id}, ${itm.descricao}, ${itm.ambiente}, ${itm.largura_cm}, ${itm.altura_cm}, ${itm.profundidade_cm}, ${itm.material}, ${itm.acabamento}, ${itm.quantidade || 1}, ${itm.valor_unitario}, ${itm.valor_total})`;
        }
      }
      if (f.status === 'aprovado') {
        const itms = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${id} AND erp_product_id IS NOT NULL`;
        for (const itm of itms) {
          const bom = await sql`SELECT * FROM erp_product_bom WHERE product_id = ${itm.erp_product_id}`;
          if (bom.length) {
            const results = await calculateBOM(itm.erp_parametros, bom as any);
            const pItem = await sql`INSERT INTO erp_project_items (project_id, product_id, label, parametros_definidos, status) VALUES (${orc[0].projeto_id || id}, ${itm.erp_product_id}, ${itm.descricao}, ${itm.erp_parametros}, 'aprovado') RETURNING id`;
            for (const r of results) {
              await sql`INSERT INTO erp_consumption_results (project_item_id, sku_id, quantidade_liquida, quantidade_com_perda) VALUES (${pItem[0].id}, ${r.sku_id}, ${r.quantidade_liquida}, ${r.quantidade_com_perda})`;
            }
            await reserveStockForProject(pItem[0].id);
          }
        }
      }
      return res.status(200).json({ success: true, data: { ...orc[0], itens: f.itens } });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM orcamentos WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleOrcamentoTecnico(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const { type, id, orcamento_id, ambiente_id, movel_id } = req.query;

    if (req.method === 'GET') {
      if (type === 'config') {
        const result = (await sql`SELECT * FROM configuracoes_precificacao LIMIT 1`)[0] || {};
        return res.status(200).json({ success: true, data: result });
      }
      if (orcamento_id && type === 'tree') {
        const ambs = await sql`SELECT * FROM orcamento_ambientes WHERE orcamento_id = ${orcamento_id} ORDER BY ordem ASC`;
        for (const amb of ambs) {
          amb.moveis = await sql`SELECT * FROM orcamento_moveis WHERE ambiente_id = ${amb.id} ORDER BY ordem ASC`;
          for (const mov of amb.moveis) {
            mov.pecas = await sql`SELECT * FROM orcamento_pecas WHERE movel_id = ${mov.id} ORDER BY criado_em ASC`;
            mov.ferragens = await sql`SELECT * FROM orcamento_ferragens WHERE movel_id = ${mov.id} ORDER BY criado_em ASC`;
          }
        }
        const extras = await sql`SELECT * FROM orcamento_custos_extras WHERE orcamento_id = ${orcamento_id} ORDER BY criado_em ASC`;
        return res.status(200).json({ success: true, data: { ambientes: ambs, extras } });
      }
    }
    if (req.method === 'POST') {
      const f = req.body;
      let result;
      if (type === 'ambiente') result = await sql`INSERT INTO orcamento_ambientes (orcamento_id, nome, ordem) VALUES (${orcamento_id}, ${f.nome}, ${f.ordem || 0}) RETURNING *`;
      if (type === 'movel') result = await sql`INSERT INTO orcamento_moveis (ambiente_id, nome, tipo_movel, largura_total_cm, altura_total_cm, profundidade_total_cm, observacoes, ordem) VALUES (${ambiente_id}, ${f.nome}, ${f.tipo_movel}, ${f.largura_total_cm}, ${f.altura_total_cm}, ${f.profundidade_total_cm}, ${f.observacoes}, ${f.ordem || 0}) RETURNING *`;
      if (type === 'peca') result = await sql`INSERT INTO orcamento_pecas (movel_id, material_id, sku, descricao_peca, largura_cm, altura_cm, quantidade, m2_unitario, m2_total, fator_perda_pct, m2_com_perda, preco_custo_m2, custo_total_peca, metros_fita_borda, fita_material_id) VALUES (${movel_id}, ${f.material_id}, ${f.sku}, ${f.descricao_peca}, ${f.largura_cm}, ${f.altura_cm}, ${f.quantidade}, ${f.m2_unitario}, ${f.m2_total}, ${f.fator_perda_pct}, ${f.m2_com_perda}, ${f.preco_custo_m2}, ${f.custo_total_peca}, ${f.metros_fita_borda}, ${f.fita_material_id || null}) RETURNING *`;
      if (type === 'ferragem') result = await sql`INSERT INTO orcamento_ferragens (movel_id, material_id, sku, descricao, quantidade, unidade, preco_custo_unitario, custo_total) VALUES (${movel_id}, ${f.material_id}, ${f.sku}, ${f.descricao}, ${f.quantidade}, ${f.unidade}, ${f.preco_custo_unitario}, ${f.custo_total}) RETURNING *`;
      if (type === 'extra') result = await sql`INSERT INTO orcamento_custos_extras (orcamento_id, descricao, tipo, forma_calculo, percentual_ou_valor, m2_total_referencia, valor_calculado) VALUES (${orcamento_id}, ${f.descricao}, ${f.tipo}, ${f.forma_calculo}, ${f.percentual_ou_valor}, ${f.m2_total_referencia}, ${f.valor_calculado}) RETURNING *`;
      return res.status(201).json({ success: true, data: result ? result[0] : null });
    }
    if (req.method === 'PATCH') {
      const f = req.body;
      let result;
      if (type === 'config') {
        result = await sql`UPDATE configuracoes_precificacao SET 
          fator_perda_padrao = COALESCE(${f.fator_perda_padrao}, fator_perda_padrao), 
          markup_padrao = COALESCE(${f.markup_padrao}, markup_padrao), 
          aliquota_imposto = COALESCE(${f.aliquota_imposto}, aliquota_imposto), 
          mo_producao_pct_padrao = COALESCE(${f.mo_producao_pct_padrao}, mo_producao_pct_padrao), 
          mo_instalacao_pct_padrao = COALESCE(${f.mo_instalacao_pct_padrao}, mo_instalacao_pct_padrao), 
          margem_minima_alerta = COALESCE(${f.margem_minima_alerta}, margem_minima_alerta),
          espessura_chapa_padrao = COALESCE(${f.espessura_chapa_padrao}, espessura_chapa_padrao),
          recuo_fundo_padrao = COALESCE(${f.recuo_fundo_padrao}, recuo_fundo_padrao),
          atualizado_em = NOW() 
        RETURNING *`;
      }
      if (type === 'ambiente' && id) result = await sql`UPDATE orcamento_ambientes SET nome = COALESCE(${f.nome}, nome), ordem = COALESCE(${f.ordem}, ordem) WHERE id = ${id} RETURNING *`;
      if (type === 'movel' && id) result = await sql`UPDATE orcamento_moveis SET nome = COALESCE(${f.nome}, nome), tipo_movel = COALESCE(${f.tipo_movel}, tipo_movel), largura_total_cm = COALESCE(${f.largura_total_cm}, largura_total_cm), altura_total_cm = COALESCE(${f.altura_total_cm}, altura_total_cm), profundidade_total_cm = COALESCE(${f.profundidade_total_cm}, profundidade_total_cm), erp_product_id = COALESCE(${f.erp_product_id}, erp_product_id), ordem = COALESCE(${f.ordem}, ordem) WHERE id = ${id} RETURNING *`;
      if (type === 'peca' && id) result = await sql`UPDATE orcamento_pecas SET material_id = COALESCE(${f.material_id}, material_id), sku = COALESCE(${f.sku}, sku), descricao_peca = COALESCE(${f.descricao_peca}, descricao_peca), largura_cm = COALESCE(${f.largura_cm}, largura_cm), altura_cm = COALESCE(${f.altura_cm}, altura_cm), quantidade = COALESCE(${f.quantidade}, quantidade), m2_unitario = COALESCE(${f.m2_unitario}, m2_unitario), m2_total = COALESCE(${f.m2_total}, m2_total), fator_perda_pct = COALESCE(${f.fator_perda_pct}, fator_perda_pct), m2_com_perda = COALESCE(${f.m2_com_perda}, m2_com_perda), preco_custo_m2 = COALESCE(${f.preco_custo_m2}, preco_custo_m2), custo_total_peca = COALESCE(${f.custo_total_peca}, custo_total_peca), sentido_veio = COALESCE(${f.sentido_veio}, sentido_veio), desconto_fita_mm = COALESCE(${f.desconto_fita_mm}, desconto_fita_mm) WHERE id = ${id} RETURNING *`;
      if (type === 'ferragem' && id) result = await sql`UPDATE orcamento_ferragens SET material_id = COALESCE(${f.material_id}, material_id), sku = COALESCE(${f.sku}, sku), quantidade = COALESCE(${f.quantidade}, quantidade), preco_custo_unitario = COALESCE(${f.preco_custo_unitario}, preco_custo_unitario), custo_total = COALESCE(${f.custo_total}, custo_total) WHERE id = ${id} RETURNING *`;
      
      return res.status(200).json({ success: true, data: result ? result[0] : null });
    }
    if (req.method === 'DELETE') {
      if (type === 'ambiente') await sql`DELETE FROM orcamento_ambientes WHERE id = ${id}`;
      if (type === 'movel') await sql`DELETE FROM orcamento_moveis WHERE id = ${id}`;
      if (type === 'peca') await sql`DELETE FROM orcamento_pecas WHERE id = ${id}`;
      if (type === 'ferragem') await sql`DELETE FROM orcamento_ferragens WHERE id = ${id}`;
      if (type === 'extra') await sql`DELETE FROM orcamento_custos_extras WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleCondicoesPagamento(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM condicoes_pagamento WHERE ativo = true ORDER BY n_parcelas ASC`;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const r = await sql`INSERT INTO condicoes_pagamento (nome, n_parcelas) VALUES (${req.body.nome}, ${req.body.n_parcelas}) RETURNING *`;
      return res.status(201).json({ success: true, data: r[0] });
    }
    if (req.method === 'PATCH') {
      const r = await sql`UPDATE condicoes_pagamento SET nome = COALESCE(${req.body.nome}, nome), n_parcelas = COALESCE(${req.body.n_parcelas}, n_parcelas), ativo = COALESCE(${req.body.ativo}, ativo) WHERE id = ${req.query.id} RETURNING *`;
      return res.status(200).json({ success: true, data: r[0] });
    }
    if (req.method === 'DELETE') {
      await sql`DELETE FROM condicoes_pagamento WHERE id = ${req.query.id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
