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

// NOTA: as funcões abaixo foram refatoradas em algum momento para usar um único
// statement combinado (INSERT...SELECT...ON CONFLICT / UPDATE...FROM...WHERE) em vez
// do padrão anterior de "SELECT o consumo, depois fazer loop de INSERT/UPDATE por SKU".
// Os testes originais assumiam o padrão antigo (2-3 chamadas a `sql`), o que não só
// falhava como deixava valores de mockResolvedValueOnce não consumidos vazando para
// os testes seguintes (poluição de estado entre testes). Reescrito para refletir o
// comportamento real: cada função faz exatamente 1 chamada a `sql`.

describe('_inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reserveStockForProject', () => {
    it('deve executar o INSERT...SELECT...ON CONFLICT em uma única chamada', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);

      await reserveStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0][0]).toContain('INSERT INTO erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain('ON CONFLICT');
    });

    it('deve propagar o erro se o banco falhar', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(sql).mockRejectedValueOnce(dbError);

      await expect(reserveStockForProject('item-1', 'tenant-1')).rejects.toThrow(
        'Database connection failed',
      );
      expect(sql).toHaveBeenCalledTimes(1);
    });
  });

  describe('writeOffStockForProject', () => {
    it('deve executar o UPDATE de baixa em uma única chamada', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);

      await writeOffStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0][0]).toContain('UPDATE erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain(
        'estoque_atual = ei.estoque_atual - cr.quantidade_com_perda',
      );
      expect(sql.mock.calls[0][0].join('')).toContain(
        'estoque_reservado = ei.estoque_reservado - cr.quantidade_com_perda',
      );
    });

    it('deve propagar erro', async () => {
      vi.mocked(sql).mockRejectedValueOnce(new Error('DB Error'));
      await expect(writeOffStockForProject('item-1', 'tenant-1')).rejects.toThrow('DB Error');
      expect(sql).toHaveBeenCalledTimes(1);
    });
  });

  describe('writeOffStockForProjectBatch', () => {
    it('deve executar o UPDATE de baixa em lote (por projeto) em uma única chamada', async () => {
      const { writeOffStockForProjectBatch } = await import('../_inventory.js');
      vi.mocked(sql).mockResolvedValueOnce([]);

      await writeOffStockForProjectBatch('proj-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0][0]).toContain('UPDATE erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain('JOIN erp_project_items pi');
    });

    it('deve propagar erro', async () => {
      const { writeOffStockForProjectBatch } = await import('../_inventory.js');
      vi.mocked(sql).mockRejectedValueOnce(new Error('DB Error'));
      await expect(writeOffStockForProjectBatch('proj-1', 'tenant-1')).rejects.toThrow('DB Error');
    });
  });

  describe('releaseStockForProject', () => {
    it('deve executar o UPDATE de liberação de reserva em uma única chamada', async () => {
      vi.mocked(sql).mockResolvedValueOnce([]);

      await releaseStockForProject('item-1', 'tenant-1');

      expect(sql).toHaveBeenCalledTimes(1);
      expect(sql.mock.calls[0][0][0]).toContain('UPDATE erp_inventory');
      expect(sql.mock.calls[0][0].join('')).toContain(
        'estoque_reservado = ei.estoque_reservado - cr.quantidade_com_perda',
      );
    });

    it('deve propagar erro', async () => {
      vi.mocked(sql).mockRejectedValueOnce(new Error('DB Error'));
      await expect(releaseStockForProject('item-1', 'tenant-1')).rejects.toThrow('DB Error');
      expect(sql).toHaveBeenCalledTimes(1);
    });
  });
});
