import type { Peca } from '../../plano-corte/domain/services/MaxRectsOptimizer';

/**
 * INTERFACE: Entrada para cálculo de custos
 */
export interface CalculoCustoInput {
  layouts: Array<{
    tipo: 'retalho' | 'chapa_inteira';
    chapa_sku: string;
    largura_original_mm: number;
    altura_original_mm: number;
    area_aproveitada_mm2: number;
    pecas_posicionadas: Peca[];
  }>;
  pecas: Peca[];
  ferragens: Array<{ sku: string; descricao: string; quantidade: number }>;
  sku_chapa: string;
  preco_chapa?: number; // Override preço padrão
  precos_ferragem?: Record<string, number>; // Override preços
  margem_minima?: number; // Default: 0.30 (30%)
}

/**
 * INTERFACE: Resultado do cálculo
 */
export interface ResultadoCustos {
  material: {
    chapas: Array<{
      sku: string;
      quantidade: number;
      preco_unitario: number;
      preco_total: number;
      aproveitamento: number;
      fator_desperdicio: number;
    }>;
    retalhos_economia: number; // Quanto economizou usando retalhos
    ferragens: Array<{
      sku: string;
      descricao: string;
      quantidade: number;
      preco_unitario: number;
      preco_total: number;
    }>;
    subtotal: number;
  };
  
  processamento: {
    corte_chapa: { tempo_horas: number; preco_hora: number; preco_total: number };
    furação: { tempo_horas: number; preco_hora: number; preco_total: number };
    aplicacao_fita: { tempo_horas: number; preco_hora: number; preco_total: number };
    montagem: { tempo_horas: number; preco_hora: number; preco_total: number };
    acabamento: { tempo_horas: number; preco_hora: number; preco_total: number };
    subtotal: number;
    detalhes: string;
  };
  
  indiretos: {
    administrativo: { percentual: number; preco_total: number };
    logistica: { percentual: number; preco_total: number };
    subtotal: number;
  };
  
  resumo: {
    custo_material: number;
    custo_processamento: number;
    custo_indiretos: number;
    custo_total: number;
  };
  
  margem: {
    margem_minima_percentual: number;
    preco_venda_com_margem: number;
    markup: number;
  };
  
  preco_venda: number;
  
  // Detalhes para auditoria
  detalhes: {
    chapas_novas: number;
    retalhos_utilizados: number;
    numero_pecas: number;
    tempo_producao_total_horas: number;
    aproveitamento_medio: number;
  };
}

/**
 * CLASSE: CustosService
 * 
 * Implementa cálculo de custos industriais reais.
 */
export class CustosService {
  private db: any;
  private logger: any;

  constructor(db: any, logger?: any) {
    this.db = db;
    this.logger = logger || console;
  }

  /**
   * MÉTODO PÚBLICO: Calcular custos completos
   */
  async calcularCompleto(input: CalculoCustoInput): Promise<ResultadoCustos> {
    try {
      // 1. Calcular custo de material (chapas + ferragens)
      const custoMaterial = await this.calcularCustoMaterial(input);

      // 2. Calcular custo de processamento (MOD)
      const custoProcessamento = this.calcularCustoProcessamento(input);

      // 3. Calcular custos indiretos
      const custoIndiretos = this.calcularCustosIndiretos(
        custoMaterial.subtotal + custoProcessamento.subtotal
      );

      // 4. Calcular custo total
      const custoTotal =
        custoMaterial.subtotal +
        custoProcessamento.subtotal +
        custoIndiretos.subtotal;

      // 5. Aplicar margem mínima e calcular preço de venda
      const margem_minima = input.margem_minima || 0.30;
      const preco_venda = custoTotal / (1 - margem_minima);
      const markup = preco_venda / custoTotal;

      // 6. Calcular estatísticas
      const detalhes = this.calcularDetalhes(input);

      // 7. Montar resposta
      const resultado: ResultadoCustos = {
        material: custoMaterial,
        processamento: custoProcessamento,
        indiretos: custoIndiretos,
        resumo: {
          custo_material: custoMaterial.subtotal,
          custo_processamento: custoProcessamento.subtotal,
          custo_indiretos: custoIndiretos.subtotal,
          custo_total: custoTotal
        },
        margem: {
          margem_minima_percentual: margem_minima,
          preco_venda_com_margem: preco_venda,
          markup
        },
        preco_venda,
        detalhes
      };

      this.logger.info(
        `[CUSTOS] Projeto: R$ ${custoTotal.toFixed(2)} custo → ` +
        `R$ ${preco_venda.toFixed(2)} venda (${markup.toFixed(2)}x)`
      );

      return resultado;

    } catch (erro) {
      this.logger.error('[CUSTOS] Erro ao calcular custos:', erro);
      throw erro;
    }
  }

  private async calcularCustoMaterial(input: CalculoCustoInput) {
    const chapasMap = new Map<string, { quantidade: number; area: number }>();
    let retalhos_economia = 0;

    for (const layout of input.layouts) {
      if (layout.tipo === 'chapa_inteira') {
        const key = layout.chapa_sku;
        const atual = chapasMap.get(key) || { quantidade: 0, area: 0 };
        atual.quantidade += 1;
        atual.area = layout.largura_original_mm * layout.altura_original_mm;
        chapasMap.set(key, atual);
      } else if (layout.tipo === 'retalho') {
        retalhos_economia += layout.area_aproveitada_mm2 / 1000000;
      }
    }

    const chapas: ResultadoCustos['material']['chapas'] = [];
    let custoChapas = 0;

    for (const [sku, dados] of chapasMap.entries()) {
      const preco_unitario = input.preco_chapa || (await this.buscarPrecoChapaParaSKU(sku));
      const preco_total = dados.quantidade * preco_unitario;
      const aproveitamento = this.calcularAproveitamentoParaLayout(
        input.layouts.filter(l => l.chapa_sku === sku && l.tipo === 'chapa_inteira'),
        dados.area
      );
      const fator_desperdicio = 1 / (aproveitamento / 100);

      chapas.push({
        sku,
        quantidade: dados.quantidade,
        preco_unitario,
        preco_total,
        aproveitamento,
        fator_desperdicio
      });

      custoChapas += preco_total;
    }

    const ferragens: ResultadoCustos['material']['ferragens'] = [];
    let custoFerragens = 0;

    for (const ferragem of input.ferragens) {
      const preco_unitario =
        input.precos_ferragem?.[ferragem.sku] ||
        (await this.buscarPrecoFerragemParaSKU(ferragem.sku));

      const preco_total = ferragem.quantidade * preco_unitario;

      ferragens.push({
        sku: ferragem.sku,
        descricao: ferragem.descricao,
        quantidade: ferragem.quantidade,
        preco_unitario,
        preco_total
      });

      custoFerragens += preco_total;
    }

    return {
      chapas,
      retalhos_economia,
      ferragens,
      subtotal: custoChapas + custoFerragens
    };
  }

  private calcularCustoProcessamento(input: CalculoCustoInput) {
    const numero_pecas = input.pecas.length;

    const tempo_corte = (numero_pecas * 5) / 60;
    const preco_hora_corte = 50;
    const custo_corte = tempo_corte * preco_hora_corte;

    const perimet_total = input.pecas.reduce((sum, p) => sum + 2 * (p.largura + p.altura), 0);
    const tempo_furação = (perimet_total / 300) * 2 / 60;
    const preco_hora_furação = 50;
    const custo_furação = tempo_furação * preco_hora_furação;

    const tempo_fita = numero_pecas * 1.5 / 60;
    const preco_hora_fita = 35;
    const custo_fita = tempo_fita * preco_hora_fita;

    const tempo_montagem = numero_pecas * 10 / 60;
    const preco_hora_montagem = 45;
    const custo_montagem = tempo_montagem * preco_hora_montagem;

    const tempo_acabamento = numero_pecas * 5 / 60;
    const preco_hora_acabamento = 40;
    const custo_acabamento = tempo_acabamento * preco_hora_acabamento;

    const subtotal = custo_corte + custo_furação + custo_fita + custo_montagem + custo_acabamento;

    return {
      corte_chapa: { tempo_horas: parseFloat(tempo_corte.toFixed(2)), preco_hora: preco_hora_corte, preco_total: custo_corte },
      furação: { tempo_horas: parseFloat(tempo_furação.toFixed(2)), preco_hora: preco_hora_furação, preco_total: custo_furação },
      aplicacao_fita: { tempo_horas: parseFloat(tempo_fita.toFixed(2)), preco_hora: preco_hora_fita, preco_total: custo_fita },
      montagem: { tempo_horas: parseFloat(tempo_montagem.toFixed(2)), preco_hora: preco_hora_montagem, preco_total: custo_montagem },
      acabamento: { tempo_horas: parseFloat(tempo_acabamento.toFixed(2)), preco_hora: preco_hora_acabamento, preco_total: custo_acabamento },
      subtotal,
      detalhes: `${numero_pecas} peças, ≈ ${(tempo_corte + tempo_furação + tempo_fita + tempo_montagem + tempo_acabamento).toFixed(1)}h total`
    };
  }

  private calcularCustosIndiretos(custo_direto: number) {
    const percentual_admin = 0.08;
    const custo_admin = custo_direto * percentual_admin;

    const percentual_logistica = 0.05;
    const custo_logistica = custo_direto * percentual_logistica;

    return {
      administrativo: { percentual: percentual_admin, preco_total: custo_admin },
      logistica: { percentual: percentual_logistica, preco_total: custo_logistica },
      subtotal: custo_admin + custo_logistica
    };
  }

  private calcularAproveitamentoParaLayout(layouts: any[], area_chapa: number): number {
    const area_usada = layouts.reduce((sum, l) => sum + l.area_aproveitada_mm2, 0);
    return area_chapa > 0 ? (area_usada / area_chapa) * 100 : 0;
  }

  private async buscarPrecoChapaParaSKU(sku: string): Promise<number> {
    if (sku.includes('MDF-18')) return 240;
    if (sku.includes('MDF-25')) return 320;
    return 250;
  }

  private async buscarPrecoFerragemParaSKU(sku: string): Promise<number> {
    const precosDefault: Record<string, number> = {
      'FER-0001': 28, 'FER-0002': 12, 'FER-0003': 8, 'FER-0004': 5, 'FER-0005': 15
    };
    return precosDefault[sku] || 10;
  }

  private calcularDetalhes(input: CalculoCustoInput) {
    const chapas_novas = input.layouts.filter(l => l.tipo === 'chapa_inteira').length;
    const retalhos_utilizados = input.layouts.filter(l => l.tipo === 'retalho').length;
    const numero_pecas = input.pecas.length;

    const area_total = input.layouts.reduce((sum, l) => sum + l.largura_original_mm * l.altura_original_mm, 0);
    const area_usada = input.layouts.reduce((sum, l) => sum + l.area_aproveitada_mm2, 0);
    const aproveitamento = area_total > 0 ? (area_usada / area_total) * 100 : 0;

    return {
      chapas_novas,
      retalhos_utilizados,
      numero_pecas,
      tempo_producao_total_horas: 0, // Simplificado
      aproveitamento_medio: parseFloat(aproveitamento.toFixed(2))
    };
  }
}
