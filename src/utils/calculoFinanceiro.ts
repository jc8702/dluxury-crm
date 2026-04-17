// Fórmula: valor_base × (1 + taxa_mensal)^n_parcelas
export function calcularValorFinal(
  valorBase: number,
  taxaMensal: number,
  nParcelas: number
): number {
  if (nParcelas <= 1) return valorBase;
  // Convertendo taxa de percentual (ex: 3) para decimal (0.03) se necessário
  const taxa = taxaMensal > 1 ? taxaMensal / 100 : taxaMensal;
  return valorBase * Math.pow(1 + taxa, nParcelas);
}

// Custo financeiro em R$
export function calcularCustoFinanceiro(
  valorBase: number,
  valorFinal: number
): number {
  return valorFinal - valorBase;
}

// Percentual de encargo
export function calcularPercentualEncargo(
  valorBase: number,
  valorFinal: number
): number {
  if (valorBase === 0) return 0;
  return ((valorFinal - valorBase) / valorBase) * 100;
}

// Prazo com urgência
export function calcularValorComUrgencia(
  valorFinal: number,
  adicionalPct: number // ex: 0.15
): number {
  return valorFinal * (1 + adicionalPct);
}

