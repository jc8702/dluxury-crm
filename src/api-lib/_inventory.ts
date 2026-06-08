import { sql } from './_db.js';
import { logger } from './logger.js';

export async function reserveStockForProject(projectItemId: string, tenantId: string) {
  try {
    await sql`
      INSERT INTO erp_inventory (sku_id, estoque_reservado, tenant_id)
      SELECT cr.sku_id, cr.quantidade_com_perda, ${tenantId}::uuid
      FROM erp_consumption_results cr
      WHERE cr.project_item_id = ${projectItemId} AND cr.tenant_id = ${tenantId}::uuid
      ON CONFLICT (sku_id, tenant_id) 
      DO UPDATE SET estoque_reservado = erp_inventory.estoque_reservado + EXCLUDED.estoque_reservado
    `;
  } catch (err) {
    logger.error('Erro ao reservar estoque:', err);
    throw err;
  }
}

export async function writeOffStockForProject(projectItemId: string, tenantId: string) {
  try {
    await sql`
      UPDATE erp_inventory ei
      SET estoque_atual = ei.estoque_atual - cr.quantidade_com_perda,
          estoque_reservado = ei.estoque_reservado - cr.quantidade_com_perda
      FROM erp_consumption_results cr
      WHERE cr.sku_id = ei.sku_id
        AND cr.project_item_id = ${projectItemId}
        AND cr.tenant_id = ${tenantId}::uuid
        AND ei.tenant_id = ${tenantId}::uuid
    `;
  } catch (err) {
    logger.error('Erro ao dar baixa no estoque:', err);
    throw err;
  }
}

export async function writeOffStockForProjectBatch(projectId: string, tenantId: string) {
  try {
    await sql`
      UPDATE erp_inventory ei
      SET estoque_atual = ei.estoque_atual - cr.quantidade_com_perda,
          estoque_reservado = ei.estoque_reservado - cr.quantidade_com_perda
      FROM erp_consumption_results cr
      JOIN erp_project_items pi ON pi.id = cr.project_item_id AND pi.tenant_id = ${tenantId}::uuid
      WHERE cr.sku_id = ei.sku_id
        AND pi.project_id = ${projectId}
        AND cr.tenant_id = ${tenantId}::uuid
        AND ei.tenant_id = ${tenantId}::uuid
    `;
  } catch (err) {
    logger.error('Erro ao dar baixa em lote no estoque:', err);
    throw err;
  }
}

export async function releaseStockForProject(projectItemId: string, tenantId: string) {
  try {
    await sql`
      UPDATE erp_inventory ei
      SET estoque_reservado = ei.estoque_reservado - cr.quantidade_com_perda
      FROM erp_consumption_results cr
      WHERE cr.sku_id = ei.sku_id
        AND cr.project_item_id = ${projectItemId}
        AND cr.tenant_id = ${tenantId}::uuid
        AND ei.tenant_id = ${tenantId}::uuid
    `;
  } catch (err) {
    logger.error('Erro ao liberar reserva de estoque:', err);
    throw err;
  }
}
