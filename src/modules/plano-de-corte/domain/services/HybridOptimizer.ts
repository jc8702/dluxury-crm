import { ChapaMaterial, PecaCorte, LayoutChapa, PecaPosicionada } from '../entities/CuttingPlan';
import { MaxRectsOptimizer } from './MaxRectsOptimizer';
import { GuillotineOptimizer } from './GuillotineOptimizer';

export interface RetalhoMaterial {
  id: string;
  sku: string;
  largura_mm: number;
  altura_mm: number;
}

export interface OtimizacaoResult {
  layouts: LayoutChapa[];
  naoPosicionadas: PecaCorte[];
  aproveitamento_percentual: number;
}

export class HybridOptimizer {
  public otimizar(
    pecas: PecaCorte[], 
    chapasBase: ChapaMaterial[], 
    kerf: number, 
    iteracoes: number = 20,
    retalhosDisponiveis: RetalhoMaterial[] = []
  ): OtimizacaoResult {
    // Expandir peças de acordo com a quantidade
    const pecasExpandidas: PecaCorte[] = [];
    pecas.forEach(p => {
      for (let i = 0; i < p.quantidade; i++) {
        pecasExpandidas.push({ ...p });
      }
    });

    let melhorResultado: OtimizacaoResult | null = null;

    for (let iter = 0; iter < iteracoes; iter++) {
      // Diferentes heurísticas de ordenação para as iterações
      const pecasOrdenadas = this.ordenarPecas(pecasExpandidas, iter);

      // Tentar com MaxRects
      const resultMaxRects = this.rodarAlgoritmo(pecasOrdenadas, chapasBase, kerf, 'MaxRects', retalhosDisponiveis);
      if (!melhorResultado || resultMaxRects.aproveitamento_percentual > melhorResultado.aproveitamento_percentual) {
        melhorResultado = resultMaxRects;
      }

      // Tentar com Guillotina (Shortest e Longest)
      const resultGuillotineShort = this.rodarAlgoritmo(pecasOrdenadas, chapasBase, kerf, 'GuillotineShort', retalhosDisponiveis);
      if (resultGuillotineShort.aproveitamento_percentual > melhorResultado.aproveitamento_percentual) {
        melhorResultado = resultGuillotineShort;
      }

      const resultGuillotineLong = this.rodarAlgoritmo(pecasOrdenadas, chapasBase, kerf, 'GuillotineLong', retalhosDisponiveis);
      if (resultGuillotineLong.aproveitamento_percentual > melhorResultado.aproveitamento_percentual) {
        melhorResultado = resultGuillotineLong;
      }
    }

    return melhorResultado!;
  }

  private rodarAlgoritmo(
    pecas: PecaCorte[], 
    chapasBase: ChapaMaterial[], 
    kerf: number, 
    algoritmo: 'MaxRects' | 'GuillotineShort' | 'GuillotineLong',
    retalhosDisponiveis: RetalhoMaterial[]
  ): OtimizacaoResult {
    const layouts: LayoutChapa[] = [];
    let pecasRestantes = [...pecas];
    let chapaIdx = 1;

    let areaTotalAproveitada = 0;
    let areaTotalChapas = 0;

    // FASE 1: Tentar encaixar em retalhos disponíveis (usar os menores primeiro)
    const retalhosOrdenados = [...retalhosDisponiveis].sort((a, b) => 
      (a.largura_mm * a.altura_mm) - (b.largura_mm * b.altura_mm)
    );

    for (const retalho of retalhosOrdenados) {
      if (pecasRestantes.length === 0) break;

      const chapaMock: ChapaMaterial = {
        id: retalho.id,
        sku: retalho.sku,
        nome: `Retalho ${retalho.id.substring(0,6)}`,
        largura_mm: retalho.largura_mm,
        altura_mm: retalho.altura_mm,
        espessura_mm: chapasBase[0].espessura_mm,
        pecas: []
      };

      const resultadoAlgoritmo = this.executarAlgoritmoEspecifico(pecasRestantes, chapaMock, kerf, algoritmo);

      if (resultadoAlgoritmo.posicionadas.length > 0) {
        const areaChapa = chapaMock.largura_mm * chapaMock.altura_mm;
        const areaUsada = resultadoAlgoritmo.posicionadas.reduce((acc, p) => acc + (p.largura * p.altura), 0);
        
        layouts.push({
          chapa_sku: chapaMock.sku,
          indice_chapa: chapaIdx++,
          largura_original_mm: chapaMock.largura_mm,
          altura_original_mm: chapaMock.altura_mm,
          pecas_posicionadas: resultadoAlgoritmo.posicionadas,
          area_aproveitada_mm2: areaUsada,
          area_desperdicada_mm2: areaChapa - areaUsada
        });

        areaTotalAproveitada += areaUsada;
        areaTotalChapas += areaChapa;
        pecasRestantes = resultadoAlgoritmo.naoPosicionadas;
      }
    }

    // FASE 2: Usar chapas inteiras para o restante
    const chapaTemplate = chapasBase[0];

    while (pecasRestantes.length > 0) {
      const resultadoAlgoritmo = this.executarAlgoritmoEspecifico(pecasRestantes, chapaTemplate, kerf, algoritmo);

      if (resultadoAlgoritmo.posicionadas.length === 0) {
        break; // Peças restantes são maiores que a chapa
      }

      const areaChapa = chapaTemplate.largura_mm * chapaTemplate.altura_mm;
      const areaUsada = resultadoAlgoritmo.posicionadas.reduce((acc, p) => acc + (p.largura * p.altura), 0);
      
      layouts.push({
        chapa_sku: chapaTemplate.sku,
        indice_chapa: chapaIdx++,
        largura_original_mm: chapaTemplate.largura_mm,
        altura_original_mm: chapaTemplate.altura_mm,
        pecas_posicionadas: resultadoAlgoritmo.posicionadas,
        area_aproveitada_mm2: areaUsada,
        area_desperdicada_mm2: areaChapa - areaUsada
      });

      areaTotalAproveitada += areaUsada;
      areaTotalChapas += areaChapa;
      pecasRestantes = resultadoAlgoritmo.naoPosicionadas;
    }

    return {
      layouts,
      naoPosicionadas: pecasRestantes,
      aproveitamento_percentual: areaTotalChapas > 0 ? (areaTotalAproveitada / areaTotalChapas) * 100 : 0
    };
  }

  private executarAlgoritmoEspecifico(
    pecas: PecaCorte[], 
    chapa: ChapaMaterial, 
    kerf: number, 
    algoritmo: 'MaxRects' | 'GuillotineShort' | 'GuillotineLong'
  ) {
    if (algoritmo === 'MaxRects') {
      const optimizer = new MaxRectsOptimizer();
      return optimizer.optimize(pecas, chapa, kerf);
    } else {
      const optimizer = new GuillotineOptimizer();
      return optimizer.optimize(
        pecas, 
        chapa, 
        kerf, 
        algoritmo === 'GuillotineShort' ? 'ShortestAxis' : 'LongestAxis'
      );
    }
  }

  private ordenarPecas(pecas: PecaCorte[], iteracao: number): PecaCorte[] {
    const sorted = [...pecas];
    const modo = iteracao % 5;

    switch (modo) {
      case 0: // Área decrescente
        sorted.sort((a, b) => (b.largura_mm * b.altura_mm) - (a.largura_mm * a.altura_mm));
        break;
      case 1: // Perímetro decrescente
        sorted.sort((a, b) => (b.largura_mm + b.altura_mm) - (a.largura_mm + a.altura_mm));
        break;
      case 2: // Maior lado decrescente
        sorted.sort((a, b) => Math.max(b.largura_mm, b.altura_mm) - Math.max(a.largura_mm, a.altura_mm));
        break;
      case 3: // Menor lado decrescente
        sorted.sort((a, b) => Math.min(b.largura_mm, b.altura_mm) - Math.min(a.largura_mm, a.altura_mm));
        break;
      case 4: // Embaralhado
        for (let i = sorted.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
        }
        break;
    }

    return sorted;
  }
}
