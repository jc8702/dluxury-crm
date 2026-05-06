import { Peca, PecaPosicionada } from '../types';
import { ResultadoOtimizacaoSimples } from './MaxRectsOptimizer';


/**
 * CLASSE: Guillotine Optimizer — Best Fit Decreasing
 * 
 * Algoritmo:
 * 1. Ordena peças por área (maior primeiro) — BFD heurística
 * 2. Para cada peça, encontra melhor faixa (horizontal ou vertical)
 * 3. Posiciona e "corta" (guillotina) o espaço em duas partes
 * 4. Repete até todas peças tentarem ser colocadas
 */
export class GuillotineOptimizer {
  private largura_chapa: number;
  private altura_chapa: number;
  private kerf_mm: number;

  constructor(largura: number, altura: number, kerf: number = 3) {
    this.largura_chapa = largura;
    this.altura_chapa = altura;
    this.kerf_mm = kerf;
  }

  otimizar(pecas: Peca[]): ResultadoOtimizacaoSimples {
    const inicio = performance.now();

    const pecasOrdenadas = [...pecas].sort((a, b) => (b.largura * b.altura) - (a.largura * a.altura));
    const pecas_posicionadas: PecaPosicionada[] = [];
    const pecas_rejeitadas: Peca[] = [];

    interface Faixa {
      x: number;
      y: number;
      largura: number;
      altura: number;
    }

    const faixasLivres: Faixa[] = [{ x: 0, y: 0, largura: this.largura_chapa, altura: this.altura_chapa }];

    for (const peca of pecasOrdenadas) {
      let posicionada = false;

      for (let i = 0; i < faixasLivres.length; i++) {
        const faixa = faixasLivres[i];
        let larguraNecessaria = peca.largura + this.kerf_mm;
        let alturaNecessaria = peca.altura + this.kerf_mm;
        let rotacionada = false;

        // Tentar normal
        if (larguraNecessaria <= faixa.largura && alturaNecessaria <= faixa.altura) {
          rotacionada = false;
        } 
        // Tentar rotacionado
        else if (peca.rotacionavel && (peca.altura + this.kerf_mm <= faixa.largura) && (peca.largura + this.kerf_mm <= faixa.altura)) {
          larguraNecessaria = peca.altura + this.kerf_mm;
          alturaNecessaria = peca.largura + this.kerf_mm;
          rotacionada = true;
        } else {
          continue;
        }

        // Posicionar
        pecas_posicionadas.push({
          ...peca,
          largura: rotacionada ? peca.altura : peca.largura,
          altura: rotacionada ? peca.largura : peca.altura,
          x: faixa.x,
          y: faixa.y,
          rotacionada
        });

        // Split Guillotine (Horizontal Split Strategy)
        const f = faixasLivres[i];
        faixasLivres.splice(i, 1);

        // 1. Espaço à direita (mesma altura que a peça)
        if (f.largura - larguraNecessaria > 0) {
          faixasLivres.push({
            x: f.x + larguraNecessaria,
            y: f.y,
            largura: f.largura - larguraNecessaria,
            altura: alturaNecessaria
          });
        }

        // 2. Espaço acima (toda a largura da faixa original)
        if (f.altura - alturaNecessaria > 0) {
          faixasLivres.push({
            x: f.x,
            y: f.y + alturaNecessaria,
            largura: f.largura,
            altura: f.altura - alturaNecessaria
          });
        }

        posicionada = true;
        break;
      }

      if (!posicionada) {
        pecas_rejeitadas.push(peca);
      }
    }

    const area_usada = pecas_posicionadas.reduce((sum, p) => sum + (p.largura * p.altura), 0);
    const area_total = this.largura_chapa * this.altura_chapa;
    const aproveitamento = (area_usada / area_total) * 100;

    return {
      pecas_posicionadas,
      pecas_rejeitadas,
      aproveitamento: Math.round(aproveitamento * 100) / 100,
      area_usada,
      area_total,
      area_desperdicada: area_total - area_usada,
      tempo_ms: Math.round(performance.now() - inicio),
      espacos_vazios: faixasLivres
    };
  }
}

export default GuillotineOptimizer;
