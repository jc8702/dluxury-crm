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
  if (!bom || !Array.isArray(bom)) return [];
  
  const context: Record<string, number> = {};
  
  // Normalizar parâmetros para caixa alta e validar se são números
  Object.entries(paramsJson || {}).forEach(([key, val]) => {
    const numVal = Number(val);
    context[key.toUpperCase()] = isNaN(numVal) ? 0 : numVal;
  });

  return bom.map(item => {
    try {
      let formula = item.formula_quantidade;

      // Validação de entrada
      if (!formula && !item.tipo_regra) {
        throw new Error(`Item ${item.componente_nome} sem fórmula ou regra definida`);
      }

      // Mapeamento de regras rápidas
      if (item.tipo_regra === 'AREA') {
        formula = '(L * A) / 1000000';
      } else if (item.tipo_regra === 'PERIMETRO') {
        formula = '(2 * (L + A)) / 1000';
      }

      // 1. Calcular Qtd Líquida
      const rawQty = math.evaluate(formula || '0', context);
      const liquidQty = typeof rawQty === 'number' && !isNaN(rawQty) ? rawQty : 0;

      // 2. Fator de Perda
      let lossFactor = 1.10;
      try {
        const rawLoss = math.evaluate(item.formula_perda || '1.10', context);
        lossFactor = typeof rawLoss === 'number' && !isNaN(rawLoss) ? rawLoss : 1.10;
      } catch (e) {
        console.warn(`Erro na fórmula de perda para ${item.componente_nome}, usando default 1.10`);
      }

      const qtyWithLoss = liquidQty * lossFactor;

      // 3. Arredondamento Técnico
      const isDiscrete = item.tipo_regra === 'FIXO' || (!item.tipo_regra && liquidQty >= 1);
      const finalQty = isDiscrete ? Math.ceil(qtyWithLoss) : Number(qtyWithLoss.toFixed(4));

      return {
        sku_id: item.sku_id,
        nome: item.componente_nome,
        quantidade_liquida: Number(liquidQty.toFixed(4)),
        quantidade_com_perda: finalQty,
        sucesso: true
      };
    } catch (err) {
      console.error(`[BOM_ENGINE_ERROR] Erro no cálculo de ${item.componente_nome}:`, err);
      return { 
        sku_id: item.sku_id, 
        nome: item.componente_nome, 
        quantidade_liquida: 0, 
        quantidade_com_perda: 0,
        sucesso: false,
        erro: err instanceof Error ? err.message : 'Erro desconhecido'
      };
    }
  });
}

