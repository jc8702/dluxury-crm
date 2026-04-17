import { sql } from './_db.js';

/**
 * Adiciona ou remove saldo reservado de um projeto
 */
export async function reserveStockForProject(projectItemId: string) {
  try {
    // 1. Buscar os resultados de consumo calculados para este item de projeto
    const consumption = await sql`
      SELECT sku_id, quantidade_com_perda 
      FROM erp_consumption_results 
      WHERE project_item_id = ${projectItemId}
    `;

    if (consumption.length === 0) return;

    // 2. Incrementar a reserva para cada SKU (Atomicamente)
    for (const item of consumption) {
      await sql`
        INSERT INTO erp_inventory (sku_id, estoque_reservado)
        VALUES (${item.sku_id}, ${item.quantidade_com_perda})
        ON CONFLICT (sku_id) 
        DO UPDATE SET estoque_reservado = erp_inventory.estoque_reservado + ${item.quantidade_com_perda}
      `;
    }
  } catch (err) {
    console.error('Erro ao reservar estoque:', err);
    throw err;
  }
}

/**
 * Converte reserva em baixa real
 */
export async function writeOffStockForProject(projectItemId: string) {
  try {
    const consumption = await sql`
      SELECT sku_id, quantidade_com_perda 
      FROM erp_consumption_results 
      WHERE project_item_id = ${projectItemId}
    `;

    if (consumption.length === 0) return;

    for (const item of consumption) {
      await sql`
        UPDATE erp_inventory 
        SET estoque_atual = estoque_atual - ${item.quantidade_com_perda},
            estoque_reservado = estoque_reservado - ${item.quantidade_com_perda}
        WHERE sku_id = ${item.sku_id}
      `;
    }
  } catch (err) {
    console.error('Erro ao dar baixa no estoque:', err);
    throw err;
  }
}

/**
 * Libera reserva (Cancelamento)
 */
export async function releaseStockForProject(projectItemId: string) {
  try {
    const consumption = await sql`
      SELECT sku_id, quantidade_com_perda 
      FROM erp_consumption_results 
      WHERE project_item_id = ${projectItemId}
    `;

    if (consumption.length === 0) return;

    for (const item of consumption) {
      await sql`
        UPDATE erp_inventory 
        SET estoque_reservado = estoque_reservado - ${item.quantidade_com_perda}
        WHERE sku_id = ${item.sku_id}
      `;
    }
  } catch (err) {
    console.error('Erro ao liberar reserva de estoque:', err);
    throw err;
  }
}

