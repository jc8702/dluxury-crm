import { sql, extractAndVerifyToken } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { user, error } = extractAndVerifyToken(req);
  if (error) return res.status(401).json({ error });

  const { method } = req;
  const { id, type } = req.query;

  try {
    // ─── MOVIMENTAÇÕES (/api/estoque?type=movimentacoes) ───
    if (type === 'movimentacoes') {
      if (method === 'GET') {
        const { material_id, limit: queryLimit } = req.query;
        const lim = Number(queryLimit) || 100;

        if (material_id) {
          const results = await sql`
            SELECT mov.*, m.nome as material_nome, m.sku as material_sku, m.unidade_compra as material_unidade
            FROM movimentacoes_estoque mov
            LEFT JOIN materiais m ON mov.material_id = m.id
            WHERE mov.material_id = ${material_id}
            ORDER BY mov.criado_em DESC
            LIMIT ${lim}
          `;
          return res.status(200).json(results);
        }

        const results = await sql`
          SELECT mov.*, m.nome as material_nome, m.sku as material_sku, m.unidade_compra as material_unidade
          FROM movimentacoes_estoque mov
          LEFT JOIN materiais m ON mov.material_id = m.id
          ORDER BY mov.criado_em DESC
          LIMIT ${lim}
        `;
        return res.status(200).json(results);
      }

      if (method === 'POST') {
        const { material_id, tipo, quantidade, motivo, projeto_id, orcamento_id, preco_unitario } = req.body;

        const materialRes = await sql`
          SELECT estoque_atual, fator_conversao, preco_custo FROM materiais WHERE id = ${material_id}
        `;
        if (!materialRes.length) throw new Error('Material não encontrado');

        const mat = materialRes[0];
        const estAntes = Number(mat.estoque_atual);
        const fator = Number(mat.fator_conversao);
        const precoAtual = preco_unitario || Number(mat.preco_custo);

        let estDepois = estAntes;
        if (tipo === 'entrada') estDepois += Number(quantidade);
        else if (tipo === 'saida') estDepois -= Number(quantidade);
        else if (tipo === 'ajuste') estDepois = Number(quantidade);

        if (estDepois < 0 && tipo === 'saida') {
          throw new Error('Estoque insuficiente para realizar esta saída.');
        }

        const mov = await sql`
          INSERT INTO movimentacoes_estoque (
            material_id, tipo, quantidade, quantidade_uso, motivo,
            projeto_id, orcamento_id, preco_unitario, valor_total,
            estoque_antes, estoque_depois, criado_por
          )
          VALUES (
            ${material_id}, ${tipo}, ${quantidade}, ${Number(quantidade) * fator}, ${motivo},
            ${projeto_id || null}, ${orcamento_id || null}, ${precoAtual}, ${Number(quantidade) * precoAtual},
            ${estAntes}, ${estDepois}, ${user.name}
          )
          RETURNING *
        `;

        await sql`
          UPDATE materiais SET
            estoque_atual = ${estDepois},
            preco_custo = ${tipo === 'entrada' ? precoAtual : mat.preco_custo},
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = ${material_id}
        `;

        return res.status(201).json(mov[0]);
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ─── FORNECEDORES (/api/estoque?type=fornecedores) ───
    if (type === 'fornecedores') {
      if (method === 'GET') {
        if (id) {
          const result = await sql`SELECT * FROM fornecedores WHERE id = ${id}`;
          return res.status(200).json(result[0]);
        }
        const result = await sql`SELECT * FROM fornecedores WHERE ativo = true ORDER BY nome ASC`;
        return res.status(200).json(result);
      }

      if (method === 'POST') {
        const { nome, cnpj, contato, telefone, email, cidade, estado, observacoes } = req.body;
        const result = await sql`
          INSERT INTO fornecedores (nome, cnpj, contato, telefone, email, cidade, estado, observacoes)
          VALUES (${nome}, ${cnpj}, ${contato}, ${telefone}, ${email}, ${cidade}, ${estado}, ${observacoes})
          RETURNING *
        `;
        return res.status(201).json(result[0]);
      }

      if (method === 'PATCH') {
        const fields = req.body;
        const result = await sql`
          UPDATE fornecedores SET
            nome = ${fields.nome}, cnpj = ${fields.cnpj}, contato = ${fields.contato},
            telefone = ${fields.telefone}, email = ${fields.email}, cidade = ${fields.cidade},
            estado = ${fields.estado}, observacoes = ${fields.observacoes}
          WHERE id = ${id}
          RETURNING *
        `;
        return res.status(200).json(result[0]);
      }

      if (method === 'DELETE') {
        if (user?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
        await sql`UPDATE fornecedores SET ativo = false WHERE id = ${id}`;
        return res.status(200).json({ success: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ─── CATEGORIAS (/api/estoque?type=categories) ───
    if (type === 'categories') {
      if (method === 'GET') {
        const categories = await sql`SELECT * FROM categorias_material ORDER BY nome ASC`;
        return res.status(200).json(categories);
      }
      if (method === 'POST') {
        const { nome, slug, icone } = req.body;
        const result = await sql`
          INSERT INTO categorias_material (nome, slug, icone) VALUES (${nome}, ${slug}, ${icone}) RETURNING *
        `;
        return res.status(201).json(result[0]);
      }
    }

    // ─── MATERIAIS (default: /api/estoque) ───
    if (method === 'GET') {
      if (id) {
        const material = await sql`
          SELECT m.*, c.nome as categoria_nome, c.icone as categoria_icone
          FROM materiais m LEFT JOIN categorias_material c ON m.categoria_id = c.id
          WHERE m.id = ${id}
        `;
        const movements = await sql`
          SELECT * FROM movimentacoes_estoque WHERE material_id = ${id} ORDER BY criado_em DESC LIMIT 50
        `;
        return res.status(200).json({ ...material[0], movements });
      }
      const materials = await sql`
        SELECT m.*, c.nome as categoria_nome, c.icone as categoria_icone
        FROM materiais m LEFT JOIN categorias_material c ON m.categoria_id = c.id
        WHERE m.ativo = true ORDER BY m.nome ASC
      `;
      return res.status(200).json(materials);
    }

    if (method === 'POST') {
      const { 
        sku, nome, descricao, categoria_id, subcategoria, unidade_compra, unidade_uso, 
        fator_conversao, estoque_minimo, preco_custo, fornecedor_principal, observacoes,
        cfop, ncm, largura_mm, altura_mm, preco_venda, margem_lucro,
        icms, icms_st, ipi, pis, cofins, origem, marca
      } = req.body;

      const result = await sql`
        INSERT INTO materiais (
          sku, nome, descricao, categoria_id, subcategoria, unidade_compra, unidade_uso, 
          fator_conversao, estoque_minimo, preco_custo, fornecedor_principal, observacoes,
          cfop, ncm, largura_mm, altura_mm, preco_venda, margem_lucro,
          icms, icms_st, ipi, pis, cofins, origem, marca
        )
        VALUES (
          ${sku}, ${nome}, ${descricao}, ${categoria_id}, ${subcategoria}, ${unidade_compra}, ${unidade_uso}, 
          ${fator_conversao}, ${estoque_minimo}, ${preco_custo}, ${fornecedor_principal}, ${observacoes},
          ${cfop}, ${ncm}, ${largura_mm}, ${altura_mm}, ${preco_venda}, ${margem_lucro},
          ${icms}, ${icms_st}, ${ipi}, ${pis}, ${cofins}, ${origem}, ${marca}
        )
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    if (method === 'PATCH') {
      const f = req.body;
      const result = await sql`
        UPDATE materiais SET
          sku = ${f.sku}, nome = ${f.nome}, descricao = ${f.descricao},
          categoria_id = ${f.categoria_id}, subcategoria = ${f.subcategoria},
          unidade_compra = ${f.unidade_compra}, unidade_uso = ${f.unidade_uso},
          fator_conversao = ${f.fator_conversao}, estoque_minimo = ${f.estoque_minimo},
          preco_custo = ${f.preco_custo}, fornecedor_principal = ${f.fornecedor_principal},
          observacoes = ${f.observacoes}, 
          cfop = ${f.cfop}, ncm = ${f.ncm}, 
          largura_mm = ${f.largura_mm}, altura_mm = ${f.altura_mm},
          preco_venda = ${f.preco_venda}, margem_lucro = ${f.margem_lucro},
          icms = ${f.icms}, icms_st = ${f.icms_st}, ipi = ${f.ipi},
          pis = ${f.pis}, cofins = ${f.cofins}, origem = ${f.origem},
          marca = ${f.marca},
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    }

    if (method === 'DELETE') {
      if (user?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
      await sql`UPDATE materiais SET ativo = false WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
