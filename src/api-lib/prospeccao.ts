import { sql, validateAuth, auditLog } from './_db.js';

// ─── PROSPECÇÕES CRUD ────────────────────────────────────────────────────────

export async function handleProspeccoes(req: any, res: any) {
  try {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';

    if (req.method === 'GET') {
      const { status, origem, temperatura, search, page = '1', limit = '30' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const filters: string[] = ['p.deleted_at IS NULL', `p.tenant_id = '${tenantId}'`];
      if (status) filters.push(`p.status = '${status}'`);
      if (origem) filters.push(`p.origem = '${origem}'`);
      if (temperatura) filters.push(`p.temperatura = '${temperatura}'`);
      if (search) {
        const s = search.replace(/'/g, "''");
        filters.push(
          `(p.nome ILIKE '%${s}%' OR p.telefone ILIKE '%${s}%' OR p.email ILIKE '%${s}%')`,
        );
      }

      const where = filters.join(' AND ');

      const [rows, countResult] = await Promise.all([
        sql(
          `
          SELECT p.*,
            (SELECT json_agg(i ORDER BY i.data_interacao DESC)
             FROM interacoes_prospeccao i
             WHERE i.prospeccao_id = p.id
             LIMIT 5) AS ultimas_interacoes
          FROM prospeccoes p
          WHERE ${where}
          ORDER BY p.updated_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${offset}
        ` as any,
        ),
        sql(`SELECT COUNT(*) AS total FROM prospeccoes p WHERE ${where}` as any),
      ]);

      return res.status(200).json({
        success: true,
        data: rows,
        meta: {
          total: parseInt(countResult[0]?.total || '0'),
          page: parseInt(page),
          limit: parseInt(limit),
        },
      });
    }

    if (req.method === 'POST') {
      const f = req.body;
      if (!f.nome?.trim()) {
        return res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
      }

      const result = await sql`
        INSERT INTO prospeccoes (
          tenant_id, nome, telefone, email, cidade, uf,
          status, temperatura, origem, interesse,
          orcamento_estimado, prazo_desejado_dias,
          responsavel_id, responsavel_nome,
          budget, authority, need, timeline,
          observacoes
        ) VALUES (
          ${tenantId}, ${f.nome}, ${f.telefone || null}, ${f.email || null},
          ${f.cidade || null}, ${f.uf || null},
          ${f.status || 'novo_contato'}, ${f.temperatura || 'frio'}, ${f.origem || 'outro'},
          ${f.interesse || null}, ${f.orcamento_estimado || null}, ${f.prazo_desejado_dias || null},
          ${user?.id || null}, ${user?.name || null},
          ${!!f.budget}, ${!!f.authority}, ${!!f.need}, ${!!f.timeline},
          ${f.observacoes || null}
        ) RETURNING *
      `;

      // Registrar a primeira interação
      await sql`
        INSERT INTO interacoes_prospeccao (prospeccao_id, tenant_id, tipo, titulo, status_novo, realizado_por)
        VALUES (${result[0].id}, ${tenantId}, 'criacao', 'Lead criado', ${result[0].status}, ${user?.name || 'Sistema'})
      `;

      await auditLog('prospeccoes', result[0].id, 'CREATE', user?.id, null, result[0]);
      return res.status(201).json({ success: true, data: result[0] });
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error('[Prospeccoes] Erro:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro interno' });
  }
}

// ─── PROSPECÇÃO INDIVIDUAL (GET / PATCH / DELETE) ────────────────────────────

export async function handleProspeccaoById(req: any, res: any) {
  try {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
    const { id } = req.query;

    if (req.method === 'GET') {
      const [prosp, interacoes] = await Promise.all([
        sql`SELECT * FROM prospeccoes WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL`,
        sql`SELECT * FROM interacoes_prospeccao WHERE prospeccao_id = ${id} ORDER BY data_interacao DESC`,
      ]);
      if (!prosp.length)
        return res.status(404).json({ success: false, error: 'Prospecção não encontrada' });
      return res.status(200).json({ success: true, data: { ...prosp[0], interacoes } });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const f = req.body;
      const before =
        await sql`SELECT * FROM prospeccoes WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!before.length)
        return res.status(404).json({ success: false, error: 'Prospecção não encontrada' });

      const statusChanged = f.status && f.status !== before[0].status;
      const isGanho = f.status === 'ganho';

      const result = await sql`
        UPDATE prospeccoes SET
          nome = COALESCE(${f.nome ?? null}, nome),
          telefone = COALESCE(${f.telefone ?? null}, telefone),
          email = COALESCE(${f.email ?? null}, email),
          cidade = COALESCE(${f.cidade ?? null}, cidade),
          uf = COALESCE(${f.uf ?? null}, uf),
          status = COALESCE(${f.status ?? null}, status),
          temperatura = COALESCE(${f.temperatura ?? null}, temperatura),
          origem = COALESCE(${f.origem ?? null}, origem),
          interesse = COALESCE(${f.interesse ?? null}, interesse),
          orcamento_estimado = COALESCE(${f.orcamento_estimado ?? null}, orcamento_estimado),
          prazo_desejado_dias = COALESCE(${f.prazo_desejado_dias ?? null}, prazo_desejado_dias),
          budget = COALESCE(${f.budget ?? null}, budget),
          authority = COALESCE(${f.authority ?? null}, authority),
          need = COALESCE(${f.need ?? null}, need),
          timeline = COALESCE(${f.timeline ?? null}, timeline),
          motivo_perda = COALESCE(${f.motivo_perda ?? null}, motivo_perda),
          concorrente_perdeu = COALESCE(${f.concorrente_perdeu ?? null}, concorrente_perdeu),
          observacoes = COALESCE(${f.observacoes ?? null}, observacoes),
          cliente_id = COALESCE(${f.cliente_id ?? null}, cliente_id),
          projeto_id = COALESCE(${f.projeto_id ?? null}, projeto_id),
          convertido_em = COALESCE(${isGanho ? new Date().toISOString() : null}, convertido_em),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;

      // Registrar interação se houve mudança de status
      if (statusChanged) {
        await sql`
          INSERT INTO interacoes_prospeccao (prospeccao_id, tenant_id, tipo, titulo, descricao, status_anterior, status_novo, realizado_por)
          VALUES (
            ${id}, ${tenantId}, 'mudanca_status',
            ${`Status alterado para ${f.status}`},
            ${f.observacoes_interacao || null},
            ${before[0].status}, ${f.status},
            ${user?.name || 'Sistema'}
          )
        `;
      }

      await auditLog('prospeccoes', id, 'UPDATE', user?.id, before[0], result[0]);
      return res.status(200).json({ success: true, data: result[0] });
    }

    if (req.method === 'DELETE') {
      const before =
        await sql`SELECT * FROM prospeccoes WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!before.length)
        return res.status(404).json({ success: false, error: 'Prospecção não encontrada' });
      await sql`UPDATE prospeccoes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ${id} AND tenant_id = ${tenantId}`;
      await auditLog('prospeccoes', id, 'DELETE', user?.id, before[0], null);
      return res.status(200).json({ success: true });
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error('[ProspeccaoById] Erro:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro interno' });
  }
}

// ─── INTERAÇÕES ──────────────────────────────────────────────────────────────

export async function handleInteracoes(req: any, res: any) {
  try {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
    const { prospeccao_id } = req.query;

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM interacoes_prospeccao
        WHERE prospeccao_id = ${prospeccao_id} AND tenant_id = ${tenantId}
        ORDER BY data_interacao DESC
      `;
      return res.status(200).json({ success: true, data: rows });
    }

    if (req.method === 'POST') {
      const f = req.body;
      if (!f.tipo)
        return res.status(400).json({ success: false, error: 'Tipo da interação é obrigatório.' });

      const result = await sql`
        INSERT INTO interacoes_prospeccao (prospeccao_id, tenant_id, tipo, titulo, descricao, realizado_por, data_interacao)
        VALUES (
          ${prospeccao_id}, ${tenantId}, ${f.tipo}, ${f.titulo || null},
          ${f.descricao || null}, ${user?.name || 'Sistema'},
          ${f.data_interacao || new Date().toISOString()}
        ) RETURNING *
      `;

      // Atualizar updated_at da prospecção
      await sql`UPDATE prospeccoes SET updated_at = CURRENT_TIMESTAMP WHERE id = ${prospeccao_id} AND tenant_id = ${tenantId}`;

      return res.status(201).json({ success: true, data: result[0] });
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error('[Interacoes] Erro:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro interno' });
  }
}

// ─── MÉTRICAS / FUNIL ────────────────────────────────────────────────────────

export async function handleProspeccaoMetrics(req: any, res: any) {
  try {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';

    const [funil, taxas, origens] = await Promise.all([
      sql`
        SELECT status, COUNT(*) as total, SUM(orcamento_estimado) as valor_total
        FROM prospeccoes
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        GROUP BY status
        ORDER BY total DESC
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'ganho') AS ganhos,
          COUNT(*) FILTER (WHERE status = 'perdido') AS perdidos,
          COUNT(*) FILTER (WHERE status NOT IN ('ganho','perdido','desqualificado')) AS ativos,
          COUNT(*) AS total,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) FILTER (WHERE status = 'ganho') AS ciclo_medio_dias,
          AVG(orcamento_estimado) FILTER (WHERE status = 'ganho') AS ticket_medio
        FROM prospeccoes
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `,
      sql`
        SELECT origem, COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'ganho') AS ganhos
        FROM prospeccoes
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        GROUP BY origem ORDER BY total DESC
      `,
    ]);

    const t = taxas[0] || {};
    const taxaConversao = t.total > 0 ? (parseInt(t.ganhos) / parseInt(t.total)) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        funil,
        resumo: {
          total: parseInt(t.total || '0'),
          ganhos: parseInt(t.ganhos || '0'),
          perdidos: parseInt(t.perdidos || '0'),
          ativos: parseInt(t.ativos || '0'),
          taxaConversao: parseFloat(taxaConversao.toFixed(1)),
          cicloMedioDias: t.ciclo_medio_dias
            ? parseFloat(parseFloat(t.ciclo_medio_dias).toFixed(1))
            : null,
          ticketMedio: t.ticket_medio ? parseFloat(t.ticket_medio) : null,
        },
        origens,
      },
    });
  } catch (err: any) {
    console.error('[ProspeccaoMetrics] Erro:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro interno' });
  }
}
