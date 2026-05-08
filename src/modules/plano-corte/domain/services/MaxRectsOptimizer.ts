import type { Peca, PecaPosicionada, Retangulo } from '../types.js';

export interface ResultadoOtimizacaoSimples {
  pecas_posicionadas: PecaPosicionada[];
  pecas_rejeitadas: Peca[];
  aproveitamento: number;
  area_usada: number;
  area_total: number;
  area_desperdicada: number;
  tempo_ms: number;
  espacos_vazios: Retangulo[];
}


/**
 * CLASSE: MaxRects Optimizer — Best Short Side Fit
 * 
 * Algoritmo:
 * 1. Mantém lista de retângulos vazios (espaços livres)
 * 2. Para cada peça, encontra melhor encaixe (menor lado curto)
 * 3. Divide espaço em novos retângulos vazios
 * 4. Repete até todas peças tentarem ser colocadas
 */
export class MaxRectsOptimizer {
  private largura_chapa: number;
  private altura_chapa: number;
  private kerf_mm: number;

  constructor(largura: number, altura: number, kerf: number = 3) {
    this.largura_chapa = largura;
    this.altura_chapa = altura;
    this.kerf_mm = Math.max(0, kerf); // Garantir kerf positivo
  }

  /**
   * MÉTODO PÚBLICO: Otimizar posicionamento
   */
  otimizar(pecas: Peca[]): ResultadoOtimizacaoSimples {
    const inicio = performance.now();
    
    // Ordenar peças por área decrescente (heurística)
    const pecasOrdenadas = [...pecas].sort(
      (a, b) => (b.largura * b.altura) - (a.largura * a.altura)
    );

    const pecas_posicionadas: PecaPosicionada[] = [];
    const pecas_rejeitadas: Peca[] = [];
    
    // Iniciar com um retângulo vazio representando a chapa inteira
    const espacosVazios: Retangulo[] = [{
      x: 0,
      y: 0,
      largura: this.largura_chapa,
      altura: this.altura_chapa
    }];

    // Tentar posicionar cada peça
    for (const peca of pecasOrdenadas) {
      const melhorEncaixe = this.encontrarMelhorEncaixe(
        peca,
        espacosVazios
      );

      if (melhorEncaixe) {
        const { posicao, rotacionada } = melhorEncaixe;
        
        // Adicionar peça posicionada
        const larguraFinal = melhorEncaixe.rotacionada ? peca.altura : peca.largura;
        const alturaFinal = melhorEncaixe.rotacionada ? peca.largura : peca.altura;

        pecas_posicionadas.push({
          ...peca,
          largura: larguraFinal,
          altura: alturaFinal,
          x: melhorEncaixe.posicao.x,
          y: melhorEncaixe.posicao.y,
          rotacionada: melhorEncaixe.rotacionada
        });

        // Atualizar espaços vazios com as dimensões finais
        this.atualizarEspacosVazios(
          espacosVazios,
          melhorEncaixe.posicao,
          larguraFinal,
          alturaFinal
        );
      } else {
        pecas_rejeitadas.push(peca);
      }
    }

    // Calcular métricas
    const area_usada = pecas_posicionadas.reduce(
      (sum, p) => sum + (p.largura * p.altura),
      0
    );
    const area_total = this.largura_chapa * this.altura_chapa;
    const aproveitamento = (area_usada / area_total) * 100;

    const tempo_ms = performance.now() - inicio;

    return {
      pecas_posicionadas,
      pecas_rejeitadas,
      aproveitamento: Math.round(aproveitamento * 100) / 100,
      area_usada,
      area_total,
      area_desperdicada: area_total - area_usada,
      tempo_ms: Math.round(tempo_ms * 100) / 100,
      espacos_vazios: espacosVazios
    };
  }

  /**
   * ENCONTRAR MELHOR ENCAIXE (Best Short Side Fit)
   * 
   * BSSF procura:
   * 1. Espaço com menor lado curto (min y ou min x)
   * 2. Desempata com menor lado longo
   * 3. Prioriza orientação sem rotação
   */
  private encontrarMelhorEncaixe(
    peca: Peca,
    espacosVazios: Retangulo[]
  ): { posicao: { x: number; y: number }; rotacionada: boolean } | null {
    let melhorScore = Infinity;
    let melhorEspacoIdx = -1;
    let melhorRotacionada = false;

    for (let i = 0; i < espacosVazios.length; i++) {
      const espaco = espacosVazios[i];

      // Tentar sem rotação
      if (
        peca.largura + this.kerf_mm <= espaco.largura &&
        peca.altura + this.kerf_mm <= espaco.altura
      ) {
        const score = Math.min(
          espaco.largura - (peca.largura + this.kerf_mm),
          espaco.altura - (peca.altura + this.kerf_mm)
        );

        if (score < melhorScore) {
          melhorScore = score;
          melhorEspacoIdx = i;
          melhorRotacionada = false;
        }
      }

      // Tentar com rotação (se permitido)
      if (peca.rotacionavel) {
        if (
          peca.altura + this.kerf_mm <= espaco.largura &&
          peca.largura + this.kerf_mm <= espaco.altura
        ) {
          const score = Math.min(
            espaco.largura - (peca.altura + this.kerf_mm),
            espaco.altura - (peca.largura + this.kerf_mm)
          );

          if (score < melhorScore) {
            melhorScore = score;
            melhorEspacoIdx = i;
            melhorRotacionada = true;
          }
        }
      }
    }

    if (melhorEspacoIdx === -1) {
      return null; // Peça não cabe em nenhum espaço
    }

    const espaco = espacosVazios[melhorEspacoIdx];
    return {
      posicao: { x: espaco.x, y: espaco.y },
      rotacionada: melhorRotacionada
    };
  }

  /**
   * ATUALIZAR ESPAÇOS VAZIOS (Split & Pruning)
   * 
   * Segue o algoritmo oficial de MaxRects:
   * 1. Para cada espaço livre que sobrepõe a peça colocada:
   * 2. Divide esse espaço em até 4 novos espaços
   * 3. Remove espaços redundantes (contidos em outros)
   */
  private atualizarEspacosVazios(
    espacosVazios: Retangulo[],
    pecaPos: { x: number; y: number },
    largura: number,
    altura: number
  ): void {
    const pecaRect: Retangulo = { 
      x: pecaPos.x, 
      y: pecaPos.y, 
      largura: largura + this.kerf_mm, 
      altura: altura + this.kerf_mm 
    };
    
    // Log para depuração de sobreposição
    if (this.kerf_mm > 0) {
       // Otimização: se o kerf for muito grande, avisar
       if (this.kerf_mm > 20) console.warn('[MAXRECTS] Kerf muito alto:', this.kerf_mm);
    }

    const novosEspacos: Retangulo[] = [];
    
    for (let i = 0; i < espacosVazios.length; i++) {
      const espaco = espacosVazios[i];
      
      // Se houver sobreposição
      if (this.haSobreposicao(espaco, pecaRect)) {
        // Dividir o espaço livre atual
        novosEspacos.push(...this.dividirEspaco(espaco, pecaRect));
      } else {
        // Se não sobrepõe, mantém o espaço como está
        novosEspacos.push(espaco);
      }
    }

    // Poda: Remover espaços contidos em outros e espaços inválidos
    const espacosLimpos = this.podarEspacosRedundantes(novosEspacos);
    
    espacosVazios.length = 0;
    espacosVazios.push(...espacosLimpos);
  }

  private haSobreposicao(a: Retangulo, b: Retangulo): boolean {
    return !(
      b.x >= a.x + a.largura ||
      b.x + b.largura <= a.x ||
      b.y >= a.y + a.altura ||
      b.y + b.altura <= a.y
    );
  }

  private dividirEspaco(espaco: Retangulo, peca: Retangulo): Retangulo[] {
    const resultados: Retangulo[] = [];

    // Divisão Vertical (Top / Bottom)
    if (peca.x < espaco.x + espaco.largura && peca.x + peca.largura > espaco.x) {
      // Espaço acima
      if (peca.y > espaco.y && peca.y < espaco.y + espaco.altura) {
        resultados.push({ ...espaco, altura: peca.y - espaco.y });
      }
      // Espaço abaixo
      if (peca.y + peca.altura < espaco.y + espaco.altura) {
        resultados.push({ 
          x: espaco.x, 
          y: peca.y + peca.altura, 
          largura: espaco.largura, 
          altura: espaco.y + espaco.altura - (peca.y + peca.altura) 
        });
      }
    }

    // Divisão Horizontal (Left / Right)
    if (peca.y < espaco.y + espaco.altura && peca.y + peca.altura > espaco.y) {
      // Espaço à esquerda
      if (peca.x > espaco.x && peca.x < espaco.x + espaco.largura) {
        resultados.push({ ...espaco, largura: peca.x - espaco.x });
      }
      // Espaço à direita
      if (peca.x + peca.largura < espaco.x + espaco.largura) {
        resultados.push({ 
          x: peca.x + peca.largura, 
          y: espaco.y, 
          largura: espaco.x + espaco.largura - (peca.x + peca.largura), 
          altura: espaco.altura 
        });
      }
    }

    return resultados;
  }

  private podarEspacosRedundantes(espacos: Retangulo[]): Retangulo[] {
    // 1. Remover espaços muito pequenos
    const filtrados = espacos.filter(e => e.largura >= 1 && e.altura >= 1);
    const paraRemover = new Set<number>();

    // 2. Remover espaços que estão totalmente contidos em outros
    for (let i = 0; i < filtrados.length; i++) {
      for (let j = 0; j < filtrados.length; j++) {
        if (i === j) continue;
        
        const a = filtrados[i];
        const b = filtrados[j];
        
        // Se A está contido em B
        if (a.x >= b.x && a.y >= b.y && 
            a.x + a.largura <= b.x + b.largura && 
            a.y + a.altura <= b.y + b.altura) {
          paraRemover.add(i);
          break;
        }
      }
    }

    return filtrados.filter((_, idx) => !paraRemover.has(idx));
  }
}

export default MaxRectsOptimizer;
