import { ParseadorProjeto, TipoMovelEnum } from '../modules/plano-corte/infrastructure/parsers/ParseadorProjeto';
import { ProcessadorProjeto } from '../modules/engenharia/application/usecases/ProcessadorProjeto';
import { sql } from '../api-lib/_db';

// --- 1. INTERFACES DE ENGENHARIA ---

export interface Projeto {
  tipo: string;
  largura: number;
  altura: number;
  profundidade: number;
  espessura: number;
  gavetas: number;
  portas: number;
  travessas?: boolean;
}

export interface Peca {
  nome: string;
  largura: number;
  altura: number;
  espessura: number;
  material: string;
  id?: string;
}

export interface PlanoCorte {
  chapaId: number;
  pecas: Array<Peca & { x?: number; y?: number; rotacionado?: boolean }>;
  aproveitamento: number;
}

export interface ResultadoProjetoCompleto {
  projeto: Projeto;
  pecas: Peca[];
  planoDeCorte: PlanoCorte[];
  custo: number;
  venda: {
    custo: number;
    preco: number;
    margem: number;
  };
  analise_financeira?: CustoCalculado;
  avisos: string[];
}

const CHAPA_PADRAO = {
  largura: 2750,
  altura: 1840 // 1850 - 10mm margem
};

// --- 3. FUNÇÕES DO MOTOR ---

export function interpretarProjeto(msg: string): Projeto {
  const parseResult = ParseadorProjeto.parse(msg);
  
  if (!parseResult.sucesso) {
    console.warn("Parser falhou, usando interpretação básica:", parseResult.erros);
    const match = msg.match(/(\d+)x(\d+)(x(\d+))?/);
    return {
      tipo: "Estrutura Industrial",
      largura: match ? Number(match[1]) : 600,
      altura: match ? Number(match[2]) : 700,
      profundidade: match?.[4] ? Number(match[4]) : 450,
      espessura: 18,
      gavetas: 0,
      portas: 0
    };
  }

  const p = parseResult.projeto!;
  return {
    tipo: p.tipo_movel.charAt(0).toUpperCase() + p.tipo_movel.slice(1),
    largura: p.largura_mm,
    altura: p.altura_mm,
    profundidade: p.profundidade_mm,
    espessura: 18,
    gavetas: p.customizacoes.gavetas,
    portas: p.customizacoes.portas,
    travessas: p.largura_mm > 1200 
  };
}

/**
 * BUSCAR REGRAS DE PEÇAS (ME 4.1)
 * Tenta buscar no DB, se não houver, usa heurística local
 */
export async function gerarPecas(p: Projeto): Promise<Peca[]> {
  try {
    const rows = await sql`
      SELECT regras_bom 
      FROM projeto_tipos 
      WHERE slug = ${p.tipo.toLowerCase()} OR nome ILIKE ${p.tipo}
      LIMIT 1
    `;

    if (rows.length > 0 && rows[0].regras_bom) {
      // TODO: Implementar interpretador de fórmulas para regras_bom
      // Por enquanto, seguimos com a heurística local mais segura
    }
  } catch (e) {
    console.warn("Tabela projeto_tipos não encontrada ou erro no DB. Usando heurística local.");
  }

  const pecas: Peca[] = [];
  const ESP = p.espessura;

  if (p.largura < 100 || p.altura < 100) {
    throw new Error("Dimensões insuficientes para fabricação (mínimo 100mm)");
  }

  // 1. Laterais
  pecas.push({ nome: "Lateral Esquerda", largura: p.profundidade, altura: p.altura, espessura: ESP, material: "MDF" });
  pecas.push({ nome: "Lateral Direita", largura: p.profundidade, altura: p.altura, espessura: ESP, material: "MDF" });

  // 2. Base e Topo
  const larguraInterna = p.largura - (ESP * 2);
  pecas.push({ nome: "Base Inferior", largura: larguraInterna, altura: p.profundidade, espessura: ESP, material: "MDF" });
  
  if (p.travessas) {
    pecas.push({ nome: "Travessa Frontal", largura: larguraInterna, altura: 80, espessura: ESP, material: "MDF" });
    pecas.push({ nome: "Travessa Traseira", largura: larguraInterna, altura: 80, espessura: ESP, material: "MDF" });
  } else {
    pecas.push({ nome: "Tampo Superior", largura: larguraInterna, altura: p.profundidade, espessura: ESP, material: "MDF" });
  }

  // 3. Fundo
  pecas.push({ nome: "Fundo", largura: p.largura - 2, altura: p.altura - 2, espessura: 6, material: "HDF" });

  // 4. Gavetas
  if (p.gavetas > 0) {
    const alturaFrente = (p.altura / p.gavetas) - 4;
    for (let i = 1; i <= p.gavetas; i++) {
        pecas.push({ nome: `Frente Gaveta ${i}`, largura: p.largura - 4, altura: alturaFrente, espessura: ESP, material: "MDF" });
        pecas.push({ nome: `Gaveta ${i} Lateral E`, largura: p.profundidade - 50, altura: 120, espessura: 15, material: "MDF" });
        pecas.push({ nome: `Gaveta ${i} Lateral D`, largura: p.profundidade - 50, altura: 120, espessura: 15, material: "MDF" });
    }
  }

  return pecas;
}

export function otimizarCorte(pecas: Peca[]): PlanoCorte[] {
  // Separa peças por espessura/material (apenas MDF para o exemplo principal)
  let pecasParaOtimizar = pecas.filter(p => p.material === "MDF").map(p => ({
    id: p.nome,
    nome: p.nome,
    largura: p.largura,
    altura: p.altura,
    rotacionavel: true
  }));

  if (pecasParaOtimizar.length === 0) return [];

  const chapas: PlanoCorte[] = [];
  let chapaCount = 1;

  // Loop para tratar múltiplas chapas (Bin Packing)
  while (pecasParaOtimizar.length > 0) {
    const optimizer = new HybridOptimizer(CHAPA_PADRAO.largura, CHAPA_PADRAO.altura, 3);
    const resultado = optimizer.otimizar(pecasParaOtimizar, 10);

    if (resultado.pecas_posicionadas.length === 0 && pecasParaOtimizar.length > 0) {
      console.error("Peça muito grande para a chapa:", pecasParaOtimizar[0]);
      break; // Evitar loop infinito
    }

    chapas.push({
      chapaId: chapaCount++,
      pecas: resultado.pecas_posicionadas.map(p => ({
        nome: p.id,
        largura: p.largura,
        altura: p.altura,
        espessura: 18,
        material: "MDF",
        x: p.x,
        y: p.y,
        rotacionado: p.rotacionada
      })),
      aproveitamento: parseFloat(resultado.aproveitamento.toFixed(2))
    });

    // Peças que não couberam nesta chapa vão para a próxima iteração
    pecasParaOtimizar = resultado.pecas_rejeitadas as any;
  }

  return chapas;
}

export async function gerarProjetoCompleto(msg: string): Promise<any> {
  const processador = new ProcessadorProjeto(sql, console);
  
  const resultado = await processador.processar({
    descricao_projeto: msg,
    sku_chapa: "MDF-18MM-BRA",
    usuario_id: "copilot-system",
    opcoes: {
      usar_retalhos: true,
      iteracoes_otimizacao: 20
    }
  });

  if (!resultado.sucesso) {
    throw new Error(resultado.erros.join('; '));
  }

  return {
    projeto: {
      tipo: resultado.projeto?.tipo_movel || "Móvel Customizado",
      largura: resultado.projeto?.largura_mm,
      altura: resultado.projeto?.altura_mm,
      profundidade: resultado.projeto?.profundidade_mm,
      espessura: 18,
      gavetas: resultado.projeto?.customizacoes.gavetas,
      portas: resultado.projeto?.customizacoes.portas
    },
    pecas: resultado.pecas,
    planoDeCorte: resultado.layouts,
    custo: resultado.custos?.resumo.custo_total,
    venda: {
      custo: resultado.custos?.resumo.custo_total,
      preco: resultado.custos?.preco_venda,
      margem: resultado.custos?.margem.margem_minima_percentual
    },
    analise_financeira: resultado.custos,
    avisos: resultado.avisos,
    confianca: resultado.confianca_geral
  };
}

// --- ORDENS DE PRODUÇÃO ---

export interface OrdemProducao {
  opId: string;
  produto: string;
  dataCriacao: Date;
  status: "PENDENTE" | "EM_PRODUCAO" | "FINALIZADA";
  pecas: Peca[];
  materiais: any[];
  planoCorte: PlanoCorte[];
}

export function gerarNumeroOP(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `OP-${timestamp}`;
}

export async function gerarOrdemProducao(msg: string): Promise<OrdemProducao> {
  const projetoCompleto = await gerarProjetoCompleto(msg);
  const { projeto, pecas, planoDeCorte, analise_financeira } = projetoCompleto;

  return {
    opId: gerarNumeroOP(),
    produto: projeto.tipo,
    dataCriacao: new Date(),
    status: "PENDENTE",
    pecas: pecas,
    materiais: projetoCompleto.pecas, // Simplificado para o exemplo
    planoCorte: planoDeCorte
  };
}
