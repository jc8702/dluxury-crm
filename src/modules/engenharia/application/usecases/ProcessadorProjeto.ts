import { ParseadorProjeto, type ProjeParsed } from '../../plano-corte/infrastructure/parsers/ParseadorProjeto';
import { HybridOptimizer } from '../../plano-corte/domain/services/HybridOptimizer';
import { GeradorPecasParametrico } from '../../domain/services/GeradorPecasParametrico';
import { RetalhosRepository, type RetalhoDisponivel } from '../../plano-corte/infrastructure/repositories/RetalhosRepository';
import { CustosService, type ResultadoCustos } from '../../domain/services/CustosService';
import type { Peca } from '../../plano-corte/domain/types';

/**
 * INTERFACE: Entrada do processador
 */
export interface RequisicaoProcessamento {
  descricao_projeto: string; // "Armário 80x120cm com 4 gavetas e vidro"
  sku_chapa: string; // "MDF-18MM-BRA"
  usuario_id: string;
  projeto_id?: string; // Se edição, senão null = novo
  opcoes?: {
    usar_retalhos?: boolean; // Default: true
    iteracoes_otimizacao?: number; // Default: 20
    margem_minima?: number; // Default: 0.30 (30%)
    preco_chapa_override?: number; // Preço customizado
    precos_ferragem?: Record<string, number>;
  };
}

/**
 * INTERFACE: Resultado completo do processamento
 */
export interface ResultadoProcessamento {
  sucesso: boolean;
  erros: string[];
  avisos: string[];
  
  // Dados de entrada parseados
  projeto?: ProjeParsed;
  
  // Dados de engenharia
  pecas?: Peca[];
  ferragens?: Array<{ sku: string; descricao: string; quantidade: number }>;
  
  // Otimização de corte
  layouts?: Array<{
    tipo: 'retalho' | 'chapa_inteira';
    chapa_sku: string;
    pecas_posicionadas: Peca[];
    area_aproveitada_mm2: number;
    area_desperdicada_mm2?: number;
    retalho_id?: number | string;
    largura_original_mm: number;
    altura_original_mm: number;
  }>;
  aproveitamento_percentual?: number;
  retalhos_utilizados?: number;
  chapas_novas_utilizadas?: number;
  
  // Custos
  custos?: ResultadoCustos; // Tipado pelo CustosService
  
  // Metadados
  tempo_processamento_ms: number;
  confianca_geral: number; // 0-100
}

/**
 * CLASSE PRINCIPAL: ProcessadorProjeto
 * 
 * Orquestra todo o fluxo de um projeto desde a entrada textual até o custo final.
 */
export class ProcessadorProjeto {
  private db: unknown;
  private logger: Console | unknown;

  constructor(db: any, logger?: any) {
    this.db = db;
    this.logger = logger || console;
  }

  /**
   * MÉTODO PÚBLICO: Processar requisição completa
   */
  async processar(requisicao: RequisicaoProcessamento): Promise<ResultadoProcessamento> {
    const inicio = performance.now();
    const resultado: ResultadoProcessamento = {
      sucesso: false,
      erros: [],
      avisos: [],
      tempo_processamento_ms: 0,
      confianca_geral: 0
    };

    try {
      (this.logger as any).info(`[PROCESSADOR] Iniciando processamento: "${requisicao.descricao_projeto}"`);
      
      // 1. PARSE
      const parseResult = ParseadorProjeto.parse(requisicao.descricao_projeto);
      resultado.projeto = parseResult.projeto;
      resultado.avisos.push(...parseResult.avisos);

      if (!parseResult.sucesso) {
        resultado.erros.push(...parseResult.erros);
        return resultado;
      }

      // 2. GERAR PEÇAS
      const gerador = new GeradorPecasParametrico(this.db);
      const geracaoResult = await gerador.gerarPecas(
        parseResult.projeto!.tipo_movel,
        {
          largura: parseResult.projeto!.largura_mm,
          altura: parseResult.projeto!.altura_mm,
          profundidade: parseResult.projeto!.profundidade_mm,
          gavetas: parseResult.projeto!.customizacoes.gavetas,
          portas: parseResult.projeto!.customizacoes.portas,
          prateleiras: parseResult.projeto!.customizacoes.prateleiras
        }
      );

      if (geracaoResult.erros.length > 0) {
        resultado.erros.push(...geracaoResult.erros);
        return resultado;
      }

      resultado.pecas = geracaoResult.pecas;
      resultado.ferragens = geracaoResult.ferragens;
      resultado.avisos.push(...geracaoResult.avisos);

      // 3. BUSCAR RETALHOS
      let retalhosDisponiveis: RetalhoDisponivel[] = [];
      if (requisicao.opcoes?.usar_retalhos !== false) {
        const repo = new RetalhosRepository(this.db);
        retalhosDisponiveis = await repo.buscarRetalhosDisponiveis({
          sku_chapa: requisicao.sku_chapa,
          disponivel: true,
          descartado: false
        });
      }

      // 4. OTIMIZAR LAYOUT
      const iteracoes = requisicao.opcoes?.iteracoes_otimizacao || 20;
      const layouts = await this.otimizarComRetalhos(
        resultado.pecas!,
        requisicao.sku_chapa,
        retalhosDisponiveis,
        iteracoes
      );

      if (layouts.length === 0) {
        resultado.erros.push('Não foi possível encaixar todas as peças nas chapas disponíveis');
        return resultado;
      }

      resultado.layouts = layouts;
      resultado.retalhos_utilizados = layouts.filter(l => l.tipo === 'retalho').length;
      resultado.chapas_novas_utilizadas = layouts.filter(l => l.tipo === 'chapa_inteira').length;
      resultado.aproveitamento_percentual = this.calcularAproveitamentoMedio(layouts);

      // 5. CALCULAR CUSTOS
      const custosService = new CustosService(this.db);
      const custoResult = await custosService.calcularCompleto({
        layouts,
        pecas: resultado.pecas!,
        ferragens: resultado.ferragens!,
        sku_chapa: requisicao.sku_chapa,
        preco_chapa: requisicao.opcoes?.preco_chapa_override,
        precos_ferragem: requisicao.opcoes?.precos_ferragem,
        margem_minima: requisicao.opcoes?.margem_minima || 0.30
      });

      resultado.custos = custoResult;

      // 6. CONFIANÇA
      resultado.confianca_geral = Math.round(
        (parseResult.projeto!.confianca_geral +
          (geracaoResult.avisos.length === 0 ? 100 : 85) +
          (layouts.length > 0 ? 100 : 0)) / 3
      );

      resultado.sucesso = true;
      resultado.tempo_processamento_ms = performance.now() - inicio;

      return resultado;

    } catch (erro) {
      resultado.erros.push(`Erro interno: ${erro instanceof Error ? erro.message : String(erro)}`);
      return resultado;
    }
  }

  private async otimizarComRetalhos(
    pecas: Peca[],
    sku_chapa: string,
    retalhos: RetalhoDisponivel[],
    iteracoes: number
  ): Promise<NonNullable<ResultadoProcessamento['layouts']>> {
    const layouts: NonNullable<ResultadoProcessamento['layouts']> = [];
    let pecasRestantes = [...pecas];
    const repo = new RetalhosRepository(this.db);

    // 1. Tentar retalhos
    const retalhosOrdenados = retalhos.sort((a, b) => a.dias_estoque - b.dias_estoque);

    for (const retalho of retalhosOrdenados) {
      if (pecasRestantes.length === 0) break;

      const pecasQueCabem = pecasRestantes.filter(p => 
        (p.largura <= retalho.largura_mm && p.altura <= retalho.altura_mm) ||
        (p.altura <= retalho.largura_mm && p.largura <= retalho.altura_mm)
      );

      if (pecasQueCabem.length > 0) {
        layouts.push({
          tipo: 'retalho',
          chapa_sku: sku_chapa,
          retalho_id: retalho.id,
          largura_original_mm: retalho.largura_mm,
          altura_original_mm: retalho.altura_mm,
          pecas_posicionadas: pecasQueCabem,
          area_aproveitada_mm2: pecasQueCabem.reduce((sum, p) => sum + p.largura * p.altura, 0)
        });

        await repo.usarRetalho(retalho.id, `proj-${Date.now()}`);
        pecasRestantes = pecasRestantes.filter(p => !pecasQueCabem.includes(p));
      }
    }

    // 2. Chapas novas
    if (pecasRestantes.length > 0) {
      const chapa = await this.buscarChapaPadraoParaSKU(sku_chapa);
      if (chapa) {
        const optimizer = new HybridOptimizer(chapa.largura_mm, chapa.altura_mm, 3);
        const res = optimizer.otimizar(pecasRestantes, iteracoes);
        
        // Simulação de divisão por chapas (simplificado para o exemplo)
        layouts.push({
          tipo: 'chapa_inteira',
          chapa_sku: sku_chapa,
          largura_original_mm: chapa.largura_mm,
          altura_original_mm: chapa.altura_mm,
          pecas_posicionadas: res.pecas_posicionadas,
          area_aproveitada_mm2: res.area_usada
        });
      }
    }

    return layouts;
  }

  private calcularAproveitamentoMedio(layouts: NonNullable<ResultadoProcessamento['layouts']>): number {
    const totalArea = layouts.reduce((sum, l) => sum + l.largura_original_mm * l.altura_original_mm, 0);
    const areaUsada = layouts.reduce((sum, l) => sum + l.area_aproveitada_mm2, 0);
    return totalArea > 0 ? (areaUsada / totalArea) * 100 : 0;
  }

  private async buscarChapaPadraoParaSKU(sku: string) {
    return { largura_mm: 2750, altura_mm: 1830 };
  }
}
