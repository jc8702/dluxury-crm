import { sql, validateAuth } from './_db.js';

export async function handleAprovacao(req: any, res: any) {
  try {
    const { method } = req;
    const { token } = req.query;

    // Rota pública para buscar orçamento pelo token
    if (method === 'GET' && token) {
      const orc = (await sql`
        SELECT o.id, o.cliente_id, o.projeto_id, o.numero, o.status, o.valor_base, o.taxa_mensal, o.condicao_pagamento_id, o.valor_final, o.prazo_entrega_dias, o.prazo_tipo, o.adicional_urgencia_pct, o.observacoes, o.materiais_consumidos, o.created_at, o.updated_at, o.token_aprovacao, o.url_aprovacao, o.aprovado_em, o.aprovado_ip, o.aprovado_nome, o.recusado_em, o.motivo_recusa, o.tenant_id, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone
        FROM orcamentos o
        JOIN clients c ON o.cliente_id::text = c.id::text AND c.tenant_id = o.tenant_id
        WHERE o.token_aprovacao = ${token}      `)[0];

      if (!orc) return res.status(404).json({ success: false, error: 'Proposta não encontrada ou link expirado' });

      const itms = await sql`SELECT id, orcamento_id, descricao, ambiente, largura_cm, altura_cm, profundidade_cm, material, acabamento, quantidade, valor_unitario, valor_total, erp_product_id, erp_parametros, created_at, updated_at FROM itens_orcamento WHERE orcamento_id = ${orc.id} AND tenant_id = ${orc.tenant_id} ORDER BY id ASC`;
      const condicao = orc.condicao_pagamento_id ? (await sql`SELECT id, nome, parcelas FROM condicoes_pagamento WHERE id = ${orc.condicao_pagamento_id} AND tenant_id = ${orc.tenant_id}`)[0] : null;

      return res.status(200).json({ success: true, data: { ...orc, itens: itms, condicao } });
    }

    // Gerar link (Protegido)
    if (method === 'POST' && req.url.includes('gerar')) {
      const auth = validateAuth(req);
      if (!auth.authorized) return res.status(401).json({ success: false, error: auth.error || 'Não autorizado' });
      const tenantId = auth.user?.tenantId || '00000000-0000-0000-0000-000000000000';

      const { orcamento_id } = req.body;
      const newToken = crypto.randomUUID();
      const origin = req.headers.origin || 'https://dluxury-crm.vercel.app';
      const url = `${origin}/aprovar/${newToken}`;

      const result = await sql`
        UPDATE orcamentos SET
          token_aprovacao = ${newToken},
          url_aprovacao = ${url},
          status = 'enviado',
          updated_at = NOW()
        WHERE id = ${orcamento_id} AND tenant_id = ${tenantId}
        RETURNING id, numero, token_aprovacao, url_aprovacao, status, updated_at
      `;

      return res.status(200).json({ success: true, data: result[0] });
    }

    // Aprovar (Público)
    if (method === 'POST' && req.url.includes('aprovar')) {
      const { nome } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      const result = await sql`
        UPDATE orcamentos SET
          status = 'aprovado',
          aprovado_em = NOW(),
          aprovado_ip = ${ip},
          aprovado_nome = ${nome},
          updated_at = NOW()
        WHERE token_aprovacao = ${token}
        RETURNING id, numero
      `;

      if (result.length === 0) return res.status(404).json({ success: false, error: 'Erro ao aprovar proposta' });

      return res.status(200).json({ success: true, data: result[0] });
    }

    // Recusar (Público)
    if (method === 'POST' && req.url.includes('recusar')) {
      const { motivo } = req.body;
      await sql`
        UPDATE orcamentos SET
          status = 'revisao_solicitada',
          recusado_em = NOW(),
          motivo_recusa = ${motivo},
          updated_at = NOW()
        WHERE token_aprovacao = ${token}
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
