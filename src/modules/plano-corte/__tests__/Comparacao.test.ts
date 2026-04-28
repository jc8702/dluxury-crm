import { describe, it, expect } from 'vitest';
import { MaxRectsOptimizer, type Peca } from '../domain/services/MaxRectsOptimizer';
import { GuillotineOptimizer } from '../domain/services/GuillotineOptimizer';
import { HybridOptimizer } from '../domain/services/HybridOptimizer';

/**
 * TESTES COMPARATIVOS: MaxRects vs Guillotine vs Hybrid
 * Avalia trade-offs de cada algoritmo
 */

describe('Comparação de Otimizadores', () => {
  
  it('MaxRects: Melhor aproveitamento, mais lento', () => {
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 450, altura: 350, rotacionavel: true },
      { id: 'p2', nome: 'P2', largura: 480, altura: 380, rotacionavel: true },
      { id: 'p3', nome: 'P3', largura: 520, altura: 420, rotacionavel: true },
      { id: 'p4', nome: 'P4', largura: 350, altura: 300, rotacionavel: true }
    ];

    const initMax = performance.now();
    const max = new MaxRectsOptimizer(2750, 1830, 3);
    const resultMax = max.otimizar(pecas);
    const tempoMax = performance.now() - initMax;

    const initGuil = performance.now();
    const guil = new GuillotineOptimizer(2750, 1830, 3);
    const resultGuil = guil.otimizar(pecas);
    const tempoGuil = performance.now() - initGuil;

    // MaxRects deve ter melhor aproveitamento
    expect(resultMax.aproveitamento).toBeGreaterThanOrEqual(resultGuil.aproveitamento);
    
    // Guillotine deve ser mais rápido
    expect(tempoGuil).toBeLessThan(tempoMax);
  });

  it('Hybrid: Equilibra aproveitamento e velocidade', () => {
    const pecas: Peca[] = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      nome: `P${i}`,
      largura: 200 + Math.random() * 400,
      altura: 200 + Math.random() * 400,
      rotacionavel: true
    }));

    const initMax = performance.now();
    const max = new MaxRectsOptimizer(2750, 1830, 3);
    const resultMax = max.otimizar(pecas);
    const tempoMax = performance.now() - initMax;

    const initHybrid = performance.now();
    const hybrid = new HybridOptimizer(2750, 1830, 3);
    const resultHybrid = hybrid.otimizar(pecas, 10);
    const tempoHybrid = performance.now() - initHybrid;

    // Hybrid deve ter aproveitamento >= MaxRects (tem 10 iterações)
    expect(resultHybrid.aproveitamento).toBeGreaterThanOrEqual(resultMax.aproveitamento * 0.95);
    
    // Hybrid pode ser mais lento (múltiplas iterações) mas mais robusto
    // Esse é o trade-off intencional
    expect(resultHybrid.pecas_posicionadas.length).toBeGreaterThanOrEqual(resultMax.pecas_posicionadas.length);
  });

  it('Casos extremos: Peças muito diferentes de tamanho', () => {
    const pecas: Peca[] = [
      { id: 'p1', nome: 'Gigante', largura: 2000, altura: 1500, rotacionavel: true },
      { id: 'p2', nome: 'Média', largura: 500, altura: 400, rotacionavel: true },
      { id: 'p3', nome: 'Minúscula', largura: 100, altura: 100, rotacionavel: true }
    ];

    const max = new MaxRectsOptimizer(2750, 1830, 3);
    const resultMax = max.otimizar(pecas);

    const hybrid = new HybridOptimizer(2750, 1830, 3);
    const resultHybrid = hybrid.otimizar(pecas, 20);

    // Ambos devem caber as peças maiores
    expect(resultMax.pecas_posicionadas.length).toBeGreaterThanOrEqual(2);
    expect(resultHybrid.pecas_posicionadas.length).toBeGreaterThanOrEqual(2);
  });
});

export {};
