import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  reserveStockForProject,
  writeOffStockForProject,
  releaseStockForProject,
} from '../_inventory.js';

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
      vi.mocked(sql).mockResolvedValueOnce([]); // INSERT...SELECT com 0 linhas

      await reserveStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0].join('')).toContain('INSERT INTO erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain('SELECT cr.sku_id');
      expect(sql.mock.calls[0][0].join('')).toContain('ON CONFLICT');
    });

    it('deve incrementar a reserva para cada SKU retornado', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // INSERT...SELECT...ON CONFLICT combinado

      await reserveStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0].join('')).toContain('INSERT INTO erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain('SELECT cr.sku_id');
      expect(sql.mock.calls[0][0].join('')).toContain('ON CONFLICT');
      expect(sql.mock.calls[0][0].join('')).toContain('estoque_reservado');
    });

    it('deve propagar o erro se o banco falhar', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(sql).mockRejectedValueOnce(dbError);

      await expect(reserveStockForProject('item-1', 'tenant-1')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('writeOffStockForProject', () => {
    it('deve retornar silenciosamente se nao houver consumo', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // UPDATE...FROM com 0 linhas

      await writeOffStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0].join('')).toContain('UPDATE erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain('estoque_atual');
    });

    it('deve atualizar estoque_atual e estoque_reservado para cada SKU', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // UPDATE...FROM combinado

      await writeOffStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0].join('')).toContain('UPDATE erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain('estoque_atual = ei.estoque_atual -');
      expect(sql.mock.calls[0][0].join('')).toContain('estoque_reservado = ei.estoque_reservado -');
      expect(sql.mock.calls[0][0].join('')).toContain('FROM erp_consumption_results');
    });

    it('deve propagar erro', async () => {
      vi.mocked(sql).mockRejectedValueOnce(new Error('DB Error'));
      await expect(writeOffStockForProject('item-1', 'tenant-1')).rejects.toThrow('DB Error');
    });
  });

  describe('releaseStockForProject', () => {
    it('deve retornar silenciosamente se nao houver consumo', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // UPDATE...FROM com 0 linhas

      await releaseStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0].join('')).toContain('UPDATE erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain('estoque_reservado');
    });

    it('deve liberar reserva (reduzir estoque_reservado)', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]); // UPDATE...FROM combinado

      await releaseStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0].join('')).toContain('UPDATE erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain('estoque_reservado = ei.estoque_reservado -');
      expect(sql.mock.calls[0][0].join('')).toContain('FROM erp_consumption_results');
    });

    it('deve propagar erro', async () => {
      vi.mocked(sql).mockRejectedValueOnce(new Error('DB Error'));
      await expect(releaseStockForProject('item-1', 'tenant-1')).rejects.toThrow('DB Error');
    });
  });
});
