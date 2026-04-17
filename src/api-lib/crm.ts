import { sql, validateAuth } from './_db.js';
import { ApiResponse, Client, KanbanItem } from './types.js';

export async function handleClients(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const { nome, cpf, telefone, email, endereco, bairro, cidade, uf, tipo_imovel, comodos_interesse, origem, observacoes, status, razao_social } = req.body;
      const comodosStr = Array.isArray(comodos_interesse) ? comodos_interesse.join(', ') : (comodos_interesse || '');
      const result = await sql`INSERT INTO clients (nome, cpf, telefone, email, endereco, bairro, cidade, uf, tipo_imovel, comodos_interesse, origem, observacoes, status, razao_social, cnpj, municipio, situacao_cadastral) VALUES (${nome}, ${cpf}, ${telefone}, ${email}, ${endereco}, ${bairro}, ${cidade}, ${uf}, ${tipo_imovel}, ${comodosStr}, ${origem}, ${observacoes}, ${status || 'ativo'}, ${razao_social || nome}, ${cpf}, ${cidade}, ${status === 'ativo' ? 'ATIVA' : 'INATIVA'}) RETURNING *`;
      return res.status(201).json({ success: true, data: result[0] });
    }
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const f = req.body;
      const comodosStr = Array.isArray(f.comodos_interesse) ? f.comodos_interesse.join(', ') : (f.comodos_interesse || null);
      const result = await sql`UPDATE clients SET nome = COALESCE(${f.nome}, nome), cpf = COALESCE(${f.cpf}, cpf), telefone = COALESCE(${f.telefone}, telefone), email = COALESCE(${f.email}, email), endereco = COALESCE(${f.endereco}, endereco), bairro = COALESCE(${f.bairro}, bairro), cidade = COALESCE(${f.cidade}, cidade), uf = COALESCE(${f.uf}, uf), tipo_imovel = COALESCE(${f.tipo_imovel}, tipo_imovel), comodos_interesse = COALESCE(${comodosStr}, comodos_interesse), origem = COALESCE(${f.origem}, origem), observacoes = COALESCE(${f.observacoes}, observacoes), status = COALESCE(${f.status}, status), razao_social = COALESCE(${f.razao_social}, razao_social) WHERE id = ${id} RETURNING *`;
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
      const result = await sql`SELECT * FROM kanban_items ORDER BY updated_at DESC`;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const f = req.body;
      const r = await sql`INSERT INTO kanban_items (title, subtitle, label, status, type, contact_name, contact_role, email, phone, city, state, value, temperature, visit_date, visit_time, visit_type, observations) VALUES (${f.title}, ${f.subtitle}, ${f.label}, ${f.status}, ${f.type}, ${f.contact_name}, ${f.contact_role}, ${f.email}, ${f.phone}, ${f.city}, ${f.state}, ${f.value}, ${f.temperature}, ${f.visit_date}, ${f.visit_time}, ${f.visit_type}, ${f.observations}) RETURNING *`;
      return res.status(201).json({ success: true, data: r[0] });
    }
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const r = await sql`UPDATE kanban_items SET status = ${req.body.status}, updated_at = CURRENT_TIMESTAMP WHERE id = ${req.query.id} RETURNING *`;
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
