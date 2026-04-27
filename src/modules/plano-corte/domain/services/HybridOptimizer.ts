import { MaxRectsOptimizer } from './MaxRectsOptimizer';
import type { Peca, ResultadoOtimizacao } from '../types';
import { GuillotineOptimizer } from './GuillotineOptimizer';

type Heuristica = 
  | 'area_desc'
  | 'perimetro_desc'
  | 'largura_desc'
  | 'altura_desc'
  | 'aleatorio';

export class HybridOptimizer {
  private larguraChapa: number;
  private alturaChapa: number;
  private kerfMm: number;

  constructor(larguraChapa: number, alturaChapa: number, kerfMm: number = 3) {
    this.larguraChapa = larguraChapa;
    this.alturaChapa = alturaChapa;
    this.kerfMm = kerfMm;
  }

  otimizar(pecas: Peca[], iteracoes: number = 50): ResultadoOtimizacao {
    let melhorResultado: ResultadoOtimizacao | null = null;
    let melhorAproveitamento = -1;

    const heuristicas: Heuristica[] = [
      'area_desc',
      'perimetro_desc',
      'largura_desc',
      'altura_desc'
    ];

    for (let i = 0; i < iteracoes; i++) {
      const usarMaxRects = i % 2 === 0;
      
      const heuristica: Heuristica = i < 4 
        ? heuristicas[i] 
        : 'aleatorio';

      const pecasOrdenadas = this.ordenarPecas(pecas, heuristica, i);

      const otimizador = usarMaxRects
        ? new MaxRectsOptimizer(this.larguraChapa, this.alturaChapa, this.kerfMm)
        : new GuillotineOptimizer(this.larguraChapa, this.alturaChapa, this.kerfMm);

      const resultado = otimizador.otimizar(pecasOrdenadas);

      if (resultado.aproveitamento > melhorAproveitamento) {
        melhorAproveitamento = resultado.aproveitamento;
        melhorResultado = resultado;
      }
    }

    return melhorResultado!;
  }

  private ordenarPecas(pecas: Peca[], heuristica: Heuristica, seed: number): Peca[] {
    const copia = [...pecas];

    switch (heuristica) {
      case 'area_desc':
        return copia.sort((a, b) => (b.largura * b.altura) - (a.largura * a.altura));
      
      case 'perimetro_desc':
        return copia.sort((a, b) => 
          ((b.largura + b.altura) * 2) - ((a.largura + a.altura) * 2)
        );
      
      case 'largura_desc':
        return copia.sort((a, b) => b.largura - a.largura);
      
      case 'altura_desc':
        return copia.sort((a, b) => b.altura - a.altura);
      
      case 'aleatorio':
        return this.embaralhar(copia, seed);
      
      default:
        return copia;
    }
  }

  private embaralhar(array: Peca[], seed: number): Peca[] {
    const resultado = [...array];
    
    let s = seed;
    const random = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    for (let i = resultado.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
    }

    return resultado;
  }
}
