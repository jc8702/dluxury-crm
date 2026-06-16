import { sql, validateAuth } from './_db.js';

export async function handleServicos(req: any, res: any) {
  try {
    const { authorized, error } = validateAuth(req);
    if (!authorized) return res.status(401).json({ success: false, error });

    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'categorias') {
        const result = await sql`
          SELECT DISTINCT atributos->>'categoria' as categoria
          FROM erp_skus
          WHERE atributos->>'categoria' IS NOT NULL
            AND ativo = true
          ORDER BY categoria ASC
        `;
        return res.status(200).json({
          success: true,
          data: result.map((r: any) => r.categoria)
        });
      }

      const { categoria, q } = req.query;
      let query = sql`SELECT * FROM erp_skus WHERE ativo = true`;
      const params: any[] = [];
      let paramIndex = 0;

      if (categoria) {
        paramIndex++;
        query = sql`${query} AND atributos->>'categoria' = ${categoria}`;
      }
      if (q) {
        query = sql`${query} AND (nome ILIKE ${'%' + q + '%'} OR sku_code ILIKE ${'%' + q + '%'})`;
      }

      query = sql`${query} ORDER BY nome ASC`;
      const result = await query;
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const f = req.body;
      const result = await sql`
        INSERT INTO erp_skus (sku_code, nome, unidade_medida, preco_base, atributos, ativo)
        VALUES (
          ${f.sku_code},
          ${f.nome},
          ${f.unidade_medida || 'SV'},
          ${f.preco_base || f.preco || 0},
          ${JSON.stringify({
            categoria: f.categoria,
            descricao: f.descricao,
            moeda: f.moeda || 'BRL',
            garantia_dias: f.garantia_dias || 90
          })},
          ${f.ativo !== false}
        )
        ON CONFLICT (sku_code) DO UPDATE SET
          nome = EXCLUDED.nome,
          preco_base = EXCLUDED.preco_base,
          atributos = EXCLUDED.atributos,
          ativo = EXCLUDED.ativo
        RETURNING *
      `;
      return res.status(201).json({ success: true, data: result[0] });
    }

    if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'id é obrigatório' });

      const f = req.body;
      const sets: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (f.nome !== undefined) { sets.push(`nome = $${idx++}`); values.push(f.nome); }
      if (f.preco_base !== undefined) { sets.push(`preco_base = $${idx++}`); values.push(f.preco_base); }
      if (f.ativo !== undefined) { sets.push(`ativo = $${idx++}`); values.push(f.ativo); }
      if (f.categoria !== undefined || f.descricao !== undefined || f.moeda !== undefined || f.garantia_dias !== undefined) {
        const current = await sql`SELECT atributos FROM erp_skus WHERE id = ${id}`;
        const attrs = current[0]?.atributos || {};
        sets.push(`atributos = $${idx++}`);
        values.push(JSON.stringify({
          ...attrs,
          ...(f.categoria !== undefined ? { categoria: f.categoria } : {}),
          ...(f.descricao !== undefined ? { descricao: f.descricao } : {}),
          ...(f.moeda !== undefined ? { moeda: f.moeda } : {}),
          ...(f.garantia_dias !== undefined ? { garantia_dias: f.garantia_dias } : {}),
        }));
      }

      if (sets.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
      }

      values.push(id);
      const result = await sql`
        UPDATE erp_skus SET ${sql(sets.join(', '))}
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json({ success: true, data: result[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'id é obrigatório' });
      await sql`UPDATE erp_skus SET ativo = false WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
