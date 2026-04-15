import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });

  if (req.method === 'GET') {
    const { id } = req.query;
    try {
      if (id) {
        const orcamento = await sql`SELECT * FROM orcamentos WHERE id = ${id}`;
        if (orcamento.length === 0) return res.status(404).json({ error: 'Orçamento não encontrado' });
        
        const itens = await sql`SELECT * FROM itens_orcamento WHERE orcamento_id = ${id} ORDER BY id ASC`;
        return res.status(200).json({ ...orcamento[0], itens });
      }

      const orcamentos = await sql`
        SELECT o.*, c.nome as cliente_nome 
        FROM orcamentos o
        LEFT JOIN clients c ON o.cliente_id = c.id
        ORDER BY o.criado_em DESC
      `;
      return res.status(200).json(orcamentos);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { 
      cliente_id, projeto_id, status, valor_base, taxa_mensal, 
      condicao_pagamento_id, valor_final, prazo_entrega_dias, 
      prazo_tipo, adicional_urgencia_pct, observacoes, itens 
    } = req.body;

    try {
      // Gerar número sequencial ORC-2024-XXX
      const year = new Date().getFullYear();
      const lastOrc = await sql`SELECT numero FROM orcamentos WHERE numero LIKE ${`ORC-${year}-%`} ORDER BY numero DESC LIMIT 1`;
      let nextNum = 1;
      if (lastOrc.length > 0) {
        const parts = lastOrc[0].numero.split('-');
        nextNum = parseInt(parts[2]) + 1;
      }
      const numero = `ORC-${year}-${nextNum.toString().padStart(3, '0')}`;

      // Inserir Cabeçalho
      const orc = await sql`
        INSERT INTO orcamentos (
          cliente_id, projeto_id, numero, status, valor_base, taxa_mensal,
          condicao_pagamento_id, valor_final, prazo_entrega_dias,
          prazo_tipo, adicional_urgencia_pct, observacoes
        )
        VALUES (
          ${cliente_id}, ${projeto_id || null}, ${numero}, ${status || 'rascunho'},
          ${valor_base}, ${taxa_mensal}, ${condicao_pagamento_id}, ${valor_final},
          ${prazo_entrega_dias}, ${prazo_tipo || 'padrao'}, ${adicional_urgencia_pct}, ${observacoes || null}
        )
        RETURNING *
      `;

      const orcamentoId = orc[0].id;

      // Inserir Itens
      if (Array.isArray(itens) && itens.length > 0) {
        for (const item of itens) {
          await sql`
            INSERT INTO itens_orcamento (
              orcamento_id, descricao, ambiente, largura_cm, altura_cm, 
              profundidade_cm, material, acabamento, quantidade, 
              valor_unitario, valor_total
            )
            VALUES (
              ${orcamentoId}, ${item.descricao}, ${item.ambiente}, ${item.largura_cm}, 
              ${item.altura_cm}, ${item.profundidade_cm}, ${item.material}, 
              ${item.acabamento}, ${item.quantidade || 1}, ${item.valor_unitario}, ${item.valor_total}
            )
          `;
        }
      }

      return res.status(201).json({ ...orc[0], itens });
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { 
      status, valor_base, taxa_mensal, condicao_pagamento_id, 
      valor_final, prazo_entrega_dias, prazo_tipo, 
      adicional_urgencia_pct, observacoes, itens 
    } = req.body;

    try {
      const orc = await sql`
        UPDATE orcamentos SET
          status = COALESCE(${status}, status),
          valor_base = COALESCE(${valor_base}, valor_base),
          taxa_mensal = COALESCE(${taxa_mensal}, taxa_mensal),
          condicao_pagamento_id = COALESCE(${condicao_pagamento_id}, condicao_pagamento_id),
          valor_final = COALESCE(${valor_final}, valor_final),
          prazo_entrega_dias = COALESCE(${prazo_entrega_dias}, prazo_entrega_dias),
          prazo_tipo = COALESCE(${prazo_tipo}, prazo_tipo),
          adicional_urgencia_pct = COALESCE(${adicional_urgencia_pct}, adicional_urgencia_pct),
          observacoes = COALESCE(${observacoes}, observacoes),
          atualizado_em = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (orc.length === 0) return res.status(404).json({ error: 'Orçamento não encontrado' });

      // Atualizar Itens (simplificado: remove e reinsere)
      if (Array.isArray(itens)) {
        await sql`DELETE FROM itens_orcamento WHERE orcamento_id = ${id}`;
        for (const item of itens) {
          await sql`
            INSERT INTO itens_orcamento (
              orcamento_id, descricao, ambiente, largura_cm, altura_cm, 
              profundidade_cm, material, acabamento, quantidade, 
              valor_unitario, valor_total
            )
            VALUES (
              ${id}, ${item.descricao}, ${item.ambiente}, ${item.largura_cm}, 
              ${item.altura_cm}, ${item.profundidade_cm}, ${item.material}, 
              ${item.acabamento}, ${item.quantidade || 1}, ${item.valor_unitario}, ${item.valor_total}
            )
          `;
        }
      }

      return res.status(200).json({ ...orc[0], itens });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await sql`DELETE FROM orcamentos WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  res.status(405).end('Method Not Allowed');
}
