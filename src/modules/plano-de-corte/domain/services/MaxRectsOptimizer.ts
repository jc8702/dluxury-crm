import { ChapaMaterial, PecaCorte, LayoutChapa, PecaPosicionada } from '../entities/CuttingPlan';

export interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class MaxRectsOptimizer {
  private freeRectangles: FreeRect[] = [];
  private chapaWidth: number = 0;
  private chapaHeight: number = 0;

  public optimize(pecas: PecaCorte[], chapa: ChapaMaterial, kerf: number): { posicionadas: PecaPosicionada[], naoPosicionadas: PecaCorte[], aproveitamento: number } {
    this.chapaWidth = chapa.largura_mm;
    this.chapaHeight = chapa.altura_mm;
    this.freeRectangles = [{ x: 0, y: 0, w: chapa.largura_mm, h: chapa.altura_mm }];
    
    const posicionadas: PecaPosicionada[] = [];
    const naoPosicionadas: PecaCorte[] = [];

    // Peças já vêm na ordem que devem ser tentadas
    for (const peca of pecas) {
      const bestNode = this.findPositionForNewNodeBestShortSideFit(peca.largura_mm, peca.altura_mm, peca.rotacionavel);
      
      if (bestNode.score === Infinity) {
        naoPosicionadas.push(peca);
        continue; // não coube
      }

      // posiciona
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

      // Node ocupado real considera o kerf (só à direita e abaixo)
      // O kerf só é adicionado entre peças, não na borda da chapa
      // Para simular isso, reservamos o espaço da peça + kerf
      const nodeW = novaPosicionada.x + novaPosicionada.largura + kerf <= this.chapaWidth ? novaPosicionada.largura + kerf : novaPosicionada.largura;
      const nodeH = novaPosicionada.y + novaPosicionada.altura + kerf <= this.chapaHeight ? novaPosicionada.altura + kerf : novaPosicionada.altura;

      this.placeRectangle({ x: novaPosicionada.x, y: novaPosicionada.y, w: nodeW, h: nodeH });
    }

    const areaChapa = chapa.largura_mm * chapa.altura_mm;
    const areaUsada = posicionadas.reduce((acc, p) => acc + (p.largura * p.altura), 0);

    return {
      posicionadas,
      naoPosicionadas,
      aproveitamento: (areaUsada / areaChapa) * 100
    };
  }

  private findPositionForNewNodeBestShortSideFit(width: number, height: number, rotacionavel?: boolean) {
    let bestNode = { x: 0, y: 0, rotacionada: false, score: Infinity, longSide: Infinity };

    for (const rect of this.freeRectangles) {
      // Tentar sem rotacionar
      if (width <= rect.w && height <= rect.h) {
        const leftoverHoriz = rect.w - width;
        const leftoverVert = rect.h - height;
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert);
        const longSideFit = Math.max(leftoverHoriz, leftoverVert);

        if (shortSideFit < bestNode.score || (shortSideFit === bestNode.score && longSideFit < bestNode.longSide)) {
          bestNode.x = rect.x;
          bestNode.y = rect.y;
          bestNode.rotacionada = false;
          bestNode.score = shortSideFit;
          bestNode.longSide = longSideFit;
        }
      }

      // Tentar rotacionando
      if (rotacionavel && height <= rect.w && width <= rect.h) {
        const leftoverHoriz = rect.w - height;
        const leftoverVert = rect.h - width;
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert);
        const longSideFit = Math.max(leftoverHoriz, leftoverVert);

        if (shortSideFit < bestNode.score || (shortSideFit === bestNode.score && longSideFit < bestNode.longSide)) {
          bestNode.x = rect.x;
          bestNode.y = rect.y;
          bestNode.rotacionada = true;
          bestNode.score = shortSideFit;
          bestNode.longSide = longSideFit;
        }
      }
    }

    return bestNode;
  }

  private placeRectangle(node: FreeRect) {
    let numRectanglesToProcess = this.freeRectangles.length;
    for (let i = 0; i < numRectanglesToProcess; ++i) {
      if (this.splitFreeNode(this.freeRectangles[i], node)) {
        this.freeRectangles.splice(i, 1);
        --i;
        --numRectanglesToProcess;
      }
    }

    this.pruneFreeList();
  }

  private splitFreeNode(freeNode: FreeRect, usedNode: FreeRect): boolean {
    // Test with SAT if the rectangles even intersect.
    if (usedNode.x >= freeNode.x + freeNode.w || usedNode.x + usedNode.w <= freeNode.x ||
        usedNode.y >= freeNode.y + freeNode.h || usedNode.y + usedNode.h <= freeNode.y) {
      return false;
    }

    if (usedNode.x < freeNode.x + freeNode.w && usedNode.x + usedNode.w > freeNode.x) {
      // New node at the top side of the used node.
      if (usedNode.y > freeNode.y && usedNode.y < freeNode.y + freeNode.h) {
        const newNode: FreeRect = { ...freeNode };
        newNode.h = usedNode.y - newNode.y;
        this.freeRectangles.push(newNode);
      }
      // New node at the bottom side of the used node.
      if (usedNode.y + usedNode.h < freeNode.y + freeNode.h) {
        const newNode: FreeRect = { ...freeNode };
        newNode.y = usedNode.y + usedNode.h;
        newNode.h = freeNode.y + freeNode.h - (usedNode.y + usedNode.h);
        this.freeRectangles.push(newNode);
      }
    }

    if (usedNode.y < freeNode.y + freeNode.h && usedNode.y + usedNode.h > freeNode.y) {
      // New node at the left side of the used node.
      if (usedNode.x > freeNode.x && usedNode.x < freeNode.x + freeNode.w) {
        const newNode: FreeRect = { ...freeNode };
        newNode.w = usedNode.x - newNode.x;
        this.freeRectangles.push(newNode);
      }
      // New node at the right side of the used node.
      if (usedNode.x + usedNode.w < freeNode.x + freeNode.w) {
        const newNode: FreeRect = { ...freeNode };
        newNode.x = usedNode.x + usedNode.w;
        newNode.w = freeNode.x + freeNode.w - (usedNode.x + usedNode.w);
        this.freeRectangles.push(newNode);
      }
    }

    return true;
  }

  private pruneFreeList() {
    for (let i = 0; i < this.freeRectangles.length; ++i) {
      for (let j = i + 1; j < this.freeRectangles.length; ++j) {
        if (this.isContainedIn(this.freeRectangles[i], this.freeRectangles[j])) {
          this.freeRectangles.splice(i, 1);
          --i;
          break;
        }
        if (this.isContainedIn(this.freeRectangles[j], this.freeRectangles[i])) {
          this.freeRectangles.splice(j, 1);
          --j;
        }
      }
    }
  }

  private isContainedIn(a: FreeRect, b: FreeRect): boolean {
    return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
  }
}
