import { describe, test, expect } from 'vitest';
import {
  calcularM2Peca,
  aplicarPerdaCorte,
  precoCustoPorM2,
  custoPeca,
  calcularMetrosFita,
  calcularCustoTotal,
  calcularPrecoVenda,
  calcularImposto,
  calcularMargemReal,
  markupParaMargem,
} from '../utils/precificacao';

describe('precificacao', () => {
  describe('calcularM2Peca', () => {
    test('calcula area em m2 a partir de cm', () => {
      expect(calcularM2Peca(100, 200)).toBeCloseTo(2);
    });

    test('retorna 0 para dimensoes zero', () => {
      expect(calcularM2Peca(0, 200)).toBe(0);
    });
  });

  describe('aplicarPerdaCorte', () => {
    test('aplica fator de perda percentual', () => {
      expect(aplicarPerdaCorte(10, 10)).toBeCloseTo(11);
    });

    test('retorna m2 inalterado quando perda zero', () => {
      expect(aplicarPerdaCorte(10, 0)).toBe(10);
    });
  });

  describe('precoCustoPorM2', () => {
    test('divide preco da chapa pela area em m2', () => {
      // chapa 2.75m x 1.83m = 5.0325 m2
      expect(precoCustoPorM2(503.25, 2750, 1830)).toBeCloseTo(100, 1);
    });

    test('retorna 0 quando area da chapa e zero', () => {
      expect(precoCustoPorM2(100, 0, 1830)).toBe(0);
    });
  });

  describe('custoPeca', () => {
    test('multiplica m2 pelo custo por m2', () => {
      expect(custoPeca(2, 50)).toBe(100);
    });
  });

  describe('calcularMetrosFita', () => {
    test('soma lados topo e base', () => {
      const lados = { topo: true, base: true, esquerda: false, direita: false };
      expect(calcularMetrosFita(200, 100, lados)).toBeCloseTo(4);
    });

    test('soma todos os lados quando todos ativos', () => {
      const lados = { topo: true, base: true, esquerda: true, direita: true };
      expect(calcularMetrosFita(100, 50, lados)).toBeCloseTo(3);
    });

    test('retorna 0 sem nenhum lado', () => {
      const lados = { topo: false, base: false, esquerda: false, direita: false };
      expect(calcularMetrosFita(100, 50, lados)).toBe(0);
    });
  });

  describe('calcularCustoTotal', () => {
    test('soma pecas + ferragens + fita + extras', () => {
      expect(
        calcularCustoTotal({
          custoPecas: 100,
          custoFerragens: 50,
          custoFita: 25,
          custosExtras: 25,
        }),
      ).toBe(200);
    });
  });

  describe('calcularPrecoVenda', () => {
    test('aplica markup sobre custo', () => {
      expect(calcularPrecoVenda(100, 1.8)).toBe(180);
    });
  });

  describe('calcularImposto', () => {
    test('calcula aliquota sobre preco de venda', () => {
      expect(calcularImposto(1000, 6)).toBeCloseTo(60);
    });
  });

  describe('calcularMargemReal', () => {
    test('calcula margem apos custo e imposto', () => {
      // (1000 - 600 - 60) / 1000 = 0.34
      expect(calcularMargemReal(1000, 600, 60)).toBeCloseTo(0.34);
    });

    test('retorna 0 quando preco de venda e zero', () => {
      expect(calcularMargemReal(0, 100, 0)).toBe(0);
    });
  });

  describe('markupParaMargem', () => {
    test('calcula markup para margem 40% com imposto 6%', () => {
      // 1 / (1 - 0.40 - 0.06) = 1 / 0.54
      expect(markupParaMargem(40, 6)).toBeCloseTo(1.8518, 3);
    });

    test('retorna 1 quando denominador <= 0', () => {
      expect(markupParaMargem(120, 0)).toBe(1);
    });
  });
});
