import { sql, validateAuth } from './_db.js';
import { ApiResponse, Client, KanbanItem } from './types.js';

export async function handleClients(req: any, res: any) {
  try {
    // TEMP: Allow without auth for debugging
    // const { authorized, error } = validateAuth(req);
    // if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const f = req.body;
      const comodosStr = Array.isArray(f.comodos_interesse) ? f.comodos_interesse.join(', ') : (f.comodos_interesse || '');
      
      // Tratar CNPJ/CPF vazios como NULL para evitar duplicates
      const cnpjVal = f.cnpj && f.cnpj.length > 0 ? f.cnpj : null;
      const cpfVal = f.cpf && f.cpf.length > 0 ? f.cpf : null;
      
      const result = await sql`
        INSERT INTO clients (
          nome, cpf, telefone, email, endereco, bairro, cidade, uf, 
          tipo_imovel, comodos_interesse, origem, observacoes, status, 
          razao_social, cnpj, municipio, situacao_cadastral
        ) VALUES (
          ${f.nome || ''}, ${cpfVal}, ${f.telefone || ''}, ${f.email || ''}, 
          ${f.endereco || ''}, ${f.bairro || ''}, ${f.cidade || ''}, ${f.uf || ''}, 
          ${f.tipo_imovel || 'casa'}, ${comodosStr}, ${f.origem || 'indicacao'}, 
          ${f.observacoes || ''}, ${f.status || 'ativo'}, ${f.razao_social || f.nome || ''}, 
          ${cnpjVal}, ${f.cidade || ''}, ${f.status === 'ativo' ? 'ATIVA' : 'INATIVA'}
        ) RETURNING *
      `;
      return res.status(201).json({ success: true, data: result[0] });
    }
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { id } = req.query;
      const f = req.body;
      const comodosStr = Array.isArray(f.comodos_interesse) ? f.comodos_interesse.join(', ') : (f.comodos_interesse || null);
      
      const result = await sql`
        UPDATE clients SET 
          nome = COALESCE(${f.nome}, nome), 
          cpf = COALESCE(${f.cpf}, cpf), 
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
          municipio = COALESCE(${f.cidade}, municipio),
          situacao_cadastral = COALESCE(${f.status === 'ativo' ? 'ATIVA' : f.status === 'inativo' ? 'INATIVA' : null}, situacao_cadastral)
        WHERE id = ${id} RETURNING *
      `;
      return res.status(200).json({ success: true, data: result[0] });
    }
    if (req.method === 'DELETE') {
      await sql`DELETE FROM clients WHERE id = ${req.query.id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleKanban(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method === 'GET') {
      const result = await sql`
        SELECT 
          k.*,
          o.valor_final as valor_orcamento_atual
        FROM kanban_items k
        LEFT JOIN (
          SELECT DISTINCT ON (projeto_id) valor_final, projeto_id
          FROM orcamentos
          ORDER BY projeto_id, criado_em DESC
        ) o ON k.id::text = o.projeto_id::text
        ORDER BY k.updated_at DESC
      `;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const f = req.body;
      const tag = f.type === 'project' ? `PRJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null;
      const r = await sql`INSERT INTO kanban_items (title, subtitle, label, status, type, contact_name, contact_role, email, phone, city, state, value, temperature, visit_date, visit_time, visit_type, observations, tag) VALUES (${f.title}, ${f.subtitle}, ${f.label}, ${f.status}, ${f.type}, ${f.contact_name}, ${f.contact_role}, ${f.email}, ${f.phone}, ${f.city}, ${f.state}, ${f.value}, ${f.temperature}, ${f.visit_date}, ${f.visit_time}, ${f.visit_type}, ${f.observations}, ${tag}) RETURNING *`;
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
        WHERE id = ${req.query.id} 
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: r[0] });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleGoals(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method === 'GET') {
      const result = await sql`SELECT period, amount FROM monthly_goals ORDER BY period ASC`;
      const goals: Record<string, number> = {};
      result.forEach((r: { period: string; amount: string }) => goals[r.period] = parseFloat(r.amount));
      return res.status(200).json({ success: true, data: goals });
    }
    if (req.method === 'POST') {
      const r = await sql`INSERT INTO monthly_goals (period, amount) VALUES (${req.body.period}, ${req.body.amount}) ON CONFLICT (period) DO UPDATE SET amount = ${req.body.amount}, updated_at = CURRENT_TIMESTAMP RETURNING *`;
      return res.status(200).json({ success: true, data: r[0] });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
