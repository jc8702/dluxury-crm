import { sql, extractAndVerifyToken } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { user, error } = extractAndVerifyToken(req);
  if (error) return res.status(401).json({ error });

  const { method } = req;
  const { id, type } = req.query; // type can be 'categories' or 'materials'

  try {
    // CATEGORIAS
    if (type === 'categories') {
      if (method === 'GET') {
        const categories = await sql`SELECT * FROM categorias_material ORDER BY nome ASC`;
        return res.status(200).json(categories);
      }
      if (method === 'POST') {
        const { nome, slug, icone } = req.body;
        const result = await sql`
          INSERT INTO categorias_material (nome, slug, icone)
          VALUES (${nome}, ${slug}, ${icone})
          RETURNING *
        `;
        return res.status(201).json(result[0]);
      }
    }

    // MATERIAIS
    if (method === 'GET') {
      if (id) {
        const material = await sql`
          SELECT m.*, c.nome as categoria_nome, c.icone as categoria_icone 
          FROM materiais m
          LEFT JOIN categorias_material c ON m.categoria_id = c.id
          WHERE m.id = ${id}
        `;
        const movements = await sql`
          SELECT * FROM movimentacoes_estoque 
          WHERE material_id = ${id} 
          ORDER BY criado_em DESC LIMIT 50
        `;
        return res.status(200).json({ ...material[0], movements });
      }
      
      const materials = await sql`
        SELECT m.*, c.nome as categoria_nome, c.icone as categoria_icone 
        FROM materiais m
        LEFT JOIN categorias_material c ON m.categoria_id = c.id
        WHERE m.ativo = true
        ORDER BY m.nome ASC
      `;
      return res.status(200).json(materials);
    }

    if (method === 'POST') {
      const { 
        sku, nome, descricao, categoria_id, subcategoria, 
        unidade_compra, unidade_uso, fator_conversao, 
        estoque_minimo, preco_custo, fornecedor_principal, observacoes 
      } = req.body;

      const result = await sql`
        INSERT INTO materiais (
          sku, nome, descricao, categoria_id, subcategoria, 
          unidade_compra, unidade_uso, fator_conversao, 
          estoque_minimo, preco_custo, fornecedor_principal, observacoes
        )
        VALUES (
          ${sku}, ${nome}, ${descricao}, ${categoria_id}, ${subcategoria}, 
          ${unidade_compra}, ${unidade_uso}, ${fator_conversao}, 
          ${estoque_minimo}, ${preco_custo}, ${fornecedor_principal}, ${observacoes}
        )
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    if (method === 'PATCH') {
      const fields = req.body;
      const result = await sql`
        UPDATE materiais SET
          sku = ${fields.sku},
          nome = ${fields.nome},
          descricao = ${fields.descricao},
          categoria_id = ${fields.categoria_id},
          subcategoria = ${fields.subcategoria},
          unidade_compra = ${fields.unidade_compra},
          unidade_uso = ${fields.unidade_uso},
          fator_conversao = ${fields.fator_conversao},
          estoque_minimo = ${fields.estoque_minimo},
          preco_custo = ${fields.preco_custo},
          fornecedor_principal = ${fields.fornecedor_principal},
          observacoes = ${fields.observacoes},
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
