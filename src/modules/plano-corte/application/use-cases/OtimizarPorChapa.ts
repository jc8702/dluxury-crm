import MaxRectsOptimizer from '../../domain/services/MaxRectsOptimizer.js';
import type { ChapaSelecionada, Peca, ResultadoOtimizacaoPorChapa } from '../../domain/types.js';

export class OtimizarPorChapa {

  async executar(chapa: ChapaSelecionada, pecas: Peca[]): Promise<ResultadoOtimizacaoPorChapa> {
    const startTime = performance.now();

    // Instanciar o otimizador com as dimensões da chapa atual
    const optimizer = new MaxRectsOptimizer(chapa.largura_mm, chapa.altura_mm, 3);

    // Preparar peças para o algoritmo
    const resultadoRaw = optimizer.otimizar(pecas);

    const layoutMapeado: any = {
      tipo: 'chapa_inteira',
      chapa_sku: chapa.sku_chapa,
      indice_chapa: 1,
      largura_original_mm: chapa.largura_mm,
      altura_original_mm: chapa.altura_mm,
      pecas_posicionadas: resultadoRaw.pecas_posicionadas,
      espacos_livres: resultadoRaw.espacos_vazios,
      area_aproveitada_mm2: resultadoRaw.area_usada,
      area_total_mm2: resultadoRaw.area_total,
      aproveitamento_percentual: resultadoRaw.aproveitamento || 0
    };

    return {
      chapa_id: chapa.id,
      layouts: [layoutMapeado],
      aproveitamento_percentual: resultadoRaw.aproveitamento || 0,
      chapas_necessarias: 1, // Por enquanto 1 layout por chapa
      tempo_calculo_ms: performance.now() - startTime,
      retalhos_utilizados: 0
    };
  }
}
