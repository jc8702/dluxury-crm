import { sql, validateAuth, auditLog } from './_db.js';

export async function handleKanbanProducao(req: any, res: any) {
  try {
    const { authorized, error, user } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';
    const method = req.method;
    const url = req.url || '';

    if (method === 'GET' && url.includes('/board')) {
      const { filtro_responsavel, filtro_prioridade, filtro_ambiente, busca } = req.query;

      // Base query
      let queryStr = `
        SELECT 
          ep.id,
          ep.status_kanban,
          ep.etapa_nome,
          ep.etapa_numero,
          op.id as operacao_prod_id,
          op.numero_op,
          o.id as orcamento_id,
          o.numero_orcamento,
          c.nome as cliente_nome,
          op.prioridade,
          op.environment,
          ep.data_inicio,
          ep.data_conclusao,
          ep.responsavel_id,
          u.name as responsavel_nome,
          ep.created_at,
          ep.updated_at
        FROM etapas_prod_kanban ep
        JOIN ordens_prod op ON ep.operacao_prod_id = op.id
        JOIN orcamentos_pro o ON op.orcamento_id = o.id
        LEFT JOIN clients c ON o.cliente_id::text = c.id::text AND c.tenant_id = o.tenant_id
        LEFT JOIN users u ON ep.responsavel_id = u.id
        WHERE ep.tenant_id = $1::uuid
      `;

      const params: any[] = [tenantId];
      let paramCount = 1;

      if (filtro_responsavel) {
        paramCount++;
        queryStr += ` AND ep.responsavel_id = $${paramCount}::uuid`;
        params.push(filtro_responsavel);
      }

      if (filtro_prioridade) {
        paramCount++;
        queryStr += ` AND op.prioridade = $${paramCount}::integer`;
        params.push(parseInt(filtro_prioridade));
      }

      if (filtro_ambiente) {
        paramCount++;
        queryStr += ` AND op.environment = $${paramCount}`;
        params.push(filtro_ambiente);
      }

      if (busca) {
        paramCount++;
        queryStr += ` AND (op.numero_op ILIKE $${paramCount} OR c.nome ILIKE $${paramCount})`;
        params.push(`%${busca}%`);
      }

      queryStr += ` ORDER BY op.prioridade ASC, ep.etapa_numero ASC`;

      const cards = await sql(queryStr as any, ...params);

      // Agrupar por status_kanban
      const board: Record<string, any[]> = {
        a_fazer: [],
        em_progresso: [],
        bloqueado: [],
        concluido: []
      };

      cards.forEach((card: any) => {
        const status = card.status_kanban;
        if (board[status]) {
          board[status].push(card);
        } else {
          board.a_fazer.push(card);
        }
      });

      return res.status(200).json({ success: true, data: board });
    }

    if (method === 'POST' && url.includes('/move-card')) {
      const { etapa_kanban_id, novo_status, status_anterior, nota } = req.body;

      if (!etapa_kanban_id || !novo_status) {
        return res.status(400).json({ success: false, error: 'Parâmetros insuficientes' });
      }

      const statusValidos = ['a_fazer', 'em_progresso', 'bloqueado', 'concluido'];
      if (!statusValidos.includes(novo_status)) {
        return res.status(400).json({ success: false, error: 'Status inválido' });
      }

      // 1. Atualizar status na tabela etapas_prod_kanban
      const [etapa] = await sql`
        UPDATE etapas_prod_kanban 
        SET status_kanban = ${novo_status}, 
            updated_at = NOW(),
            data_inicio = COALESCE(data_inicio, CASE WHEN ${novo_status} = 'em_progresso' THEN CURRENT_DATE ELSE NULL END),
            data_conclusao = CASE WHEN ${novo_status} = 'concluido' THEN CURRENT_DATE ELSE data_conclusao END
        WHERE id = ${etapa_kanban_id} AND tenant_id = ${tenantId}::uuid
        RETURNING *
      `;

      if (!etapa) {
        return res.status(404).json({ success: false, error: 'Etapa de produção não encontrada' });
      }

      // 2. Registrar movimento em movimento_kanban (auditoria)
      await sql`
        INSERT INTO movimento_kanban (etapa_kanban_id, status_anterior, status_novo, usuario_id, nota, tenant_id)
        VALUES (${etapa_kanban_id}, ${status_anterior || null}, ${novo_status}, ${user.id}::uuid, ${nota || null}, ${tenantId}::uuid)
      `;

      // 3. Se todas as etapas daquela OP estiverem concluídas, podemos atualizar a ordem de produção geral
      const totalEtapas = await sql`
        SELECT COUNT(*) as count, SUM(CASE WHEN status_kanban = 'concluido' THEN 1 ELSE 0 END) as concluidas
        FROM etapas_prod_kanban
        WHERE operacao_prod_id = ${etapa.operacao_prod_id} AND tenant_id = ${tenantId}::uuid
      `;
      
      if (totalEtapas.length && parseInt(totalEtapas[0].count) === parseInt(totalEtapas[0].concluidas)) {
        await sql`
          UPDATE ordens_prod 
          SET status = 'concluído', data_conclusao = CURRENT_DATE, updated_at = NOW()
          WHERE id = ${etapa.operacao_prod_id} AND tenant_id = ${tenantId}::uuid
        `;
      } else {
        // Se começou pelo menos uma e não terminou todas
        await sql`
          UPDATE ordens_prod 
          SET status = 'produção', data_inicio = COALESCE(data_inicio, CURRENT_DATE), updated_at = NOW()
          WHERE id = ${etapa.operacao_prod_id} AND tenant_id = ${tenantId}::uuid
        `;
      }

      // Auditar ação
      await auditLog('etapas_prod_kanban', String(etapa_kanban_id), 'MOVE_CARD', user.id, { status_anterior }, etapa);

      return res.status(200).json({ success: true, data: etapa });
    }

    if (method === 'PATCH' && url.includes('/card-details')) {
      const { etapa_kanban_id, responsavel_id, nota } = req.body;

      if (!etapa_kanban_id) {
        return res.status(400).json({ success: false, error: 'ID da etapa é obrigatório' });
      }

      const [existing] = await sql`
        SELECT * FROM etapas_prod_kanban 
        WHERE id = ${etapa_kanban_id} AND tenant_id = ${tenantId}::uuid
      `;
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Etapa de produção não encontrada' });
      }

      let etapa = existing;
      if (responsavel_id !== undefined) {
        const [updated] = await sql`
          UPDATE etapas_prod_kanban 
          SET responsavel_id = ${responsavel_id ? responsavel_id : null}::uuid,
              updated_at = NOW()
          WHERE id = ${etapa_kanban_id} AND tenant_id = ${tenantId}::uuid
          RETURNING *
        `;
        if (updated) etapa = updated;
      }

      if (nota) {
        await sql`
          INSERT INTO movimento_kanban (etapa_kanban_id, status_anterior, status_novo, usuario_id, nota, tenant_id)
          VALUES (${etapa_kanban_id}, ${existing.status_kanban}, ${existing.status_kanban}, ${user.id}::uuid, ${nota}, ${tenantId}::uuid)
        `;
      }

      // Retorna histórico atualizado
      const historico = await sql`
        SELECT m.*, u.name as usuario_nome
        FROM movimento_kanban m
        LEFT JOIN users u ON m.usuario_id = u.id
        WHERE m.etapa_kanban_id = ${etapa_kanban_id} AND m.tenant_id = ${tenantId}::uuid
        ORDER BY m.timestamp_movimento DESC
      `;

      return res.status(200).json({ 
        success: true, 
        data: { 
          etapa,
          historico 
        } 
      });
    }

    if (method === 'GET' && url.includes('/card-history')) {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'ID da etapa é obrigatório' });

      const historico = await sql`
        SELECT m.*, u.name as usuario_nome
        FROM movimento_kanban m
        LEFT JOIN users u ON m.usuario_id = u.id
        WHERE m.etapa_kanban_id = ${parseInt(id)} AND m.tenant_id = ${tenantId}::uuid
        ORDER BY m.timestamp_movimento DESC
      `;

      return res.status(200).json({ success: true, data: historico });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    console.error('[KANBAN_PRODUCAO_ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
