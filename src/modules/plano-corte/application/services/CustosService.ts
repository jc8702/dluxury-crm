import { sql } from '../../../../api-lib/_db';

export interface CustoInput {
  pecas: Array<{
    largura: number;
    altura: number;
    espessura: number;
    material: string;
  }>;
  acessorios: Array<{
    sku: string;
    quantidade: number;
  }>;
}

export interface CustoCalculado {
  material: number;
  ferragens: number;
  mod: number; // Mão de Obra Direta
  desperdicio: number;
  total_custo: number;
  preco_sugerido: number;
  margem_contribuicao: number;
}

/**
 * SERVIÇO DE CUSTOS E PRECIFICAÇÃO INDUSTRIAL
 */
export class CustosService {
  private static readonly MARGEM_SEGURANCA = 1.15; // 15% desperdício técnico
  private static readonly FATOR_MOD = 1.20;       // 20% sobre material para mão de obra
  private static readonly MARKUP_DEFAULT = 2.8;   // Markup sugerido para móveis sob medida

  /**
   * CALCULAR CUSTO REAL
   * Busca preços reais no banco de dados
   */
  static async calcularCustoReal(input: CustoInput): Promise<CustoCalculado> {
    const materiaisPrecos = await this.getPrecosMateriais();
    
    let custoMaterial = 0;
    let custoFerragens = 0;

    // 1. Calcular Materiais (Chapas)
    input.pecas.forEach(p => {
      const precoM2 = materiaisPrecos[p.material] || 120; // Fallback 120/m2
      const area = (p.largura * p.altura) / 1000000;
      custoMaterial += area * precoM2;
    });

    // 2. Calcular Ferragens
    for (const item of input.acessorios) {
      const precoUni = materiaisPrecos[item.sku] || 0;
      custoFerragens += precoUni * item.quantidade;
    }

    const custoBase = custoMaterial + custoFerragens;
    const desperdicio = custoMaterial * (this.MARGEM_SEGURANCA - 1);
    const materialComDesperdicio = custoMaterial * this.MARGEM_SEGURANCA;
    
    const custoTotalMaterial = materialComDesperdicio + custoFerragens;
    const mod = custoTotalMaterial * (this.FATOR_MOD - 1);
    
    const custoFinal = custoTotalMaterial + mod;
    const precoSugerido = custoFinal * this.MARKUP_DEFAULT;

    return {
      material: Number(materialComDesperdicio.toFixed(2)),
      ferragens: Number(custoFerragens.toFixed(2)),
      mod: Number(mod.toFixed(2)),
      desperdicio: Number(desperdicio.toFixed(2)),
      total_custo: Number(custoFinal.toFixed(2)),
      preco_sugerido: Number(precoSugerido.toFixed(2)),
      margem_contribuicao: Number((((precoSugerido - custoFinal) / precoSugerido) * 100).toFixed(2))
    };
  }

  /**
   * BUSCAR PREÇOS NO DB
   */
  private static async getPrecosMateriais(): Promise<Record<string, number>> {
    try {
      const rows = await sql`
        SELECT nome, preco_custo, sku 
        FROM materiais 
        WHERE ativo = true
      `;
      
      const precos: Record<string, number> = {};
      rows.forEach((r: any) => {
        precos[r.nome] = Number(r.preco_custo);
        precos[r.sku] = Number(r.preco_custo);
      });
      
      return precos;
    } catch (e) {
      console.error("Erro ao buscar preços reais, usando simulado.");
      return {
        "MDF": 125,
        "HDF": 58,
        "FER-0001": 28,
        "FER-0002": 12
      };
    }
  }
}
