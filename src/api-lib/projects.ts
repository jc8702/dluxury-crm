import { sql, validateAuth } from './_db.js';
import { writeOffStockForProject } from './_inventory.js';
import { Project } from './types.js';

export async function handleProjects(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    // Infraestrutura: garantir existência da tabela e colunas
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id TEXT,
          client_name TEXT,
          cliente_nome TEXT,
          ambiente TEXT,
          title TEXT,
          titulo TEXT,
          descricao TEXT,
          description TEXT,
          valor_estimado NUMERIC DEFAULT 0,
          valor_final NUMERIC DEFAULT 0,
          prazo_entrega TEXT,
          status TEXT DEFAULT 'lead',
          etapa_producao TEXT,
          responsavel TEXT,
          observacoes TEXT,
          observations TEXT,
          visita_id TEXT,
          tag TEXT,
          orcamento_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      // Garantir colunas novas em tabelas existentes
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS tag TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS orcamento_id TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_nome TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS title TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS titulo TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS observations TEXT`.catch(() => {});

      // Migração de emergência: Se projects estiver vazio ou com poucos dados, tenta puxar do kanban_items (tabela antiga)
      const countResult = await sql`SELECT count(*) FROM projects`;
      const projectsCount = parseInt(countResult[0].count);
      
      const kanbanItemsCountResult = await sql`SELECT count(*) FROM kanban_items WHERE type = 'project' OR type IS NULL`;
      const kanbanItemsCount = parseInt(kanbanItemsCountResult[0].count);

      if (projectsCount < kanbanItemsCount) {
        try {
          // Migrar itens que ainda não estão no projects (usando titulo/ambiente como chave de unicidade simples para evitar duplicatas em massa)
          await sql`
            INSERT INTO projects (client_name, cliente_nome, ambiente, title, status, observations, created_at, updated_at)
            SELECT 
              subtitle as client_name, 
              subtitle as cliente_nome,
              title as ambiente,
              title as title,
              status, 
              observations, 
              COALESCE(updated_at, NOW()), 
              NOW()
            FROM kanban_items ki
            WHERE (ki.type = 'project' OR ki.type IS NULL)
            AND NOT EXISTS (
              SELECT 1 FROM projects p 
              WHERE p.ambiente = ki.title 
              AND (p.client_name = ki.subtitle OR p.client_name = ki.contact_name)
            )
            ON CONFLICT DO NOTHING
          `;
          console.log('Migration from kanban_items completed successfully.');
        } catch (migErr) {
          console.error('Migration from kanban_items failed:', migErr);
        }
      }
    } catch (e) {
      console.error('Database setup error in projects:', e);
    }
    if (req.method === 'GET') {
      const { client_id, status } = req.query;
      
      const query = client_id 
        ? sql`
            SELECT p.*, o.valor_final as valor_orcamento_atual
            FROM projects p
            LEFT JOIN (
              SELECT DISTINCT ON (projeto_id) valor_final, projeto_id
              FROM orcamentos
              ORDER BY projeto_id, criado_em DESC
            ) o ON p.id::text = o.projeto_id::text
            WHERE p.client_id = ${client_id}
            ORDER BY p.created_at DESC
          `
        : status 
          ? sql`
              SELECT p.*, o.valor_final as valor_orcamento_atual
              FROM projects p
              LEFT JOIN (
                SELECT DISTINCT ON (projeto_id) valor_final, projeto_id
                FROM orcamentos
                ORDER BY projeto_id, criado_em DESC
              ) o ON p.id::text = o.projeto_id::text
              WHERE p.status = ${status}
              ORDER BY p.created_at DESC
            `
          : sql`
              SELECT 
                p.*, 
                COALESCE(p.client_name, p.cliente_nome) as client_name,
                COALESCE(p.cliente_nome, p.client_name) as cliente_nome,
                COALESCE(p.ambiente, p.title, p.titulo) as ambiente,
                COALESCE(p.title, p.ambiente) as title,
                o.valor_final as valor_orcamento_atual
              FROM projects p
              LEFT JOIN (
                SELECT DISTINCT ON (projeto_id) valor_final, projeto_id
                FROM orcamentos
                ORDER BY projeto_id, created_at DESC
              ) o ON p.id::text = o.projeto_id::text
              ORDER BY p.updated_at DESC
            `;

      const result = await query;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const f = req.body;
      const tag = f.tag || `PRJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const result = await sql`
        INSERT INTO projects (
          client_id, client_name, ambiente, descricao, 
          valor_estimado, valor_final, prazo_entrega, status, 
          etapa_producao, responsavel, observacoes, visita_id, tag
        ) VALUES (
          ${f.client_id || f.clientId}, 
          ${f.client_name || f.clientName || f.cliente_nome}, 
          ${f.ambiente || f.title || f.titulo}, 
          ${f.descricao || f.description}, 
          ${f.valor_estimado || f.valorEstimado || 0}, 
          ${f.valor_final || f.valorFinal || 0}, 
          ${f.prazo_entrega || f.prazoEntrega}, 
          ${f.status || 'lead'}, 
          ${f.etapa_producao || f.etapaProducao}, 
          ${f.responsavel}, 
          ${f.observacoes || f.observations}, 
          ${f.visita_id || f.visitaId}, 
          ${tag}
        ) RETURNING *`;
      return res.status(201).json({ success: true, data: result[0] });
    }
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const f = req.body;
      const r = await sql`
        UPDATE projects SET 
          client_id = COALESCE(${f.client_id || f.clientId}, client_id), 
          client_name = COALESCE(${f.client_name || f.clientName || f.cliente_nome}, client_name), 
          ambiente = COALESCE(${f.ambiente || f.title || f.titulo}, ambiente), 
          descricao = COALESCE(${f.descricao || f.description}, descricao), 
          valor_estimado = COALESCE(${f.valor_estimado || f.valorEstimado}, valor_estimado), 
          valor_final = COALESCE(${f.valor_final || f.valorFinal}, valor_final), 
          prazo_entrega = COALESCE(${f.prazo_entrega || f.prazoEntrega}, prazo_entrega), 
          status = COALESCE(${f.status}, status), 
          etapa_producao = COALESCE(${f.etapa_producao || f.etapaProducao}, etapa_producao), 
          responsavel = COALESCE(${f.responsavel}, responsavel), 
          observacoes = COALESCE(${f.observacoes || f.observations}, observacoes), 
          visita_id = COALESCE(${f.visita_id || f.visitaId}, visita_id), 
          orcamento_id = COALESCE(${f.orcamento_id || f.orcamentoId}, orcamento_id), 
          tag = COALESCE(${f.tag}, tag), 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${req.query.id} RETURNING *`;
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
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS largura_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS altura_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS profundidade_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS horas_mo_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS valor_hora_padrao NUMERIC DEFAULT 150`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS preco_material_m3_padrao NUMERIC DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW()`.catch(() => {});
    
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
      const term = req.query.q as string;
      let result;
      if (term) {
        result = await sql`SELECT * FROM erp_product_bom WHERE nome ILIKE ${'%' + term + '%'} OR codigo_modelo ILIKE ${'%' + term + '%'} ORDER BY created_at DESC`;
      } else {
        result = await sql`SELECT * FROM erp_product_bom ORDER BY created_at DESC`;
      }
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
          horas_mo_padrao, valor_hora_padrao, preco_material_m3_padrao,
          regras_calculo
        ) 
        VALUES (
          ${nome}, ${codigo_modelo}, ${descricao},
          ${Number(largura_padrao) || 0}, ${Number(altura_padrao) || 0}, ${Number(profundidade_padrao) || 0},
          ${Number(horas_mo_padrao) || 0}, ${Number(valor_hora_padrao) || 0}, ${Number(preco_material_m3_padrao) || 0},
          ${JSON.stringify(req.body.regras_calculo || [])}::jsonb
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
          preco_material_m3_padrao = EXCLUDED.preco_material_m3_padrao,
          regras_calculo = EXCLUDED.regras_calculo
        RETURNING *
      `;
      return res.status(201).json({ success: true, data: result });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { id } = req.query;
      const f = req.body;
      const [result] = await sql`
        UPDATE erp_product_bom SET
          nome = COALESCE(${f.nome}, nome),
          codigo_modelo = COALESCE(${f.codigo_modelo}, codigo_modelo),
          descricao = COALESCE(${f.descricao}, descricao),
          largura_padrao = COALESCE(${f.largura_padrao}, largura_padrao),
          altura_padrao = COALESCE(${f.altura_padrao}, altura_padrao),
          profundidade_padrao = COALESCE(${f.profundidade_padrao}, profundidade_padrao),
          horas_mo_padrao = COALESCE(${f.horas_mo_padrao}, horas_mo_padrao),
          valor_hora_padrao = COALESCE(${f.valor_hora_padrao}, valor_hora_padrao),
          preco_material_m3_padrao = COALESCE(${f.preco_material_m3_padrao}, preco_material_m3_padrao),
          regras_calculo = COALESCE(${f.regras_calculo ? JSON.stringify(f.regras_calculo) : null}::jsonb, regras_calculo),
          atualizado_em = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await sql`DELETE FROM erp_product_bom WHERE id = ${id}`;
      return res.status(200).json({ success: true });
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
