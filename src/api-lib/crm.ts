import { sql, auditLog } from './_db.js';
import { db } from './drizzle-db.js';
import { quotations } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';
import { logger } from './logger.js';

const handleClientsCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.tenantUser;
    if (req.method === 'GET') {
      const result = await sql`
        SELECT 
          id, nome, cpf, telefone, email, endereco, bairro,
          COALESCE(cidade, municipio) as cidade,
          uf, tipo_imovel, comodos_interesse, origem, observacoes, 
          status, created_at, razao_social, cnpj, municipio, situacao_cadastral
        FROM clients 
        WHERE deleted_at IS NULL AND tenant_id = ${tenantId} 
        ORDER BY created_at DESC
      `;
      return res.status(200).json({ success: true, data: result });
    }
    if (req.method === 'POST') {
      const f = req.body;

      // Normaliza: aceita camelCase (frontend) e snake_case (legado)
      const nome = f.nome || f.razao_social || '';
      const telefone = f.telefone || '';
      const email = f.email?.trim() || null;
      const endereco = f.endereco || f.logradouro || null;
      const bairro = f.bairro || null;
      const cidade = f.cidade || f.municipio || null;
      const uf = f.uf || null;
      const tipoImovel = f.tipo_imovel || f.tipoImovel || 'casa';
      const origem = f.origem || 'indicacao';
      const observacoes = f.observacoes || f.historico || null;
      const status = f.status || 'ativo';
      const situacao = status === 'ativo' ? 'ATIVA' : 'INATIVA';

      // Normaliza array de cômodos
      const comodosRaw = f.comodos_interesse || f.comodosInteresse || [];
      const comodosStr = Array.isArray(comodosRaw) ? comodosRaw.join(', ') : comodosRaw || null;

      const cpfVal = f.cpf?.trim() || null;
      const cnpjVal = f.cnpj?.trim() || null;

      if (!nome || nome.trim().length < 3) {
        return res
          .status(422)
          .json({ success: false, error: 'O nome do cliente deve ter pelo menos 3 caracteres.' });
      }

      const result = await sql`
        INSERT INTO clients (
          nome, cpf, telefone, email, endereco, bairro, cidade, uf, 
          tipo_imovel, comodos_interesse, origem, observacoes, status, 
          razao_social, cnpj, municipio, situacao_cadastral, tenant_id
        ) VALUES (
          ${nome}, ${cpfVal}, ${telefone}, ${email}, 
          ${endereco}, ${bairro}, ${cidade}, ${uf}, 
          ${tipoImovel}, ${comodosStr}, ${origem}, 
          ${observacoes}, ${status}, ${nome}, 
          ${cnpjVal}, ${cidade}, ${situacao}, ${tenantId}
        ) RETURNING *
      `;
      await auditLog('clients', result[0].id, 'CREATE', user?.id, null, result[0]);
      return res.status(201).json({ success: true, data: result[0] });
    }
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { id } = req.query;
      const f = req.body;

      const before = await sql`SELECT * FROM clients WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!before.length)
        return res.status(404).json({ success: false, error: 'Cliente não encontrado' });

      // Normaliza: aceita camelCase (frontend) e snake_case (legado)
      const cidade = f.cidade ?? f.municipio ?? undefined;
      const tipoImovel = f.tipo_imovel ?? f.tipoImovel ?? undefined;
      const comodosRaw = f.comodos_interesse ?? f.comodosInteresse ?? undefined;
      const comodosStr =
        comodosRaw !== undefined
          ? Array.isArray(comodosRaw)
            ? comodosRaw.join(', ')
            : comodosRaw
          : undefined;

      const cpfVal = f.cpf?.trim() || undefined;
      const cnpjVal = f.cnpj?.trim() || undefined;
      const situacao =
        f.status === 'ativo' ? 'ATIVA' : f.status === 'inativo' ? 'INATIVA' : undefined;

      const result = await sql`
        UPDATE clients SET 
          nome              = COALESCE(${f.nome ?? null}, nome), 
          cpf               = COALESCE(${cpfVal ?? null}, cpf), 
          telefone          = COALESCE(${f.telefone ?? null}, telefone), 
          email             = COALESCE(${f.email ?? null}, email), 
          endereco          = COALESCE(${f.endereco ?? f.logradouro ?? null}, endereco), 
          bairro            = COALESCE(${f.bairro ?? null}, bairro), 
          cidade            = COALESCE(${cidade ?? null}, cidade), 
          uf                = COALESCE(${f.uf ?? null}, uf), 
          tipo_imovel       = COALESCE(${tipoImovel ?? null}, tipo_imovel), 
          comodos_interesse = COALESCE(${comodosStr ?? null}, comodos_interesse), 
          origem            = COALESCE(${f.origem ?? null}, origem), 
          observacoes       = COALESCE(${f.observacoes ?? f.historico ?? null}, observacoes), 
          status            = COALESCE(${f.status ?? null}, status), 
          razao_social      = COALESCE(${f.razao_social ?? f.nome ?? null}, razao_social),
          cnpj              = COALESCE(${cnpjVal ?? null}, cnpj),
          municipio         = COALESCE(${cidade ?? null}, municipio),
          situacao_cadastral = COALESCE(${situacao ?? null}, situacao_cadastral)
        WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *
      `;

      await auditLog('clients', id, 'UPDATE', user?.id, before[0], result[0]);

      return res.status(200).json({ success: true, data: result[0] });
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;

      const before = await sql`SELECT * FROM clients WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!before.length)
        return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
      await sql`UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = ${id} AND tenant_id = ${tenantId}`;
      await sql`UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE (client_id = ${id} OR client_id::text = ${id}) AND tenant_id = ${tenantId}`;
      // Soft delete quotations do cliente usando Drizzle (clients.id é UUID)
      const clienteIdStr = typeof id === 'string' && id ? id : null;
      if (clienteIdStr !== null) {
        await db
          .update(quotations)
          .set({ deletedAt: new Date() })
          .where(and(eq(quotations.clienteId, clienteIdStr), eq(quotations.tenantId, tenantId)));
      }
      await auditLog('clients', id, 'DELETE', user?.id, before[0], { status: 'deleted' });
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    logger.error('[Clients POST] Erro fatal:', err);
    const errMsg = err?.message || String(err);
    const isUnique =
      errMsg.toLowerCase().includes('unique constraint') ||
      errMsg.toLowerCase().includes('duplicate key');

    return res.status(500).json({
      success: false,
      error: isUnique
        ? 'Já existe um registro cadastrado com este identificador (CPF/CNPJ/Código).'
        : errMsg,
    });
  }
};

const handleKanbanCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
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
      const tag =
        f.type === 'project'
          ? `PRJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          : null;
      const r =
        await sql`INSERT INTO kanban_items (title, subtitle, label, status, type, contact_name, contact_role, email, phone, city, state, value, temperature, visit_date, visit_time, visit_type, observations, tag, tenant_id) VALUES (${f.title}, ${f.subtitle}, ${f.label}, ${f.status}, ${f.type}, ${f.contact_name}, ${f.contact_role}, ${f.email}, ${f.phone}, ${f.city}, ${f.state}, ${f.value}, ${f.temperature}, ${f.visit_date}, ${f.visit_time}, ${f.visit_type}, ${f.observations}, ${tag}, ${tenantId}) RETURNING *`;
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
    logger.error('[Kanban] Erro fatal:', err);
    const errMsg = err?.message || String(err);
    const isUnique =
      errMsg.toLowerCase().includes('unique constraint') ||
      errMsg.toLowerCase().includes('duplicate key');

    return res.status(500).json({
      success: false,
      error: isUnique
        ? 'Já existe um registro cadastrado com este identificador (CPF/CNPJ/Código).'
        : errMsg,
    });
  }
};

const handleGoalsCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (req.method === 'GET') {
      const result =
        await sql`SELECT period, amount FROM monthly_goals WHERE tenant_id = ${tenantId} ORDER BY period ASC`;
      const goals: Record<string, number> = {};
      result.forEach(
        (r: { period: string; amount: string }) => (goals[r.period] = parseFloat(r.amount)),
      );
      return res.status(200).json({ success: true, data: goals });
    }
    if (req.method === 'POST') {
      const r =
        await sql`INSERT INTO monthly_goals (period, amount, tenant_id) VALUES (${req.body.period}, ${req.body.amount}, ${tenantId}) ON CONFLICT (period, tenant_id) DO UPDATE SET amount = ${req.body.amount}, updated_at = CURRENT_TIMESTAMP RETURNING *`;
      return res.status(200).json({ success: true, data: r[0] });
    }
    return res.status(405).end();
  } catch (err: any) {
    logger.error('[Goals] Erro fatal:', err);
    const errMsg = err?.message || String(err);
    const isUnique =
      errMsg.toLowerCase().includes('unique constraint') ||
      errMsg.toLowerCase().includes('duplicate key');

    return res.status(500).json({
      success: false,
      error: isUnique
        ? 'Já existe um registro cadastrado com este identificador (CPF/CNPJ/Código).'
        : errMsg,
    });
  }
};

export const handleClients = withTenant(handleClientsCore);
export const handleKanban = withTenant(handleKanbanCore);
export const handleGoals = withTenant(handleGoalsCore);
