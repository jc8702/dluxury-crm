import { create, all } from 'mathjs';

const math = create(all);

export type RuleType = 'FIXO' | 'AREA' | 'PERIMETRO' | 'PARAMETRICO';

export interface BOMItem {
  id: string;
  sku_id: string;
  componente_nome: string;
  formula_quantidade: string;
  formula_perda: string;
  tipo_regra: RuleType;
}

export interface CalculationResult {
  sku_id: string;
  nome: string;
  quantidade_liquida: number;
  quantidade_com_perda: number;
  unidade: string;
}

/**
 * BOMEngine - Motor de Cálculo Industrial de Consumo
 */
export class BOMEngine {
  /**
   * Calcula o consumo de um item baseado em parâmetros dimensionais
   * @param params Variáveis (L, A, P, qtd_gavetas, etc.)
   * @param bom Itens da estrutura
   */
  static calculate(params: Record<string, number>, bom: BOMItem[]): CalculationResult[] {
    // Normalizar parâmetros para caixa alta (padrão industrial)
    const context: Record<string, number> = {};
    Object.entries(params).forEach(([key, val]) => {
      context[key.toUpperCase()] = Number(val);
    });

    return bom.map(item => {
      let formula = item.formula_quantidade;

      // Mapeamento automático de regras pré-definidas
      switch (item.tipo_regra) {
        case 'AREA':
          formula = '(L * A) / 1000000'; // Assume L e A em mm para m2
          break;
        case 'PERIMETRO':
          formula = '(2 * (L + A)) / 1000'; // Perímetro em metros lineares
          break;
        case 'FIXO':
          // Se for fixo e a fórmula não for um número, tenta avaliar como expressão constante
          break;
        case 'PARAMETRICO':
        default:
          // Usa a formula_quantidade diretamente
          break;
      }

      try {
        // 1. Calcular Quantidade Líquida
        const rawQty = math.evaluate(formula, context);
        const liquidQty = typeof rawQty === 'number' ? rawQty : 0;

        // 2. Calcular Fator de Perda
        // A perda também pode ser uma fórmula (ex: depende da cor ou material)
        const lossFactor = math.evaluate(item.formula_perda || '1', context);
        const qtyWithLoss = liquidQty * (typeof lossFactor === 'number' ? lossFactor : 1);

        // 3. Aplicar Arredondamento conforme tipo (Simplificado para este MVP)
        // Em um sistema real, buscaríamos a unidade do SKU para decidir.
        // Aqui assumimos: quantidade > 1 e unidade discreta -> CEIL
        const finalQty = qtyWithLoss > 0 && liquidQty < 1 ? Number(qtyWithLoss.toFixed(4)) : Math.ceil(qtyWithLoss);

        return {
          sku_id: item.sku_id,
          nome: item.componente_nome,
          quantidade_liquida: Number(liquidQty.toFixed(4)),
          quantidade_com_perda: finalQty,
          unidade: 'un' // Placeholder, deve vir do SKU
        };
      } catch (err) {
        console.error(`Erro ao processar BOM para item ${item.componente_nome}:`, err);
        return {
          sku_id: item.sku_id,
          nome: item.componente_nome,
          quantidade_liquida: 0,
          quantidade_com_perda: 0,
          unidade: 'ERRO'
        };
      }
    });
  }
}
