import { sql, validateAuth, extractAndVerifyToken } from './_db.js';
import { Material } from './types.js';

export async function handleEstoque(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });
    const { method } = req;
    const { id, type } = req.query;

    if (type === 'movimentacoes') {
      if (method === 'GET') {
        const { material_id, limit: ql } = req.query;
        const lim = Number(ql) || 100;
        const result = material_id ? await sql`SELECT mov.*, m.nome as material_nome FROM movimentacoes_estoque mov LEFT JOIN materiais m ON mov.material_id = m.id WHERE mov.material_id = ${material_id} ORDER BY mov.criado_em DESC LIMIT ${lim}` : await sql`SELECT mov.*, m.nome as material_nome FROM movimentacoes_estoque mov LEFT JOIN materiais m ON mov.material_id = m.id ORDER BY mov.criado_em DESC LIMIT ${lim}`;
        return res.status(200).json({ success: true, data: result });
      }
      if (method === 'POST') {
        const { material_id, tipo, quantidade, motivo, projeto_id, orcamento_id, preco_unitario } = req.body;
        const mRes = await sql`SELECT estoque_atual, fator_conversao, preco_custo, nome FROM materiais WHERE id = ${material_id}`;
        if (!mRes.length) throw new Error('Material não encontrado');
        const mat = mRes[0];
        let estD = Number(mat.estoque_atual);
        if (tipo === 'entrada') estD += Number(quantidade);
        else if (tipo === 'saida') estD -= Number(quantidade);
        else if (tipo === 'ajuste') estD = Number(quantidade);
        if (estD < 0 && tipo === 'saida') throw new Error('Estoque insuficiente');
        
        const { user } = extractAndVerifyToken(req);
        const mov = await sql`INSERT INTO movimentacoes_estoque (material_id, tipo, quantidade, quantidade_uso, motivo, projeto_id, orcamento_id, preco_unitario, valor_total, estoque_antes, estoque_depois, criado_por) VALUES (${material_id}, ${tipo}, ${quantidade}, ${Number(quantidade) * Number(mat.fator_conversao)}, ${motivo}, ${projeto_id || null}, ${orcamento_id || null}, ${preco_unitario || mat.preco_custo}, ${Number(quantidade) * (preco_unitario || Number(mat.preco_custo))}, ${mat.estoque_atual}, ${estD}, ${user?.name || 'Sistema'}) RETURNING *`;
        await sql`UPDATE materiais SET estoque_atual = ${estD}, preco_custo = ${tipo === 'entrada' ? (preco_unitario || mat.preco_custo) : mat.preco_custo}, atualizado_em = CURRENT_TIMESTAMP WHERE id = ${material_id}`;
        return res.status(201).json({ success: true, data: mov[0] });
      }
    }

    if (type === 'fornecedores') {
      if (method === 'GET') {
        const result = id ? (await sql`SELECT * FROM fornecedores WHERE id = ${id}`)[0] : await sql`SELECT * FROM fornecedores WHERE ativo = true ORDER BY nome ASC`;
        return res.status(200).json({ success: true, data: result });
      }
      if (method === 'POST') {
        const f = req.body;
        const r = await sql`INSERT INTO fornecedores (nome, cnpj, contato, telefone, email, cidade, estado, observacoes) VALUES (${f.nome}, ${f.cnpj}, ${f.contato}, ${f.telefone}, ${f.email}, ${f.cidade}, ${f.estado}, ${f.observacoes}) RETURNING *`;
        return res.status(201).json({ success: true, data: r[0] });
      }
      if (method === 'PATCH') {
        const f = req.body;
        const r = await sql`UPDATE fornecedores SET nome = ${f.nome}, cnpj = ${f.cnpj}, contato = ${f.contato}, telefone = ${f.telefone}, email = ${f.email}, cidade = ${f.cidade}, estado = ${f.estado}, observacoes = ${f.observacoes} WHERE id = ${id} RETURNING *`;
        return res.status(200).json({ success: true, data: r[0] });
      }
      if (method === 'DELETE') {
        const { user } = extractAndVerifyToken(req);
        if (user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Acesso negado' });
        await sql`UPDATE fornecedores SET ativo = false WHERE id = ${id}`;
        return res.status(200).json({ success: true });
      }
    }

    if (type === 'categories') {
      if (method === 'GET') {
        const result = await sql`SELECT * FROM erp_categories ORDER BY nome ASC`;
        return res.status(200).json({ success: true, data: result });
      }
      if (method === 'POST') {
        const r = await sql`INSERT INTO categorias_material (nome, slug, icone) VALUES (${req.body.nome}, ${req.body.slug}, ${req.body.icone}) RETURNING *`;
        return res.status(201).json({ success: true, data: r[0] });
      }
    }

    if (method === 'GET') {
      if (id) {
        const mat = await sql`SELECT m.*, c.nome as categoria_nome FROM materiais m LEFT JOIN erp_categories c ON m.categoria_id = c.id WHERE m.id = ${id}`;
        const movs = await sql`SELECT * FROM movimentacoes_estoque WHERE material_id = ${id} ORDER BY criado_em DESC LIMIT 50`;
        return res.status(200).json({ success: true, data: { ...mat[0], movements: movs } });
      }
      const result = await sql`SELECT m.*, c.nome as categoria_nome FROM materiais m LEFT JOIN erp_categories c ON m.categoria_id = c.id WHERE m.ativo = true ORDER BY m.nome ASC`;
      return res.status(200).json({ success: true, data: result });
    }

    if (method === 'POST' || method === 'PATCH') {
      const f = req.body;
      if (method === 'POST') {
        const r = await sql`INSERT INTO materiais (sku, nome, descricao, categoria_id, subcategoria, unidade_compra, unidade_uso, fator_conversao, estoque_minimo, preco_custo, fornecedor_principal, observacoes, cfop, ncm, largura_mm, altura_mm, preco_venda, margem_lucro, icms, icms_st, ipi, pis, cofins, origem, marca) VALUES (${f.sku}, ${f.nome}, ${f.descricao}, ${f.categoria_id}, ${f.subcategoria}, ${f.unidade_compra}, ${f.unidade_uso}, ${f.fator_conversao}, ${f.estoque_minimo}, ${f.preco_custo}, ${f.fornecedor_principal}, ${f.observacoes}, ${f.cfop}, ${f.ncm}, ${f.largura_mm}, ${f.altura_mm}, ${f.preco_venda}, ${f.margem_lucro}, ${f.icms}, ${f.icms_st}, ${f.ipi}, ${f.pis}, ${f.cofins}, ${f.origem}, ${f.marca}) RETURNING *`;
        return res.status(201).json({ success: true, data: r[0] });
      }
      const r = await sql`UPDATE materiais SET sku = ${f.sku}, nome = ${f.nome}, descricao = ${f.descricao}, categoria_id = ${f.categoria_id}, subcategoria = ${f.subcategoria}, unidade_compra = ${f.unidade_compra}, unidade_uso = ${f.unidade_uso}, fator_conversao = ${f.fator_conversao}, estoque_minimo = ${f.estoque_minimo}, preco_custo = ${f.preco_custo}, fornecedor_principal = ${f.fornecedor_principal}, observacoes = ${f.observacoes}, cfop = ${f.cfop}, ncm = ${f.ncm}, largura_mm = ${f.largura_mm}, altura_mm = ${f.altura_mm}, preco_venda = ${f.preco_venda}, margem_lucro = ${f.margem_lucro}, icms = ${f.icms}, icms_st = ${f.icms_st}, ipi = ${f.ipi}, pis = ${f.pis}, cofins = ${f.cofins}, origem = ${f.origem}, marca = ${f.marca}, atualizado_em = CURRENT_TIMESTAMP WHERE id = ${id} RETURNING *`;
      return res.status(200).json({ success: true, data: r[0] });
    }

    if (method === 'DELETE') {
      const { user } = extractAndVerifyToken(req);
      if (user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Acesso negado' });
      await sql`UPDATE materiais SET ativo = false WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
