import { db } from './drizzle-db.js';
import { skuComponente } from '../db/schema/skus.js';
import { ilike, or, eq, and, sql } from 'drizzle-orm';
import { withTenant, type TenantHandler } from './middleware/tenantMiddleware.js';

/**
 * Endpoint para buscar SKUs no banco baseado nos dados do CSV/PDF ou busca manual
 */
const handleMatchSKUsCore: TenantHandler = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  try {
    const tenantId = req.tenantId;

    // --- AÇÃO DE BUSCA (Autocomplete) ---
    if (req.method === 'GET') {
      const { q, categoria } = req.query;
      if (!q) return res.status(200).json({ success: true, data: [] });

      const query = `%${q}%`;

      // Busca em ambas as tabelas (Industrial e Comercial)
      const industrialFilters = [
        or(ilike(skuComponente.codigo, query), ilike(skuComponente.nome, query)),
      ];
      if (categoria) {
        industrialFilters.push(eq(skuComponente.tipo, categoria));
      }

      const resultsIndustrial = await db
        .select()
        .from(skuComponente)
        .where(and(...industrialFilters))
        .limit(20);

      let comercialSql = sql`
                SELECT id, sku as codigo, nome, preco_custo as "precoUnitario", 'COMERCIAL' as tipo 
                FROM materiais 
                WHERE (sku ILIKE ${query} OR nome ILIKE ${query}) AND tenant_id = ${tenantId}::uuid
            `;
      if (categoria) {
        comercialSql = sql`
                    SELECT m.id, m.sku as codigo, m.nome, m.preco_custo as "precoUnitario", 'COMERCIAL' as tipo 
                    FROM materiais m
                    LEFT JOIN erp_categories c ON m.categoria_id = c.id
                    WHERE (m.sku ILIKE ${query} OR m.nome ILIKE ${query}) 
                      AND m.tenant_id = ${tenantId}::uuid
                      AND c.id = ${categoria}
                `;
      }
      comercialSql.append(sql` LIMIT 20`);
      const resultsComercial = await db.execute(comercialSql);

      const combined = [
        ...resultsIndustrial.map((it) => ({ ...it, tipo: 'INDUSTRIAL' })),
        ...resultsComercial.rows.map((r: any) => ({
          id: r.id,
          codigo: r.codigo,
          nome: r.nome,
          precoUnitario: r.precoUnitario,
          tipo: 'COMERCIAL',
        })),
      ];

      return res.status(200).json({ success: true, data: combined });
    }

    // --- AÇÃO DE MATCH (Lote Importação) ---
    const { itens } = req.body;
    if (!itens || !Array.isArray(itens)) throw new Error('Itens inválidos');

    const enriched = [];
    for (const item of itens) {
      let match = null;

      if (item.sku_informado) {
        const skuLimpo = String(item.sku_informado).trim();
        const results = await db
          .select()
          .from(skuComponente)
          .where(ilike(skuComponente.codigo, skuLimpo))
          .limit(1);
        if (results.length > 0) match = results[0];
        else {
          const resMateriais = await db.execute(
            sql`SELECT id, sku as codigo, nome, preco_custo as "precoUnitario" FROM materiais WHERE sku ILIKE ${skuLimpo} AND tenant_id = ${tenantId}::uuid LIMIT 1`,
          );
          if (resMateriais.rows.length > 0) match = resMateriais.rows[0];
        }
      }

      if (!match && item.nome) {
        const results = await db
          .select()
          .from(skuComponente)
          .where(
            or(
              ilike(skuComponente.nome, `%${item.nome}%`),
              ilike(skuComponente.codigo, `%${item.nome}%`),
            ),
          )
          .limit(1);
        if (results.length > 0) match = results[0];
      }

      enriched.push({
        ...item,
        produto_id: match?.id || null,
        sku_encontrado: match?.codigo || match?.sku || null,
        status: match ? 'encontrado' : 'nao_encontrado',
        custoUnitario: match?.precoUnitario || match?.custoUnitario || 0,
      });
    }
    return res.status(200).json({ success: true, data: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const handleMatchSKUs = withTenant(handleMatchSKUsCore);
