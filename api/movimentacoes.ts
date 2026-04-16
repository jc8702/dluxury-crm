import { sql, extractAndVerifyToken } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { user, error } = extractAndVerifyToken(req);
  if (error) return res.status(401).json({ error });

  if (req.method === 'GET') {
    try {
      const { material_id, limit = 100 } = req.query;
      
      let query = sql`
        SELECT 
          mov.*, 
          m.nome as material_nome, 
          m.sku as material_sku,
          m.unidade_compra as material_unidade
        FROM movimentacoes_estoque mov
        LEFT JOIN materiais m ON mov.material_id = m.id
      `;

      if (material_id) {
        query = sql`${query} WHERE mov.material_id = ${material_id}`;
      }

      const results = await sql`
        ${query} 
        ORDER BY mov.criado_em DESC 
        LIMIT ${limit}
      `;

      return res.status(200).json(results);
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { 
    material_id, tipo, quantidade, motivo, 
    projeto_id, orcamento_id, preco_unitario 
  } = req.body;

  try {
    // 1. Snapshot do estoque atual
    const materialRes = await sql`
      SELECT estoque_atual, fator_conversao, preco_custo 
      FROM materiais 
      WHERE id = ${material_id}
    `;

    if (!materialRes.length) throw new Error('Material não encontrado');

    const material = materialRes[0];
    const estAntes = Number(material.estoque_atual);
    const fator = Number(material.fator_conversao);
    const precoAtual = preco_unitario || Number(material.preco_custo);
    
    let estDepois = estAntes;
    if (tipo === 'entrada') estDepois += Number(quantidade);
    else if (tipo === 'saida') estDepois -= Number(quantidade);
    else if (tipo === 'ajuste') estDepois = Number(quantidade);

    if (estDepois < 0 && tipo === 'saida') {
      throw new Error('Estoque insuficiente para realizar esta saída.');
    }

    // 2. Registrar movimentação
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

    // 3. Atualizar saldo no material
    await sql`
      UPDATE materiais SET 
        estoque_atual = ${estDepois},
        preco_custo = ${tipo === 'entrada' ? precoAtual : material.preco_custo},
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ${material_id}
    `;

    const result = mov[0];


    return res.status(201).json(result);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
