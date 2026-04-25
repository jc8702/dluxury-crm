export interface Peca {
  id: string;
  nome: string;
  largura: number;
  altura: number;
  rotacionavel: boolean;
  fio_de_fita?: {
    topo: boolean;
    baixo: boolean;
    esquerda: boolean;
    direita: boolean;
  };
}

export interface PecaPosicionada {
  peca_id: string;
  nome: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  rotacionada: boolean;
  fio_de_fita?: any;
}

export interface FreeRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResultadoOtimizacao {
  pecas_posicionadas: PecaPosicionada[];
  espacos_livres: FreeRectangle[];
  aproveitamento: number;
  area_usada: number;
  area_total: number;
}

export class MaxRectsOptimizer {
  private freeRectangles: FreeRectangle[] = [];
  private pecasPosicionadas: PecaPosicionada[] = [];
  private kerfMm: number;
  private larguraChapa: number;
  private alturaChapa: number;

  constructor(larguraChapa: number, alturaChapa: number, kerfMm: number = 3) {
    this.larguraChapa = larguraChapa;
    this.alturaChapa = alturaChapa;
    this.kerfMm = kerfMm;
    this.reset();
  }

  reset(): void {
    this.freeRectangles = [
      { x: 0, y: 0, width: this.larguraChapa, height: this.alturaChapa }
    ];
    this.pecasPosicionadas = [];
  }

  otimizar(pecas: Peca[]): ResultadoOtimizacao {
    this.reset();
    const pecasRestantes = [...pecas];

    while (pecasRestantes.length > 0) {
      const resultado = this.encontrarMelhorPosicao(pecasRestantes);
      
      if (!resultado) break;

      const { peca, posicao } = resultado;
      
      this.pecasPosicionadas.push({
        peca_id: peca.id,
        nome: peca.nome,
        x: posicao.x,
        y: posicao.y,
        largura: posicao.largura,
        altura: posicao.altura,
        rotacionada: posicao.rotacionada,
        fio_de_fita: peca.fio_de_fita
      });

      this.dividirFreeRectangles(posicao);
      const idx = pecasRestantes.indexOf(peca);
      pecasRestantes.splice(idx, 1);
    }

    const areaUsada = this.pecasPosicionadas.reduce((acc, p) => acc + (p.largura * p.altura), 0);
    const areaTotal = this.larguraChapa * this.alturaChapa;

    return {
      pecas_posicionadas: this.pecasPosicionadas,
      espacos_livres: this.freeRectangles,
      aproveitamento: (areaUsada / areaTotal) * 100,
      area_usada: areaUsada,
      area_total: areaTotal
    };
  }

  private encontrarMelhorPosicao(pecas: Peca[]) {
    let melhorScore = Infinity;
    let melhorPeca: Peca | null = null;
    let melhorPosicao: any = null;

    for (const peca of pecas) {
      for (const rect of this.freeRectangles) {
        const larguraComKerf = peca.largura + this.kerfMm;
        const alturaComKerf = peca.altura + this.kerfMm;

        if (larguraComKerf <= rect.width && alturaComKerf <= rect.height) {
          const leftoverX = rect.width - larguraComKerf;
          const leftoverY = rect.height - alturaComKerf;
          const shortSide = Math.min(leftoverX, leftoverY);

          if (shortSide < melhorScore) {
            melhorScore = shortSide;
            melhorPeca = peca;
            melhorPosicao = { x: rect.x, y: rect.y, largura: peca.largura, altura: peca.altura, rotacionada: false };
          }
        }

        if (peca.rotacionavel) {
          const larguraRotadaComKerf = peca.altura + this.kerfMm;
          const alturaRotadaComKerf = peca.largura + this.kerfMm;

          if (larguraRotadaComKerf <= rect.width && alturaRotadaComKerf <= rect.height) {
            const leftoverX = rect.width - larguraRotadaComKerf;
            const leftoverY = rect.height - alturaRotadaComKerf;
            const shortSide = Math.min(leftoverX, leftoverY);

            if (shortSide < melhorScore) {
              melhorScore = shortSide;
              melhorPeca = peca;
              melhorPosicao = { x: rect.x, y: rect.y, largura: peca.altura, altura: peca.largura, rotacionada: true };
            }
          }
        }
      }
    }

    return melhorPeca && melhorPosicao ? { peca: melhorPeca, posicao: melhorPosicao } : null;
  }

  private dividirFreeRectangles(pecaPos: any): void {
    const novosFreeRects: FreeRectangle[] = [];
    const pecaComKerf = { x: pecaPos.x, y: pecaPos.y, width: pecaPos.largura + this.kerfMm, height: pecaPos.altura + this.kerfMm };

    for (const rect of this.freeRectangles) {
      if (!this.intersecta(rect, pecaComKerf)) {
        novosFreeRects.push(rect);
        continue;
      }

      if (pecaComKerf.x > rect.x) novosFreeRects.push({ x: rect.x, y: rect.y, width: pecaComKerf.x - rect.x, height: rect.height });
      if (pecaComKerf.x + pecaComKerf.width < rect.x + rect.width) novosFreeRects.push({ x: pecaComKerf.x + pecaComKerf.width, y: rect.y, width: rect.x + rect.width - (pecaComKerf.x + pecaComKerf.width), height: rect.height });
      if (pecaComKerf.y > rect.y) novosFreeRects.push({ x: rect.x, y: rect.y, width: rect.width, height: pecaComKerf.y - rect.y });
      if (pecaComKerf.y + pecaComKerf.height < rect.y + rect.height) novosFreeRects.push({ x: rect.x, y: pecaComKerf.y + pecaComKerf.height, width: rect.width, height: rect.y + rect.height - (pecaComKerf.y + pecaComKerf.height) });
    }

    this.freeRectangles = this.removerRedundancias(novosFreeRects);
  }

  private intersecta(a: FreeRectangle, b: any): boolean {
    return !(a.x >= b.x + b.width || a.x + a.width <= b.x || a.y >= b.y + b.height || a.y + a.height <= b.y);
  }

  private removerRedundancias(rects: FreeRectangle[]): FreeRectangle[] {
    const resultado: FreeRectangle[] = [];
    for (let i = 0; i < rects.length; i++) {
      const rectA = rects[i];
      let isContido = false;
      for (let j = 0; j < rects.length; j++) {
        if (i === j) continue;
        if (this.contem(rects[j], rectA)) { isContido = true; break; }
      }
      if (!isContido) resultado.push(rectA);
    }
    return resultado;
  }

  private contem(a: FreeRectangle, b: FreeRectangle): boolean {
    return (a.x <= b.x && a.y <= b.y && a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height);
  }
}
