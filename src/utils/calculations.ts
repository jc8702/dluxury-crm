export const parseBrazilianNumber = (val: any) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const cleanStr = String(val)
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  return parseFloat(cleanStr) || 0;
};

export const recalculateTotalMaterialCost = (draftState: any) => {
  let cost = 0;
  const { largura, altura, metadata } = draftState;
  const l = parseBrazilianNumber(largura); // mm
  const a = parseBrazilianNumber(altura); // mm

  // Chapa
  if (metadata?.chapa?.precoUnitario) {
    const areaM2 = (l * a) / 1000000;
    cost += areaM2 * Number(metadata.chapa.precoUnitario);
  }

  // Fita
  if (metadata?.fitaBorda?.sku?.precoUnitario) {
    const lados = metadata.fitaBorda.lados || {};
    let perimetroMm = 0;
    if (lados.topo) perimetroMm += l;
    if (lados.base) perimetroMm += l;
    if (lados.esquerda) perimetroMm += a;
    if (lados.direita) perimetroMm += a;
    cost += (perimetroMm / 1000) * Number(metadata.fitaBorda.sku.precoUnitario);
  }

  // Ferragens
  if (metadata?.ferragens?.length > 0) {
    metadata.ferragens.forEach((f: any) => {
      cost += (Number(f.quantidade) || 1) * Number(f.sku?.precoUnitario || 0);
    });
  }
  return cost;
};

/**
 * MK de fallback quando o item ainda não tem markup definido.
 * Espelha `CONFIG.DEFAULT_MARKUP` do backend e o default de
 * `configuracoes_precificacao.markup_padrao`.
 */
export const DEFAULT_MARKUP = 1.5;

/**
 * Precificação do item do orçamento.
 *
 * Regra comercial: **preço de venda = custo × MK** (markup multiplicador).
 * Ex.: custo R$ 260,00 com MK 3 → R$ 780,00.
 *
 * - `cost`: altera o custo e mantém o MK, recalculando o preço
 * - `markup`: altera o MK e recalcula o preço
 * - `price`: preço digitado à mão define o MK implícito (vira override)
 *
 * A margem real é sempre derivada de preço ÷ custo — nunca um valor de entrada.
 */
export const recalculatePrices = (
  type: 'cost' | 'price' | 'markup',
  value: number,
  currentDraft: any,
) => {
  const cost = type === 'cost' ? value : Number(currentDraft.custoUnitarioCalculado) || 0;
  const currentMarkup =
    Number(currentDraft.markup) > 0 ? Number(currentDraft.markup) : DEFAULT_MARKUP;

  let price = type === 'price' ? value : Number(currentDraft.precoVendaUnitario) || 0;
  let markup = currentMarkup;

  if (type === 'markup') {
    markup = value;
    price = cost * value;
  } else if (type === 'price') {
    markup = cost > 0 ? value / cost : 0;
  } else {
    price = cost * currentMarkup;
  }

  const margin = cost > 0 ? (price / cost - 1) * 100 : 0;

  return { cost, price, markup, margin };
};

/**
 * MK médio do orçamento: **média simples** dos MKs dos itens.
 *
 * Itens ainda sem MK (legado, antes do primeiro recálculo) entram com o MK padrão —
 * o mesmo valor que o backend aplica neles no recálculo.
 * Retorna `null` quando o orçamento não tem itens.
 */
export const calculateAverageMarkup = (itens: any[] | undefined | null): number | null => {
  if (!Array.isArray(itens) || itens.length === 0) return null;

  const soma = itens.reduce((acc, item) => {
    const mk = Number(item?.markup);
    return acc + (Number.isFinite(mk) && mk > 0 ? mk : DEFAULT_MARKUP);
  }, 0);

  return soma / itens.length;
};

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const calculateMargin = (profit: number, revenue: number): number =>
  revenue > 0 ? (profit / revenue) * 100 : 0;
