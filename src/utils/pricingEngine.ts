/**
 * MOTOR DE CÁLCULO DE CUSTO E PRECIFICAÇÃO INDUSTRIAL
 * Especialista: Engenharia de Custos para Marcenaria Sob Medida
 */

// --- 1. MODELOS (TYPES / INTERFACES) ---

import { PricingConfigSchema } from './pricingConfig.js';

export interface SKUConsumo {
  skuId: string;
  categoria: string;
  quantidade: number;
  custoMedio: number;
}

export interface ProjetoInput {
  tipoProjeto: string;
  tempoProducaoMinutos: number;
  itens: SKUConsumo[];
}

export interface ResultadoPreco {
  custoMaterial: number;
  custoMaoDeObra: number;
  custoTotal: number;
  precoFinal: number;
  margem: number;
  alertas: string[];
}

// --- 2. FUNÇÕES AUXILIARES ---

/**
 * Calcula o custo bruto de todos os materiais consumidos
 */
const calcularCustoMaterial = (itens: SKUConsumo[]): { total: number; alertas: string[] } => {
  let custoTotal = 0;
  const alertas: string[] = [];

  for (const item of itens) {
    if (item.custoMedio <= 0) {
      alertas.push(`SKU sem custo: ${item.skuId}`);
    }
    custoTotal += item.quantidade * item.custoMedio;
  }

  return { total: custoTotal, alertas };
};

/**
 * Calcula o custo de mão de obra baseado no tempo e custo/hora
 */
const calcularMaoDeObra = (tempoMinutos: number, custoHora: number): number => {
  const custoMinuto = custoHora / 60;
  return tempoMinutos * custoMinuto;
};

/**
 * Aplica markup nos materiais baseado na categoria utilizando o fallback da config
 */
const calcularPrecoMaterialComMarkup = (
  itens: SKUConsumo[],
  config: PricingConfigSchema
): number => {
  return itens.reduce((total, item) => {
    // Busca do config com fallback
    const markup = config.markupCategoria[item.categoria] ?? config.fallbacks.markupCategoria;
    return total + (item.quantidade * item.custoMedio * markup);
  }, 0);
};

// --- 3. FUNÇÃO PRINCIPAL ---

/**
 * Executa o fluxo completo de precificação industrial
 */
export function calcularPrecoProjeto(
  input: ProjetoInput,
  config: PricingConfigSchema
): ResultadoPreco {
  const alertas: string[] = [];

  // 3.1 Custo Material Bruto
  const { total: custoMaterial, alertas: alertasMateriais } = calcularCustoMaterial(input.itens);
  alertas.push(...alertasMateriais);

  // 3.2 Custo Mão de Obra
  const custoMaoDeObra = calcularMaoDeObra(input.tempoProducaoMinutos, config.custoHora);

  // 3.3 Custo Total
  const custoTotal = custoMaterial + custoMaoDeObra;

  // 3.4 Aplicação de Markups
  // Primeiro calculamos o preço base do material com markup de categoria (usando fallbacks)
  const precoMaterialMarkup = calcularPrecoMaterialComMarkup(input.itens, config);
  
  // Somamos com a mão de obra
  let precoFinal = precoMaterialMarkup + custoMaoDeObra;

  // Aplicamos o markup do tipo de projeto (com fallback)
  const markupProjeto = config.markupProjeto[input.tipoProjeto] ?? config.fallbacks.markupProjeto;
  precoFinal = precoFinal * markupProjeto;

  // 3.5 Cálculo de Margem Real
  const margem = precoFinal > 0 ? (precoFinal - custoTotal) / precoFinal : 0;

  // 3.6 VALIDAÇÕES E ALERTAS
  if (custoTotal <= 0) alertas.push("Custo inválido");
  if (margem < config.margemMinima) alertas.push("Margem abaixo do mínimo");

  return {
    custoMaterial,
    custoMaoDeObra,
    custoTotal,
    precoFinal: parseFloat(precoFinal.toFixed(2)),
    margem: parseFloat(margem.toFixed(4)),
    alertas
  };
}

// --- 4. EXEMPLO DE USO ---

/*
const meuProjeto: ProjetoInput = {
  tipoProjeto: 'Cozinha',
  tempoProducaoMinutos: 480, // 8 horas
  itens: [
    { skuId: 'MDF-BR-18', categoria: 'Chapa', quantidade: 3, custoMedio: 250 },
    { skuId: 'FITA-BR-22', categoria: 'Fita', quantidade: 20, custoMedio: 2 },
    { skuId: 'DOB-SLO', categoria: 'Ferragem', quantidade: 12, custoMedio: 15 }
  ]
};

const minhaConfig: ConfiguracaoPreco = {
  custoHora: 45,
  markupCategoria: {
    'Chapa': 1.6,
    'Fita': 2.0,
    'Ferragem': 1.4
  },
  markupProjeto: {
    'Cozinha': 1.2,
    'Dormitorio': 1.1
  },
  margemMinima: 0.25
};

const resultado = calcularPrecoProjeto(meuProjeto, minhaConfig);
console.log(resultado);
*/
