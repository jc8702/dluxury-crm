import { sql, validateAuth, extractAndVerifyToken } from './_db.js';

export async function handleCompras(req: any, res: any) {
  try {
    const { method } = req;
    const { id, type } = req.query;

    // Acesso protegido - Exceto talvez para algumas rotas se necessário, mas Compras é interno.
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    if (type === 'pedidos') {
      if (method === 'GET') {
        if (id) {
          const pedido = (await sql`SELECT p.*, f.nome as fornecedor_nome FROM pedidos_compra p LEFT JOIN fornecedores f ON p.fornecedor_id = f.id WHERE p.id = ${id}`)[0];
          const itens = await sql`SELECT * FROM pedido_compra_itens WHERE pedido_id = ${id} ORDER BY id ASC`;
          return res.status(200).json({ success: true, data: { ...pedido, itens } });
        }
        const result = await sql`SELECT p.*, f.nome as fornecedor_nome FROM pedidos_compra p LEFT JOIN fornecedores f ON p.fornecedor_id = f.id ORDER BY p.criado_em DESC`;
        return res.status(200).json({ success: true, data: result });
      }

      if (method === 'POST') {
        const f = req.body;
        // Gerar Número PC-ANO-SEQ
        const ano = new Date().getFullYear();
        const count = await sql`SELECT count(*) FROM pedidos_compra WHERE numero LIKE ${`PC-${ano}-%`}`;
        const seq = (parseInt(count[0].count) + 1).toString().padStart(3, '0');
        const numero = `PC-${ano}-${seq}`;

        const result = await sql`
          INSERT INTO pedidos_compra (numero, fornecedor_id, status, data_previsao_entrega, valor_total, frete, observacoes, origem)
          VALUES (${numero}, ${f.fornecedor_id}, 'rascunho', ${f.data_previsao_entrega || null}, ${f.valor_total || 0}, ${f.frete || 0}, ${f.observacoes}, ${f.origem || 'manual'})
          RETURNING *
        `;
        return res.status(201).json({ success: true, data: result[0] });
      }

      if (method === 'PATCH' || method === 'PUT') {
        const f = req.body;
        const result = await sql`
          UPDATE pedidos_compra SET
            fornecedor_id = COALESCE(${f.fornecedor_id}, fornecedor_id),
            status = COALESCE(${f.status}, status),
            data_previsao_entrega = COALESCE(${f.data_previsao_entrega}, data_previsao_entrega),
            data_recebimento = COALESCE(${f.data_recebimento}, data_recebimento),
            valor_total = COALESCE(${f.valor_total}, valor_total),
            frete = COALESCE(${f.frete}, frete),
            observacoes = COALESCE(${f.observacoes}, observacoes),
            atualizado_em = NOW()
          WHERE id = ${id} RETURNING *
        `;
        return res.status(200).json({ success: true, data: result[0] });
      }
    }

    if (type === 'itens') {
      if (method === 'POST') {
        const f = req.body;
        const result = await sql`
          INSERT INTO pedido_compra_itens (pedido_id, material_id, sku, descricao, quantidade_pedida, unidade, preco_unitario, subtotal)
          VALUES (${f.pedido_id}, ${f.material_id}, ${f.sku}, ${f.descricao}, ${f.quantidade_pedida}, ${f.unidade}, ${f.preco_unitario}, ${f.quantidade_pedida * f.preco_unitario})
          RETURNING *
        `;
        // Atualizar total do pedido
        await sql`UPDATE pedidos_compra SET valor_total = (SELECT SUM(subtotal) FROM pedido_compra_itens WHERE pedido_id = ${f.pedido_id}) WHERE id = ${f.pedido_id}`;
        return res.status(201).json({ success: true, data: result[0] });
      }
      if (method === 'DELETE') {
        const itm = (await sql`SELECT pedido_id FROM pedido_compra_itens WHERE id = ${id}`)[0];
        await sql`DELETE FROM pedido_compra_itens WHERE id = ${id}`;
        if (itm) {
          await sql`UPDATE pedidos_compra SET valor_total = COALESCE((SELECT SUM(subtotal) FROM pedido_compra_itens WHERE pedido_id = ${itm.pedido_id}), 0) WHERE id = ${itm.pedido_id}`;
        }
        return res.status(200).json({ success: true });
      }
    }

    if (type === 'recebimento') {
      if (method === 'POST') {
        const { pedido_id, itens_recebidos, nota_fiscal, observacao } = req.body;
        const { user } = extractAndVerifyToken(req);

        for (const r of itens_recebidos) {
          // 1. Inserir em recebimentos_compra
          await sql`
            INSERT INTO recebimentos_compra (pedido_id, item_id, quantidade_recebida, nota_fiscal, observacao)
            VALUES (${pedido_id}, ${r.item_id}, ${r.quantidade}, ${nota_fiscal}, ${observacao})
          `;

          // 2. Atualizar quantidade_recebida no item
          const itm = await sql`UPDATE pedido_compra_itens SET quantidade_recebida = quantidade_recebida + ${r.quantidade} WHERE id = ${r.item_id} RETURNING *`;
          const item = itm[0];

          // 3. Atualizar status do item
          const nStatus = item.quantidade_recebida >= item.quantidade_pedida ? 'recebido' : 'parcial';
          await sql`UPDATE pedido_compra_itens SET status_item = ${nStatus} WHERE id = ${r.item_id}`;

          // 4. Criar movimentacao_estoque
          await sql`
            INSERT INTO movimentacoes_estoque (material_id, tipo, quantidade, motivo, preco_unitario, valor_total, criado_por)
            VALUES (${item.material_id}, 'entrada', ${r.quantidade}, ${`PC-${pedido_id.substring(0,8)}`}, ${item.preco_unitario}, ${r.quantidade * item.preco_unitario}, ${user?.name || 'Sistema'})
          `;

          // 5. Atualizar estoque_atual em materiais
          await sql`UPDATE materiais SET estoque_atual = estoque_atual + ${r.quantidade}, preco_custo = ${item.preco_unitario}, atualizado_em = NOW() WHERE id = ${item.material_id}`;
        }

        // 6. Atualizar status do pedido
        const allItens = await sql`SELECT quantidade_pedida, quantidade_recebida FROM pedido_compra_itens WHERE pedido_id = ${pedido_id}`;
        const totalPedida = allItens.reduce((acc, i) => acc + Number(i.quantidade_pedida), 0);
        const totalRecebida = allItens.reduce((acc, i) => acc + Number(i.quantidade_recebida), 0);
        
        let pStatus = 'parcialmente_recebido';
        if (totalRecebida >= totalPedida) pStatus = 'recebido';
        else if (totalRecebida === 0) pStatus = 'enviado';

        await sql`UPDATE pedidos_compra SET status = ${pStatus}, data_recebimento = ${totalRecebida >= totalPedida ? 'NOW()' : 'NULL'} WHERE id = ${pedido_id}`;

        return res.status(200).json({ success: true });
      }
    }

    if (type === 'sugestao') {
      const result = await sql`
        SELECT m.id as material_id, m.sku, m.nome as descricao, m.unidade_compra as unidade, m.estoque_minimo, m.estoque_atual, m.preco_custo as preco_unitario, m.fornecedor_principal as fornecedor_id
        FROM materiais m
        WHERE m.estoque_atual <= m.estoque_minimo AND m.ativo = true
      `;
      return res.status(200).json({ success: true, data: result });
    }

    if (type === 'historico_precos') {
      const materialId = req.query.material_id;
      const result = await sql`
        SELECT r.data_recebimento, r.quantidade_recebida, i.preco_unitario, p.numero as pedido_numero, f.nome as fornecedor_nome
        FROM recebimentos_compra r
        JOIN pedido_compra_itens i ON r.item_id = i.id
        JOIN pedidos_compra p ON r.pedido_id = p.id
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        WHERE i.material_id = ${materialId}
        ORDER BY r.data_recebimento DESC
      `;
      return res.status(200).json({ success: true, data: result });
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
