import { describe, it, expect } from 'vitest';
import { HybridOptimizer } from '../domain/services/HybridOptimizer';

describe('HybridOptimizer', () => {
  it('deve escolher o melhor algoritmo entre MaxRects e Guillotine', () => {
    // Para este teste, o Hybrid deve rodar ambos e retornar o melhor
    const otimizador = new HybridOptimizer(2750, 1830, 3);
    
    const pecas = [
      { id: 'p1', nome: 'P1', largura: 500, altura: 500, rotacionavel: true },
      { id: 'p2', nome: 'P2', largura: 500, altura: 500, rotacionavel: true },
      { id: 'p3', nome: 'P3', largura: 500, altura: 500, rotacionavel: true }
    ];

    const resultado = otimizador.otimizar(pecas, 10); // 10 iterações

    expect(resultado.pecas_posicionadas.length).toBe(3);
    expect(resultado.aproveitamento).toBeGreaterThan(0);
    expect(resultado.algoritmo_usado).toMatch(/MaxRects|Guillotine/);
  });

  it('deve lidar com lista vazia de peças', () => {
    const otimizador = new HybridOptimizer(2750, 1830, 3);
    const resultado = otimizador.otimizar([]);
    expect(resultado.pecas_posicionadas).toHaveLength(0);
    expect(resultado.aproveitamento).toBe(0);
  });
});
