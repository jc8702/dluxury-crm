import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  bootstrapFinanceiro,
  garantirSeedsFinanceiros,
} from '../financeiro.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn().mockResolvedValue([]),
  validateAuth: vi.fn().mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null }),
}));

const { sql } = await import('../_db.js');

describe('bootstrapFinanceiro', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deve executar todas as migrations idempotentemente sem erro', async () => {
    await bootstrapFinanceiro();
    expect(vi.mocked(sql)).toHaveBeenCalled();
  });

  it('deve resolver sem rejeitar (idempotente em chamadas repetidas)', async () => {
    await expect(bootstrapFinanceiro()).resolves.toBeUndefined();
    await expect(bootstrapFinanceiro()).resolves.toBeUndefined();
  });

  it('deve capturar erros individuais de ALTER TABLE sem abortar o bootstrap', async () => {
    vi.mocked(sql).mockImplementation(async () => {
      throw new Error('Connection lost');
    });
    await expect(bootstrapFinanceiro()).resolves.toBeUndefined();
  });
});

describe('garantirSeedsFinanceiros', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deve inserir classes financeiras e contas quando não existem', async () => {
    vi.mocked(sql).mockImplementation(async (q: any) => {
      const sqlText = String(q?.[0] || '').toLowerCase();
      if (sqlText.includes('select count(*) as count from contas_internas')) return [{ count: '0' }];
      if (sqlText.includes('select count(*) as count from formas_pagamento')) return [{ count: '0' }];
      return [];
    });
    await garantirSeedsFinanceiros('00000000-0000-0000-0000-000000000000');
    expect(vi.mocked(sql)).toHaveBeenCalled();
  });

  it('deve pular inserção de contas_internas quando já existem', async () => {
    vi.mocked(sql).mockImplementation(async (q: any) => {
      const sqlText = String(q?.[0] || '').toLowerCase();
      if (sqlText.includes('select count(*) as count from contas_internas')) return [{ count: '5' }];
      if (sqlText.includes('select count(*) as count from formas_pagamento')) return [{ count: '0' }];
      return [];
    });
    await garantirSeedsFinanceiros('00000000-0000-0000-0000-000000000000');
  });

  it('deve pular inserção de formas_pagamento quando já existem', async () => {
    vi.mocked(sql).mockImplementation(async (q: any) => {
      const sqlText = String(q?.[0] || '').toLowerCase();
      if (sqlText.includes('select count(*) as count from contas_internas')) return [{ count: '0' }];
      if (sqlText.includes('select count(*) as count from formas_pagamento')) return [{ count: '4' }];
      return [];
    });
    await garantirSeedsFinanceiros('00000000-0000-0000-0000-000000000000');
  });

  it('deve tratar resposta vazia do count de contas_internas (length = 0)', async () => {
    vi.mocked(sql).mockImplementation(async (q: any) => {
      const sqlText = String(q?.[0] || '').toLowerCase();
      if (sqlText.includes('select count(*) as count from contas_internas')) return [];
      if (sqlText.includes('select count(*) as count from formas_pagamento')) return [{ count: '0' }];
      return [];
    });
    await garantirSeedsFinanceiros('00000000-0000-0000-0000-000000000000');
  });

  it('deve tratar resposta vazia do count de formas_pagamento (length = 0)', async () => {
    vi.mocked(sql).mockImplementation(async (q: any) => {
      const sqlText = String(q?.[0] || '').toLowerCase();
      if (sqlText.includes('select count(*) as count from contas_internas')) return [{ count: '0' }];
      if (sqlText.includes('select count(*) as count from formas_pagamento')) return [];
      return [];
    });
    await garantirSeedsFinanceiros('00000000-0000-0000-0000-000000000000');
  });

  it('deve logar erro e não propagar se qualquer seed falhar', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(sql).mockImplementation(async (q: any) => {
      const sqlText = String(q?.[0] || '').toLowerCase();
      if (sqlText.includes('select count(*) as count from contas_internas')) {
        throw new Error('seed failure');
      }
      return [];
    });
    await expect(garantirSeedsFinanceiros('t1')).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('[ERRO GARANTIR SEEDS FINANCEIROS]', 'seed failure');
    consoleSpy.mockRestore();
  });
});
