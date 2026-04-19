import type { PlanoDeCorte } from '../../domain/entities/CuttingPlan';

const API_BASE = '/api/plano-corte';

export const planoDeCorteRepository = {
  async listar(): Promise<PlanoDeCorte[]> {
    const res = await fetch(API_BASE);
    const data = await res.json();
    return data.success ? data.data : [];
  },

  async buscarPorId(id: string): Promise<PlanoDeCorte | null> {
    const res = await fetch(`${API_BASE}?id=${id}`);
    const data = await res.json();
    return data.success ? data.data : null;
  },

  async criar(plano: Partial<PlanoDeCorte>): Promise<PlanoDeCorte> {
    const res = await fetch(`${API_BASE}?action=criar_plano`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plano)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async salvarResultado(planoId: string, materiais: any[], resultado: any, KPIs: any): Promise<void> {
    const res = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano_id: planoId, materiais, resultado, KPIs })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async aprovarProducao(materiaisConsumidos: { sku: string, qtd: number }[]): Promise<void> {
    const res = await fetch(`${API_BASE}?action=aprovar_producao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materiais_consumidos: materiaisConsumidos })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async buscarChapas(termo: string): Promise<any[]> {
    const q = encodeURIComponent(termo);
    const res = await fetch(`/api/chapas?q=${q}`);
    const data = await res.json();
    const primary = data.success ? data.data : [];

    // Always try to enrich results with engineering SKUs and basic SKUs
    const [fallbackRes, engRes, engGeralRes] = await Promise.all([
      fetch('/api/skus'),
      fetch(`/api/engenharia/skus?q=${q}`),
      fetch('/api/engineering')
    ]);

    const fallbackData = await fallbackRes.json().catch(() => ({ success: false }));
    const engData = await engRes.json().catch(() => ({ success: false }));
    const engGeralData = await engGeralRes.json().catch(() => ({ success: false }));

    const fallbackList = fallbackData.success ? fallbackData.data : [];
    const engList = engData.success ? engData.data : [];
    const engGeralList = engGeralData.success ? engGeralData.data : [];

    const term = termo.trim().toLowerCase();

    const mappedFallback = (fallbackList || []).map((item: any) => ({
      id: item.id,
      sku: item.sku,
      nome: item.nome,
      largura_mm: 2750,
      altura_mm: 1830,
      espessura_mm: 18,
      tipo_material: 'MDF',
      cor: 'Branco',
      preco_unitario: Number(item.preco_base || 0),
    }));

    const mappedEng = (engList || []).map((item: any) => ({
      id: item.id || item.sku,
      sku: item.sku || item.codigo_modelo || item.id,
      nome: item.nome || item.descricao || item.codigo_modelo,
      largura_mm: Number(item.largura_mm || item.width_mm || 2750),
      altura_mm: Number(item.altura_mm || item.height_mm || 1830),
      espessura_mm: Number(item.espessura_mm || 18),
      tipo_material: item.tipo_material || 'MDF',
      cor: item.cor || 'Branco'
    }));

    const mappedEngGeral = (engGeralList || [])
      .filter((item: any) =>
        String(item.codigo_modelo || '').toLowerCase().includes(term) ||
        String(item.nome || '').toLowerCase().includes(term)
      )
      .map((item: any) => ({
        id: item.codigo_modelo || item.id,
        sku: item.codigo_modelo || item.id,
        nome: item.nome || item.descricao || item.codigo_modelo,
        // largura_padrao likely in cm in engineering module; fallback to mm defaults
        largura_mm: Number((item.largura_padrao ? Number(item.largura_padrao) * 10 : 2750)),
        altura_mm: Number((item.altura_padrao ? Number(item.altura_padrao) * 10 : 1830)),
        espessura_mm: 18,
        tipo_material: 'MDF',
        cor: 'Branco'
      }));

    // Combine primary results with fallback and engineering-derived items; dedupe by SKU
    const combined = [ ...(primary || []), ...mappedFallback, ...mappedEng, ...mappedEngGeral ];
    const seen = new Set<string>();
    const filtered = combined
      .filter((item: any) => {
        const s = String(item.sku || item.id || '').toLowerCase();
        if (!s) return false;
        if (seen.has(s)) return false;
        // filter by search term
        const matches = s.includes(term) || String(item.nome || '').toLowerCase().includes(term);
        if (!matches) return false;
        seen.add(s);
        return true;
      })
      .slice(0, 20);

    return filtered.map((item: any) => ({
      id: item.id,
      sku: item.sku,
      nome: item.nome,
      largura_mm: item.largura_mm || 2750,
      altura_mm: item.altura_mm || 1830,
      espessura_mm: item.espessura_mm || 18,
      tipo_material: item.tipo_material || 'MDF',
      cor: item.cor || 'Branco',
      preco_unitario: Number(item.preco_unitario || item.preco_base || 0),
    }));
  },

  async buscarEngenharia(termo: string): Promise<any[]> {
    const res = await fetch(`/api/engenharia/skus?q=${encodeURIComponent(termo)}`);
    const data = await res.json();
    return data.success ? data.data : [];
  },

  async buscarEngenhariaGeral(termo: string): Promise<any[]> {
    const res = await fetch('/api/engineering');
    const data = await res.json();
    const list = data.success ? data.data : [];
    const term = termo.trim().toLowerCase();
    return list.filter((item: any) =>
      String(item.codigo_modelo || '').toLowerCase().includes(term) ||
      String(item.nome || '').toLowerCase().includes(term),
    );
  },

  async listarSkusBasicos(): Promise<any[]> {
    const res = await fetch('/api/skus');
    const data = await res.json();
    return data.success ? data.data : [];
  }
};
