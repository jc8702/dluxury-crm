import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRentabilidade, autoCreateCustosReaisOP } from '../rentabilidade.js';

vi.mock('../_db.js', () => ({
  sql: vi.fn(),
  validateAuth: vi.fn(),
}));

const { sql, validateAuth } = await import('../_db.js');

function mockRes() {
  let sc = 200, jd: any = null;
  const self: any = {
    status: vi.fn((c: number) => { sc = c; return self; }),
    json: vi.fn((d: any) => { jd = d; return self; }),
    end: vi.fn(() => self),
    _s: () => sc,
    _d: () => jd,
  };
  return self;
}

describe('handleRentabilidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1', tenantId: '00000000-0000-0000-0000-000000000000' }, error: null });
  });

  it('deve retornar 401 se não estiver autorizado', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'Token inválido' });
    const req = { method: 'GET', url: '/kpi', query: {}, body: {} };
    const res = mockRes();
    await handleRentabilidade(req, res);
    expect(res._s()).toBe(401);
  });

  it('deve retornar KPIs de rentabilidade (GET /kpi)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      return [
        { receita_total: '10000', custo_total: '7000', margem_total: '3000', margem_media_percentual: '30' }
      ];
    });

    const req = { method: 'GET', url: '/kpi', query: { periodo: 'mes' }, body: {} };
    const res = mockRes();
    await handleRentabilidade(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().receita_total).toBe(10000);
    expect(res._d().custo_total).toBe(7000);
    expect(res._d().margem_total).toBe(3000);
  });

  it('deve retornar lista de projetos (GET /projetos)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { id: 1, orcamento_id: 'o-uuid', numero_op: 'OP-001', valor_venda: '5000', margem_percentual_real: '35', status: 'lucrativo' }
    ] as any);

    const req = { method: 'GET', url: '/projetos', query: {}, body: {} };
    const res = mockRes();
    await handleRentabilidade(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().projetos).toHaveLength(1);
    expect(res._d().projetos[0].valor_venda).toBe(5000);
  });

  it('deve retornar alertas críticos de margem desvia > 20% ou negativa (GET /alertas)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { orcamento_id: 'o-uuid', numero_op: 'OP-002', cliente: 'Cliente X', variacao_percentual: '25', margem_percentual_real: '-5', descricao_desvios: 'Mão de obra excedeu' }
    ] as any);

    const req = { method: 'GET', url: '/alertas', query: {}, body: {} };
    const res = mockRes();
    await handleRentabilidade(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().alertas).toHaveLength(1);
    expect(res._d().alertas[0].variacao_percentual).toBe(25);
  });

  it('deve retornar rentabilidade agrupada por cliente (GET /por-cliente)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { cliente: 'Cliente A', total_pedidos: '3', total_vendido: '15000', margem_total: '4500', margem_media_percentual: '30', score_rentabilidade: '6' }
    ] as any);

    const req = { method: 'GET', url: '/por-cliente', query: {}, body: {} };
    const res = mockRes();
    await handleRentabilidade(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().clientes).toHaveLength(1);
    expect(res._d().clientes[0].total_pedidos).toBe(3);
  });

  it('deve retornar dados de tendência de preços e margem (GET /grafico-margem)', async () => {
    vi.mocked(sql).mockResolvedValue([
      { mes_ano: '05/2026', margem_estimada: '35', margem_real: '32' }
    ] as any);

    const req = { method: 'GET', url: '/grafico-margem', query: {}, body: {} };
    const res = mockRes();
    await handleRentabilidade(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
    expect(res._d().dados).toHaveLength(1);
    expect(res._d().dados[0].mes).toBe('05/2026');
  });

  it('deve atualizar os custos reais de uma OP (POST /salvar)', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('SELECT * FROM custos_reais_op')) {
        return [{ id: 10, orcamento_id: 'o-uuid', custo_total_estimado: '4000', valor_venda: '6000' }];
      }
      if (qStr.includes('UPDATE custos_reais_op')) {
        return [{ id: 10, custo_total_real: 4200, variacao_percentual: 5 }];
      }
      return [];
    });

    const req = {
      method: 'POST',
      url: '/salvar',
      query: {},
      body: {
        id: 10,
        custo_material_real: 2500,
        custo_mao_obra_real: 1500,
        tempo_horas_real: 24,
        custo_retrabalho: 200,
        custo_desperdicio_material: 0,
        descricao_desvios: 'Retrabalho de acabamento'
      }
    };
    const res = mockRes();
    await handleRentabilidade(req, res);

    expect(res._s()).toBe(200);
    expect(res._d().success).toBe(true);
  });
});

describe('autoCreateCustosReaisOP', () => {
  it('deve criar custos reais iniciais ao concluir OP', async () => {
    vi.mocked(sql).mockImplementation(async (query: any, ...params: any[]) => {
      let qStr = '';
      if (typeof query === 'string') {
        qStr = query;
      } else if (Array.isArray(query)) {
        qStr = query.join('?');
      } else if (query && typeof query === 'object' && 'strings' in query) {
        qStr = (query.strings as string[]).join('?');
      }

      if (qStr.includes('SELECT op.*')) {
        return [{ id: 'op-1', orcamento_id: 'o-1', valor_total_custo: '3000', valor_total_venda: '5000', margem_lucro_percentual: '40' }];
      }
      if (qStr.includes('SELECT id FROM custos_reais_op')) {
        return []; // Não existe ainda
      }
      if (qStr.includes('SELECT cliente_id FROM orcamentos_pro')) {
        return [{ cliente_id: 100 }];
      }
      if (qStr.includes('SELECT COUNT(DISTINCT cr.orcamento_id)')) {
        return [{ total_pedidos: '1', total_vendido: '5000', total_custos_reais: '3000', margem_total: '2000', margem_media_percentual: '40', ultimo_pedido_data: '2026-05-27' }];
      }
      if (qStr.includes('SELECT COUNT(*) as count FROM orcamentos_pro')) {
        return [{ count: '2' }];
      }
      if (qStr.includes('SELECT id FROM rentabilidade_cliente')) {
        return [];
      }
      return [];
    });

    await autoCreateCustosReaisOP('op-uuid', 'tenant-uuid');
    
    expect(sql).toHaveBeenCalled();
  });
});
