import { FreeRectangle, Peca, PecaPosicionada, ResultadoOtimizacao } from './MaxRectsOptimizer';

export class GuillotineOptimizer {
  private espacosLivres: FreeRectangle[] = [];
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
    this.espacosLivres = [{ x: 0, y: 0, width: this.larguraChapa, height: this.alturaChapa }];
    this.pecasPosicionadas = [];
  }

  otimizar(pecas: Peca[]): ResultadoOtimizacao {
    this.reset();
    const pecasOrdenadas = [...pecas].sort((a, b) => (b.largura * b.altura) - (a.largura * a.altura));

    for (const peca of pecasOrdenadas) {
      const resultado = this.posicionarPeca(peca);
      if (resultado) this.pecasPosicionadas.push(resultado);
    }

    const areaUsada = this.pecasPosicionadas.reduce((acc, p) => acc + (p.largura * p.altura), 0);
    const areaTotal = this.larguraChapa * this.alturaChapa;

    return {
      pecas_posicionadas: this.pecasPosicionadas,
      espacos_livres: this.espacosLivres,
      aproveitamento: (areaUsada / areaTotal) * 100,
      area_usada: areaUsada,
      area_total: areaTotal
    };
  }

  private posicionarPeca(peca: Peca): PecaPosicionada | null {
    let melhorIdx = -1;
    let melhorOrientacao: 'normal' | 'rotacionada' | null = null;
    let menorDesperdicio = Infinity;

    for (let i = 0; i < this.espacosLivres.length; i++) {
      const espaco = this.espacosLivres[i];
      if (peca.largura + this.kerfMm <= espaco.width && peca.altura + this.kerfMm <= espaco.height) {
        const desperdicio = (espaco.width * espaco.height) - (peca.largura * peca.altura);
        if (desperdicio < menorDesperdicio) { menorDesperdicio = desperdicio; melhorIdx = i; melhorOrientacao = 'normal'; }
      }
      if (peca.rotacionavel && peca.altura + this.kerfMm <= espaco.width && peca.largura + this.kerfMm <= espaco.height) {
        const desperdicio = (espaco.width * espaco.height) - (peca.largura * peca.altura);
        if (desperdicio < menorDesperdicio) { menorDesperdicio = desperdicio; melhorIdx = i; melhorOrientacao = 'rotacionada'; }
      }
    }

    if (melhorIdx === -1) return null;

    const espaco = this.espacosLivres[melhorIdx];
    const rotacionada = melhorOrientacao === 'rotacionada';
    const largura = rotacionada ? peca.altura : peca.largura;
    const altura = rotacionada ? peca.largura : peca.altura;

    const resultado: PecaPosicionada = {
      peca_id: peca.id, nome: peca.nome, x: espaco.x, y: espaco.y, largura, altura, rotacionada, fio_de_fita: peca.fio_de_fita
    };

    this.dividirEspacoGuillotine(melhorIdx, largura, altura);
    return resultado;
  }

  private dividirEspacoGuillotine(idx: number, larguraPeca: number, alturaPeca: number): void {
    const espaco = this.espacosLivres[idx];
    const larguraRestante = espaco.width - larguraPeca - this.kerfMm;
    const alturaRestante = espaco.height - alturaPeca - this.kerfMm;
    this.espacosLivres.splice(idx, 1);

    if (larguraRestante > alturaRestante) {
      if (larguraRestante > 0) this.espacosLivres.push({ x: espaco.x + larguraPeca + this.kerfMm, y: espaco.y, width: larguraRestante, height: espaco.height });
      if (alturaRestante > 0) this.espacosLivres.push({ x: espaco.x, y: espaco.y + alturaPeca + this.kerfMm, width: larguraPeca, height: alturaRestante });
    } else {
      if (alturaRestante > 0) this.espacosLivres.push({ x: espaco.x, y: espaco.y + alturaPeca + this.kerfMm, width: espaco.width, height: alturaRestante });
      if (larguraRestante > 0) this.espacosLivres.push({ x: espaco.x + larguraPeca + this.kerfMm, y: espaco.y, width: larguraRestante, height: alturaPeca });
    }
  }
}
