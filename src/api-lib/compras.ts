import { sql, validateAuth } from './_db.js';
import { garantirSeedsFinanceiros } from './financeiro.js';

export async function handleCompras(req: any, res: any) {
  try {
    const { method } = req;
    const { id, type } = req.query;

    const auth = validateAuth(req);
    if (!auth.authorized) return res.status(401).json({ success: false, error: auth.error || 'Não autorizado' });
    const tenantId = auth.user?.tenantId || '00000000-0000-0000-0000-000000000000';
    const { user } = auth;

    if (type === 'pedidos') {
      if (method === 'GET') {
        if (id) {
          const pedido = (await sql`SELECT p.*, f.nome as fornecedor_nome FROM pedidos_compra p LEFT JOIN fornecedores f ON p.fornecedor_id = f.id AND f.tenant_id = ${tenantId} WHERE p.id = ${id} AND p.tenant_id = ${tenantId}`)[0];
          const itens = await sql`SELECT id, pedido_id, material_id, sku, descricao, quantidade_pedida, quantidade_recebida, unidade, preco_unitario, subtotal, status_item, created_at, updated_at FROM pedido_compra_itens WHERE pedido_id = ${id} AND tenant_id = ${tenantId} ORDER BY id ASC`;
          return res.status(200).json({ success: true, data: { ...pedido, itens } });
        }
        if (req.query.fornecedor_id) {
          const result = await sql`SELECT p.*, f.nome as fornecedor_nome FROM pedidos_compra p LEFT JOIN fornecedores f ON p.fornecedor_id = f.id AND f.tenant_id = ${tenantId} WHERE p.fornecedor_id = ${req.query.fornecedor_id} AND p.status != 'cancelado' AND p.tenant_id = ${tenantId} ORDER BY p.created_at DESC`;
          return res.status(200).json({ success: true, data: result });
        }
        const result = await sql`SELECT p.*, f.nome as fornecedor_nome FROM pedidos_compra p LEFT JOIN fornecedores f ON p.fornecedor_id = f.id AND f.tenant_id = ${tenantId} WHERE p.tenant_id = ${tenantId} ORDER BY p.created_at DESC`;
        return res.status(200).json({ success: true, data: result });
      }

      if (method === 'DELETE') {
        // Deletar pedido e seus itens
        if (!id) return res.status(400).json({ success: false, error: 'id é obrigatório para deletar pedido' });
        await sql`DELETE FROM pedido_compra_itens WHERE pedido_id = ${id} AND tenant_id = ${tenantId}`;
        await sql`DELETE FROM pedidos_compra WHERE id = ${id} AND tenant_id = ${tenantId}`;
        return res.status(200).json({ success: true });
      }

      if (method === 'POST') {
        const f = req.body;
        // Gerar Número PC-ANO-SEQ
        const ano = new Date().getFullYear();
        const count = await sql`SELECT count(*) FROM pedidos_compra WHERE numero LIKE ${`PC-${ano}-%`} AND tenant_id = ${tenantId}`;
        const seq = (parseInt(count[0].count) + 1).toString().padStart(3, '0');
        const numero = `PC-${ano}-${seq}`;

        const totalItens = (f.itens || []).reduce((acc: number, item: any) => acc + ((Number(item.quantidade_pedida) || 0) * (Number(item.preco_unitario) || 0)), 0);
        const valorTotal = totalItens + (Number(f.frete) || 0);

        const fornecedorId = f.fornecedor_id && f.fornecedor_id !== '' ? Number(f.fornecedor_id) : null;
        const dataPrevisao = f.data_previsao_entrega && f.data_previsao_entrega !== '' ? f.data_previsao_entrega : null;
        const observacoes = f.observacoes || null;
        const origem = f.origem || 'manual';

        const result = await sql`
          INSERT INTO pedidos_compra (numero, fornecedor_id, status, data_previsao_entrega, valor_total, frete, observacoes, origem, tenant_id)
          VALUES (${numero}, ${fornecedorId}, 'rascunho', ${dataPrevisao}, ${valorTotal}, ${Number(f.frete) || 0}, ${observacoes}, ${origem}, ${tenantId})
          RETURNING *
        `;
        const pedido = result[0];

        // Inserir itens se existirem
        if (f.itens && f.itens.length > 0) {
          for (const item of f.itens) {
            const matId = item.material_id && item.material_id !== '' ? Number(item.material_id) : null;
            const subtotal = (Number(item.quantidade_pedida) || 0) * (Number(item.preco_unitario) || 0);
            await sql`
              INSERT INTO pedido_compra_itens (pedido_id, material_id, sku, descricao, quantidade_pedida, unidade, preco_unitario, subtotal, tenant_id)
              VALUES (${pedido.id}, ${matId}, ${item.sku || null}, ${item.descricao || null}, ${Number(item.quantidade_pedida) || 0}, ${item.unidade || null}, ${Number(item.preco_unitario) || 0}, ${subtotal}, ${tenantId})
            `;
          }
        }

        return res.status(201).json({ success: true, data: pedido });
      }

      if (method === 'PATCH' || method === 'PUT') {
        const f = req.body;
        
        let valorTotal = f.valor_total;
        if (f.itens) {
            const totalItens = f.itens.reduce((acc: number, item: any) => acc + (item.quantidade_pedida * item.preco_unitario), 0);
            valorTotal = totalItens + (Number(f.frete) || 0);
        }
        
        const result = await sql`
          UPDATE pedidos_compra SET
            fornecedor_id = COALESCE(${f.fornecedor_id}, fornecedor_id),
            status = COALESCE(${f.status}, status),
            data_previsao_entrega = COALESCE(${f.data_previsao_entrega}, data_previsao_entrega),
            data_recebimento = COALESCE(${f.data_recebimento}, data_recebimento),
            valor_total = COALESCE(${valorTotal}, valor_total),
            frete = COALESCE(${f.frete}, frete),
            observacoes = COALESCE(${f.observacoes}, observacoes),
            updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *
        `;
        const pedido = result[0];

        // Geração automática de títulos a pagar ao confirmar o pedido
        if (f.status === 'confirmado') {
          await garantirSeedsFinanceiros(tenantId);
          const existing = await sql`SELECT id FROM titulos_pagar WHERE pedido_compra_id = ${id} AND tenant_id = ${tenantId}`;
          if (existing.length === 0) {
            // Tenta pegar condição de pagamento do pedido ou assume 1 parcela
            const cond = (await sql`SELECT id, nome, parcelas FROM condicoes_pagamento WHERE id = ${f.condicao_pagamento_id || null} AND tenant_id = ${tenantId}`)[0];
            const totalParcelas = cond?.parcelas || 1;
            const valorParcela = Number(pedido.valor_total) / totalParcelas;
            const dataEmissao = new Date();
            
            // Busca valores padrão para evitar erro de FK
            const defClasse = (await sql`SELECT id FROM classes_financeiras WHERE codigo = '2.4.01' AND tenant_id = ${tenantId} LIMIT 1`)[0]?.id || (await sql`SELECT id FROM classes_financeiras WHERE tenant_id = ${tenantId} LIMIT 1`)[0]?.id;
            const defForma = (await sql`SELECT id FROM formas_pagamento WHERE tenant_id = ${tenantId} LIMIT 1`)[0]?.id;
            const defConta = (await sql`SELECT id FROM contas_internas WHERE tenant_id = ${tenantId} LIMIT 1`)[0]?.id;

            for (let i = 1; i <= totalParcelas; i++) {
              const vencimento = new Date();
              vencimento.setMonth(vencimento.getMonth() + (i - 1));
              
              await sql`
                INSERT INTO titulos_pagar (
                  numero_titulo, fornecedor_id, pedido_compra_id,
                  valor_original, valor_liquido, valor_aberto,
                  data_emissao, data_vencimento, data_competencia,
                  classe_financeira_id, forma_pagamento_id, conta_bancaria_id,
                  status, parcela, total_parcelas, tenant_id
                ) VALUES (
                  ${`PAG-AUTO-${pedido.numero}-${i}`}, ${pedido.fornecedor_id}, ${id},
                  ${valorParcela}, ${valorParcela}, ${valorParcela},
                  ${dataEmissao}, ${vencimento}, ${dataEmissao},
                  ${defClasse}, ${defForma}, ${defConta},
                  'aberto', ${i}, ${totalParcelas}, ${tenantId}
                )`;
            }
          }
        }

        // Se enviou itens, sobrescrevemos
        if (f.itens) {
          await sql`DELETE FROM pedido_compra_itens WHERE pedido_id = ${id} AND tenant_id = ${tenantId}`;
          for (const item of f.itens) {
            await sql`
              INSERT INTO pedido_compra_itens (pedido_id, material_id, sku, descricao, quantidade_pedida, unidade, preco_unitario, subtotal, tenant_id)
              VALUES (${id}, ${item.material_id}, ${item.sku}, ${item.descricao}, ${item.quantidade_pedida}, ${item.unidade}, ${item.preco_unitario}, ${item.quantidade_pedida * item.preco_unitario}, ${tenantId})
            `;
          }
        }

        return res.status(200).json({ success: true, data: pedido });
      }

    }

    if (type === 'itens') {
      if (method === 'POST') {
        const f = req.body;
        const result = await sql`
          INSERT INTO pedido_compra_itens (pedido_id, material_id, sku, descricao, quantidade_pedida, unidade, preco_unitario, subtotal, tenant_id)
          VALUES (${f.pedido_id}, ${f.material_id}, ${f.sku}, ${f.descricao}, ${f.quantidade_pedida}, ${f.unidade}, ${f.preco_unitario}, ${f.quantidade_pedida * f.preco_unitario}, ${tenantId})
          RETURNING *
        `;
        // Atualizar total do pedido
        await sql`UPDATE pedidos_compra SET valor_total = (SELECT SUM(subtotal) FROM pedido_compra_itens WHERE pedido_id = ${f.pedido_id} AND tenant_id = ${tenantId}) WHERE id = ${f.pedido_id} AND tenant_id = ${tenantId}`;
        return res.status(201).json({ success: true, data: result[0] });
      }
      if (method === 'DELETE') {
        const itm = (await sql`SELECT pedido_id FROM pedido_compra_itens WHERE id = ${id} AND tenant_id = ${tenantId}`)[0];
        await sql`DELETE FROM pedido_compra_itens WHERE id = ${id} AND tenant_id = ${tenantId}`;
        if (itm) {
          await sql`UPDATE pedidos_compra SET valor_total = COALESCE((SELECT SUM(subtotal) FROM pedido_compra_itens WHERE pedido_id = ${itm.pedido_id} AND tenant_id = ${tenantId}), 0) WHERE id = ${itm.pedido_id} AND tenant_id = ${tenantId}`;
        }
        return res.status(200).json({ success: true });
      }
    }

    if (type === 'recebimento') {
      if (method === 'POST') {
        const { pedido_id, itens_recebidos, nota_fiscal, observacao } = req.body;

        for (const r of itens_recebidos) {
          // 1. Inserir em recebimentos_compra
          await sql`
            INSERT INTO recebimentos_compra (pedido_id, item_id, quantidade_recebida, nota_fiscal, observacao, tenant_id)
            VALUES (${pedido_id}, ${r.item_id}, ${r.quantidade}, ${nota_fiscal}, ${observacao}, ${tenantId})
          `;

          // 2. Atualizar quantidade_recebida no item
          const itm = await sql`UPDATE pedido_compra_itens SET quantidade_recebida = quantidade_recebida + ${r.quantidade} WHERE id = ${r.item_id} AND tenant_id = ${tenantId} RETURNING *`;
          const item = itm[0];

          // 3. Atualizar status do item
          const nStatus = item.quantidade_recebida >= item.quantidade_pedida ? 'recebido' : 'parcial';
          await sql`UPDATE pedido_compra_itens SET status_item = ${nStatus} WHERE id = ${r.item_id} AND tenant_id = ${tenantId}`;

          // 4. Criar movimentacao_estoque
          await sql`
            INSERT INTO movimentacoes_estoque (material_id, tipo, quantidade, motivo, preco_unitario, valor_total, created_by, nota_fiscal, tenant_id)
            VALUES (${item.material_id}, 'entrada', ${r.quantidade}, ${`PC-${pedido_id.substring(0,8)}`}, ${item.preco_unitario}, ${r.quantidade * item.preco_unitario}, ${user?.name || 'SISTEMA'}, ${nota_fiscal || null}, ${tenantId})
          `;

          // 5. Atualizar estoque_atual em materiais
          await sql`UPDATE materiais SET estoque_atual = estoque_atual + ${r.quantidade}, preco_custo = ${item.preco_unitario}, updated_at = NOW() WHERE id = ${item.material_id} AND tenant_id = ${tenantId}`;
        }

        // 6. Atualizar status do pedido
        const allItens = await sql`SELECT quantidade_pedida, quantidade_recebida FROM pedido_compra_itens WHERE pedido_id = ${pedido_id} AND tenant_id = ${tenantId}`;
        const totalPedida = allItens.reduce((acc: number, i: any) => acc + Number(i.quantidade_pedida), 0);
        const totalRecebida = allItens.reduce((acc: number, i: any) => acc + Number(i.quantidade_recebida), 0);
        
        let pStatus = 'parcialmente_recebido';
        if (totalRecebida >= totalPedida) pStatus = 'recebido';
        else if (totalRecebida === 0) pStatus = 'enviado';

        await sql`UPDATE pedidos_compra SET status = ${pStatus}, data_recebimento = ${totalRecebida >= totalPedida ? 'NOW()' : 'NULL'} WHERE id = ${pedido_id} AND tenant_id = ${tenantId}`;

        return res.status(200).json({ success: true });
      }
    }

    if (type === 'sugestao') {
      const result = await sql`
        SELECT m.id as material_id, m.sku, m.nome as descricao, m.unidade_compra as unidade, m.estoque_minimo, m.estoque_atual, m.preco_custo as preco_unitario, m.fornecedor_principal as fornecedor_id
        FROM materiais m
        WHERE m.estoque_atual <= m.estoque_minimo AND m.ativo = true AND m.tenant_id = ${tenantId}
      `;
      return res.status(200).json({ success: true, data: result });
    }

    if (type === 'historico_precos') {
      const materialId = req.query.material_id;
      const result = await sql`
        SELECT r.data_recebimento, r.quantidade_recebida, i.preco_unitario, p.numero as pedido_numero, f.nome as fornecedor_nome
        FROM recebimentos_compra r
        JOIN pedido_compra_itens i ON r.item_id = i.id AND i.tenant_id = ${tenantId}
        JOIN pedidos_compra p ON r.pedido_id = p.id AND p.tenant_id = ${tenantId}
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id AND f.tenant_id = ${tenantId}
        WHERE i.material_id = ${materialId} AND r.tenant_id = ${tenantId}
        ORDER BY r.data_recebimento DESC
      `;
      return res.status(200).json({ success: true, data: result });
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
