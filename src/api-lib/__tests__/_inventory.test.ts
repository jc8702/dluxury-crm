import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  reserveStockForProject,
  writeOffStockForProject,
  releaseStockForProject,
} from '../_inventory.js';

vi.mock('../_db.js', () => {
  const mockSql = vi.fn() as any;
  mockSql.join = vi.fn((values: any[]) => values);
  mockSql.begin = vi.fn(async (cb: any) => cb(mockSql));
  return { sql: mockSql };
});

const { sql } = await import('../_db.js');

describe('_inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reserveStockForProject', () => {
    it('deve executar a query de inserção/reserva com sucesso', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);

      await reserveStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      const queryText = sql.mock.calls[0][0].join('');
      expect(queryText).toContain('INSERT INTO erp_inventory');
      expect(queryText).toContain(
        'estoque_reservado = erp_inventory.estoque_reservado + EXCLUDED.estoque_reservado',
      );
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
    it('deve executar a query de baixa no estoque com sucesso', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);

      await writeOffStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      const queryText = sql.mock.calls[0][0].join('');
      expect(queryText).toContain('UPDATE erp_inventory');
      expect(queryText).toContain('estoque_atual = ei.estoque_atual - cr.quantidade_com_perda');
    });

    it('deve propagar erro se o banco falhar', async () => {
      vi.mocked(sql).mockRejectedValueOnce(new Error('DB Error'));
      await expect(writeOffStockForProject('item-1', 'tenant-1')).rejects.toThrow('DB Error');
    });
  });

  describe('releaseStockForProject', () => {
    it('deve executar a query de liberação de reserva com sucesso', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);

      await releaseStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      const queryText = sql.mock.calls[0][0].join('');
      expect(queryText).toContain('UPDATE erp_inventory');
      expect(queryText).toContain(
        'estoque_reservado = ei.estoque_reservado - cr.quantidade_com_perda',
      );
    });

    it('deve propagar erro se o banco falhar', async () => {
      vi.mocked(sql).mockRejectedValueOnce(new Error('DB Error'));
      await expect(releaseStockForProject('item-1', 'tenant-1')).rejects.toThrow('DB Error');
    });
  });
});
