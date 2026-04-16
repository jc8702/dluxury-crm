import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });

  const { type, projectId } = req.query;

  try {
    switch (type) {
      case 'fin-rentabilidade':
        // Dados de rentabilidade por projeto
        const rentabilidade = await sql`
          SELECT * FROM bi_custos_projeto
          ORDER BY custo_material_total DESC
        `;
        return res.status(200).json(rentabilidade);

      case 'ind-romaneio':
        // Romaneio técnico para a oficina (BOM Explodida)
        if (!projectId) return res.status(400).json({ error: 'projectId é obrigatório' });
        const romaneio = await sql`
          SELECT 
            pi.ambiente, 
            cr.componente_nome, 
            s.nome as sku_nome, 
            s.sku_code,
            cr.quantidade_com_perda,
            s.unidade_medida
          FROM erp_project_items pi
          JOIN erp_consumption_results cr ON cr.project_item_id = pi.id
          JOIN erp_skus s ON s.id = cr.sku_id
          WHERE pi.project_id = ${projectId}
          ORDER BY pi.ambiente, cr.componente_nome
        `;
        return res.status(200).json(romaneio);

      case 'com-necessidade':
        // Lista de compras baseada em estoque baixo e Classe ABC
        const compras = await sql`
          SELECT 
            s.sku_code, s.nome, s.categoria, 
            i.estoque_atual, i.estoque_reservado,
            abc.classe_abc, abc.valor_total_consumido
          FROM erp_skus s
          JOIN erp_inventory i ON i.sku_id = s.id
          LEFT JOIN bi_curva_abc_materiais abc ON abc.id = s.id
          WHERE (i.estoque_atual - i.estoque_reservado) < i.ponto_pedido OR abc.classe_abc = 'A'
          ORDER BY abc.classe_abc ASC, (i.estoque_atual - i.estoque_reservado) ASC
        `;
        return res.status(200).json(compras);

      case 'ind-desvios':
        // Relatório de anomalias e desvios técnicos
        const desvios = await sql`
          SELECT * FROM bi_desvio_producao
          WHERE ABS(desvio_percentual) > 5
          ORDER BY ABS(desvio_percentual) DESC
        `;
        return res.status(200).json(desvios);

      default:
        return res.status(400).json({ error: 'Tipo de relatório inválido' });
    }
  } catch (err: any) {
    console.error('Report Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
