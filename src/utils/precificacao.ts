// Área de uma peça em m²
export function calcularM2Peca(
  larguraCm: number,
  alturaCm: number
): number {
  return (larguraCm / 100) * (alturaCm / 100)
}

// m² com fator de perda de corte
export function aplicarPerdaCorte(
  m2: number,
  fatorPerda: number // ex: 0.10
): number {
  return m2 * (1 + (fatorPerda / 100))
}

// Custo da chapa por m²
// precoChapa = preço de 1 chapa inteira
// larguraMm, alturaMm = dimensões da chapa
export function precoCustoPorM2(
  precoChapa: number,
  larguraMm: number,
  alturaMm: number
): number {
  const m2Chapa = (larguraMm / 1000) * (alturaMm / 1000)
  if (!m2Chapa || m2Chapa === 0) return 0;
  return precoChapa / m2Chapa
}

// Custo total de uma peça
export function custoPeca(
  m2ComPerda: number,
  precoCustoM2: number
): number {
  return m2ComPerda * precoCustoM2
}

// Perímetro para fita de borda
// lados: array de lados que precisam de fita
export function calcularMetrosFita(
  larguraCm: number,
  alturaCm: number,
  lados: { topo: boolean; base: boolean; esquerda: boolean; direita: boolean }
): number {
  let metros = 0
  if (lados.topo) metros += larguraCm / 100
  if (lados.base) metros += larguraCm / 100
  if (lados.esquerda) metros += alturaCm / 100
  if (lados.direita) metros += alturaCm / 100
  return metros
}

// Custo total do orçamento (soma de tudo)
export function calcularCustoTotal(params: {
  custoPecas: number
  custoFerragens: number
  custoFita: number
  custosExtras: number
}): number {
  return (
    params.custoPecas +
    params.custoFerragens +
    params.custoFita +
    params.custosExtras
  )
}

// Preço de venda com markup
// markup ex: 1.80 = custo × 1.80
export function calcularPrecoVenda(
  custoTotal: number,
  markup: number
): number {
  return custoTotal * markup
}

// Imposto sobre preço de venda (por dentro)
// aliquota ex: 0.06 para 6%
export function calcularImposto(
  precoVenda: number,
  aliquota: number
): number {
  return precoVenda * (aliquota / 100)
}

// Margem real após impostos
export function calcularMargemReal(
  precoVenda: number,
  custoTotal: number,
  imposto: number
): number {
  if (!precoVenda || precoVenda === 0) return 0;
  return (precoVenda - custoTotal - imposto) / precoVenda
}

// Markup necessário para atingir margem desejada com imposto
// ex: margem 40%, imposto 6% → markup = 1 / (1 - 0.40 - 0.06)
export function markupParaMargem(
  margemDesejada: number,
  aliquota: number
): number {
  const div = (1 - (margemDesejada / 100) - (aliquota / 100));
  if (div <= 0) return 1;
  return 1 / div
}
