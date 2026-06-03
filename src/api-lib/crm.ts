import { sql, validateAuth, auditLog } from './_db.js';


export async function handleClients(req: any, res: any) {
  try {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
    if (req.method === 'GET') {
      const result = await sql`SELECT id, nome, cpf, telefone, email, endereco, bairro, city as cidade, uf, tipo_imovel, comodos_interesse, origem, observacoes, status, created_at, razao_social, cnpj, municipio, situacao_cadastral FROM clients WHERE deleted_at IS NULL AND tenant_id = ${tenantId} ORDER BY created_at DESC`.catch(async () => {
        // Fallback para coluna cidade legada
        return await sql`SELECT id, nome, cpf, telefone, email, endereco, bairro, cidade, uf, tipo_imovel, comodos_interesse, origem, observacoes, status, created_at, razao_social, cnpj, municipio, situacao_cadastral FROM clients WHERE deleted_at IS NULL AND tenant_id = ${tenantId} ORDER BY created_at DESC`;
      });
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const f = req.body;
      const comodosStr = Array.isArray(f.comodos_interesse) ? f.comodos_interesse.join(', ') : (f.comodos_interesse || '');
      const cnpjVal = f.cnpj?.trim() ? f.cnpj.trim() : null;
      const cpfVal = f.cpf?.trim() ? f.cpf.trim() : null;
      
      const { user } = validateAuth(req);
      const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
      const result = await sql`
        INSERT INTO clients (
          nome, cpf, telefone, email, endereco, bairro, cidade, uf, 
          tipo_imovel, comodos_interesse, origem, observacoes, status, 
          razao_social, cnpj, municipio, situacao_cadastral, tenant_id
        ) VALUES (
          ${f.nome || ''}, ${cpfVal}, ${f.telefone || ''}, ${f.email || ''}, 
          ${f.endereco || ''}, ${f.bairro || ''}, ${f.cidade || ''}, ${f.uf || ''}, 
          ${f.tipo_imovel || 'casa'}, ${comodosStr}, ${f.origem || 'indicacao'}, 
          ${f.observacoes || ''}, ${f.status || 'ativo'}, ${f.razao_social || f.nome || ''}, 
          ${cnpjVal}, ${f.cidade || ''}, ${f.status === 'ativo' ? 'ATIVA' : 'INATIVA'}, ${tenantId}
        ) RETURNING *
      `;
      await auditLog('clients', result[0].id, 'CREATE', user?.id, null, result[0]);
      return res.status(201).json({ success: true, data: result[0] });
    }
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { id } = req.query;
      const f = req.body;
      const comodosStr = Array.isArray(f.comodos_interesse) ? f.comodos_interesse.join(', ') : (f.comodos_interesse || null);
      
      const { user } = validateAuth(req);
      const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
      const before = await sql`SELECT * FROM clients WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!before.length) return res.status(404).json({ success: false, error: 'Cliente não encontrado' });

      const cnpjVal = f.cnpj?.trim() ? f.cnpj.trim() : null;
      const cpfVal = f.cpf?.trim() ? f.cpf.trim() : null;

      const result = await sql`
        UPDATE clients SET 
          nome = COALESCE(${f.nome}, nome), 
          cpf = COALESCE(${cpfVal}, cpf), 
          telefone = COALESCE(${f.telefone}, telefone), 
          email = COALESCE(${f.email}, email), 
          endereco = COALESCE(${f.endereco}, endereco), 
          bairro = COALESCE(${f.bairro}, bairro), 
          cidade = COALESCE(${f.cidade}, cidade), 
          uf = COALESCE(${f.uf}, uf), 
          tipo_imovel = COALESCE(${f.tipo_imovel}, tipo_imovel), 
          comodos_interesse = COALESCE(${comodosStr}, comodos_interesse), 
          origem = COALESCE(${f.origem}, origem), 
          observacoes = COALESCE(${f.observacoes}, observacoes), 
          status = COALESCE(${f.status}, status), 
          razao_social = COALESCE(${f.razao_social}, razao_social),
          cnpj = COALESCE(${cnpjVal}, cnpj),
          municipio = COALESCE(${f.cidade}, municipio),
          situacao_cadastral = COALESCE(${f.status === 'ativo' ? 'ATIVA' : f.status === 'inactive' ? 'INATIVA' : null}, situacao_cadastral)
        WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *
      `;

      await auditLog('clients', id, 'UPDATE', user?.id, before[0], result[0]);

      return res.status(200).json({ success: true, data: result[0] });
    }
    if (req.method === 'DELETE') {
      const { user } = validateAuth(req);
      const { id } = req.query;
      const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
      
      const before = await sql`SELECT * FROM clients WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!before.length) return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
      await sql`UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = ${id} AND tenant_id = ${tenantId}`;
      await sql`UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE (client_id = ${id} OR client_id::text = ${id}) AND tenant_id = ${tenantId}`;
      await sql`UPDATE orcamentos SET deleted_at = CURRENT_TIMESTAMP WHERE (cliente_id = ${id} OR cliente_id::text = ${id}) AND tenant_id = ${tenantId}`;
      await auditLog('clients', id, 'DELETE', user?.id, before[0], { status: 'deleted' });
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    console.error('[Clients POST] Erro fatal:', err);
    const errMsg = err?.message || String(err);
    const isUnique = errMsg.toLowerCase().includes('unique constraint') || errMsg.toLowerCase().includes('duplicate key');
    
    return res.status(500).json({ 
      success: false, 
      error: isUnique 
        ? 'Já existe um registro cadastrado com este identificador (CPF/CNPJ/Código).'
        : errMsg 
    });
  }
}

export async function handleKanban(req: any, res: any) {
  try {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
    if (req.method === 'GET') {
      const result = await sql`
        SELECT 
          k.*,
          o.valor_final as valor_orcamento_atual
        FROM kanban_items k
        LEFT JOIN (
          SELECT DISTINCT ON (projeto_id) valor_final, projeto_id
          FROM quotations
          WHERE tenant_id = ${tenantId}
          ORDER BY projeto_id, created_at DESC
        ) o ON k.id::text = o.projeto_id::text
        WHERE k.tenant_id = ${tenantId}
        ORDER BY k.updated_at DESC
      `;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const f = req.body;
      const tag = f.type === 'project' ? `PRJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null;
      const r = await sql`INSERT INTO kanban_items (title, subtitle, label, status, type, contact_name, contact_role, email, phone, city, state, value, temperature, visit_date, visit_time, visit_type, observations, tag, tenant_id) VALUES (${f.title}, ${f.subtitle}, ${f.label}, ${f.status}, ${f.type}, ${f.contact_name}, ${f.contact_role}, ${f.email}, ${f.phone}, ${f.city}, ${f.state}, ${f.value}, ${f.temperature}, ${f.visit_date}, ${f.visit_time}, ${f.visit_type}, ${f.observations}, ${tag}, ${tenantId}) RETURNING *`;
      return res.status(201).json({ success: true, data: r[0] });
    }
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { status, tag, observations, title } = req.body;
      const r = await sql`
        UPDATE kanban_items 
        SET 
          status = COALESCE(${status}, status), 
          tag = COALESCE(${tag}, tag),
          observations = COALESCE(${observations}, observations),
          title = COALESCE(${title}, title),
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${req.query.id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: r[0] });
    }
    return res.status(405).end();
  } catch (err: any) {
    console.error('[Kanban] Erro fatal:', err);
    const errMsg = err?.message || String(err);
    const isUnique = errMsg.toLowerCase().includes('unique constraint') || errMsg.toLowerCase().includes('duplicate key');
    
    return res.status(500).json({ 
      success: false, 
      error: isUnique 
        ? 'Já existe um registro cadastrado com este identificador (CPF/CNPJ/Código).'
        : errMsg 
    });
  }
}

export async function handleGoals(req: any, res: any) {
  try {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
    if (req.method === 'GET') {
      const result = await sql`SELECT period, amount FROM monthly_goals WHERE tenant_id = ${tenantId} ORDER BY period ASC`;
      const goals: Record<string, number> = {};
      result.forEach((r: { period: string; amount: string }) => goals[r.period] = parseFloat(r.amount));
      return res.status(200).json({ success: true, data: goals });
    }
    if (req.method === 'POST') {
      const r = await sql`INSERT INTO monthly_goals (period, amount, tenant_id) VALUES (${req.body.period}, ${req.body.amount}, ${tenantId}) ON CONFLICT (period, tenant_id) DO UPDATE SET amount = ${req.body.amount}, updated_at = CURRENT_TIMESTAMP RETURNING *`;
      return res.status(200).json({ success: true, data: r[0] });
    }
    return res.status(405).end();
  } catch (err: any) {
    console.error('[Goals] Erro fatal:', err);
    const errMsg = err?.message || String(err);
    const isUnique = errMsg.toLowerCase().includes('unique constraint') || errMsg.toLowerCase().includes('duplicate key');
    
    return res.status(500).json({ 
      success: false, 
      error: isUnique 
        ? 'Já existe um registro cadastrado com este identificador (CPF/CNPJ/Código).'
        : errMsg 
    });
  }
}
