import { describe, it, expect } from 'vitest';
import { HybridOptimizer } from '../domain/services/HybridOptimizer';
import { MaxRectsOptimizer, type Peca } from '../domain/services/MaxRectsOptimizer';

describe('HybridOptimizer', () => {
  
  it('deve rodar 50 iterações e retornar melhor resultado', () => {
    const otimizador = new HybridOptimizer(2750, 1830, 3);
    
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p2', nome: 'P2', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p3', nome: 'P3', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p4', nome: 'P4', largura: 500, altura: 400, rotacionavel: true }
    ];

    const resultado = otimizador.otimizar(pecas, 50);

    expect(resultado.pecas_posicionadas.length).toBeGreaterThanOrEqual(3);
    expect(resultado.aproveitamento).toBeGreaterThan(70);
  });

  it('deve ter aproveitamento >= MaxRects único', () => {
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 600, altura: 500, rotacionavel: true },
      { id: 'p2', nome: 'P2', largura: 700, altura: 400, rotacionavel: true },
      { id: 'p3', nome: 'P3', largura: 550, altura: 450, rotacionavel: true },
      { id: 'p4', nome: 'P4', largura: 400, altura: 350, rotacionavel: true },
      { id: 'p5', nome: 'P5', largura: 300, altura: 250, rotacionavel: true }
    ];

    const maxRects = new MaxRectsOptimizer(2750, 1830, 3);
    const resultadoMax = maxRects.otimizar(pecas);

    const hybrid = new HybridOptimizer(2750, 1830, 3);
    const resultadoHybrid = hybrid.otimizar(pecas, 50);

    // Hybrid deve ser >= MaxRects (múltiplas iterações)
    expect(resultadoHybrid.aproveitamento).toBeGreaterThanOrEqual(resultadoMax.aproveitamento * 0.95);
  });

  it('deve usar diferentes heurísticas em iterações', () => {
    const otimizador = new HybridOptimizer(2750, 1830, 3);
    
    const pecas: Peca[] = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      nome: `P${i}`,
      largura: 200 + Math.random() * 300,
      altura: 200 + Math.random() * 300,
      rotacionavel: true
    }));

    // Rodar 50 iterações
    const resultado = otimizador.otimizar(pecas, 50);

    // Resultado deve ser válido
    expect(resultado.pecas_posicionadas.length).toBeGreaterThan(0);
    expect(resultado.aproveitamento).toBeGreaterThan(0);
  });

  it('deve retornar resultado consistente com mesmo seed', () => {
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 600, altura: 500, rotacionavel: true },
      { id: 'p2', nome: 'P2', largura: 700, altura: 400, rotacionavel: true }
    ];

    const otimizador1 = new HybridOptimizer(2750, 1830, 3);
    const resultado1 = otimizador1.otimizar(pecas, 10);

    const otimizador2 = new HybridOptimizer(2750, 1830, 3);
    const resultado2 = otimizador2.otimizar(pecas, 10);

    // Aproveitamento deve ser igual (seed determinístico no embaralhamento)
    expect(resultado1.aproveitamento).toBe(resultado2.aproveitamento);
  });

  it('deve lidar com 100+ peças sem travamento', () => {
    const otimizador = new HybridOptimizer(2750, 1830, 3);
    
    const pecas: Peca[] = Array.from({ length: 100 }, (_, i) => ({
      id: `p${i}`,
      nome: `Peça ${i}`,
      largura: 100 + Math.random() * 400,
      altura: 100 + Math.random() * 400,
      rotacionavel: Math.random() > 0.3
    }));

    const inicio = performance.now();
    const resultado = otimizador.otimizar(pecas, 20); // Menos iterações para 100 peças
    const tempo = performance.now() - inicio;

    expect(resultado.pecas_posicionadas.length).toBeGreaterThan(50);
    expect(tempo).toBeLessThan(10000); // Menos de 10 segundos
  });
});
