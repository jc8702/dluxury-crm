import { describe, test, expect } from 'vitest';
import {
  calcularValorFinal,
  calcularCustoFinanceiro,
  calcularPercentualEncargo,
  calcularValorComUrgencia,
} from '../utils/financeCalculations';

describe('financeCalculations', () => {
  describe('calcularValorFinal', () => {
    test('retorna valor base quando 1 parcela', () => {
      expect(calcularValorFinal(1000, 0.03, 1)).toBe(1000);
    });

    test('aplica juros compostos sobre N parcelas (taxa decimal)', () => {
      // 1000 * (1.02)^3 = 1061.208
      expect(calcularValorFinal(1000, 0.02, 3)).toBeCloseTo(1061.208, 2);
    });

    test('converte taxa percentual > 1 para decimal', () => {
      // 2% = 0.02, mesmo resultado do teste anterior
      expect(calcularValorFinal(1000, 2, 3)).toBeCloseTo(1061.208, 2);
    });

    test('retorna valor base quando 0 parcelas', () => {
      expect(calcularValorFinal(1000, 0.03, 0)).toBe(1000);
    });
  });

  describe('calcularCustoFinanceiro', () => {
    test('diferenca entre valor final e base', () => {
      expect(calcularCustoFinanceiro(1000, 1100)).toBe(100);
    });
  });

  describe('calcularPercentualEncargo', () => {
    test('percentual de encargos sobre base', () => {
      // (1100 - 1000) / 1000 * 100 = 10%
      expect(calcularPercentualEncargo(1000, 1100)).toBeCloseTo(10);
    });

    test('retorna 0 quando base e zero', () => {
      expect(calcularPercentualEncargo(0, 100)).toBe(0);
    });
  });

  describe('calcularValorComUrgencia', () => {
    test('aplica adicional percentual', () => {
      expect(calcularValorComUrgencia(1000, 0.15)).toBe(1150);
    });

    test('retorna mesmo valor quando adicional zero', () => {
      expect(calcularValorComUrgencia(1000, 0)).toBe(1000);
    });
  });
});
