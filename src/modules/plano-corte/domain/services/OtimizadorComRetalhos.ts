import { HybridOptimizer } from './HybridOptimizer';
import type { Peca, ResultadoOtimizacao } from './MaxRectsOptimizer';
import type { RetalhosRepository } from '../../infrastructure/repositories/RetalhosRepository';
import type { RetalhoDisponivel } from '../entities/Retalho';

export interface ChapaMaterial {
  sku: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
}

export interface LayoutChapa {
  tipo: 'retalho' | 'chapa_inteira';
  chapa_sku: string;
  retalho_id?: string;
  indice_chapa?: number;
  largura_original_mm: number;
  altura_original_mm: number;
  pecas_posicionadas: any[];
  area_aproveitada_mm2: number;
  area_desperdicada_mm2: number;
}

export interface ResultadoOtimizacaoComRetalhos {
  layouts: LayoutChapa[];
  retalhos_utilizados: number;
  chapas_novas_utilizadas: number;
  aproveitamento_percentual: number;
  economia_retalhos_mm2: number;
  tempo_calculo_ms: number;
}

interface Sobra {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

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
    planoCorteId: string
  ): Promise<ResultadoOtimizacaoComRetalhos> {
    const inicio = performance.now();
    const layouts: LayoutChapa[] = [];
    let pecasRestantes = [...pecas];

    // ─────────────────────────────────────────────────────────────────────────────
    // FASE 1: Tentar encaixar em retalhos disponíveis
    // ─────────────────────────────────────────────────────────────────────────────
    try {
      console.log(`[OTIMIZADOR] Buscando retalhos para SKU: ${chapa.sku}`);
      const retalhos = await this.retalhosRepo.buscarRetalhosDisponiveis({
        sku_chapa: chapa.sku,
        area_min: 90000 // 300x300mm mínimo
      });

      console.log(`[OTIMIZADOR] ${retalhos.length} retalhos encontrados.`);

      for (const retalho of retalhos) {
        if (pecasRestantes.length === 0) break;

        const resultado = await this.tentarEncaixarEmRetalho(
          pecasRestantes,
          retalho
        );

        if (resultado.pecas_posicionadas.length > 0) {
          // Sucesso! Peças encaixaram no retalho
          layouts.push({
            tipo: 'retalho',
            chapa_sku: retalho.sku_chapa,
            retalho_id: retalho.id,
            largura_original_mm: retalho.largura_mm,
            altura_original_mm: retalho.altura_mm,
            pecas_posicionadas: resultado.pecas_posicionadas,
            area_aproveitada_mm2: resultado.area_usada,
            area_desperdicada_mm2: resultado.area_total - resultado.area_usada
          });

          // Marcar retalho como utilizado (silenciosamente se falhar)
          try {
            await this.retalhosRepo.usarRetalho(retalho.id, planoCorteId);
          } catch (e) {
            console.error('[OTIMIZADOR] Erro ao marcar retalho como usado:', e);
          }

          // Remover peças posicionadas da lista
          pecasRestantes = pecasRestantes.filter(
            p => !resultado.pecas_posicionadas.find(pp => pp.id === p.id)
          );
        }
      }
    } catch (err) {
      console.error('[OTIMIZADOR] Falha ao buscar retalhos (Failover para chapas inteiras):', err);
      // Não interrompe o fluxo, continua com pecasRestantes usando chapas inteiras
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // FASE 2: Usar chapas inteiras para o resto
    // ─────────────────────────────────────────────────────────────────────────────

    let indiceChapaAtual = 1;

    while (pecasRestantes.length > 0) {
      const otimizador = new HybridOptimizer(
        chapa.largura_mm,
        chapa.altura_mm,
        this.kerfMm
      );

      const resultado = otimizador.otimizar(pecasRestantes, 50); // 50 iterações

      if (resultado.pecas_posicionadas.length === 0) {
        throw new Error(
          `Peça "${pecasRestantes[0].nome}" (${pecasRestantes[0].largura}x${pecasRestantes[0].altura}mm) não cabe na chapa (${chapa.largura_mm}x${chapa.altura_mm}mm)`
        );
      }

      layouts.push({
        tipo: 'chapa_inteira',
        chapa_sku: chapa.sku,
        indice_chapa: indiceChapaAtual++,
        largura_original_mm: chapa.largura_mm,
        altura_original_mm: chapa.altura_mm,
        pecas_posicionadas: resultado.pecas_posicionadas,
        area_aproveitada_mm2: resultado.area_usada,
        area_desperdicada_mm2: resultado.area_total - resultado.area_usada
      });

      // Detectar e salvar sobras como novos retalhos
      await this.salvarSobrasComoRetalhos(
        resultado,
        chapa,
        planoCorteId
      );

      // Remover peças posicionadas
      pecasRestantes = pecasRestantes.filter(
        p => !resultado.pecas_posicionadas.find(pp => pp.id === p.id)
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // FASE 3: Calcular estatísticas finais
    // ─────────────────────────────────────────────────────────────────────────────

    const retalhosUtilizados = layouts.filter(l => l.tipo === 'retalho').length;
    const chapasNovas = layouts.filter(l => l.tipo === 'chapa_inteira').length;

    const areaTotal = layouts.reduce(
      (acc, l) => acc + (l.largura_original_mm * l.altura_original_mm),
      0
    );
    const areaUsada = layouts.reduce((acc, l) => acc + l.area_aproveitada_mm2, 0);

    const economiaRetalhos = layouts
      .filter(l => l.tipo === 'retalho')
      .reduce((acc, l) => acc + l.area_aproveitada_mm2, 0);

    const tempo = performance.now() - inicio;

    return {
      layouts,
      retalhos_utilizados: retalhosUtilizados,
      chapas_novas_utilizadas: chapasNovas,
      aproveitamento_percentual: (areaUsada / areaTotal) * 100,
      economia_retalhos_mm2: economiaRetalhos,
      tempo_calculo_ms: tempo
    };
  }

  /**
   * TENTAR ENCAIXAR EM RETALHO
   * Roda HybridOptimizer em um retalho específico
   */
  private async tentarEncaixarEmRetalho(
    pecas: Peca[],
    retalho: RetalhoDisponivel
  ): Promise<ResultadoOtimizacao> {
    const otimizador = new HybridOptimizer(
      retalho.largura_mm,
      retalho.altura_mm,
      this.kerfMm
    );

    // Usar menos iterações para retalhos (mais rápido)
    return otimizador.otimizar(pecas, 10);
  }

  /**
   * SALVAR SOBRAS COMO RETALHOS
   * Detecta sobras e salva no banco se >= 300x300mm
   */
  private async salvarSobrasComoRetalhos(
    resultado: ResultadoOtimizacao,
    chapa: ChapaMaterial,
    planoCorteId: string
  ): Promise<void> {
    const sobras = this.detectarSobras(resultado, chapa.largura_mm, chapa.altura_mm);

    for (const sobra of sobras) {
      // Verificar se sobra é grande o suficiente (300x300mm mínimo)
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

  /**
   * DETECTAR SOBRAS
   * Analisa espaços livres (free rectangles) e extrai as maiores sobras
   */
  private detectarSobras(
    resultado: ResultadoOtimizacao,
    larguraChapa: number,
    alturaChapa: number
  ): Sobra[] {
    const sobras: Sobra[] = [];

    // Nota: O resultado original não inclui 'espacos_livres'.
    // Esta implementação assume que o otimizador poderia ser estendido para retornar isso.
    // Como fallback, usamos a área desperdiçada para estimar uma sobra.
    
    const areaDesperdicio = resultado.area_total - resultado.area_usada;

    // Estimar sobra retangular (simplificação para este MVP)
    // Em uma implementação real, o otimizador deveria retornar a geometria dos espaços vazios.
    if (areaDesperdicio >= 90000) { // 300x300mm
      const larguraSobra = Math.floor(Math.sqrt(areaDesperdicio));
      const alturaSobra = Math.floor(areaDesperdicio / larguraSobra);

      if (larguraSobra >= 300 && alturaSobra >= 300) {
        sobras.push({
          x: 0,
          y: 0,
          largura: larguraSobra,
          altura: alturaSobra
        });
      }
    }

    return sobras;
  }
}
