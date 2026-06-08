import { sql, auditLog } from './_db.js';
import { db } from './drizzle-db.js';
import { sql as drizzleSql } from 'drizzle-orm';
import { writeOffStockForProjectBatch } from './_inventory.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { logger } from './logger.js';
import { requireFeature } from './middleware/featureGate.js';

const handleProjectsCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.tenantUser;

    // Infraestrutura: garantir existência da tabela e colunas
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID,
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
          quotation_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      // Garantir colunas novas em tabelas existentes
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`.catch(
        () => {},
      );
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS tag TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS quotation_id TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`.catch(
        () => {},
      );
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_nome TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS title TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS titulo TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT`.catch(() => {});
      await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS observations TEXT`.catch(() => {});

      // Migração de emergência: Se projects estiver vazio ou com poucos dados, tenta puxar do kanban_items (tabela antiga)
      const countResult = await sql`SELECT count(*) FROM projects WHERE tenant_id = ${tenantId}`;
      const projectsCount = countResult && countResult[0] ? parseInt(countResult[0].count) : 0;

      const kanbanItemsCountResult =
        await sql`SELECT count(*) FROM kanban_items WHERE (type = 'project' OR type IS NULL) AND tenant_id = ${tenantId}`;
      const kanbanItemsCount =
        kanbanItemsCountResult && kanbanItemsCountResult[0]
          ? parseInt(kanbanItemsCountResult[0].count)
          : 0;

      if (projectsCount < kanbanItemsCount) {
        try {
          // Migrar itens que ainda não estão no projects (usando titulo/ambiente como chave de unicidade simples para evitar duplicatas em massa)
          await sql`
            INSERT INTO projects (client_id, client_name, cliente_nome, ambiente, title, status, observations, created_at, updated_at, tenant_id)
            SELECT 
              c.id::text as client_id,
              COALESCE(ki.subtitle, ki.contact_name, 'Cliente Sem Nome') as client_name, 
              COALESCE(ki.subtitle, ki.contact_name, 'Cliente Sem Nome') as cliente_nome,
              COALESCE(ki.title, ki.label, 'Ambiente Sem Nome') as ambiente,
              COALESCE(ki.title, ki.label, 'Projeto Sem Nome') as title,
              ki.status, 
              ki.observations, 
              COALESCE(ki.updated_at, NOW()), 
              NOW(),
              ${tenantId}::uuid
            FROM kanban_items ki
            LEFT JOIN clients c ON TRIM(UPPER(c.nome)) = TRIM(UPPER(COALESCE(ki.subtitle, ki.contact_name))) AND c.tenant_id = ${tenantId}
            WHERE (ki.type = 'project' OR ki.type IS NULL) AND ki.tenant_id = ${tenantId}
            AND NOT EXISTS (
              SELECT 1 FROM projects p 
              WHERE TRIM(UPPER(p.ambiente)) = TRIM(UPPER(ki.title)) 
              AND (TRIM(UPPER(p.client_name)) = TRIM(UPPER(ki.subtitle)) OR TRIM(UPPER(p.client_name)) = TRIM(UPPER(ki.contact_name)))
              AND p.tenant_id = ${tenantId}
            )
            ON CONFLICT DO NOTHING
          `;
          /* logger.info('Migration from kanban_items completed successfully.'); */
        } catch (migErr) {
          logger.error('Migration from kanban_items failed:', migErr);
        }
      }
    } catch (e) {
      logger.error('Database setup error in projects:', e);
    }
    if (req.method === 'GET') {
      const { client_id, status, q } = req.query;

      // CTE: latest quotation per project — definido uma vez com Drizzle, reaproveitado nas branches
      const latestQuotCte = drizzleSql`
        SELECT DISTINCT ON (projeto_id) valor_total_venda as valor_final, projeto_id
        FROM quotations
        WHERE tenant_id = ${tenantId}
        ORDER BY projeto_id, created_at DESC
      `;

      // Helper para executar raw SQL através do Drizzle ORM e retornar rows
      const execSql = (strings: TemplateStringsArray, ...values: any[]) =>
        db.execute(drizzleSql(strings as any, ...values)).then((r) => r.rows);

      let query;
      if (q) {
        query = execSql`
          SELECT p.*, 
                 COALESCE(p.tag, 'PRJ-' || UPPER(SUBSTRING(p.id::text, 1, 6))) as tag,
                 c.nome as client_name
          FROM projects p
          LEFT JOIN clients c ON p.client_id = c.id::text AND c.tenant_id = ${tenantId}
          WHERE p.deleted_at IS NULL AND p.tenant_id = ${tenantId}
          AND (p.tag ILIKE ${'%' + q + '%'} OR p.ambiente ILIKE ${'%' + q + '%'} OR c.nome ILIKE ${'%' + q + '%'})
          ORDER BY p.updated_at DESC
          LIMIT 10
        `;
      } else if (client_id) {
        query = execSql`
          WITH latest_quot AS (${latestQuotCte})
          SELECT p.*, 
                 COALESCE(p.tag, 'PRJ-' || UPPER(SUBSTRING(p.id::text, 1, 6))) as tag,
                 o.valor_final as valor_orcamento_atual
          FROM projects p
          LEFT JOIN latest_quot o ON p.id::text = o.projeto_id::text
          WHERE p.client_id = ${client_id} AND p.deleted_at IS NULL AND p.tenant_id = ${tenantId}
          ORDER BY p.created_at DESC
        `;
      } else if (status) {
        query = execSql`
          WITH latest_quot AS (${latestQuotCte})
          SELECT p.*, 
                 COALESCE(p.tag, 'PRJ-' || UPPER(SUBSTRING(p.id::text, 1, 6))) as tag,
                 o.valor_final as valor_orcamento_atual
          FROM projects p
          LEFT JOIN latest_quot o ON p.id::text = o.projeto_id::text
          WHERE TRIM(UPPER(p.status)) = TRIM(UPPER(${status})) AND p.deleted_at IS NULL AND p.tenant_id = ${tenantId}
          ORDER BY p.created_at DESC
        `;
      } else {
        query = execSql`
          WITH latest_quot AS (${latestQuotCte})
          SELECT 
            p.*, 
            COALESCE(p.tag, 'PRJ-' || UPPER(SUBSTRING(p.id::text, 1, 6))) as tag,
            COALESCE(p.client_name, p.cliente_nome, c.nome) as client_name,
            COALESCE(p.cliente_nome, p.client_name, c.nome) as cliente_nome,
            COALESCE(p.ambiente, p.title, p.titulo) as ambiente,
            COALESCE(p.title, p.ambiente) as title,
            o.valor_final as valor_orcamento_atual
          FROM projects p
          LEFT JOIN clients c ON p.client_id = c.id::text AND c.tenant_id = ${tenantId}
          LEFT JOIN latest_quot o ON p.id::text = o.projeto_id::text
          WHERE p.deleted_at IS NULL AND p.tenant_id = ${tenantId}
          ORDER BY p.updated_at DESC
        `;
      }

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
          etapa_producao, responsavel, observacoes, visita_id, quotation_id, tag,
          tenant_id
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
          ${f.quotation_id || f.orcamentoId || null},
          ${tag},
          ${tenantId}::uuid
        ) RETURNING *`;

      await auditLog('projects', result[0].id, 'CREATE', user?.id, null, result[0]);

      if (result[0].status === 'em_producao') {
        await triggerOpCreationForProject(result[0].id, tenantId, result[0]);
      }

      return res.status(201).json({ success: true, data: result[0] });
    }
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'ID é obrigatório' });
      const f = req.body;

      const before = await sql`SELECT * FROM projects WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!before.length)
        return res.status(404).json({ success: false, error: 'Projeto não encontrado' });

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
          quotation_id = COALESCE(${f.quotation_id || f.orcamentoId}, quotation_id), 
          tag = COALESCE(${f.tag}, tag), 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;

      await auditLog('projects', id, 'UPDATE', user?.id, before[0], r[0]);

      if (r.length && f.status === 'em_producao' && before[0].status !== 'em_producao') {
        await triggerOpCreationForProject(id, tenantId, r[0]);
      }

      if (r.length && f.status === 'concluido') {
        await writeOffStockForProjectBatch(id, tenantId);
      }
      return res.status(200).json({ success: true, data: r[0] });
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'ID é obrigatório' });

      const before = await sql`SELECT * FROM projects WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!before.length)
        return res.status(404).json({ success: false, error: 'Projeto não encontrado' });

      // Soft Delete: Marcar como deletado e registrar auditoria
      await sql`UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ${id} AND tenant_id = ${tenantId}`;

      // Limpar ordens de produção vinculadas (Hard delete ou Soft delete conforme política)
      // Aqui usamos Soft Delete também nas OPs se houver a coluna
      await sql`UPDATE ordens_producao SET deleted_at = CURRENT_TIMESTAMP WHERE (projeto_id = ${id} OR metadata->>'projeto_id' = ${id}) AND tenant_id = ${tenantId}`;

      await auditLog('projects', id, 'DELETE', user?.id, before[0], {
        deleted_at: new Date().toISOString(),
      });

      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const handleReportsCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.tenantUser;
    const { type, projectId } = req.query || {};
    let result;
    if (type === 'fin-rentabilidade') {
      result = await sql`
        SELECT b.id, b.projeto_id, b.custo_material_total, b.custo_mao_obra_total, b.custo_total, b.receita_total, b.margem_percentual, b.created_at 
        FROM bi_custos_projeto b
        JOIN projects p ON b.projeto_id = p.id::text
        WHERE p.tenant_id = ${tenantId}
        ORDER BY b.custo_material_total DESC
      `;
    }
    if (type === 'ind-romaneio') {
      result = await sql`
        SELECT pi.label as ambiente, cr.componente_nome, s.nome as sku_nome, s.sku as sku_code, cr.quantidade_com_perda, s.unidade_uso as unidade_medida 
        FROM erp_project_items pi 
        JOIN erp_consumption_results cr ON cr.project_item_id = pi.id 
        JOIN materiais s ON s.id = cr.sku_id AND s.tenant_id = ${tenantId}
        JOIN projects p ON pi.project_id = p.id::text AND p.tenant_id = ${tenantId}
        WHERE pi.project_id = ${projectId} 
        ORDER BY pi.label, cr.componente_nome
      `;
    }
    if (type === 'com-necessidade') {
      result = await sql`
        SELECT s.sku as sku_code, s.nome, s.estoque_atual, s.estoque_minimo 
        FROM materiais s 
        WHERE s.estoque_atual <= s.estoque_minimo AND s.tenant_id = ${tenantId}
        ORDER BY (s.estoque_minimo - s.estoque_atual) DESC
      `;
    }
    if (type === 'ind-desvios') {
      result = await sql`
        SELECT d.id, d.projeto_id, d.op_id, d.tipo_desvio, d.descricao, d.data_ocorrencia, d.created_at 
        FROM bi_desvio_producao d
        JOIN projects p ON d.projeto_id = p.id::text
        WHERE p.tenant_id = ${tenantId}
      `;
    }
    if (!result) return res.status(400).json({ success: false, error: 'Tipo inválido' });
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const handleEngineeringCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.tenantUser;

    // Garantia de infra: cria tabela e colunas se não existirem (v5 schema fix)
    await sql`CREATE TABLE IF NOT EXISTS erp_product_bom (id UUID PRIMARY KEY DEFAULT gen_random_uuid())`;
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS nome TEXT`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS codigo_modelo TEXT`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS descricao TEXT`.catch(() => {});
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS regras_calculo JSONB DEFAULT '[]'`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS largura_padrao NUMERIC DEFAULT 0`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS altura_padrao NUMERIC DEFAULT 0`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS profundidade_padrao NUMERIC DEFAULT 0`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS horas_mo_padrao NUMERIC DEFAULT 0`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS valor_hora_padrao NUMERIC DEFAULT 150`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS preco_material_m3_padrao NUMERIC DEFAULT 0`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS valor_total NUMERIC DEFAULT 0`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_product_bom ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`.catch(
      () => {},
    );

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
    } catch {
      // Ignore migration errors for existing structures
    }

    try {
      await sql`ALTER TABLE erp_product_bom ADD CONSTRAINT erp_product_bom_unique_code UNIQUE (codigo_modelo)`;
    } catch {
      // Ignore if constraint already exists
    }

    if (req.method === 'GET') {
      const term = req.query.q as string;
      let result;

      if (term) {
        result = await sql`
          SELECT id, nome, codigo_modelo, descricao,
            largura_padrao, altura_padrao, profundidade_padrao,
            horas_mo_padrao, valor_hora_padrao, valor_total,
            regras_calculo, created_at, updated_at
          FROM erp_product_bom
          WHERE tenant_id = ${tenantId}
          AND (nome ILIKE ${'%' + term + '%'} OR codigo_modelo ILIKE ${'%' + term + '%'})
          ORDER BY created_at DESC
          LIMIT 20
        `;
      } else {
        result = await sql`
          SELECT id, nome, codigo_modelo, descricao,
            largura_padrao, altura_padrao, profundidade_padrao,
            horas_mo_padrao, valor_hora_padrao, valor_total,
            regras_calculo, created_at, updated_at
          FROM erp_product_bom
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `;
      }
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      let {
        nome,
        codigo_modelo,
        descricao,
        largura_padrao,
        altura_padrao,
        profundidade_padrao,
        horas_mo_padrao,
        valor_hora_padrao,
        valor_total,
        regras_calculo,
      } = req.body;

      if (!nome) {
        return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
      }

      // Auto-gera codigo_modelo se vazio
      if (!codigo_modelo) {
        const [last] = await sql`
          SELECT codigo_modelo FROM erp_product_bom
          WHERE codigo_modelo ~ '^MOD-[0-9]+$' AND tenant_id = ${tenantId}
          ORDER BY codigo_modelo DESC
          LIMIT 1
        `;
        const nextNum = last ? Number(last.codigo_modelo.replace('MOD-', '')) + 1 : 1;
        codigo_modelo = `MOD-${String(nextNum).padStart(3, '0')}`;
      }

      // Calcula valor_total a partir das regras_calculo se nao veio explicito
      if (!valor_total && Array.isArray(regras_calculo) && regras_calculo.length > 0) {
        valor_total = regras_calculo.reduce((sum: number, r: any) => {
          return sum + (Number(r.valor_unitario) || 0) * (Number(r.quantidade) || 0);
        }, 0);
      }

      const [result] = await sql`
        INSERT INTO erp_product_bom (
          nome, codigo_modelo, descricao, 
          largura_padrao, altura_padrao, profundidade_padrao, 
          horas_mo_padrao, valor_hora_padrao, valor_total,
          regras_calculo, tenant_id
        ) 
        VALUES (
          ${nome}, ${codigo_modelo}, ${descricao},
          ${Number(largura_padrao) || 0}, ${Number(altura_padrao) || 0}, ${Number(profundidade_padrao) || 0},
          ${Number(horas_mo_padrao) || 0}, ${Number(valor_hora_padrao) || 0}, ${Number(valor_total) || 0},
          ${JSON.stringify(regras_calculo || [])}::jsonb,
          ${tenantId}::uuid
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
          valor_total = EXCLUDED.valor_total,
          regras_calculo = EXCLUDED.regras_calculo,
          updated_at = NOW()
        RETURNING *
      `;
      return res.status(201).json({ success: true, data: result });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { id } = req.query;
      const f = req.body;

      // Recalcula valor_total a partir das regras_calculo se informadas
      let valor_total = f.valor_total;
      if (f.regras_calculo && Array.isArray(f.regras_calculo)) {
        valor_total = f.regras_calculo.reduce((sum: number, r: any) => {
          return sum + (Number(r.valor_unitario) || 0) * (Number(r.quantidade) || 0);
        }, 0);
      }

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
          valor_total = COALESCE(${Number(valor_total) || 0}, valor_total),
          regras_calculo = COALESCE(${f.regras_calculo ? JSON.stringify(f.regras_calculo) : null}::jsonb, regras_calculo),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await sql`DELETE FROM erp_product_bom WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).end();
  } catch (err: any) {
    logger.error('ENGINEERING_PERSISTENCE_ERROR:', err);
    return res.status(500).json({ success: false, error: `Falha na Engenharia: ${err.message}` });
  }
};

const handleSKUsCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.tenantUser;

    if (req.method === 'GET') {
      if (req.query.action === 'next-code') {
        const prefix = req.query.prefix || 'SKU';
        const [last] = await sql`
          SELECT sku_codigo as sku FROM estoque_materiais_detalhado
          WHERE sku_codigo LIKE ${prefix + '-%'} AND tenant_id = ${tenantId}
          ORDER BY sku_codigo DESC
          LIMIT 1
        `;
        let nextNum = 1;
        if (last && last.sku) {
          const numPart = last.sku.split('-')[1];
          if (numPart && !isNaN(Number(numPart))) {
            nextNum = Number(numPart) + 1;
          }
        }
        const nextCode = `${prefix}-${String(nextNum).padStart(4, '0')}`;
        return res.status(200).json({ success: true, data: { nextCode } });
      }

      const result =
        await sql`SELECT id, sku_codigo as sku, null as categoria_id, descricao as nome, unidade_medida, preco_custo_unitario as preco_base, null as largura_mm, null as altura_mm, ativo, fabricante, fornecedor_principal, lead_time_dias, categoria_taxonomia FROM estoque_materiais_detalhado WHERE tenant_id = ${tenantId} ORDER BY descricao ASC`;
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const f = req.body;
      const r =
        await sql`INSERT INTO estoque_materiais_detalhado (sku_codigo, descricao, preco_custo_unitario, preco_custo, unidade_medida, unidade_uso, ativo, quantidade_disponivel, fabricante, fornecedor_principal, lead_time_dias, categoria_taxonomia, tenant_id) VALUES (${f.sku_code}, ${f.nome}, ${f.preco_base}, ${f.preco_base}, ${f.unidade_medida}, ${f.unidade_medida}, true, 0, ${f.fabricante || null}, ${f.fornecedor_principal || null}, ${f.lead_time_dias || null}, ${f.categoria_taxonomia || null}, ${tenantId}::uuid) RETURNING id, sku_codigo as sku, null as categoria_id, descricao as nome, unidade_medida, preco_custo_unitario as preco_base, ativo, fabricante, fornecedor_principal, lead_time_dias, categoria_taxonomia`;
      return res.status(201).json({ success: true, data: r[0] });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const f = req.body;
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'ID do SKU n�o fornecido' });
      const r = await sql`UPDATE estoque_materiais_detalhado SET 
        descricao = COALESCE(${f.nome}, descricao),
        preco_custo_unitario = COALESCE(${f.preco_base}, preco_custo_unitario),
        preco_custo = COALESCE(${f.preco_base}, preco_custo),
        unidade_medida = COALESCE(${f.unidade_medida}, unidade_medida),
        unidade_uso = COALESCE(${f.unidade_medida}, unidade_uso),
        fabricante = COALESCE(${f.fabricante}, fabricante),
        fornecedor_principal = COALESCE(${f.fornecedor_principal}, fornecedor_principal),
        lead_time_dias = COALESCE(${f.lead_time_dias}, lead_time_dias),
        categoria_taxonomia = COALESCE(${f.categoria_taxonomia}, categoria_taxonomia)
        WHERE id = ${id} AND tenant_id = ${tenantId} 
        RETURNING id, sku_codigo as sku, null as categoria_id, descricao as nome, unidade_medida, preco_custo_unitario as preco_base, ativo, fabricante, fornecedor_principal, lead_time_dias, categoria_taxonomia`;
      return res.status(200).json({ success: true, data: r[0] });
    }

    if (req.method === 'DELETE') {
      await sql`UPDATE estoque_materiais_detalhado SET ativo = false WHERE id = ${req.query.id} AND tenant_id = ${tenantId}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const handleSimulationsCore: TenantHandler = async (req, res) => {
  try {
    await requireFeature('simulator')(req, res, () => {});
    if (res.headersSent) return;
    const tenantId = req.tenantId;
    const user = req.tenantUser;

    // Migração: garantir colunas adicionais para cenários de produção
    await sql`ALTER TABLE erp_simulations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_simulations ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT 'Simulação'`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_simulations ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'generico'`.catch(
      () => {},
    );
    await sql`ALTER TABLE erp_simulations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE`.catch(
      () => {},
    );

    const method = req.method;
    const url = req.url || '';

    const { id, tipo } = req.query || {};
    let pathId: string | null = null;
    if (!id && url.includes('/simulations/')) {
      pathId = url.split('/simulations/')[1].split('?')[0];
    }
    const recordId = id || pathId;

    if (method === 'GET') {
      if (recordId) {
        const [row] =
          await sql`SELECT * FROM erp_simulations WHERE id = ${recordId} AND tenant_id = ${tenantId}`;
        if (!row)
          return res.status(404).json({ success: false, error: 'Simulação não encontrada' });
        return res.status(200).json({ success: true, data: row });
      }
      if (tipo) {
        const rows =
          await sql`SELECT * FROM erp_simulations WHERE tipo = ${tipo} AND tenant_id = ${tenantId} ORDER BY created_at DESC`;
        return res.status(200).json({ success: true, data: rows });
      }
      const rows =
        await sql`SELECT * FROM erp_simulations WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
      return res.status(200).json({ success: true, data: rows });
    }

    if (method === 'POST') {
      const {
        nome,
        tipo: tipoBody,
        dados_simulacao,
        dados_input,
        cliente_id,
        cliente_nome,
      } = req.body;
      const [row] = await sql`
        INSERT INTO erp_simulations (nome, tipo, dados_simulacao, dados_input, cliente_id, cliente_nome, tenant_id)
        VALUES (${nome || 'Simulação'}, ${tipoBody || 'generico'}, ${JSON.stringify(dados_simulacao || {})}, ${JSON.stringify(dados_input || {})}, ${cliente_id || null}, ${cliente_nome || null}, ${tenantId}::uuid)
        RETURNING *
      `;
      return res.status(201).json({ success: true, data: row });
    }

    if (method === 'PUT') {
      if (!recordId) return res.status(400).json({ success: false, error: 'ID é obrigatório' });
      const { nome, dados_simulacao, dados_input } = req.body;
      const [row] = await sql`
        UPDATE erp_simulations SET
          nome = COALESCE(${nome}, nome),
          dados_simulacao = CASE WHEN ${!!dados_simulacao} THEN ${JSON.stringify(dados_simulacao)}::jsonb ELSE dados_simulacao END,
          dados_input = CASE WHEN ${!!dados_input} THEN ${JSON.stringify(dados_input)}::jsonb ELSE dados_input END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${recordId} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (!row) return res.status(404).json({ success: false, error: 'Simulação não encontrada' });
      return res.status(200).json({ success: true, data: row });
    }

    if (method === 'DELETE') {
      if (!recordId) return res.status(400).json({ success: false, error: 'ID é obrigatório' });
      await sql`DELETE FROM erp_simulations WHERE id = ${recordId} AND tenant_id = ${tenantId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    logger.error('HANDLE_SIMULATIONS_ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

async function triggerOpCreationForProject(projectId: string, tenantId: string, projectData: any) {
  try {
    const existingOp =
      await sql`SELECT id FROM ordens_producao WHERE projeto_id = ${projectId} AND tenant_id = ${tenantId}`;
    if (existingOp.length === 0) {
      const rawTag = projectData.tag || `PRJ-${projectId.substring(0, 6).toUpperCase()}`;
      const numeroOp = `OP-PRJ-${rawTag.replace('PRJ-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      let orcId = null;
      if (
        projectData.quotation_id &&
        projectData.quotation_id !== 'none' &&
        projectData.quotation_id !== ''
      ) {
        orcId = projectData.quotation_id;
      }

      const produtoNome = projectData.ambiente || `Projeto ${rawTag}`;

      const [newOp] = await sql`
        INSERT INTO ordens_producao (
          op_id, 
          tenant_id, 
          projeto_id, 
          quotation_id, 
          produto, 
          status, 
          metadata
        )
        VALUES (
          ${numeroOp}, 
          ${tenantId}::uuid, 
          ${projectId}::uuid, 
          ${orcId}, 
          ${produtoNome}, 
          'AGUARDANDO', 
          ${JSON.stringify({ origem: 'kanban_projetos' })}
        )
        RETURNING id
      `;

      if (newOp?.id) {
        // Notificação opcional
      }
    }
  } catch (err) {
    logger.error('Error creating OP for project:', err);
  }
}

export const handleProjects = withTenant(handleProjectsCore);
export const handleReports = withTenant(handleReportsCore);
export const handleEngineering = withTenant(handleEngineeringCore);
export const handleSKUs = withTenant(handleSKUsCore);
export const handleSimulations = withTenant(handleSimulationsCore);
