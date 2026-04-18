import { sql, validateAuth } from './_db.js';
import { writeOffStockForProject } from './_inventory.js';
import { Project } from './types.js';

export async function handleProjects(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method === 'GET') {
      const { client_id, status } = req.query;
      const result = client_id ? await sql`SELECT * FROM projects WHERE client_id = ${client_id} ORDER BY created_at DESC` : status ? await sql`SELECT * FROM projects WHERE status = ${status} ORDER BY created_at DESC` : await sql`SELECT * FROM projects ORDER BY updated_at DESC`;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const f = req.body;
      const result = await sql`INSERT INTO projects (client_id, client_name, ambiente, descricao, valor_estimado, valor_final, prazo_entrega, status, etapa_producao, responsavel, observacoes) VALUES (${f.client_id}, ${f.client_name}, ${f.ambiente}, ${f.descricao}, ${f.valor_estimado}, ${f.valor_final}, ${f.prazo_entrega}, ${f.status || 'lead'}, ${f.etapa_producao}, ${f.responsavel}, ${f.observacoes}) RETURNING *`;
      return res.status(201).json({ success: true, data: result[0] });
    }
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const f = req.body;
      const r = await sql`UPDATE projects SET client_id = COALESCE(${f.client_id}, client_id), client_name = COALESCE(${f.client_name}, client_name), ambiente = COALESCE(${f.ambiente}, ambiente), descricao = COALESCE(${f.descricao}, descricao), valor_estimado = COALESCE(${f.valor_estimado}, valor_estimado), valor_final = COALESCE(${f.valor_final}, valor_final), prazo_entrega = COALESCE(${f.prazo_entrega}, prazo_entrega), status = COALESCE(${f.status}, status), etapa_producao = COALESCE(${f.etapa_producao}, etapa_producao), responsavel = COALESCE(${f.responsavel}, responsavel), observacoes = COALESCE(${f.observacoes}, observacoes), updated_at = CURRENT_TIMESTAMP WHERE id = ${req.query.id} RETURNING *`;
      if (r.length && f.status === 'concluido') {
        const itms = await sql`SELECT id FROM erp_project_items WHERE project_id = ${req.query.id}`;
        for (const itm of itms) await writeOffStockForProject(itm.id);
      }
      return res.status(200).json({ success: true, data: r[0] });
    }
    if (req.method === 'DELETE') {
      await sql`DELETE FROM projects WHERE id = ${req.query.id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleReports(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const { type, projectId } = req.query || {};
    let result;
    if (type === 'fin-rentabilidade') result = await sql`SELECT * FROM bi_custos_projeto ORDER BY custo_material_total DESC`;
    if (type === 'ind-romaneio') result = await sql`SELECT pi.label as ambiente, cr.componente_nome, s.nome as sku_nome, s.sku as sku_code, cr.quantidade_com_perda, s.unidade_uso as unidade_medida FROM erp_project_items pi JOIN erp_consumption_results cr ON cr.project_item_id = pi.id JOIN materiais s ON s.id = cr.sku_id WHERE pi.project_id = ${projectId} ORDER BY pi.label, cr.componente_nome`;
    if (type === 'com-necessidade') result = await sql`SELECT s.sku as sku_code, s.nome, s.estoque_atual, s.estoque_minimo FROM materiais s WHERE s.estoque_atual <= s.estoque_minimo ORDER BY (s.estoque_minimo - s.estoque_atual) DESC`;
    if (type === 'ind-desvios') result = await sql`SELECT * FROM bi_desvio_producao`;
    if (!result) return res.status(400).json({ success: false, error: 'Tipo inválido' });
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleEngineering(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    
    // Garantia de infra: cria tabela e colunas se não existirem (v5 schema fix)
    await sql`CREATE TABLE IF NOT EXISTS erp_product_bom (id UUID PRIMARY KEY DEFAULT gen_random_uuid())`;
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS nome TEXT`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS codigo_modelo TEXT`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS descricao TEXT`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS regras_calculo JSONB DEFAULT '[]'`.catch(() => {});
    
    // Force Null em colunas legadas (hotfix industrial v6)
    try {
      await sql`
        DO $$ 
        DECLARE r RECORD;
        BEGIN
            FOR r IN (SELECT column_name FROM information_schema.columns WHERE table_name = 'erp_product_bom' AND is_nullable = 'NO' AND column_name NOT IN ('id', 'nome', 'codigo_modelo')) 
            LOOP
                EXECUTE 'ALTER TABLE erp_product_bom ALTER COLUMN ' || quote_ident(r.column_name) || ' DROP NOT NULL';
            END LOOP;
        END $$;
      `;
    } catch (e) {}

    try { await sql`ALTER TABLE erp_product_bom ADD CONSTRAINT erp_product_bom_unique_code UNIQUE (codigo_modelo)`; } catch(e){}

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM erp_product_bom ORDER BY created_at DESC`;
      return res.status(200).json({ success: true, data: result });
    }
    
    if (req.method === 'POST') {
      const { 
        nome, codigo_modelo, descricao,
        largura_padrao, altura_padrao, profundidade_padrao,
        horas_mo_padrao, valor_hora_padrao, preco_material_m3_padrao 
      } = req.body;
      
      if (!nome || !codigo_modelo) {
        return res.status(400).json({ success: false, error: 'Nome e Código são obrigatórios' });
      }

      const [result] = await sql`
        INSERT INTO erp_product_bom (
          nome, codigo_modelo, descricao, 
          largura_padrao, altura_padrao, profundidade_padrao, 
          horas_mo_padrao, valor_hora_padrao, preco_material_m3_padrao
        ) 
        VALUES (
          ${nome}, ${codigo_modelo}, ${descricao},
          ${Number(largura_padrao) || 0}, ${Number(altura_padrao) || 0}, ${Number(profundidade_padrao) || 0},
          ${Number(horas_mo_padrao) || 0}, ${Number(valor_hora_padrao) || 0}, ${Number(preco_material_m3_padrao) || 0}
        ) 
        ON CONFLICT (codigo_modelo) 
        DO UPDATE SET 
          nome = EXCLUDED.nome, 
          descricao = EXCLUDED.descricao,
          largura_padrao = EXCLUDED.largura_padrao,
          altura_padrao = EXCLUDED.altura_padrao,
          profundidade_padrao = EXCLUDED.profundidade_padrao,
          horas_mo_padrao = EXCLUDED.horas_mo_padrao,
          valor_hora_padrao = EXCLUDED.valor_hora_padrao,
          preco_material_m3_padrao = EXCLUDED.preco_material_m3_padrao
        RETURNING *
      `;
      return res.status(201).json({ success: true, data: result });
    }
    
    return res.status(405).end();
  } catch (err: any) {
    console.error('ENGINEERING_PERSISTENCE_ERROR:', err);
    return res.status(500).json({ success: false, error: `Falha na Engenharia: ${err.message}` });
  }
}

export async function handleSKUs(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method === 'GET') {
      const result = await sql`SELECT id, sku, categoria_id, nome, unidade_uso as unidade_medida, preco_custo as preco_base, ativo FROM materiais ORDER BY nome ASC`;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const f = req.body;
      const r = await sql`INSERT INTO materiais (sku, nome, preco_custo, unidade_uso, unidade_compra, ativo, estoque_atual, estoque_minimo) VALUES (${f.sku_code}, ${f.nome}, ${f.preco_base}, ${f.unidade_medida}, ${f.unidade_medida}, true, 0, 0) RETURNING id, sku, categoria_id, nome, unidade_uso as unidade_medida, preco_custo as preco_base, ativo`;
      return res.status(201).json({ success: true, data: r[0] });
    }
    if (req.method === 'DELETE') {
      await sql`UPDATE materiais SET ativo = false WHERE id = ${req.query.id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleSimulations(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    return res.status(200).json({ success: true, data: [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
