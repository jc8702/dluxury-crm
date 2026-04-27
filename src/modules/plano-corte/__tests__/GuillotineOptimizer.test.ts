import { describe, it, expect } from 'vitest';
import { GuillotineOptimizer } from '../domain/services/GuillotineOptimizer';

describe('GuillotineOptimizer', () => {
  it('deve realizar cortes guilhotinados válidos', () => {
    const otimizador = new GuillotineOptimizer(2750, 1830, 3);
    
    const pecas = [
      { id: 'p1', nome: 'Peça 1', largura: 1000, altura: 800, rotacionavel: false },
      { id: 'p2', nome: 'Peça 2', largura: 1000, altura: 800, rotacionavel: false }
    ];

    const resultado = otimizador.otimizar(pecas);

    expect(resultado.pecas_posicionadas).toHaveLength(2);
    // Na guilhotina, as peças costumam ficar alinhadas em faixas
    expect(resultado.pecas_posicionadas[0].y).toBe(0);
    expect(resultado.pecas_posicionadas[1].y).toBe(0);
    expect(resultado.pecas_posicionadas[1].x).toBeGreaterThanOrEqual(1003); // p1.w + kerf
  });

  it('deve respeitar limites da chapa', () => {
    const otimizador = new GuillotineOptimizer(500, 500, 0);
    const pecas = [
      { id: 'p1', nome: 'Grande', largura: 600, altura: 100, rotacionavel: true }
    ];

    const resultado = otimizador.otimizar(pecas);
    // Mesmo rotacionando 100x600 não cabe em 500x500
    expect(resultado.pecas_posicionadas).toHaveLength(0);
  });
});
