import { sql } from './_db.js';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';

const handleCalendarioCore: TenantHandler = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.tenantUser;
    const method = req.method;
    const url = req.url || '';

    if (method === 'GET' && url.includes('/eventos')) {
      const { mes, ano, filtro_tipo } = req.query;

      if (!mes || !ano) {
        return res.status(400).json({ success: false, error: 'Mês e ano são obrigatórios' });
      }

      const mesNum = parseInt(mes);
      const anoNum = parseInt(ano);

      // 1. Buscar eventos manuais
      let queryStr = `
        SELECT 
          ec.id::text,
          ec.titulo,
          ec.descricao,
          ec.data_evento::text as data_evento,
          ec.hora_evento,
          ec.tipo_evento,
          ec.cor_categoria,
          ec.concluido,
          ec.quotation_id,
          ec.operacao_prod_id
        FROM eventos_calendario ec
        WHERE ec.tenant_id = $1::uuid
          AND EXTRACT(MONTH FROM ec.data_evento) = $2
          AND EXTRACT(YEAR FROM ec.data_evento) = $3
      `;

      const params: any[] = [tenantId, mesNum, anoNum];

      if (filtro_tipo) {
        queryStr += ` AND ec.tipo_evento = $4`;
        params.push(filtro_tipo);
      }

      const dbEventos = await sql(queryStr as any, ...params);

      const eventosList = dbEventos.map((e: any) => ({
        id: `manual-${e.id}`,
        titulo: e.titulo,
        descricao: e.descricao || '',
        data_evento: e.data_evento,
        hora_evento: e.hora_evento || undefined,
        tipo_evento: e.tipo_evento,
        cor_categoria: e.cor_categoria,
        concluido: !!e.concluido,
        quotation_id: e.quotation_id,
        operacao_prod_id: e.operacao_prod_id,
      }));

      // 1.5 Buscar compromissos/visitas da tabela `eventos`
      const queryAgendaStr = `
        SELECT 
          e.id::text,
          e.titulo,
          e.descricao,
          e.data_inicio::text as data_inicio,
          e.tipo,
          e.cor,
          e.cliente_id,
          c.nome as cliente_nome
        FROM eventos e
        LEFT JOIN clients c ON e.cliente_id::text = c.id::text AND c.tenant_id = e.tenant_id
        WHERE e.tenant_id = $1::uuid
          AND EXTRACT(MONTH FROM e.data_inicio) = $2
          AND EXTRACT(YEAR FROM e.data_inicio) = $3
      `;

      const agendaParams: any[] = [tenantId, mesNum, anoNum];
      const dbAgenda = await sql(queryAgendaStr as any, ...agendaParams);

      dbAgenda.forEach((e: any) => {
        const tipoEventoMapped = e.tipo === 'visita' || e.tipo === 'reuniao' ? 'reuniao' : 'tarefa';

        if (filtro_tipo && filtro_tipo !== tipoEventoMapped) {
          return;
        }

        let dateStr = '';
        let timeStr = undefined;
        if (e.data_inicio) {
          const parts = e.data_inicio.split(' ');
          dateStr = parts[0];
          if (parts[1]) {
            timeStr = parts[1].substring(0, 5);
          } else if (e.data_inicio.includes('T')) {
            const isoParts = e.data_inicio.split('T');
            dateStr = isoParts[0];
            timeStr = isoParts[1].substring(0, 5);
          }
        }

        eventosList.push({
          id: `agenda-${e.id}`,
          titulo: e.titulo,
          descricao: e.descricao || '',
          data_evento: dateStr,
          hora_evento: timeStr,
          tipo_evento: tipoEventoMapped,
          cor_categoria: e.cor || '#d4af37',
          concluido: false,
          cliente_nome: e.cliente_nome || undefined,
        });
      });

      // 2. Adicionar prazos de entrega de OPs se não houver filtro ou se for filtro = 'prazo_entrega'
      if (!filtro_tipo || filtro_tipo === 'prazo_entrega') {
        const ops = await sql`
          SELECT 
            op.id::text,
            op.numero_op,
            op.data_prazo::text as data_prazo,
            op.status,
            c.nome as cliente_nome
          FROM ordens_prod op
          JOIN quotations o ON op.quotation_id = o.id
          LEFT JOIN clients c ON o.cliente_id::text = c.id::text AND c.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}::uuid
            AND op.data_prazo IS NOT NULL
            AND EXTRACT(MONTH FROM op.data_prazo) = ${mesNum}
            AND EXTRACT(YEAR FROM op.data_prazo) = ${anoNum}
        `;

        ops.forEach((op: any) => {
          eventosList.push({
            id: `op-${op.id}`,
            titulo: `Prazo OP: ${op.numero_op} (${op.cliente_nome || 'Cliente avulso'})`,
            descricao: `Ordem de produção com status: ${op.status}`,
            data_evento: op.data_prazo,
            tipo_evento: 'prazo_entrega',
            cor_categoria: '#DC2626', // Vermelho
            concluido: op.status === 'concluído',
            operacao_prod_id: op.id,
          });
        });
      }

      // 3. Adicionar prazos de orçamentos se não houver filtro ou se for filtro = 'quotation'
      if (!filtro_tipo || filtro_tipo === 'quotation') {
        const budgets = await sql`
          SELECT 
            o.id::text,
            o.numero_orcamento,
            o.data_orcamento,
            o.prazo_entrega_dias,
            c.nome as cliente_nome
          FROM quotations o
          LEFT JOIN clients c ON o.cliente_id::text = c.id::text AND c.tenant_id = o.tenant_id
          WHERE o.tenant_id = ${tenantId}::uuid
            AND LOWER(o.status) = 'aprovado'
            AND o.data_orcamento IS NOT NULL
        `;

        budgets.forEach((b: any) => {
          const dateObj = new Date(b.data_orcamento);
          if (b.prazo_entrega_dias) {
            dateObj.setDate(dateObj.getDate() + parseInt(b.prazo_entrega_dias));
          }

          const eventMonth = dateObj.getMonth() + 1;
          const eventYear = dateObj.getFullYear();

          if (eventMonth === mesNum && eventYear === anoNum) {
            const formattedDate = dateObj.toISOString().split('T')[0];
            eventosList.push({
              id: `quotation-${b.id}`,
              titulo: `Entrega Proposta: ${b.numero_orcamento} (${b.cliente_nome || 'Cliente avulso'})`,
              descricao: `Prazo contratual calculado de entrega do pedido`,
              data_evento: formattedDate,
              tipo_evento: 'quotation',
              cor_categoria: '#3B82F6', // Azul
              concluido: false,
              quotation_id: b.id,
            });
          }
        });
      }

      return res.status(200).json({ success: true, eventos: eventosList });
    }

    if (method === 'POST' && url.includes('/criar-evento')) {
      const {
        titulo,
        descricao,
        data_evento,
        hora_evento,
        tipo_evento,
        quotation_id,
        operacao_prod_id,
        notificacao_dias_antes,
        cor_categoria,
      } = req.body;

      if (!titulo || !data_evento || !tipo_evento) {
        return res
          .status(400)
          .json({ success: false, error: 'Título, data e tipo são obrigatórios' });
      }

      const [evento] = await sql`
        INSERT INTO eventos_calendario (
          usuario_id, tipo_evento, titulo, descricao, data_evento, hora_evento, 
          quotation_id, operacao_prod_id, cor_categoria, notificacao_dias_antes, tenant_id
        ) VALUES (
          ${user.id}::uuid, ${tipo_evento}, ${titulo}, ${descricao || null}, ${data_evento}, ${hora_evento || null}, 
          ${quotation_id || null}::uuid, ${operacao_prod_id || null}::uuid, ${cor_categoria || '#3B82F6'}, ${notificacao_dias_antes || 0}, ${tenantId}::uuid
        ) RETURNING *
      `;

      if (notificacao_dias_antes && parseInt(notificacao_dias_antes) > 0) {
        await sql`
          INSERT INTO notificacoes_calendario (evento_calendario_id, tipo_notificacao, mensagem, tenant_id)
          VALUES (${evento.id}, 'push', ${`Lembrete: O evento "${titulo}" está próximo. (${data_evento})`}, ${tenantId}::uuid)
        `;
      }

      return res.status(201).json({ success: true, evento });
    }

    if (method === 'POST' && url.includes('/gerar-automatico')) {
      const { quotation_id } = req.body;

      if (!quotation_id) {
        return res.status(400).json({ success: false, error: 'ID do orçamento é obrigatório' });
      }

      const [quotation] = await sql`
        SELECT o.*, c.nome as cliente_nome
        FROM quotations o
        LEFT JOIN clients c ON o.cliente_id::text = c.id::text AND c.tenant_id = o.tenant_id
        WHERE o.id = ${quotation_id}::uuid AND o.tenant_id = ${tenantId}::uuid
      `;

      if (!quotation) {
        return res
          .status(404)
          .json({ success: false, error: 'Orçamento não encontrado no tenant' });
      }

      const usuarios = await sql`
        SELECT id FROM users 
        WHERE tenant_id = ${tenantId}::uuid
      `;

      const dataEvento = new Date(quotation.data_orcamento || new Date());
      if (quotation.prazo_entrega_dias) {
        dataEvento.setDate(dataEvento.getDate() + parseInt(quotation.prazo_entrega_dias));
      }

      const formattedDate = dataEvento.toISOString().split('T')[0];

      for (const u of usuarios) {
        await sql`
          INSERT INTO eventos_calendario (
            usuario_id, tipo_evento, titulo, descricao, data_evento, quotation_id, cor_categoria, notificacao_dias_antes, tenant_id
          ) VALUES (
            ${u.id}::uuid, 'quotation', ${`Entrega Pedido: ${quotation.numero_orcamento}`}, 
            ${`Prazo contratual de entrega para o cliente ${quotation.cliente_nome || ''}`}, 
            ${formattedDate}, ${quotation_id}::uuid, '#3B82F6', 3, ${tenantId}::uuid
          )
        `;
      }

      return res.status(200).json({ success: true, eventos_criados: usuarios.length });
    }

    if (method === 'GET' && url.includes('/verificar-lembretes')) {
      const eventosProximos = await sql`
        SELECT ec.*, u.email as usuario_email, u.name as usuario_nome
        FROM eventos_calendario ec
        JOIN users u ON ec.usuario_id = u.id
        WHERE ec.notificacao_enviada = FALSE
          AND ec.notificacao_dias_antes > 0
          AND ec.data_evento <= CURRENT_DATE + ec.notificacao_dias_antes
          AND ec.tenant_id = ${tenantId}::uuid
      `;

      for (const ev of eventosProximos) {
        const msg = `Lembrete: O evento "${ev.titulo}" vence em ${ev.notificacao_dias_antes} dias (${ev.data_evento})`;

        await sql`
          INSERT INTO notificacoes_calendario (evento_calendario_id, tipo_notificacao, mensagem, tenant_id)
          VALUES (${ev.id}, 'email', ${msg}, ${tenantId}::uuid)
        `;

        await sql`
          UPDATE eventos_calendario
          SET notificacao_enviada = TRUE
          WHERE id = ${ev.id} AND tenant_id = ${tenantId}::uuid
        `;
      }

      return res
        .status(200)
        .json({ success: true, notificacoes_disparadas: eventosProximos.length });
    }

    if (method === 'PATCH' && req.query.id) {
      const { concluido, cor_categoria } = req.body;
      const [updated] = await sql`
        UPDATE eventos_calendario
        SET concluido = COALESCE(${concluido}, concluido),
            cor_categoria = COALESCE(${cor_categoria}, cor_categoria),
            updated_at = NOW()
        WHERE id = ${parseInt(req.query.id)} AND tenant_id = ${tenantId}::uuid
        RETURNING *
      `;
      if (!updated) return res.status(404).json({ success: false, error: 'Evento não encontrado' });
      return res.status(200).json({ success: true, data: updated });
    }

    if (method === 'DELETE' && req.query.id) {
      await sql`
        DELETE FROM eventos_calendario
        WHERE id = ${parseInt(req.query.id)} AND tenant_id = ${tenantId}::uuid
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    console.error('[CALENDARIO_ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const handleCalendario = withTenant(handleCalendarioCore);
