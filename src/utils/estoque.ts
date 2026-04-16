// Converte quantidade de unidade_compra para unidade_uso
export function converterParaUso(
  qtdCompra: number,
  fatorConversao: number
): number {
  return (qtdCompra || 0) * (fatorConversao || 1);
}

// Converte quantidade de unidade_uso para unidade_compra
export function converterParaCompra(
  qtdUso: number,
  fatorConversao: number
): number {
  return (qtdUso || 0) / (fatorConversao || 1);
}

// Verifica se está abaixo do mínimo
export function abaixoDoMinimo(
  estoqueAtual: number,
  estoqueMinimo: number
): boolean {
  return (estoqueAtual || 0) <= (estoqueMinimo || 0);
}

// Status do estoque
export function statusEstoque(
  estoqueAtual: number,
  estoqueMinimo: number
): 'ok' | 'alerta' | 'critico' | 'zerado' {
  const atual = Number(estoqueAtual || 0);
  const minimo = Number(estoqueMinimo || 0);

  if (atual === 0) return 'zerado';
  if (atual <= minimo) return 'critico';
  if (atual <= minimo * 1.5) return 'alerta';
  return 'ok';
}

// Valor total em estoque
export function valorEmEstoque(
  estoqueAtual: number,
  precoCusto: number
): number {
  return (estoqueAtual || 0) * (precoCusto || 0);
}
