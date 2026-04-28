/**
 * MELHORIA 3.1: ParseadorProjeto ROBUSTO
 * 
 * PROBLEMA: regex simples /(\d+)x(\d+)/ não trata:
 * - Múltiplas unidades (mm, cm, m, polegadas)
 * - Ordem variada (800x600 vs 600x800)
 * - Valores decimais (800.5 x 600.3)
 * - Validação de ranges físicos
 *
 * SOLUÇÃO: Parser parametrizável com validação completa
 */

/**
 * ENUMS: Unidades suportadas
 */
export enum UnidadeMedida {
  MM = 'mm',
  CM = 'cm',
  M = 'm',
  POLEGADAS = 'pol'
}

/**
 * ENUM: Tipos de móvel reconhecíveis
 */
export enum TipoMovelEnum {
  GAVETEIRO = 'gaveteiro',
  ARMARIO = 'armario',
  PRATELEIRA = 'prateleira',
  MESA = 'mesa',
  ESTANTE = 'estante',
  CRIADO = 'criado',
  RACK = 'rack',
  PAINEL = 'painel',
  OUTRO = 'outro'
}

/**
 * INTERFACE: Dimensão parseada (sempre em mm internamente)
 */
export interface DimensaoParsed {
  valor_mm: number; // Sempre convertido para mm internamente
  valor_original: number;
  unidade_original: UnidadeMedida;
  confianca: 'alta' | 'media' | 'baixa';
}

/**
 * INTERFACE: Resultado do parse
 */
export interface ParseResultado {
  sucesso: boolean;
  projeto?: ProjeParsed;
  erros: string[];
  avisos: string[];
  debug?: {
    texto_original: string;
    regex_matches: RegExpMatchArray[] | null;
    dimensoes_raw: any;
  };
}

/**
 * INTERFACE: Projeto parseado
 */
export interface ProjeParsed {
  tipo_movel: TipoMovelEnum;
  largura_mm: number;
  altura_mm: number;
  profundidade_mm: number;
  customizacoes: {
    gavetas: number;
    portas: number;
    prateleiras: number;
    vidro: boolean;
    espelho: boolean;
    rodapio: boolean;
    acabamento?: string;
  };
  material_sugerido?: string;
  confianca_geral: number; // 0-100
}

/**
 * CLASSE: ParseadorProjeto com validação robusta
 */
export class ParseadorProjeto {
  // Ranges físicos válidos (em mm)
  private static readonly RANGES_VALIDOS = {
    largura: { min: 250, max: 4000, descricao: '250mm a 4m' },
    altura: { min: 300, max: 2500, descricao: '300mm a 2.5m' },
    profundidade: { min: 250, max: 800, descricao: '250mm a 800mm' }
  };

  // Tabela de conversão de unidades para mm
  private static readonly CONVERSOES: Record<UnidadeMedida, number> = {
    [UnidadeMedida.MM]: 1,
    [UnidadeMedida.CM]: 10,
    [UnidadeMedida.M]: 1000,
    [UnidadeMedida.POLEGADAS]: 25.4
  };

  // Palavras-chave para reconhecer tipos de móvel
  private static readonly TIPO_PALAVRAS: Record<TipoMovelEnum, string[]> = {
    [TipoMovelEnum.GAVETEIRO]: ['gaveteiro', 'gaveta', 'drawer', 'gavetão'],
    [TipoMovelEnum.ARMARIO]: ['armário', 'guarda-roupa', 'closet', 'armario'],
    [TipoMovelEnum.PRATELEIRA]: ['prateleira', 'rack', 'estante', 'shelf'],
    [TipoMovelEnum.MESA]: ['mesa', 'table', 'desk', 'bancada'],
    [TipoMovelEnum.ESTANTE]: ['estante', 'bookshelf', 'showcase'],
    [TipoMovelEnum.CRIADO]: ['criado', 'bedside', 'noite'],
    [TipoMovelEnum.RACK]: ['rack', 'tv', 'audio'],
    [TipoMovelEnum.PAINEL]: ['painel', 'divisória', 'divider'],
    [TipoMovelEnum.OUTRO]: ['móvel', 'peça', 'item']
  };

  /**
   * MÉTODO PÚBLICO: Fazer parse
   */
  static parse(mensagemUsuario: string): ParseResultado {
    const erros: string[] = [];
    const avisos: string[] = [];

    if (!mensagemUsuario || typeof mensagemUsuario !== 'string') {
      return {
        sucesso: false,
        erros: ['Entrada inválida ou vazia'],
        avisos: []
      };
    }

    const msgNormalizada = mensagemUsuario.toLowerCase().trim();

    // 1. Extrair dimensões
    const dimensoesResult = this.extrairDimensoes(msgNormalizada);
    if (!dimensoesResult.sucesso) {
      return {
        sucesso: false,
        erros: dimensoesResult.erros,
        avisos: []
      };
    }

    const { largura_mm, altura_mm, profundidade_mm, confianca_dimensoes } =
      dimensoesResult;

    // 2. Reconhecer tipo de móvel
    const tipoMovel = this.reconhecerTipoMovel(msgNormalizada);

    // 3. Extrair customizações
    const customizacoes = this.extrairCustomizacoes(msgNormalizada);

    // 4. Validar ranges físicos
    const validacaoRanges = this.validarRanges(
      largura_mm || 0,
      altura_mm || 0,
      profundidade_mm || 0
    );
    if (!validacaoRanges.valido) {
      return {
        sucesso: false,
        erros: validacaoRanges.erros,
        avisos: validacaoRanges.avisos
      };
    }

    // 5. Validar coerência (proporções, tipo vs dimensões)
    const validacaoCoerencia = this.validarCoerencia(
      tipoMovel,
      largura_mm || 0,
      altura_mm || 0,
      profundidade_mm || 0,
      customizacoes
    );
    if (validacaoCoerencia.erros.length > 0) {
      erros.push(...validacaoCoerencia.erros);
    }
    if (validacaoCoerencia.avisos.length > 0) {
      avisos.push(...validacaoCoerencia.avisos);
    }

    // 6. Se tem erros, retornar falha
    if (erros.length > 0) {
      return { sucesso: false, erros, avisos };
    }

    // 7. Calcular confiança geral
    const confiancaGeral = Math.round(
      ((confianca_dimensoes || 0) +
        (tipoMovel !== TipoMovelEnum.OUTRO ? 95 : 70) +
        (customizacoes.gavetas > 0 ? 90 : 95)) /
        3
    );

    // 8. Sugerir material baseado no tipo
    const materialSugerido = this.sugerirMaterial(
      tipoMovel,
      altura_mm || 0,
      profundidade_mm || 0
    );

    const projeto: ProjeParsed = {
      tipo_movel: tipoMovel,
      largura_mm: largura_mm || 0,
      altura_mm: altura_mm || 0,
      profundidade_mm: profundidade_mm || 0,
      customizacoes,
      material_sugerido: materialSugerido,
      confianca_geral: confiancaGeral
    };

    return {
      sucesso: true,
      projeto,
      erros,
      avisos
    };
  }

  /**
   * EXTRAIR DIMENSÕES: Buscar números + unidades no texto
   */
  private static extrairDimensoes(msg: string): {
    sucesso: boolean;
    largura_mm?: number;
    altura_mm?: number;
    profundidade_mm?: number;
    confianca_dimensoes?: number;
    erros: string[];
  } {
    const erros: string[] = [];

    // Regex: captura "800", "800.5", "80cm", "1.2m", etc
    const padraoNumero = /(\d+(?:[.,]\d+)?)\s*(mm|cm|m|pol)?/gi;

    const matches = Array.from(msg.matchAll(padraoNumero));

    if (matches.length === 0) {
      return {
        sucesso: false,
        erros: ['Nenhuma dimensão encontrada (ex: 800x600 ou 80cm x 60cm)']
      };
    }

    // Extrair até 3 dimensões
    const dimensoes: DimensaoParsed[] = [];
    for (let i = 0; i < Math.min(matches.length, 3); i++) {
      const match = matches[i];
      const numeroStr = match[1];
      const unidadeStr = match[2];

      // Normalizar decimal (pode ser , ou .)
      const numero = parseFloat(numeroStr.replace(',', '.'));

      // Validar se é número válido
      if (isNaN(numero) || numero <= 0) {
        erros.push(`Dimensão inválida: "${numeroStr}"`);
        continue;
      }

      // Determinar unidade (default: mm se não especificada)
      const unidadeText = (
        unidadeStr || 'mm'
      ).toLowerCase() as UnidadeMedida;
      const unidade =
        Object.values(UnidadeMedida).find(u => u === unidadeText) ||
        UnidadeMedida.MM;

      // Converter para mm
      const fator = this.CONVERSOES[unidade];
      const valor_mm = numero * fator;

      // Validar se é número realista (não > 10m ou < 10mm)
      if (valor_mm > 10000 || valor_mm < 10) {
        erros.push(
          `Dimensão fora de escala: ${numero}${unidade} = ${valor_mm}mm`
        );
        continue;
      }

      dimensoes.push({
        valor_mm,
        valor_original: numero,
        unidade_original: unidade,
        confianca: unidadeStr ? 'alta' : 'media'
      });
    }

    if (dimensoes.length < 2) {
      return {
        sucesso: false,
        erros: [
          `Encontradas apenas ${dimensoes.length} dimensão(ões), precisam de 2-3`
        ]
      };
    }

    // Ordenar por tamanho (maior primeiro)
    dimensoes.sort((a, b) => b.valor_mm - a.valor_mm);

    // Atribuir largura, altura, profundidade
    let largura_mm = dimensoes[0].valor_mm; // Maior
    let altura_mm = dimensoes[1].valor_mm;  // Segundo maior
    let profundidade_mm =
      dimensoes.length === 3 ? dimensoes[2].valor_mm : 450; // Default 450mm

    // Heurística: se altura > largura 1.5x, provavelmente trocou
    if (altura_mm > largura_mm * 1.5) {
      [largura_mm, altura_mm] = [altura_mm, largura_mm];
    }

    // Calcular confiança média
    const confianca_dimensoes = Math.round(
      (dimensoes.reduce(
        (sum, d) => sum + (d.confianca === 'alta' ? 100 : 80),
        0
      ) /
        dimensoes.length) *
        (erros.length === 0 ? 1 : 0.7)
    );

    return {
      sucesso: erros.length === 0,
      largura_mm,
      altura_mm,
      profundidade_mm,
      confianca_dimensoes,
      erros
    };
  }

  /**
   * RECONHECER TIPO DE MÓVEL
   */
  private static reconhecerTipoMovel(msg: string): TipoMovelEnum {
    for (const [tipo, palavras] of Object.entries(this.TIPO_PALAVRAS)) {
      for (const palavra of palavras) {
        if (msg.includes(palavra)) {
          return tipo as TipoMovelEnum;
        }
      }
    }
    return TipoMovelEnum.OUTRO;
  }

  /**
   * EXTRAIR CUSTOMIZAÇÕES (gavetas, portas, etc)
   */
  private static extrairCustomizacoes(msg: string): any {
    const customizacoes = {
      gavetas: 0,
      portas: 0,
      prateleiras: 0,
      vidro: false,
      espelho: false,
      rodapio: false,
      acabamento: undefined as string | undefined
    };

    // Gavetas
    const matchGavetas = msg.match(/(\d+)\s*gaveta/);
    if (matchGavetas) {
      customizacoes.gavetas = parseInt(matchGavetas[1]);
    }

    // Portas
    const matchPortas = msg.match(/(\d+)\s*porta/);
    if (matchPortas) {
      customizacoes.portas = parseInt(matchPortas[1]);
    }

    // Prateleiras
    const matchPrateleiras = msg.match(/(\d+)\s*prateleira/);
    if (matchPrateleiras) {
      customizacoes.prateleiras = parseInt(matchPrateleiras[1]);
    }

    // Vidro
    customizacoes.vidro = /vidro|transparente|glass/.test(msg);

    // Espelho
    customizacoes.espelho = /espelho|mirror/.test(msg);

    // Rodapé
    customizacoes.rodapio = /rodapé|base|feet/.test(msg);

    // Acabamento
    if (/off.?white|branco/.test(msg)) {
      customizacoes.acabamento = 'Off-White';
    } else if (/cinza|grey|gray/.test(msg)) {
      customizacoes.acabamento = 'Cinza';
    } else if (/natural|madeira|wood/.test(msg)) {
      customizacoes.acabamento = 'Natural';
    }

    return customizacoes;
  }

  /**
   * VALIDAR RANGES FÍSICOS
   */
  private static validarRanges(
    largura: number,
    altura: number,
    profundidade: number
  ): {
    valido: boolean;
    erros: string[];
    avisos: string[];
  } {
    const erros: string[] = [];
    const avisos: string[] = [];

    // Largura
    if (largura < this.RANGES_VALIDOS.largura.min) {
      erros.push(
        `Largura ${largura}mm está abaixo do mínimo (${this.RANGES_VALIDOS.largura.min}mm)`
      );
    }
    if (largura > this.RANGES_VALIDOS.largura.max) {
      erros.push(
        `Largura ${largura}mm está acima do máximo (${this.RANGES_VALIDOS.largura.max}mm)`
      );
    }

    // Altura
    if (altura < this.RANGES_VALIDOS.altura.min) {
      erros.push(
        `Altura ${altura}mm está abaixo do mínimo (${this.RANGES_VALIDOS.altura.min}mm)`
      );
    }
    if (altura > this.RANGES_VALIDOS.altura.max) {
      avisos.push(`Altura >2.5m pode precisar reforço estrutural`);
    }

    // Profundidade
    if (profundidade < this.RANGES_VALIDOS.profundidade.min) {
      erros.push(
        `Profundidade ${profundidade}mm está abaixo do mínimo (${this.RANGES_VALIDOS.profundidade.min}mm)`
      );
    }
    if (profundidade > this.RANGES_VALIDOS.profundidade.max) {
      erros.push(
        `Profundidade ${profundidade}mm está acima do máximo (${this.RANGES_VALIDOS.profundidade.max}mm)`
      );
    }

    return {
      valido: erros.length === 0,
      erros,
      avisos
    };
  }

  /**
   * VALIDAR COERÊNCIA (Tipo vs dimensões)
   */
  private static validarCoerencia(
    tipo: TipoMovelEnum,
    largura: number,
    altura: number,
    profundidade: number,
    customizacoes: any
  ): {
    erros: string[];
    avisos: string[];
  } {
    const erros: string[] = [];
    const avisos: string[] = [];

    // Gavetas: altura mínima
    if (customizacoes.gavetas > 0) {
      const alturaGaveta = altura / customizacoes.gavetas;
      if (alturaGaveta < 100) {
        erros.push(
          `${customizacoes.gavetas} gavetas em ${altura}mm = ${alturaGaveta.toFixed(0)}mm por gaveta (mínimo 100mm)`
        );
      }
      if (alturaGaveta < 150) {
        avisos.push(
          `Gavetas pequenas (${alturaGaveta.toFixed(0)}mm), cliente pode reclamar`
        );
      }
    }

    // Proporções (muito alto + pouco profundo = instável)
    const proporcao = altura / profundidade;
    if (proporcao > 4) {
      avisos.push(`Proporção altura/profundidade ${proporcao.toFixed(1)}x pode parecer desproporcionado`);
    }
    if (proporcao < 0.5) {
      avisos.push(`Móvel muito baixo (proporção ${proporcao.toFixed(1)}x)`);
    }

    return { erros, avisos };
  }

  /**
   * SUGERIR MATERIAL baseado em tipo e dimensões
   */
  private static sugerirMaterial(
    tipo: TipoMovelEnum,
    altura: number,
    profundidade: number
  ): string {
    // Gaveteir/armário com altura < 1200mm: 18mm é suficiente
    if (altura < 1200) {
      return 'MDF 18mm';
    }

    // Acima de 1200mm: melhor 25mm para rigidez
    if (altura > 1800) {
      return 'MDF 25mm + Reforços';
    }

    return 'MDF 18mm';
  }
}
