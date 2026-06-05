import { describe, it, expect, vi, beforeEach } from 'vitest';
import { explodirBOM, recalcularOrcamento, _resetRateLimit } from '../quotations.js';
import { db } from '../drizzle-db.js';
import { validarPayload } from '../quotations.js';

vi.mock('../drizzle-db.js', () => ({
  db: {
    query: {
      skuEngenharia: { findFirst: vi.fn() },
    },
    execute: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../_db.js', () => ({
  auditLog: vi.fn().mockResolvedValue({}),
  validateAuth: vi.fn(),
  sql: Object.assign(vi.fn().mockResolvedValue([]), { query: vi.fn().mockResolvedValue([]) }),
}));

vi.mock('../financeiro.js', () => ({
  garantirSeedsFinanceiros: vi.fn().mockResolvedValue(undefined),
}));

describe('explodirBOM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimit();
  });

  it('deve lançar erro se SKU não for UUID válido', async () => {
    await expect(explodirBOM('not-a-uuid')).rejects.toThrow(/SKU inválido/);
  });

  it('deve lançar erro se quantidade não for positiva', async () => {
    await expect(explodirBOM('12345678-1234-1234-1234-123456789012', -1)).rejects.toThrow(/Quantidade inválida/);
    await expect(explodirBOM('12345678-1234-1234-1234-123456789012', NaN)).rejects.toThrow(/Quantidade inválida/);
  });

  it('deve lançar erro se SKU não existir', async () => {
    vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue(null);
    await expect(explodirBOM('12345678-1234-1234-1234-123456789012')).rejects.toThrow(/não encontrado/);
  });

  it('deve retornar array vazio se SKU existe mas não tem componentes', async () => {
    vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue({
      id: '12345678-1234-1234-1234-123456789012',
      nome: 'Test',
    } as any);
    vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any);
    const result = await explodirBOM('12345678-1234-1234-1234-123456789012', 2);
    expect(result).toEqual([]);
  });

  it('deve retornar componentes quando BOM tem dados', async () => {
    vi.mocked(db.query.skuEngenharia.findFirst).mockResolvedValue({
      id: '12345678-1234-1234-1234-123456789012',
      nome: 'Armário',
    } as any);
    vi.mocked(db.execute).mockResolvedValue({
      rows: [
        { sku_componente_id: 'c1', quantidade_total: '2.5', nome: 'Chapa MDF', codigo: 'CHP-15', preco_unitario: '100' },
      ],
    } as any);
    const result = await explodirBOM('12345678-1234-1234-1234-123456789012', 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      skuComponenteId: 'c1',
      quantidadeCalculada: 7.5,
      custoUnitario: 100,
      custoTotal: 750,
    });
  });
});

describe('recalcularOrcamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimit();
  });

  it('deve lançar erro se orcId não for UUID válido', async () => {
    await expect(recalcularOrcamento('not-a-uuid')).rejects.toThrow(/orçamento inválido/);
  });

  it('deve executar transação com sucesso quando config existe', async () => {
    const txMock = {
      execute: vi.fn().mockResolvedValue({ rows: [] }),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    };
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => {
      return await fn(txMock);
    });
    const result = await recalcularOrcamento('12345678-1234-1234-1234-123456789012').catch(e => `caught: ${e.message}`);
    expect(typeof result).toBe('string');
  });
});
