import { describe, it, expect } from 'vitest';
import { recalculatePrices, calculateAverageMarkup, DEFAULT_MARKUP } from '../utils/calculations';

describe('recalculatePrices — precificação por markup (MK)', () => {
  it('deve aplicar custo × MK ao alterar o MK (260 × 3 = 780)', () => {
    const { price, markup, margin } = recalculatePrices('markup', 3, {
      custoUnitarioCalculado: 260,
      precoVendaUnitario: 0,
      markup: 1.5,
    });

    expect(price).toBe(780);
    expect(markup).toBe(3);
    // Margem real derivada: (780 / 260 - 1) * 100
    expect(margin).toBeCloseTo(200, 5);
  });

  it('deve manter o MK e recalcular o preço ao alterar o custo', () => {
    const { price, markup } = recalculatePrices('cost', 100, {
      custoUnitarioCalculado: 260,
      precoVendaUnitario: 780,
      markup: 3,
    });

    expect(markup).toBe(3);
    expect(price).toBe(300);
  });

  it('deve derivar o MK quando o preço é digitado à mão', () => {
    const { price, markup, margin } = recalculatePrices('price', 500, {
      custoUnitarioCalculado: 250,
      precoVendaUnitario: 0,
      markup: 1.5,
    });

    expect(price).toBe(500);
    expect(markup).toBe(2);
    expect(margin).toBeCloseTo(100, 5);
  });

  it('deve usar o MK padrão quando o item ainda não tem markup', () => {
    const { price, markup } = recalculatePrices('cost', 200, {
      custoUnitarioCalculado: 0,
      precoVendaUnitario: 0,
      markup: undefined,
    });

    expect(markup).toBe(DEFAULT_MARKUP);
    expect(price).toBe(200 * DEFAULT_MARKUP);
  });

  it('deve zerar preço e margem quando o custo é zero', () => {
    const { price, margin } = recalculatePrices('markup', 3, {
      custoUnitarioCalculado: 0,
      precoVendaUnitario: 0,
      markup: 1.5,
    });

    expect(price).toBe(0);
    expect(margin).toBe(0);
  });
});

describe('calculateAverageMarkup — MK médio do orçamento', () => {
  it('deve retornar a média simples dos MKs', () => {
    const media = calculateAverageMarkup([{ markup: 3 }, { markup: 2 }, { markup: 1 }]);

    expect(media).toBeCloseTo(2, 5);
  });

  it('deve refletir a alteração de um MK individual', () => {
    expect(calculateAverageMarkup([{ markup: 3 }, { markup: 3 }])).toBeCloseTo(3, 5);
    // Um item muda de MK 3 para 1 → média cai de 3 para 2
    expect(calculateAverageMarkup([{ markup: 3 }, { markup: 1 }])).toBeCloseTo(2, 5);
  });

  it('deve tratar item sem MK (legado) como MK padrão', () => {
    const media = calculateAverageMarkup([{ markup: 3 }, { markup: null }]);

    expect(media).toBeCloseTo((3 + DEFAULT_MARKUP) / 2, 5);
  });

  it('deve retornar null quando não há itens', () => {
    expect(calculateAverageMarkup([])).toBeNull();
    expect(calculateAverageMarkup(undefined)).toBeNull();
    expect(calculateAverageMarkup(null)).toBeNull();
  });
});
