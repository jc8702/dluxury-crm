import { create, all } from 'mathjs';

const math = create(all);

export interface BOMItem {
  sku_id: string;
  componente_nome: string;
  formula_quantidade: string;
  formula_perda: string;
  tipo_regra: string;
}

/**
 * Motor de Cálculo para o Backend
 */
export async function calculateBOM(paramsJson: any, bom: BOMItem[]) {
  const context: Record<string, number> = {};
  
  // Normalizar parâmetros para caixa alta
  Object.entries(paramsJson || {}).forEach(([key, val]) => {
    context[key.toUpperCase()] = Number(val);
  });

  return bom.map(item => {
    let formula = item.formula_quantidade;

    // Mapeamento de regras rápidas
    if (item.tipo_regra === 'AREA') {
      formula = '(L * A) / 1000000';
    } else if (item.tipo_regra === 'PERIMETRO') {
      formula = '(2 * (L + A)) / 1000';
    }

    try {
      // 1. Calcular Qtd Líquida
      const rawQty = math.evaluate(formula, context);
      const liquidQty = typeof rawQty === 'number' ? rawQty : 0;

      // 2. Fator de Perda
      const lossFactor = math.evaluate(item.formula_perda || '1.10', context);
      const qtyWithLoss = liquidQty * (typeof lossFactor === 'number' ? lossFactor : 1.10);

      // 3. Arredondamento Técnico
      // Note: Para parafusos e ferragens (peças inteiras), arredondar para cima.
      // Para chapas (m2) ou fitas (m), manter 4 decimais.
      const isDiscrete = item.tipo_regra === 'FIXO' || (!item.tipo_regra && liquidQty >= 1);
      const finalQty = isDiscrete ? Math.ceil(qtyWithLoss) : Number(qtyWithLoss.toFixed(4));

      return {
        sku_id: item.sku_id,
        nome: item.componente_nome,
        quantidade_liquida: Number(liquidQty.toFixed(4)),
        quantidade_com_perda: finalQty
      };
    } catch (err) {
      console.error('Erro no cálculo industrial:', err);
      return { sku_id: item.sku_id, nome: item.componente_nome, quantidade_liquida: 0, quantidade_com_perda: 0 };
    }
  });
}
