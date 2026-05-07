import type { Peca } from '../../plano-corte/domain/types.js';
import { create, all } from 'mathjs';

const math = create(all);

/**
 * INTERFACE: Template de Tipo de Móvel (armazenado no banco)
 */
export interface TemplateTipoMovel {
  id: string;
  tipo_slug: string; // "gaveteiro-modular", "armario-simples", etc
  nome: string;
  descricao: string;

  parametros: {
    altura_min: number;
    altura_max: number;
    largura_min: number;
    largura_max: number;
    profundidade_padrao: number;
    profundidade_variavel: boolean;
    profundidade_min?: number;
    profundidade_max?: number;
    materiais_aceitos: string[];
    gavetas_max?: number;
  };

  template_pecas: Array<{
    id: string;
    nome: string;
    material: string;
    espessura_mm: number;
    quantidade_fixa: number;
    formula_largura?: string;
    formula_altura?: string;
    fio_de_fita?: {
      topo?: boolean;
      baixo?: boolean;
      esquerda?: boolean;
      direita?: boolean;
    };
    validacoes?: Array<{
      tipo: string;
      valor: number;
      mensagem?: string;
    }>;
  }>;

  ferragens_padrao: Array<{
    sku: string;
    descricao: string;
    categoria: string;
    formula_quantidade?: string;
    quantidade_fixa?: number;
  }>;

  versao: number;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

/**
 * INTERFACE: Parâmetros de entrada para gerar peças
 */
export interface ParametrosProjeto {
  largura: number;
  altura: number;
  profundidade: number;
  gavetas?: number;
  portas?: number;
  prateleiras?: number;
  [key: string]: number | undefined;
}

/**
 * INTERFACE: Resultado da geração
 */
export interface ResultadoGeracaoPecas {
  sucesso: boolean;
  pecas: Peca[];
  ferragens: Array<{
    sku: string;
    descricao: string;
    quantidade: number;
  }>;
  erros: string[];
  avisos: string[];
}

/**
 * CLASSE: GeradorPecasParametrico
 * 
 * Gera listas de peças e ferragens a partir de templates técnicos parametrizáveis.
 */
export class GeradorPecasParametrico {
  private db: unknown;
  private logger: Console | unknown;
  private cache_templates: Map<string, TemplateTipoMovel> = new Map();

  constructor(db: unknown, logger?: Console | unknown) {
    this.db = db;
    this.logger = logger || console;
  }

  /**
   * MÉTODO PÚBLICO: Gerar peças para um tipo de móvel
   */
  async gerarPecas(
    tipo_slug: string,
    parametros: ParametrosProjeto
  ): Promise<ResultadoGeracaoPecas> {
    const erros: string[] = [];
    const avisos: string[] = [];

    try {
      (this.logger as any).info(`[GERADOR] Carregando template: ${tipo_slug}`);
      const template = await this.buscarTemplate(tipo_slug);

      if (!template) {
        return {
          sucesso: false,
          pecas: [],
          ferragens: [],
          erros: [`Template de tipo de móvel não encontrado: "${tipo_slug}"`],
          avisos: []
        };
      }

      const validacao = this.validarParametros(parametros, template.parametros);
      if (!validacao.valido) {
        return {
          sucesso: false,
          pecas: [],
          ferragens: [],
          erros: validacao.erros,
          avisos: validacao.avisos
        };
      }
      avisos.push(...validacao.avisos);

      const contexto = this.prepararContexto(parametros);
      const pecas: Peca[] = [];

      for (const templ of template.template_pecas) {
        const pecasGeradas = this.gerarPecasDoTemplate(templ, contexto);
        pecas.push(...pecasGeradas);
      }

      const ferragens = this.calcularFerragens(template.ferragens_padrao, contexto);

      return { sucesso: true, pecas, ferragens, erros, avisos };

    } catch (erro: any) {
      (this.logger as any).error(`[GERADOR] Erro ao gerar peças:`, erro);
      return {
        sucesso: false,
        pecas: [],
        ferragens: [],
        erros: [erro instanceof Error ? erro.message : String(erro)],
        avisos: []
      };
    }
  }

  private async buscarTemplate(tipo_slug: string): Promise<TemplateTipoMovel | null> {
    if (this.cache_templates.has(tipo_slug)) {
      return this.cache_templates.get(tipo_slug) || null;
    }
    // TODO: Implementar busca real no Neon DB
    return this.obterTemplateExemplo(tipo_slug);
  }

  private validarParametros(parametros: ParametrosProjeto, constraints: TemplateTipoMovel['parametros']) {
    const erros: string[] = [];
    const avisos: string[] = [];

    if (parametros.altura < constraints.altura_min || parametros.altura > constraints.altura_max) {
      erros.push(`Altura ${parametros.altura}mm fora da faixa (${constraints.altura_min}-${constraints.altura_max}mm)`);
    }
    if (parametros.largura < constraints.largura_min || parametros.largura > constraints.largura_max) {
      erros.push(`Largura ${parametros.largura}mm fora da faixa (${constraints.largura_min}-${constraints.largura_max}mm)`);
    }

    return { valido: erros.length === 0, erros, avisos };
  }

  private prepararContexto(parametros: ParametrosProjeto): Record<string, number> {
    return {
      P_LARGURA: parametros.largura,
      P_ALTURA: parametros.altura,
      P_PROFUNDIDADE: parametros.profundidade,
      P_GAVETAS: parametros.gavetas || 0,
      P_PORTAS: parametros.portas || 0,
      P_PRATELEIRAS: parametros.prateleiras || 0,
      E_MDF: 18,
      E_HDF: 6,
      E_ESPESSURA: 18,
      KERF: 3,
      FOLGA: 5
    };
  }

  private gerarPecasDoTemplate(templ: TemplateTipoMovel['template_pecas'][number], contexto: Record<string, number>): Peca[] {
    const pecas: Peca[] = [];
    const largura = templ.formula_largura ? Math.round(this.avaliarFormula(templ.formula_largura, contexto)) : contexto['P_LARGURA'];
    const altura = templ.formula_altura ? Math.round(this.avaliarFormula(templ.formula_altura, contexto)) : contexto['P_ALTURA'];

    const qtd = templ.quantidade_fixa || (templ.id === 'frente_gaveta' ? contexto['P_GAVETAS'] : 1);

    for (let i = 0; i < qtd; i++) {
      pecas.push({
        id: `${templ.id}-${i}`,
        nome: `${templ.nome} ${i > 0 ? `(${i + 1})` : ''}`,
        largura,
        altura,
        rotacionavel: true,
        fio_de_fita: templ.fio_de_fita
      });
    }
    return pecas;
  }

  private calcularFerragens(ferragens_templ: TemplateTipoMovel['ferragens_padrao'], contexto: Record<string, number>) {
    return ferragens_templ.map(f => ({
      sku: f.sku,
      descricao: f.descricao,
      quantidade: f.formula_quantidade ? Math.ceil(this.avaliarFormula(f.formula_quantidade, contexto)) : (f.quantidade_fixa || 0)
    })).filter(f => f.quantidade > 0);
  }

  private avaliarFormula(formula: string, contexto: Record<string, number>): number {
    try {
      const res = math.evaluate(formula, contexto);
      return typeof res === 'number' ? res : 0;
    } catch (e: any) {
      (this.logger as any).error(`Erro na fórmula ${formula}`, e);
      return 0;
    }
  }

  private obterTemplateExemplo(tipo_slug: string): TemplateTipoMovel | null {
    if (tipo_slug === 'gaveteiro-modular') {
      return {
        id: 'template-001', tipo_slug, nome: 'Gaveteiro Modular', descricao: 'Gaveteiro ajustável',
        parametros: { altura_min: 400, altura_max: 2200, largura_min: 400, largura_max: 1500, profundidade_padrao: 450, profundidade_variavel: true, profundidade_min: 350, profundidade_max: 600, materiais_aceitos: ['MDF'], gavetas_max: 6 },
        template_pecas: [
          { id: 'lateral', nome: 'Lateral', material: 'MDF', espessura_mm: 18, quantidade_fixa: 2, formula_altura: 'P_ALTURA', formula_largura: 'P_PROFUNDIDADE', fio_de_fita: { topo: true } },
          { id: 'base', nome: 'Base', material: 'MDF', espessura_mm: 18, quantidade_fixa: 1, formula_altura: 'P_PROFUNDIDADE', formula_largura: 'P_LARGURA - 2*E_ESPESSURA' },
          { id: 'frente_gaveta', nome: 'Frente Gaveta', material: 'MDF', espessura_mm: 18, quantidade_fixa: 0, formula_altura: '(P_ALTURA / P_GAVETAS) - 4', formula_largura: 'P_LARGURA - 4' }
        ],
        ferragens_padrao: [
          { sku: 'FER-0001', descricao: 'Corrediça Telescópica', categoria: 'corrediça', formula_quantidade: 'P_GAVETAS * 2' }
        ],
        versao: 1, ativo: true, criado_em: new Date(), atualizado_em: new Date()
      };
    }
    return null;
  }
}
