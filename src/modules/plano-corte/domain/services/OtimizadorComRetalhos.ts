import { HybridOptimizer } from './HybridOptimizer';
import { ResultadoOtimizacaoSimples } from './MaxRectsOptimizer';
import { Peca, LayoutChapa, ResultadoOtimizacao, ChapaMaterial, Retangulo } from '../types';
import type { RetalhosRepository } from '../../infrastructure/repositories/RetalhosRepository';
import type { RetalhoDisponivel } from '../entities/Retalho';

/**
 * OTIMIZADOR COM RETALHOS
 * Estende HybridOptimizer para usar retalhos antes de chapas inteiras
 */
export class OtimizadorComRetalhos {
  private kerfMm: number;
  private retalhosRepo: RetalhosRepository;

  constructor(retalhosRepository: RetalhosRepository, kerfMm: number = 3) {
    this.retalhosRepo = retalhosRepository;
    this.kerfMm = kerfMm;
  }

  /**
   * OTIMIZAR COM RETALHOS
   * Fluxo principal: retalhos → chapas inteiras → salvar sobras
   */
  async otimizar(
    pecas: Peca[],
    chapa: ChapaMaterial,
    planoCorteId: string,
    usarRetalhos: boolean = true
  ): Promise<ResultadoOtimizacao> {
    const inicio = performance.now();
    const layouts: LayoutChapa[] = [];
    let pecasRestantes = [...pecas];

    // FASE 1: Retalhos disponíveis
    if (usarRetalhos) {
      try {
        const retalhos = await this.retalhosRepo.buscarRetalhosDisponiveis({
          sku_chapa: chapa.sku,
          area_min: 90000 // 300x300mm mínimo
        });

        for (const retalho of retalhos) {
          if (pecasRestantes.length === 0) break;

          const resultado = await this.tentarEncaixarEmRetalho(pecasRestantes, retalho);

          if (resultado.pecas_posicionadas.length > 0) {
            layouts.push({
              tipo: 'retalho',
              chapa_sku: retalho.sku_chapa,
              retalho_id: retalho.id,
              largura_original_mm: retalho.largura_mm,
              altura_original_mm: retalho.altura_mm,
              pecas_posicionadas: resultado.pecas_posicionadas,
              espacos_livres: resultado.espacos_vazios,
              area_aproveitada_mm2: resultado.area_usada,
              area_total_mm2: resultado.area_total,
              aproveitamento_percentual: resultado.aproveitamento
            });

            try {
              await this.retalhosRepo.usarRetalho(retalho.id, planoCorteId);
            } catch (e) {
              console.error('[OTIMIZADOR] Erro ao marcar retalho:', e);
            }

            const idsPosicionados = new Set(resultado.pecas_posicionadas.map(p => p.id));
            pecasRestantes = pecasRestantes.filter(p => !idsPosicionados.has(p.id));
          }
        }
      } catch (err) {
        console.error('[OTIMIZADOR] Falha nos retalhos:', err);
      }
    }

    // FASE 2: Chapas inteiras
    let indiceChapaAtual = 1;
    while (pecasRestantes.length > 0) {
      const otimizador = new HybridOptimizer(chapa.largura_mm, chapa.altura_mm, this.kerfMm);
      const resultado = otimizador.otimizar(pecasRestantes, 50);

      if (resultado.pecas_posicionadas.length === 0) {
        throw new Error(`Peça "${pecasRestantes[0].nome}" não cabe na chapa.`);
      }

      layouts.push({
        tipo: 'chapa_inteira',
        chapa_sku: chapa.sku,
        indice_chapa: indiceChapaAtual++,
        largura_original_mm: chapa.largura_mm,
        altura_original_mm: chapa.altura_mm,
        pecas_posicionadas: resultado.pecas_posicionadas,
        espacos_livres: resultado.espacos_vazios,
        area_aproveitada_mm2: resultado.area_usada,
        area_total_mm2: resultado.area_total,
        aproveitamento_percentual: resultado.aproveitamento
      });


      const idsPosicionados = new Set(resultado.pecas_posicionadas.map(p => p.id));
      pecasRestantes = pecasRestantes.filter(p => !idsPosicionados.has(p.id));
    }

    // FASE 3: Estatísticas
    const retalhosUtilizados = layouts.filter(l => l.tipo === 'retalho').length;
    const chapasNovas = layouts.filter(l => l.tipo === 'chapa_inteira').length;
    const areaTotalChapas = layouts.reduce((acc, l) => acc + l.area_total_mm2, 0);
    const areaUsadaPecas = layouts.reduce((acc, l) => acc + l.area_aproveitada_mm2, 0);

    return {
      layouts,
      pecas_rejeitadas: [],
      retalhos_utilizados: retalhosUtilizados,
      chapas_novas_utilizadas: chapasNovas,
      area_total_pecas_mm2: areaUsadaPecas,
      area_total_chapas_mm2: areaTotalChapas,
      aproveitamento_medio: (areaUsadaPecas / areaTotalChapas) * 100,
      economia_retalhos_mm2: layouts.filter(l => l.tipo === 'retalho').reduce((acc, l) => acc + l.area_aproveitada_mm2, 0),
      tempo_calculo_ms: performance.now() - inicio
    };
  }

  private async tentarEncaixarEmRetalho(pecas: Peca[], retalho: RetalhoDisponivel): Promise<ResultadoOtimizacaoSimples> {
    const otimizador = new HybridOptimizer(retalho.largura_mm, retalho.altura_mm, this.kerfMm);
    return otimizador.otimizar(pecas, 10);
  }

  private async salvarSobrasComoRetalhos(espacos: Retangulo[], chapa: ChapaMaterial, planoCorteId: string): Promise<void> {
    for (const sobra of espacos) {
      if (sobra.largura >= 300 && sobra.altura >= 300) {
        await this.retalhosRepo.salvarRetalho({
          largura_mm: sobra.largura,
          altura_mm: sobra.altura,
          espessura_mm: chapa.espessura_mm,
          sku_chapa: chapa.sku,
          origem: 'sobra_plano_corte',
          plano_corte_origem_id: planoCorteId,
          usuario_criou: 'sistema'
        });
      }
    }
  }
}
