import { describe, it, expect } from 'vitest';
import { HybridOptimizer } from '../HybridOptimizer';
import { PecaCorte, ChapaMaterial } from '../../entities/CuttingPlan';

describe('HybridOptimizer', () => {
  it('should optimize basic pieces using hybrid strategy', () => {
    const optimizer = new HybridOptimizer();
    
    const pecas: PecaCorte[] = [
      { id: '1', nome: 'Peca 1', largura_mm: 500, altura_mm: 500, quantidade: 2, rotacionavel: true },
      { id: '2', nome: 'Peca 2', largura_mm: 800, altura_mm: 400, quantidade: 1, rotacionavel: true }
    ];
    
    const chapasBase: ChapaMaterial[] = [
      {
        id: 'chapa1',
        sku: 'MDF-BRANCO-15MM',
        nome: 'MDF Branco 15mm',
        largura_mm: 2750,
        altura_mm: 1830,
        espessura_mm: 15,
        pecas: []
      }
    ];
    
    const kerf = 3;
    const result = optimizer.otimizar(pecas, chapasBase, kerf, 5);
    
    expect(result.layouts.length).toBeGreaterThan(0);
    expect(result.naoPosicionadas.length).toBe(0);
    expect(result.aproveitamento_percentual).toBeGreaterThan(0);
    
    const layout = result.layouts[0];
    expect(layout.pecas_posicionadas.length).toBe(3); // 2 pecas1 + 1 peca2
  });

  it('should handle pieces that are larger than the chapa', () => {
    const optimizer = new HybridOptimizer();
    
    const pecas: PecaCorte[] = [
      { id: '1', nome: 'Giant', largura_mm: 3000, altura_mm: 2000, quantidade: 1, rotacionavel: true }
    ];
    
    const chapasBase: ChapaMaterial[] = [
      {
        id: 'chapa1',
        sku: 'MDF',
        nome: 'MDF',
        largura_mm: 2750,
        altura_mm: 1830,
        espessura_mm: 15,
        pecas: []
      }
    ];
    
    const result = optimizer.otimizar(pecas, chapasBase, 3, 1);
    
    expect(result.naoPosicionadas.length).toBe(1);
    expect(result.layouts.length).toBe(0);
    expect(result.aproveitamento_percentual).toBe(0);
  });

  it('should prioritize retalhos over new chapas', () => {
    const optimizer = new HybridOptimizer();
    
    const pecas: PecaCorte[] = [
      { id: '1', nome: 'Pequena', largura_mm: 500, altura_mm: 500, quantidade: 1, rotacionavel: true }
    ];
    
    const chapasBase: ChapaMaterial[] = [
      { id: 'chapa1', sku: 'MDF', nome: 'MDF', largura_mm: 2750, altura_mm: 1830, espessura_mm: 15, pecas: [] }
    ];

    const retalhos = [
      { id: 'retalho1', sku: 'MDF', largura_mm: 600, altura_mm: 600 }
    ];
    
    const result = optimizer.otimizar(pecas, chapasBase, 3, 1, retalhos);
    
    expect(result.layouts.length).toBe(1);
    expect(result.layouts[0].chapa_sku).toBe('MDF');
    expect(result.layouts[0].largura_original_mm).toBe(600); // Usou o retalho!
  });
});
