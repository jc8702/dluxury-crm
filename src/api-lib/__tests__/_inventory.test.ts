import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reserveStockForProject, writeOffStockForProject, releaseStockForProject } from '../_inventory.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
}));

const { sql } = await import('../_db.js');

describe('_inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reserveStockForProject', () => {
    it('deve retornar silenciosamente se nao houver consumo calculado', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // SELECT erp_consumption_results

      await reserveStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      // Verifica se a primeira chamada foi a busca do consumo
      expect(sql.mock.calls[0][0][0]).toContain('SELECT sku_id, quantidade_com_perda');
    });

    it('deve incrementar a reserva para cada SKU retornado', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([
          { sku_id: 'sku-1', quantidade_com_perda: 5 },
          { sku_id: 'sku-2', quantidade_com_perda: 10 },
        ]) // SELECT
        .mockResolvedValueOnce([]) // INSERT sku-1
        .mockResolvedValueOnce([]); // INSERT sku-2

      await reserveStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(3);
      expect(sql.mock.calls[0][0][0]).toContain('SELECT sku_id, quantidade_com_perda');
      expect(sql.mock.calls[1][0][0]).toContain('INSERT INTO erp_inventory');
      expect(sql.mock.calls[2][0][0]).toContain('INSERT INTO erp_inventory');
    });

    it('deve propagar o erro se o banco falhar', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(sql).mockRejectedValueOnce(dbError);

      await expect(reserveStockForProject('item-1', 'tenant-1')).rejects.toThrow('Database connection failed');
    });
  });

  describe('writeOffStockForProject', () => {
    it('deve retornar silenciosamente se nao houver consumo', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);

      await writeOffStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
    });

    it('deve atualizar estoque_atual e estoque_reservado para cada SKU', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([
          { sku_id: 'sku-1', quantidade_com_perda: 5 },
        ])
        .mockResolvedValueOnce([]);

      await writeOffStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(2);
      expect(sql.mock.calls[1][0][0]).toContain('UPDATE erp_inventory');
      expect(sql.mock.calls[1][0][0]).toContain('estoque_atual = estoque_atual -');
    });

    it('deve propagar erro', async () => {
      vi.mocked(sql).mockRejectedValueOnce(new Error('DB Error'));
      await expect(writeOffStockForProject('item-1', 'tenant-1')).rejects.toThrow('DB Error');
    });
  });

  describe('releaseStockForProject', () => {
    it('deve retornar silenciosamente se nao houver consumo', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);

      await releaseStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
    });

    it('deve liberar reserva (reduzir estoque_reservado)', async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([
          { sku_id: 'sku-1', quantidade_com_perda: 5 },
        ])
        .mockResolvedValueOnce([]);

      await releaseStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(2);
      expect(sql.mock.calls[1][0][0]).toContain('UPDATE erp_inventory');
      expect(sql.mock.calls[1][0][0]).toContain('estoque_reservado = estoque_reservado -');
    });

    it('deve propagar erro', async () => {
      vi.mocked(sql).mockRejectedValueOnce(new Error('DB Error'));
      await expect(releaseStockForProject('item-1', 'tenant-1')).rejects.toThrow('DB Error');
    });
  });
});
