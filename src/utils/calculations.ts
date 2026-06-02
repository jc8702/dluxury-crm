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

export const recalculatePrices = (
  type: 'cost' | 'price' | 'margin',
  value: number,
  currentDraft: any,
) => {
  const cost = type === 'cost' ? value : currentDraft.custoUnitarioCalculado || 0;
  let price = type === 'price' ? value : currentDraft.precoVendaUnitario || 0;
  let margin = type === 'margin' ? value : currentDraft.margemLucro || 0;

  if (type === 'margin') {
    price = cost * (1 + value / 100);
  } else if (type === 'price') {
    margin = cost > 0 ? (price / cost - 1) * 100 : 0;
  } else if (type === 'cost') {
    price = cost * (1 + margin / 100);
  }

  return { cost, price, margin };
};

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const calculateMargin = (profit: number, revenue: number): number =>
  revenue > 0 ? (profit / revenue) * 100 : 0;
