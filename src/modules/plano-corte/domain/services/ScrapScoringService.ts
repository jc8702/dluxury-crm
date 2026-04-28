/**
 * SERVIÇO: ScrapScoringService
 * 
 * Avalia a utilidade de um retalho gerado para decidir se deve ser guardado ou descartado.
 * Critérios: Área total, proporção (aspect ratio) e frequência de uso de dimensões similares.
 */

export interface ScrapScore {
  score: number;       // 0 a 100
  recomendacao: 'GUARDAR' | 'DESCARTAR' | 'OPCIONAL';
  justificativa: string;
}

export class ScrapScoringService {
  private static AREA_MINIMA_MM2 = 100 * 100; // 100x100mm
  private static LARGURA_MINIMA_MM = 80;

  static avaliar(largura: number, altura: number): ScrapScore {
    const area = largura * altura;
    const menorLado = Math.min(largura, altura);
    const maiorLado = Math.max(largura, altura);
    const proporcao = maiorLado / menorLado;

    let score = 0;
    let justificativa = "";

    // 1. Critério de Tamanho Mínimo
    if (area < this.AREA_MINIMA_MM2 || menorLado < this.LARGURA_MINIMA_MM) {
      return { score: 10, recomendacao: 'DESCARTAR', justificativa: "Dimensões muito reduzidas para reuso seguro." };
    }

    // 2. Pontuação por Área
    if (area > 800 * 800) score += 50; // Peças grandes são valiosas
    else if (area > 400 * 400) score += 30;
    else score += 15;

    // 3. Pontuação por Proporção (Peças muito compridas e finas são difíceis de usar)
    if (proporcao > 10) score -= 20; // Muito "tripa"
    else if (proporcao < 3) score += 20; // Mais quadrada/útil

    // 4. Dimensões "Padrão" (Heurística de móveis comuns)
    // Laterais de armário costumam ter ~550mm a 600mm
    if (menorLado >= 500 && menorLado <= 650) {
      score += 30;
      justificativa = "Dimensão excelente para laterais de armário.";
    } else if (menorLado >= 300 && menorLado <= 450) {
      score += 20;
      justificativa = "Útil para prateleiras e divisórias.";
    } else {
      justificativa = "Dimensão genérica.";
    }

    // Decisão final
    let recomendacao: 'GUARDAR' | 'DESCARTAR' | 'OPCIONAL' = 'OPCIONAL';
    if (score >= 60) recomendacao = 'GUARDAR';
    else if (score < 30) recomendacao = 'DESCARTAR';

    return {
      score: Math.min(100, Math.max(0, score)),
      recomendacao,
      justificativa
    };
  }
}
