import { MaxRectsOptimizer } from '../../domain/services/MaxRectsOptimizer';
import type { ChapaSelecionada, Peca, ResultadoOtimizacaoPorChapa } from '../../domain/types';

export class OtimizarPorChapa {

  async executar(chapa: ChapaSelecionada, pecas: Peca[]): Promise<ResultadoOtimizacaoPorChapa> {
    const startTime = performance.now();

    // Instanciar o otimizador com as dimensões da chapa atual
    const optimizer = new MaxRectsOptimizer(chapa.largura_mm, chapa.altura_mm, 3);

    // Preparar peças para o algoritmo
    const resultadoRaw = optimizer.otimizar(pecas);

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
