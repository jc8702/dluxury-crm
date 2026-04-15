import { sql, extractAndVerifyToken } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { user, error } = extractAndVerifyToken(req);
  if (error) return res.status(401).json({ error });

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM inventory ORDER BY name ASC`;
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Apenas admins ou marceneiros deveriam alterar estoque pesado diretamente, 
  // mas vamos permitir todos os roles logados para simplificar o MVP.
  if (req.method === 'POST') {
    const { 
      name, sku, description, category, family, subcategory, unit, quantity, min_quantity, location, price,
      supplier_name, supplier_code, lead_time_days,
      ncm, cfop, icms, ipi, pis, cofins, fiscal_origin,
      purchase_unit, conversion_factor, purchase_price, currency,
      max_quantity, reorder_point, min_lot, replenishment_policy, planning_type, resupply_days
    } = req.body;
    try {
      const result = await sql`
        INSERT INTO inventory (
          name, sku, description, category, family, subcategory, unit, quantity, min_quantity, location, price,
          supplier_name, supplier_code, lead_time_days,
          ncm, cfop, icms, ipi, pis, cofins, fiscal_origin,
          purchase_unit, conversion_factor, purchase_price, currency,
          max_quantity, reorder_point, min_lot, replenishment_policy, planning_type, resupply_days
        )
        VALUES (
          ${name}, ${sku || null}, ${description || null}, ${category}, ${family || null}, ${subcategory || null},
          ${unit}, ${quantity || 0}, ${min_quantity || 0}, ${location || null}, ${price || 0},
          ${supplier_name || null}, ${supplier_code || null}, ${lead_time_days || 0},
          ${ncm || null}, ${cfop || null}, ${icms || 0}, ${ipi || 0}, ${pis || 0}, ${cofins || 0}, ${fiscal_origin || '0'},
          ${purchase_unit || unit}, ${conversion_factor || 1}, ${purchase_price || price || 0}, ${currency || 'BRL'},
          ${max_quantity || 0}, ${reorder_point || 0}, ${min_lot || 1},
          ${replenishment_policy || 'FOQ'}, ${planning_type || 'MRP'}, ${resupply_days || 0}
        )
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { quantity } = req.body; // usually just updating qty for now
    try {
      const result = await sql`
        UPDATE inventory SET
          quantity = ${quantity},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Só admins podem deletar itens.' });
    try {
      await sql`DELETE FROM inventory WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
