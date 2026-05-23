import MaxRectsOptimizer from '../../domain/services/MaxRectsOptimizer.js';
import type { ChapaSelecionada, Peca, ResultadoOtimizacaoPorChapa, LayoutChapa } from '../../domain/types.js';

export class OtimizarPorChapa {

  async executar(chapa: ChapaSelecionada, pecas: Peca[]): Promise<ResultadoOtimizacaoPorChapa> {
    const startTime = performance.now();

    const layouts: LayoutChapa[] = [];
    let pecasParaProcessar = [...pecas];
    let indiceChapa = 0;
    const maxChapas = 50;

    while (pecasParaProcessar.length > 0 && indiceChapa < maxChapas) {
      indiceChapa++;

      const optimizer = new MaxRectsOptimizer(chapa.largura_mm, chapa.altura_mm, 3, 15);
      const resultadoRaw = optimizer.otimizar(pecasParaProcessar);

      layouts.push({
        tipo: 'chapa_inteira',
        chapa_sku: chapa.sku_chapa,
        indice_chapa: indiceChapa,
        largura_original_mm: chapa.largura_mm,
        altura_original_mm: chapa.altura_mm,
        pecas_posicionadas: resultadoRaw.pecas_posicionadas,
        espacos_livres: resultadoRaw.espacos_vazios,
        area_aproveitada_mm2: resultadoRaw.area_usada,
        area_total_mm2: resultadoRaw.area_total,
        aproveitamento_percentual: resultadoRaw.aproveitamento
      });

      if (resultadoRaw.pecas_rejeitadas.length === 0) {
        pecasParaProcessar = [];
        break;
      }

      if (resultadoRaw.pecas_posicionadas.length === 0) {
        pecasParaProcessar = resultadoRaw.pecas_rejeitadas;
        break;
      }

      pecasParaProcessar = resultadoRaw.pecas_rejeitadas;
    }

    const totalArea = layouts.reduce((sum, l) => sum + l.area_total_mm2, 0);
    const totalUsedArea = layouts.reduce((sum, l) => sum + l.area_aproveitada_mm2, 0);
    const averageUtilization = totalArea > 0 ? (totalUsedArea / totalArea) * 100 : 0;

    return {
      chapa_id: chapa.id,
      layouts,
      aproveitamento_percentual: Math.round(averageUtilization * 100) / 100,
      chapas_necessarias: layouts.length,
      tempo_calculo_ms: performance.now() - startTime,
      retalhos_utilizados: 0,
      pecas_rejeitadas: pecasParaProcessar,
      pecas_total_count: pecas.length
    };
  }
}
