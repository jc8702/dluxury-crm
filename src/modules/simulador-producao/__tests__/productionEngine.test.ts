import { describe, it, expect } from 'vitest';
import { simulateProductionScenario } from '../domain/productionEngine';

describe('simulateProductionScenario', () => {
  it('deve recomendar fluxo contínuo quando o overlap reduz o makespan', () => {
    const result = simulateProductionScenario([
      {
        id: 'porta',
        nome: 'Porta',
        largura: 2100,
        altura: 700,
        quantidade: 1,
        fio_de_fita: { topo: true, baixo: true, esquerda: true, direita: true },
      },
      {
        id: 'prateleira',
        nome: 'Prateleira',
        largura: 800,
        altura: 350,
        quantidade: 3,
        fio_de_fita: { topo: true },
      },
    ]);

    expect(result.flow.makespanMinutes).toBeLessThan(result.batch.makespanMinutes);
    expect(result.recommended.id).toBe('fluxo_continuo');
    expect(result.bufferRecommendation).toBeGreaterThanOrEqual(1);
  });

  it('deve ignorar a coladeira para peças sem fita', () => {
    const result = simulateProductionScenario([
      {
        id: 'fundo',
        nome: 'Fundo',
        largura: 2100,
        altura: 600,
        quantidade: 1,
        fio_de_fita: {},
      },
    ]);

    expect(result.totalBandProcessMinutes).toBe(0);
    expect(result.bottleneck).toBe('esquadrejadeira');
  });
});
