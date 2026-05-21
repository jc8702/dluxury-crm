export interface ParsedSKU {
  sku: string;
  categoria: string;
  ambiente: string;
  dimensoes: {
    largura_mm?: number;
    altura_mm?: number;
    profundidade_mm?: number;
  };
  portas: number;
  tipoPorta: 'giro' | 'correr' | 'basculante' | 'desconhecido';
  gavetas: number;
  material: 'MDF' | 'MDP' | 'COMPENSADO' | 'VIDRO' | 'DESCONHECIDO';
  espessura_mm: number;
  caracteristicasExtra: string[];
}

export interface AlertaEngenharia {
  nivel: 'SUGESTAO' | 'AVISO' | 'CRITICO';
  mensagem: string;
  justificativa: string;
}

export interface AnaliseSKU {
  sku: string;
  parsed: ParsedSKU;
  alertas: AlertaEngenharia[];
  sugestoesMelhoria: string[];
  sucesso: boolean;
}

// Dicionários de Mapeamento Técnico de Marcenaria
const CATEGORIAS: Record<string, string> = {
  BALC: 'Balcão',
  BAL: 'Balcão',
  ARM: 'Armário',
  AER: 'Aéreo',
  COL: 'Coluna',
  PAN: 'Paneleiro',
  PAI: 'Painel',
  GAV: 'Gaveteiro',
  ROU: 'Roupeiro',
  CLO: 'Closet',
  LAV: 'Lavanderia',
  NIC: 'Nicho',
  NICH: 'Nicho',
  BANC: 'Bancada',
};

const AMBIENTES: Record<string, string> = {
  COZ: 'Cozinha',
  DOR: 'Dormitório',
  QUAR: 'Quarto',
  BAN: 'Banheiro',
  WC: 'Banheiro',
  SAL: 'Sala',
  LAV: 'Lavanderia',
  COR: 'Corporativo',
  OFF: 'Escritório',
};

const MATERIAIS: Record<string, 'MDF' | 'MDP' | 'COMPENSADO' | 'VIDRO'> = {
  MDF: 'MDF',
  MDP: 'MDP',
  COMP: 'COMPENSADO',
  VIDR: 'VIDRO',
  VIDRO: 'VIDRO',
};

/**
 * Realiza o parsing semântico de uma nomenclatura de SKU de marcenaria.
 */
export function parseSKU(sku: string): ParsedSKU {
  const cleanSku = sku.trim().toUpperCase();
  const parts = cleanSku.split('-');

  const result: ParsedSKU = {
    sku: cleanSku,
    categoria: 'Desconhecido',
    ambiente: 'Geral',
    dimensoes: {},
    portas: 0,
    tipoPorta: 'giro',
    gavetas: 0,
    material: 'DESCONHECIDO',
    espessura_mm: 15, // Padrão de mercado para móveis econômicos
    caracteristicasExtra: [],
  };

  // Processar cada segmento do SKU
  parts.forEach((part, index) => {
    // 1. Identificar Categoria (apenas se for o primeiro índice ou ainda desconhecido, e a sigla não for usada em outra posição como gaveta/ambiente)
    const isFirstOrUnknown = result.categoria === 'Desconhecido' || index === 0;
    const isCategorySigla = CATEGORIAS[part] && (part !== 'GAV' || index === 0) && (part !== 'LAV' || index === 0);

    if (isCategorySigla && isFirstOrUnknown) {
      result.categoria = CATEGORIAS[part];
      return;
    }

    // Identificar gavetas se for a sigla "GAV" e index > 0
    if (part === 'GAV' && index > 0) {
      result.gavetas = 1;
      return;
    }

    // 2. Identificar Ambiente (apenas se for geral ou nos primeiros índices)
    if (AMBIENTES[part]) {
      if (result.ambiente === 'Geral' || index === 1) {
        result.ambiente = AMBIENTES[part];
      }
      return;
    }

    // 3. Identificar Dimensoes (Largura / Altura / Profundidade)
    // Se for um número de 3 ou 4 dígitos isolado (ex: 1200, 2400, 600)
    if (/^\d{3,4}$/.test(part)) {
      const valor = parseInt(part, 10);
      if (!result.dimensoes.largura_mm) {
        result.dimensoes.largura_mm = valor;
      } else if (!result.dimensoes.altura_mm) {
        result.dimensoes.altura_mm = valor;
      } else if (!result.dimensoes.profundidade_mm) {
        result.dimensoes.profundidade_mm = valor;
      }
      return;
    }

    // Formato com "X" de dimensões compostas (ex: 1200X600 ou 800X600X350)
    if (/^\d{3,4}X\d{3,4}(?:X\d{3,4})?$/.test(part)) {
      const subParts = part.split('X').map(v => parseInt(v, 10));
      result.dimensoes.largura_mm = subParts[0];
      result.dimensoes.altura_mm = subParts[1];
      if (subParts[2]) {
        result.dimensoes.profundidade_mm = subParts[2];
      }
      return;
    }

    // 4. Identificar Composição (Portas e Gavetas)
    // Portas (ex: 2P, 3PORTAS, 1PT)
    const matchPortas = part.match(/^(\d+)P(?:T|ORTAS?)?$/);
    if (matchPortas) {
      result.portas = parseInt(matchPortas[1], 10);
      return;
    }

    // Gavetas (ex: 3GAV, 4G, GAV)
    const matchGavetas = part.match(/^(\d*)G(?:AV)?$/);
    if (matchGavetas) {
      result.gavetas = matchGavetas[1] ? parseInt(matchGavetas[1], 10) : 1;
      return;
    }

    // Tipo de porta
    if (part === 'BAS' || part === 'BASC') {
      result.tipoPorta = 'basculante';
      return;
    }
    if (part === 'RUN' || part === 'CORR' || part === 'SLID') {
      result.tipoPorta = 'correr';
      return;
    }

    // 5. Identificar Material e Espessura
    // Ex: MDF18, MDP15, MDF25, MDF06
    const matchMaterialEspessura = part.match(/^([A-Z]{3,4})(\d{1,2})$/);
    if (matchMaterialEspessura && MATERIAIS[matchMaterialEspessura[1]]) {
      result.material = MATERIAIS[matchMaterialEspessura[1]];
      result.espessura_mm = parseInt(matchMaterialEspessura[2], 10);
      return;
    }

    if (MATERIAIS[part]) {
      result.material = MATERIAIS[part];
      return;
    }

    if (/^(\d{1,2})MM$/.test(part)) {
      result.espessura_mm = parseInt(part.match(/^(\d{1,2})MM$/)![1], 10);
      return;
    }

    // Outros termos comuns
    if (part === 'ESP' || part === 'ESPELHO') {
      result.caracteristicasExtra.push('Espelhado');
    } else if (part === 'AMORT' || part === 'AMORTIGUADOR' || part === 'SLOW') {
      result.caracteristicasExtra.push('Amortecimento');
    } else if (part === 'BR' || part === 'BRANCO') {
      result.caracteristicasExtra.push('Branco Diamante');
    } else if (part === 'TX' || part === 'TEXTURA') {
      result.caracteristicasExtra.push('Texturizado');
    } else if (part === 'LED') {
      result.caracteristicasExtra.push('Iluminação LED integrada');
    } else if (part === 'PERFIL' || part === 'PUX') {
      result.caracteristicasExtra.push('Puxador Perfil de Alumínio');
    }
  });

  // Heurísticas de Fallback se não identificar pelo padrão por hífen
  if (result.categoria === 'Desconhecido') {
    if (cleanSku.includes('BALC')) result.categoria = 'Balcão';
    else if (cleanSku.includes('AER')) result.categoria = 'Aéreo';
    else if (cleanSku.includes('ARM')) result.categoria = 'Armário';
    else if (cleanSku.includes('ROU')) result.categoria = 'Roupeiro';
  }

  if (result.material === 'DESCONHECIDO') {
    if (cleanSku.includes('MDF18')) {
      result.material = 'MDF';
      result.espessura_mm = 18;
    } else if (cleanSku.includes('MDF15')) {
      result.material = 'MDF';
      result.espessura_mm = 15;
    } else if (cleanSku.includes('MDF25')) {
      result.material = 'MDF';
      result.espessura_mm = 25;
    } else if (cleanSku.includes('MDF')) {
      result.material = 'MDF';
    }
  }

  return result;
}

/**
 * Valida a estrutura física de marcenaria do móvel com base nas dimensões, materiais e boas práticas industriais.
 */
export function validarEstrutura(parsed: ParsedSKU): AlertaEngenharia[] {
  const alertas: AlertaEngenharia[] = [];
  const largura = parsed.dimensoes.largura_mm;
  const categoria = parsed.categoria;
  const espessura = parsed.espessura_mm;
  const material = parsed.material;

  if (!largura) return alertas;

  // Categorias que possuem vãos livres estruturais horizontais (prateleiras ou tampos)
  const isVaoHorizontalPropenso = [
    'Aéreo',
    'Armário',
    'Balcão',
    'Roupeiro',
    'Closet',
    'Nicho',
    'Paneleiro',
    'Coluna'
  ].includes(categoria);

  // 1. Regra de Flambagem (Curvatura da prateleira/tampo)
  if (largura >= 800 && isVaoHorizontalPropenso) {
    if (espessura <= 15) {
      alertas.push({
        nivel: 'CRITICO',
        mensagem: `Risco de Flambagem Estrutural Elevado.`,
        justificativa: `O móvel possui largura de ${largura}mm construído com espessura de ${espessura}mm. Vãos horizontais livres a partir de 800mm em MDF/MDP de 15mm tendem a encurvar sob o peso de objetos. Recomenda-se utilizar MDF 18mm no corpo ou adicionar travessas/divisórias verticais de reforço.`,
      });
    } else if (espessura === 18 && largura > 1000) {
      alertas.push({
        nivel: 'AVISO',
        mensagem: `Atenção à Flambagem no Vão Horizontal.`,
        justificativa: `Largura de ${largura}mm em MDF 18mm sem divisórias centrais pode sofrer deformação no longo prazo. Considere a inserção de um montante vertical ou reforço de travessas traseiras duplas.`,
      });
    }
  }

  // 2. Regra de Fixação para Aéreos Grandes
  if (categoria === 'Aéreo' && largura >= 1000) {
    alertas.push({
      nivel: 'AVISO',
      mensagem: `Reforço de Fixação na Instalação Necessário.`,
      justificativa: `Móveis aéreos com largura igual ou superior a 1000mm são pesados e armazenam muita carga. A fixação na parede exige cantoneiras metálicas reforçadas (cantoneira 'L' com capa plástica de alta resistência) e buchas nº 8 ou 10 adequadas para alvenaria ou drywall, além de fixação traseira em três pontos no mínimo.`,
    });
  }

  // 3. Regra de Corrediças de Gaveta
  if (parsed.gavetas > 0 && largura > 800) {
    alertas.push({
      nivel: 'CRITICO',
      mensagem: `Torção de Corrediça em Gavetas Largas.`,
      justificativa: `Gaveteiros com largura de ${largura}mm exercem forte torque lateral nas corrediças telescópicas padrão de 35mm ou 45mm quando abertas, levando a desalinhamento e desgaste acelerado. Exige o uso de corrediças ocultas com estabilizador lateral/sincronizador ou corrediças heavy-duty especificadas para alta carga.`,
    });
  }

  // 4. Regra de Portas Basculantes e Pistões
  if (parsed.tipoPorta === 'basculante' && parsed.portas > 0) {
    if (largura > 900) {
      alertas.push({
        nivel: 'AVISO',
        mensagem: `Risco de Empenamento em Porta Basculante Larga.`,
        justificativa: `Uma única porta basculante com mais de 900mm de largura tende a empenar se acionada por apenas um pistão lateral. Recomenda-se utilizar dois pistões a gás sincronizados (um de cada lado) e dobradiças centrais adicionais (mínimo de 3 dobradiças na porta).`,
      });
    }
  }

  // 5. Dimensionamento Ergonômico de Cozinha
  if (parsed.ambiente === 'Cozinha' && categoria === 'Balcão' && parsed.dimensoes.profundidade_mm) {
    const prof = parsed.dimensoes.profundidade_mm;
    if (prof < 550) {
      alertas.push({
        nivel: 'AVISO',
        mensagem: `Profundidade de Balcão Abaixo do Recomendado.`,
        justificativa: `A profundidade padrão para balcões inferiores de cozinha é de 600mm a 650mm. Profundidade inferior a 550mm restringe a instalação de pias de inox padrão, cubas e cooktops, além de reduzir o espaço para eletrodomésticos embutidos.`,
      });
    }
  }

  // 6. Cabideiro em Roupeiro/Closet/Armário
  if (['Roupeiro', 'Closet', 'Armário'].includes(categoria) && largura > 900) {
    alertas.push({
      nivel: 'AVISO',
      mensagem: `Cabideiro com Vão Muito Extenso.`,
      justificativa: `Vão livre de cabideiro com ${largura}mm exige cabideiro em tubo oblongo cromado reforçado ou a inserção de um suporte intermediário fixado no teto do nicho para evitar a flexão do tubo sob carga máxima de roupas pesadas.`,
    });
  }

  // 7. Qualidade de Materiais em Banheiros
  if (parsed.ambiente === 'Banheiro' && material === 'MDP') {
    alertas.push({
      nivel: 'CRITICO',
      mensagem: `Incompatibilidade de Material para Área Úmida.`,
      justificativa: `O MDP possui maior sensibilidade à absorção de umidade nas bordas do que o MDF. Para móveis de banheiro (WC), recomenda-se estritamente o uso de MDF (preferencialmente MDF Ultra/Hidrófugo) com fitagem de borda PUR (poliuretano resistente à água) para evitar estufamento.`,
    });
  }

  return alertas;
}

/**
 * Gera uma análise técnica estruturada e comercial para um SKU.
 */
export function analisarSKUCompleto(sku: string): AnaliseSKU {
  try {
    const parsed = parseSKU(sku);
    const alertas = validarEstrutura(parsed);
    
    const sugestoesMelhoria: string[] = [];
    
    // Gerar sugestões baseadas nos alertas
    for (const alerta of alertas) {
      if (alerta.nivel === 'CRITICO') {
        sugestoesMelhoria.push(`ALTERAÇÃO DE PROJETO: ${alerta.mensagem} -> Substituir componente ou reduzir largura.`);
      } else if (alerta.nivel === 'AVISO') {
        sugestoesMelhoria.push(`REFORÇO: ${alerta.mensagem} -> Adicionar travessas/suportes de engenharia.`);
      }
    }

    if (parsed.espessura_mm === 15 && parsed.material === 'MDF') {
      sugestoesMelhoria.push(`UPSELL COMERCIAL: Sugerir ao cliente a migração para MDF 18mm por um acréscimo de 8% a 12% no custo de chapas, garantindo estabilidade e visual robusto premium.`);
    }

    if (parsed.categoria === 'Balcão' && parsed.portas >= 2 && parsed.gavetas === 0) {
      sugestoesMelhoria.push(`OTIMIZAÇÃO ERGONÔMICA: Substituir uma das portas de giro por gavetões internos para melhorar a acessibilidade de panelas e mantimentos no fundo do móvel.`);
    }

    return {
      sku,
      parsed,
      alertas,
      sugestoesMelhoria,
      sucesso: true,
    };
  } catch (err: any) {
    return {
      sku,
      parsed: {
        sku,
        categoria: 'Erro',
        ambiente: 'Erro',
        dimensoes: {},
        portas: 0,
        tipoPorta: 'desconhecido',
        gavetas: 0,
        material: 'DESCONHECIDO',
        espessura_mm: 0,
        caracteristicasExtra: [],
      },
      alertas: [{
        nivel: 'CRITICO',
        mensagem: 'Falha no processador de engenharia de SKUs.',
        justificativa: err.message,
      }],
      sugestoesMelhoria: [],
      sucesso: false,
    };
  }
}
