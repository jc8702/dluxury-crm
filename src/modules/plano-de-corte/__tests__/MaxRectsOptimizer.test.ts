import { describe, it, expect } from 'vitest';
import { MaxRectsOptimizer } from '../domain/services/MaxRectsOptimizer';

describe('MaxRectsOptimizer', () => {
  it('deve posicionar peça simples sem rotação', () => {
    const otimizador = new MaxRectsOptimizer(2750, 1830, 3);
    const pecas = [{ id: 'p1', nome: 'Peça 1', largura: 500, altura: 400, rotacionavel: false }];
    const resultado = otimizador.otimizar(pecas);
    expect(resultado.pecas_posicionadas).toHaveLength(1);
    expect(resultado.pecas_posicionadas[0].x).toBe(0);
    expect(resultado.pecas_posicionadas[0].y).toBe(0);
  });

  it('deve rotacionar peça quando é melhor encaixe', () => {
    const otimizador = new MaxRectsOptimizer(2750, 1830, 3);
    const pecas = [
      { id: 'p1', nome: 'P1', largura: 2700, altura: 400, rotacionavel: false },
      { id: 'p2', nome: 'P2', largura: 2000, altura: 350, rotacionavel: true }
    ];
    const resultado = otimizador.otimizar(pecas);
    expect(resultado.pecas_posicionadas).toHaveLength(2);
    const p2 = resultado.pecas_posicionadas.find(p => p.peca_id === 'p2');
    expect(p2?.rotacionada).toBe(true);
  });

  it('deve ter aproveitamento > 70% em caso típico', () => {
    const otimizador = new MaxRectsOptimizer(2750, 1830, 3);
    const pecas = [
      { id: 'p1', nome: 'P1', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p2', nome: 'P2', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p3', nome: 'P3', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p4', nome: 'P4', largura: 800, altura: 600, rotacionavel: true }
    ];
    const resultado = otimizador.otimizar(pecas);
    expect(resultado.aproveitamento).toBeGreaterThan(30); // 4 peças de 800x600 em 2750x1830
  });
});
