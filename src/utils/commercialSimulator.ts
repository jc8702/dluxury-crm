/**
 * SIMULADOR COMERCIAL DE PREÇOS E MARGENS
 * Especialista: Engenharia de Software e Comercial Industrial
 */

// --- 1. INTERFACES ---

export interface ResultadoSimulacao {
  precoSugerido: number;
  margemReal: number; // Percentual (ex: 0.35 para 35%)
}

export interface ResultadoDesconto {
  novoPreco: number;
  novaMargem: number;
  valorDesconto: number;
}

// --- 2. FUNÇÕES DE SIMULAÇÃO ---

/**
 * Calcula o preço de venda necessário para atingir uma margem específica.
 * Fórmula Financeira: Preço = Custo / (1 - Margem)
 * 
 * @param custoTotal Custo bruto de produção (materiais + mão de obra)
 * @param margemDesejada Percentual de margem pretendida (ex: 0.30 para 30%)
 */
export function simularPrecoMargem(
  custoTotal: number,
  margemDesejada: number
): ResultadoSimulacao {
  // Proteção contra divisão por zero ou margens impossíveis (>= 100%)
  if (margemDesejada >= 1) {
    throw new Error("Margem desejada deve ser menor que 100% (1.0)");
  }
  if (custoTotal < 0) {
    throw new Error("Custo total não pode ser negativo");
  }

  const precoSugerido = custoTotal / (1 - margemDesejada);
  const margemReal = precoSugerido > 0 ? (precoSugerido - custoTotal) / precoSugerido : 0;

  return {
    precoSugerido: parseFloat(precoSugerido.toFixed(2)),
    margemReal: parseFloat(margemReal.toFixed(4))
  };
}

/**
 * Simula o impacto de um desconto comercial no preço e na margem final.
 * 
 * @param precoAtual O preço de venda atual (antes do desconto)
 * @param descontoPercentual O percentual de desconto a ser aplicado (ex: 0.10 para 10%)
 * @param custoTotal O custo base para recalcular a margem resultante
 */
export function simularDesconto(
  precoAtual: number,
  descontoPercentual: number,
  custoTotal: number
): ResultadoDesconto {
  const valorDesconto = precoAtual * descontoPercentual;
  const novoPreco = precoAtual - valorDesconto;
  
  // Recalcula a margem baseada no novo preço e no custo fixo
  const novaMargem = novoPreco > 0 ? (novoPreco - custoTotal) / novoPreco : -1;

  return {
    novoPreco: parseFloat(novoPreco.toFixed(2)),
    novaMargem: parseFloat(novaMargem.toFixed(4)),
    valorDesconto: parseFloat(valorDesconto.toFixed(2))
  };
}

// --- 3. EXEMPLO DE USO COMERCIAL ---

/*
const custoBase = 1000.00;
const margemAlvo = 0.35; // 35%

// 1. Definindo Preço de Venda
const venda = simularPrecoMargem(custoBase, margemAlvo);
console.log(`Para margem de 35%, vender por: R$ ${venda.precoSugerido}`);

// 2. Simulando Negociação (Desconto)
const negociacao = simularDesconto(venda.precoSugerido, 0.10, custoBase);
console.log(`Com 10% de desconto:`);
console.log(`- Novo preço: R$ ${negociacao.novoPreco}`);
console.log(`- Margem caiu para: ${(negociacao.novaMargem * 100).toFixed(2)}%`);
*/
