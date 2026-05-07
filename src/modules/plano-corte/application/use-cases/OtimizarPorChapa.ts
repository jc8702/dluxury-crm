import { MaxRectsOptimizer } from '../../domain/services/MaxRectsOptimizer';
import { ChapaSelecionada, Peca, ResultadoOtimizacaoPorChapa } from '../../domain/types';

export class OtimizarPorChapa {
  private optimizer: MaxRectsOptimizer;

  constructor(kerf: number = 3) {
    this.optimizer = new MaxRectsOptimizer(kerf);
  }

  async executar(chapa: ChapaSelecionada, pecas: Peca[]): Promise<ResultadoOtimizacaoPorChapa> {
    const startTime = performance.now();

    // Preparar peças para o algoritmo
    // O MaxRectsOptimizer.otimizar espera (pecas: Peca[], chapaLargura: number, chapaAltura: number)
    const resultadoRaw = this.optimizer.otimizar(
      pecas,
      chapa.largura_mm,
      chapa.altura_mm
    );

    return {
      chapa_id: chapa.id,
      layouts: [resultadoRaw],
      aproveitamento_percentual: resultadoRaw.aproveitamento || 0,
      chapas_necessarias: 1, // Por enquanto 1 layout por chapa
      tempo_calculo_ms: performance.now() - startTime,
      retalhos_utilizados: 0
    };
  }
}
