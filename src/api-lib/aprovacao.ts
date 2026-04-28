import { sql, validateAuth } from './_db.js';

export async function handleAprovacao(req: any, res: any) {
  try {
    const { method } = req;
    const { token } = req.query;

    // Rota pública para buscar orçamento pelo token
    if (method === 'GET' && token) {
      const orc = (await sql`
        SELECT o.*, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone
        FROM orcamentos o
        JOIN clients c ON o.cliente_id::text = c.id::text
        WHERE o.token_aprovacao = ${token}
      `)[0];

      if (!orc) return res.status(404).json({ success: false, error: 'Proposta não encontrada ou link expirado' });

      const itms = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${orc.id} ORDER BY id ASC`;
      const condicao = orc.condicao_pagamento_id ? (await sql`SELECT * FROM condicoes_pagamento WHERE id = ${orc.condicao_pagamento_id}`)[0] : null;

      return res.status(200).json({ success: true, data: { ...orc, itens: itms, condicao } });
    }

    // Gerar link (Protegido)
    if (method === 'POST' && req.url.includes('gerar')) {
      const { authorized, error } = validateAuth(req);
      if (!authorized) return res.status(401).json({ success: false, error });

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
        WHERE id = ${orcamento_id}
        RETURNING *
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
