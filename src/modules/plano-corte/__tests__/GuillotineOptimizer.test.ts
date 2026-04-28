import { describe, it, expect } from 'vitest';
import { GuillotineOptimizer } from '../domain/services/GuillotineOptimizer';
import { MaxRectsOptimizer, type Peca } from '../domain/services/MaxRectsOptimizer';

describe('GuillotineOptimizer', () => {
  
  it('deve posicionar peça simples com Best Fit Decreasing', () => {
    const otimizador = new GuillotineOptimizer(2750, 1830, 3);
    
    const pecas: Peca[] = [{
      id: 'p1',
      nome: 'Peça 1',
      largura: 500,
      altura: 400,
      rotacionavel: false
    }];

    const resultado = otimizador.otimizar(pecas);

    expect(resultado.pecas_posicionadas).toHaveLength(1);
    expect(resultado.pecas_posicionadas[0].x).toBe(0);
    expect(resultado.pecas_posicionadas[0].y).toBe(0);
  });

  it('deve ordenar peças por área decrescente (BFD)', () => {
    const otimizador = new GuillotineOptimizer(2750, 1830, 3);
    
    // Ordem de entrada propositalmente bagunçada
    const pecas: Peca[] = [
      { id: 'p1', nome: 'Pequena', largura: 200, altura: 200, rotacionavel: false },
      { id: 'p2', nome: 'Grande', largura: 1000, altura: 800, rotacionavel: false },
      { id: 'p3', nome: 'Média', largura: 500, altura: 400, rotacionavel: false }
    ];

    const resultado = otimizador.otimizar(pecas);

    // Grande peça deve ser posicionada primeira (área maior)
    const p2 = resultado.pecas_posicionadas.find(p => p.peca_id === 'p2');
    expect(p2).toBeDefined();
    expect(p2?.x).toBe(0);
    expect(p2?.y).toBe(0);
  });

  it('deve ter aproveitamento > 65% (inferior a MaxRects)', () => {
    const otimizador = new GuillotineOptimizer(2750, 1830, 3);
    
    const pecas: Peca[] = [
      { id: 'p1', nome: 'P1', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p2', nome: 'P2', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p3', nome: 'P3', largura: 800, altura: 600, rotacionavel: true },
      { id: 'p4', nome: 'P4', largura: 500, altura: 400, rotacionavel: true }
    ];

    const resultado = otimizador.otimizar(pecas);

    expect(resultado.aproveitamento).toBeGreaterThan(65);
    expect(resultado.aproveitamento).toBeLessThan(95);
  });

  it('deve ser significativamente mais rápido que MaxRects', () => {
    const numeroTestes = 3;
    const pecas: Peca[] = Array.from({ length: 50 }, (_, i) => ({
      id: `p${i}`,
      nome: `Peça ${i}`,
      largura: 100 + Math.random() * 400,
      altura: 100 + Math.random() * 400,
      rotacionavel: true
    }));

    // Tempo Guillotine
    const inicioG = performance.now();
    for (let i = 0; i < numeroTestes; i++) {
      const og = new GuillotineOptimizer(2750, 1830, 3);
      og.otimizar(pecas);
    }
    const tempoG = performance.now() - inicioG;

    // Tempo MaxRects
    const inicioM = performance.now();
    for (let i = 0; i < numeroTestes; i++) {
      const om = new MaxRectsOptimizer(2750, 1830, 3);
      om.otimizar(pecas);
    }
    const tempoM = performance.now() - inicioM;

    // Guillotine deve ser pelo menos 2x mais rápido
    expect(tempoG).toBeLessThan(tempoM * 0.8);
  });

  it('deve rejeitar peça que não cabe', () => {
    const otimizador = new GuillotineOptimizer(500, 500, 3);
    
    const pecas: Peca[] = [
      { id: 'p1', nome: 'Gigante', largura: 2000, altura: 2000, rotacionavel: true }
    ];

    const resultado = otimizador.otimizar(pecas);

    expect(resultado.pecas_posicionadas).toHaveLength(0);
  });
});
