import { ChapaMaterial, PecaCorte, PecaPosicionada } from '../entities/CuttingPlan';

export interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class GuillotineOptimizer {
  private freeRectangles: FreeRect[] = [];
  private chapaWidth: number = 0;
  private chapaHeight: number = 0;

  public optimize(pecas: PecaCorte[], chapa: ChapaMaterial, kerf: number, splitHeuristic: 'ShortestAxis' | 'LongestAxis' = 'ShortestAxis'): { posicionadas: PecaPosicionada[], naoPosicionadas: PecaCorte[], aproveitamento: number } {
    this.chapaWidth = chapa.largura_mm;
    this.chapaHeight = chapa.altura_mm;
    this.freeRectangles = [{ x: 0, y: 0, w: chapa.largura_mm, h: chapa.altura_mm }];
    
    const posicionadas: PecaPosicionada[] = [];
    const naoPosicionadas: PecaCorte[] = [];

    for (const peca of pecas) {
      const bestNode = this.findPositionForNewNodeBestAreaFit(peca.largura_mm, peca.altura_mm, peca.rotacionavel);
      
      if (bestNode.score === Infinity) {
        naoPosicionadas.push(peca);
        continue;
      }

      const novaPosicionada: PecaPosicionada = {
        peca_id: peca.id,
        nome: peca.nome,
        x: bestNode.x,
        y: bestNode.y,
        largura: bestNode.rotacionada ? peca.altura_mm : peca.largura_mm,
        altura: bestNode.rotacionada ? peca.largura_mm : peca.altura_mm,
        rotacionada: bestNode.rotacionada,
        fio_de_fita: peca.fio_de_fita
      };

      posicionadas.push(novaPosicionada);

      const nodeW = novaPosicionada.x + novaPosicionada.largura + kerf <= this.chapaWidth ? novaPosicionada.largura + kerf : novaPosicionada.largura;
      const nodeH = novaPosicionada.y + novaPosicionada.altura + kerf <= this.chapaHeight ? novaPosicionada.altura + kerf : novaPosicionada.altura;

      this.splitFreeRectByHeuristic(bestNode.rectIndex, nodeW, nodeH, splitHeuristic);
    }

    const areaChapa = chapa.largura_mm * chapa.altura_mm;
    const areaUsada = posicionadas.reduce((acc, p) => acc + (p.largura * p.altura), 0);

    return {
      posicionadas,
      naoPosicionadas,
      aproveitamento: (areaUsada / areaChapa) * 100
    };
  }

  private findPositionForNewNodeBestAreaFit(width: number, height: number, rotacionavel?: boolean) {
    let bestNode = { x: 0, y: 0, rotacionada: false, score: Infinity, rectIndex: -1 };

    for (let i = 0; i < this.freeRectangles.length; ++i) {
      const rect = this.freeRectangles[i];

      // Tentar sem rotacionar
      if (width <= rect.w && height <= rect.h) {
        const areaFit = (rect.w * rect.h) - (width * height);
        if (areaFit < bestNode.score) {
          bestNode.x = rect.x;
          bestNode.y = rect.y;
          bestNode.rotacionada = false;
          bestNode.score = areaFit;
          bestNode.rectIndex = i;
        }
      }

      // Tentar rotacionando
      if (rotacionavel && height <= rect.w && width <= rect.h) {
        const areaFit = (rect.w * rect.h) - (height * width);
        if (areaFit < bestNode.score) {
          bestNode.x = rect.x;
          bestNode.y = rect.y;
          bestNode.rotacionada = true;
          bestNode.score = areaFit;
          bestNode.rectIndex = i;
        }
      }
    }

    return bestNode;
  }

  private splitFreeRectByHeuristic(freeRectIndex: number, width: number, height: number, splitHeuristic: 'ShortestAxis' | 'LongestAxis') {
    const freeRect = this.freeRectangles[freeRectIndex];
    const w = freeRect.w;
    const h = freeRect.h;

    // Remove the rectangle that was split
    this.freeRectangles.splice(freeRectIndex, 1);

    let splitHorizontal = false;
    if (splitHeuristic === 'ShortestAxis') {
      splitHorizontal = (w <= h);
    } else {
      splitHorizontal = (w > h);
    }

    const bottomNode: FreeRect = { x: freeRect.x, y: freeRect.y + height, w: 0, h: 0 };
    const rightNode: FreeRect = { x: freeRect.x + width, y: freeRect.y, w: 0, h: 0 };

    if (splitHorizontal) {
      bottomNode.w = freeRect.w;
      bottomNode.h = freeRect.h - height;
      rightNode.w = freeRect.w - width;
      rightNode.h = height;
    } else {
      bottomNode.w = width;
      bottomNode.h = freeRect.h - height;
      rightNode.w = freeRect.w - width;
      rightNode.h = freeRect.h;
    }

    // Add new free rectangles, if they have area > 0
    if (bottomNode.w > 0 && bottomNode.h > 0) {
      this.freeRectangles.push(bottomNode);
    }
    if (rightNode.w > 0 && rightNode.h > 0) {
      this.freeRectangles.push(rightNode);
    }
  }
}
